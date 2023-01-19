import { extname, fromFileUrl, rutt, Status, toFileUrl, typeByExtension, walk } from "./deps.ts";
import { h } from "preact";
import { Bundler } from "./bundle.ts";
import { ALIVE_URL, BUILD_ID, JS_PREFIX, REFRESH_JS_URL } from "./constants.ts";
import DefaultErrorHandler from "./default_error_page.ts";
import { render as internalRender } from "./render.ts";
import { SELF } from "../runtime/csp.ts";
import { ASSET_CACHE_BUST_KEY, INTERNAL_PREFIX } from "../runtime/utils.ts";
export class ServerContext {
    #dev;
    #routes;
    #islands;
    #staticFiles;
    #bundler;
    #renderFn;
    #middlewares;
    #app;
    #notFound;
    #error;
    #plugins;
    constructor(routes, islands, staticFiles, renderfn, middlewares, app, notFound, error, plugins, importMapURL, jsxConfig){
        this.#routes = routes;
        this.#islands = islands;
        this.#staticFiles = staticFiles;
        this.#renderFn = renderfn;
        this.#middlewares = middlewares;
        this.#app = app;
        this.#notFound = notFound;
        this.#error = error;
        this.#plugins = plugins;
        this.#dev = typeof Deno.env.get("DENO_DEPLOYMENT_ID") !== "string"; // Env var is only set in prod (on Deploy).
        this.#bundler = new Bundler(this.#islands, this.#plugins, importMapURL, jsxConfig, this.#dev);
    }
    /**
   * Process the manifest into individual components and pages.
   */ static async fromManifest(manifest, opts) {
        // Get the manifest' base URL.
        const baseUrl = new URL("./", manifest.baseUrl).href;
        const config = manifest.config || {
            importMap: "./import_map.json"
        };
        if (typeof config.importMap !== "string") {
            throw new Error("deno.json must contain an 'importMap' property.");
        }
        const importMapURL = new URL(config.importMap, manifest.baseUrl);
        config.compilerOptions ??= {};
        let jsx;
        switch(config.compilerOptions.jsx){
            case "react":
            case undefined:
                jsx = "react";
                break;
            case "react-jsx":
                jsx = "react-jsx";
                break;
            default:
                throw new Error("Unknown jsx option: " + config.compilerOptions.jsx);
        }
        const jsxConfig = {
            jsx,
            jsxImportSource: config.compilerOptions.jsxImportSource
        };
        // Extract all routes, and prepare them into the `Page` structure.
        const routes = [];
        const islands = [];
        const middlewares = [];
        let app = DEFAULT_APP;
        let notFound = DEFAULT_NOT_FOUND;
        let error = DEFAULT_ERROR;
        for (const [self, module] of Object.entries(manifest.routes)){
            const url = new URL(self, baseUrl).href;
            if (!url.startsWith(baseUrl + "routes")) {
                throw new TypeError("Page is not a child of the basepath.");
            }
            const path = url.substring(baseUrl.length).substring("routes".length);
            const baseRoute = path.substring(1, path.length - extname(path).length);
            const name = baseRoute.replace("/", "-");
            const isMiddleware = path.endsWith("/_middleware.tsx") || path.endsWith("/_middleware.ts") || path.endsWith("/_middleware.jsx") || path.endsWith("/_middleware.js");
            if (!path.startsWith("/_") && !isMiddleware) {
                const { default: component , config: config1  } = module;
                let pattern = pathToPattern(baseRoute);
                if (config1?.routeOverride) {
                    pattern = String(config1.routeOverride);
                }
                let { handler  } = module;
                handler ??= {};
                if (component && typeof handler === "object" && handler.GET === undefined) {
                    handler.GET = (_req, { render  })=>render();
                }
                const route = {
                    pattern,
                    url,
                    name,
                    component,
                    handler,
                    csp: Boolean(config1?.csp ?? false)
                };
                routes.push(route);
            } else if (isMiddleware) {
                middlewares.push({
                    ...middlewarePathToPattern(baseRoute),
                    ...module
                });
            } else if (path === "/_app.tsx" || path === "/_app.ts" || path === "/_app.jsx" || path === "/_app.js") {
                app = module;
            } else if (path === "/_404.tsx" || path === "/_404.ts" || path === "/_404.jsx" || path === "/_404.js") {
                const { default: component1 , config: config2  } = module;
                let { handler: handler1  } = module;
                if (component1 && handler1 === undefined) {
                    handler1 = (_req, { render  })=>render();
                }
                notFound = {
                    pattern: pathToPattern(baseRoute),
                    url,
                    name,
                    component: component1,
                    handler: handler1 ?? ((req)=>rutt.defaultOtherHandler(req)),
                    csp: Boolean(config2?.csp ?? false)
                };
            } else if (path === "/_500.tsx" || path === "/_500.ts" || path === "/_500.jsx" || path === "/_500.js") {
                const { default: component2 , config: config3  } = module;
                let { handler: handler2  } = module;
                if (component2 && handler2 === undefined) {
                    handler2 = (_req, { render  })=>render();
                }
                error = {
                    pattern: pathToPattern(baseRoute),
                    url,
                    name,
                    component: component2,
                    handler: handler2 ?? ((req, ctx)=>rutt.defaultErrorHandler(req, ctx, ctx.error)),
                    csp: Boolean(config3?.csp ?? false)
                };
            }
        }
        sortRoutes(routes);
        sortRoutes(middlewares);
        for (const [self1, module1] of Object.entries(manifest.islands)){
            const url1 = new URL(self1, baseUrl).href;
            if (!url1.startsWith(baseUrl)) {
                throw new TypeError("Island is not a child of the basepath.");
            }
            const path1 = url1.substring(baseUrl.length).substring("islands".length);
            const baseRoute1 = path1.substring(1, path1.length - extname(path1).length);
            const name1 = sanitizeIslandName(baseRoute1);
            const id = name1.toLowerCase();
            if (typeof module1.default !== "function") {
                throw new TypeError(`Islands must default export a component ('${self1}').`);
            }
            islands.push({
                id,
                name: name1,
                url: url1,
                component: module1.default
            });
        }
        const staticFiles = [];
        try {
            const staticFolder = new URL(opts.staticDir ?? "./static", manifest.baseUrl);
            // TODO(lucacasonato): remove the extranious Deno.readDir when
            // https://github.com/denoland/deno_std/issues/1310 is fixed.
            for await (const _ of Deno.readDir(fromFileUrl(staticFolder))){
            // do nothing
            }
            const entires = walk(fromFileUrl(staticFolder), {
                includeFiles: true,
                includeDirs: false,
                followSymlinks: false
            });
            const encoder = new TextEncoder();
            for await (const entry of entires){
                const localUrl = toFileUrl(entry.path);
                const path2 = localUrl.href.substring(staticFolder.href.length);
                const stat = await Deno.stat(localUrl);
                const contentType = typeByExtension(extname(path2)) ?? "application/octet-stream";
                const etag = await crypto.subtle.digest("SHA-1", encoder.encode(BUILD_ID + path2)).then((hash)=>Array.from(new Uint8Array(hash)).map((byte)=>byte.toString(16).padStart(2, "0")).join(""));
                const staticFile = {
                    localUrl,
                    path: path2,
                    size: stat.size,
                    contentType,
                    etag
                };
                staticFiles.push(staticFile);
            }
        } catch (err) {
            if (err instanceof Deno.errors.NotFound) {
            // Do nothing.
            } else {
                throw err;
            }
        }
        return new ServerContext(routes, islands, staticFiles, opts.render ?? DEFAULT_RENDER_FN, middlewares, app, notFound, error, opts.plugins ?? [], importMapURL, jsxConfig);
    }
    /**
   * This functions returns a request handler that handles all routes required
   * by fresh, including static files.
   */ handler() {
        const inner = rutt.router(...this.#handlers());
        const withMiddlewares = this.#composeMiddlewares(this.#middlewares);
        return function handler(req, connInfo) {
            // Redirect requests that end with a trailing slash
            // to their non-trailing slash counterpart.
            // Ex: /about/ -> /about
            const url = new URL(req.url);
            if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
                url.pathname = url.pathname.slice(0, -1);
                return Response.redirect(url.href, Status.TemporaryRedirect);
            }
            return withMiddlewares(req, connInfo, inner);
        };
    }
    /**
   * Identify which middlewares should be applied for a request,
   * chain them and return a handler response
   */ #composeMiddlewares(middlewares) {
        return (req, connInfo, inner)=>{
            // identify middlewares to apply, if any.
            // middlewares should be already sorted from deepest to shallow layer
            const mws = selectMiddlewares(req.url, middlewares);
            const handlers = [];
            const ctx = {
                next () {
                    const handler = handlers.shift();
                    return Promise.resolve(handler());
                },
                ...connInfo,
                state: {}
            };
            for (const mw of mws){
                if (mw.handler instanceof Array) {
                    for (const handler of mw.handler){
                        handlers.push(()=>handler(req, ctx));
                    }
                } else {
                    const handler1 = mw.handler;
                    handlers.push(()=>handler1(req, ctx));
                }
            }
            handlers.push(()=>inner(req, ctx));
            const handler2 = handlers.shift();
            return handler2();
        };
    }
    /**
   * This function returns all routes required by fresh as an extended
   * path-to-regex, to handler mapping.
   */ #handlers() {
        const routes = {};
        routes[`${INTERNAL_PREFIX}${JS_PREFIX}/${BUILD_ID}/:path*`] = this.#bundleAssetRoute();
        if (this.#dev) {
            routes[REFRESH_JS_URL] = ()=>{
                const js = `new EventSource("${ALIVE_URL}").addEventListener("message", function listener(e) { if (e.data !== "${BUILD_ID}") { this.removeEventListener('message', listener); location.reload(); } });`;
                return new Response(js, {
                    headers: {
                        "content-type": "application/javascript; charset=utf-8"
                    }
                });
            };
            routes[ALIVE_URL] = ()=>{
                let timerId = undefined;
                const body = new ReadableStream({
                    start (controller) {
                        controller.enqueue(`data: ${BUILD_ID}\nretry: 100\n\n`);
                        timerId = setInterval(()=>{
                            controller.enqueue(`data: ${BUILD_ID}\n\n`);
                        }, 1000);
                    },
                    cancel () {
                        if (timerId !== undefined) {
                            clearInterval(timerId);
                        }
                    }
                });
                return new Response(body.pipeThrough(new TextEncoderStream()), {
                    headers: {
                        "content-type": "text/event-stream"
                    }
                });
            };
        }
        // Add the static file routes.
        // each files has 2 static routes:
        // - one serving the file at its location without a "cache bursting" mechanism
        // - one containing the BUILD_ID in the path that can be cached
        for (const { localUrl , path , size , contentType , etag  } of this.#staticFiles){
            const route = sanitizePathToRegex(path);
            routes[`GET@${route}`] = this.#staticFileHandler(localUrl, size, contentType, etag);
        }
        const genRender = (route, status)=>{
            const imports = [];
            if (this.#dev) {
                imports.push(REFRESH_JS_URL);
            }
            return (req, params, error)=>{
                return async (data)=>{
                    if (route.component === undefined) {
                        throw new Error("This page does not have a component to render.");
                    }
                    if (typeof route.component === "function" && route.component.constructor.name === "AsyncFunction") {
                        throw new Error("Async components are not supported. Fetch data inside of a route handler, as described in the docs: https://fresh.deno.dev/docs/getting-started/fetching-data");
                    }
                    const preloads = [];
                    const resp = await internalRender({
                        route,
                        islands: this.#islands,
                        plugins: this.#plugins,
                        app: this.#app,
                        imports,
                        preloads,
                        renderFn: this.#renderFn,
                        url: new URL(req.url),
                        params,
                        data,
                        error
                    });
                    const headers = {
                        "content-type": "text/html; charset=utf-8"
                    };
                    const [body, csp] = resp;
                    if (csp) {
                        if (this.#dev) {
                            csp.directives.connectSrc = [
                                ...csp.directives.connectSrc ?? [],
                                SELF
                            ];
                        }
                        const directive = serializeCSPDirectives(csp.directives);
                        if (csp.reportOnly) {
                            headers["content-security-policy-report-only"] = directive;
                        } else {
                            headers["content-security-policy"] = directive;
                        }
                    }
                    return new Response(body, {
                        status,
                        headers
                    });
                };
            };
        };
        const createUnknownRender = genRender(this.#notFound, Status.NotFound);
        for (const route1 of this.#routes){
            const createRender = genRender(route1, Status.OK);
            if (typeof route1.handler === "function") {
                routes[route1.pattern] = (req, ctx, params)=>route1.handler(req, {
                        ...ctx,
                        params,
                        render: createRender(req, params),
                        renderNotFound: createUnknownRender(req, {})
                    });
            } else {
                for (const [method, handler] of Object.entries(route1.handler)){
                    routes[`${method}@${route1.pattern}`] = (req, ctx, params)=>handler(req, {
                            ...ctx,
                            params,
                            render: createRender(req, params),
                            renderNotFound: createUnknownRender(req, {})
                        });
                }
            }
        }
        const unknownHandler = (req, ctx)=>this.#notFound.handler(req, {
                ...ctx,
                render: createUnknownRender(req, {})
            });
        const errorHandlerRender = genRender(this.#error, Status.InternalServerError);
        const errorHandler = (req, ctx, error)=>{
            console.error("%cAn error occurred during route handling or page rendering.", "color:red", error);
            return this.#error.handler(req, {
                ...ctx,
                error,
                render: errorHandlerRender(req, {}, error)
            });
        };
        return [
            routes,
            unknownHandler,
            errorHandler
        ];
    }
    #staticFileHandler(localUrl1, size1, contentType1, etag1) {
        return async (req)=>{
            const url = new URL(req.url);
            const key = url.searchParams.get(ASSET_CACHE_BUST_KEY);
            if (key !== null && BUILD_ID !== key) {
                url.searchParams.delete(ASSET_CACHE_BUST_KEY);
                const location = url.pathname + url.search;
                return new Response("", {
                    status: 307,
                    headers: {
                        "content-type": "text/plain",
                        location
                    }
                });
            }
            const headers = new Headers({
                "content-type": contentType1,
                etag: etag1,
                vary: "If-None-Match"
            });
            if (key !== null) {
                headers.set("Cache-Control", "public, max-age=31536000, immutable");
            }
            const ifNoneMatch = req.headers.get("if-none-match");
            if (ifNoneMatch === etag1 || ifNoneMatch === "W/" + etag1) {
                return new Response(null, {
                    status: 304,
                    headers
                });
            } else {
                const file = await Deno.open(localUrl1);
                headers.set("content-length", String(size1));
                return new Response(file.readable, {
                    headers
                });
            }
        };
    }
    /**
   * Returns a router that contains all fresh routes. Should be mounted at
   * constants.INTERNAL_PREFIX
   */ #bundleAssetRoute = ()=>{
        return async (_req, _ctx, params)=>{
            const path = `/${params.path}`;
            const file = await this.#bundler.get(path);
            let res;
            if (file) {
                const headers = new Headers({
                    "Cache-Control": "public, max-age=604800, immutable"
                });
                const contentType = typeByExtension(extname(path));
                if (contentType) {
                    headers.set("Content-Type", contentType);
                }
                res = new Response(file, {
                    status: 200,
                    headers
                });
            }
            return res ?? new Response(null, {
                status: 404
            });
        };
    };
}
const DEFAULT_RENDER_FN = (_ctx, render)=>{
    render();
};
const DEFAULT_APP = {
    default: ({ Component  })=>h(Component, {})
};
const DEFAULT_NOT_FOUND = {
    pattern: "",
    url: "",
    name: "_404",
    handler: (req)=>rutt.defaultOtherHandler(req),
    csp: false
};
const DEFAULT_ERROR = {
    pattern: "",
    url: "",
    name: "_500",
    component: DefaultErrorHandler,
    handler: (_req, ctx)=>ctx.render(),
    csp: false
};
/**
 * Return a list of middlewares that needs to be applied for request url
 * @param url the request url
 * @param middlewares Array of middlewares handlers and their routes as path-to-regexp style
 */ export function selectMiddlewares(url, middlewares) {
    const selectedMws = [];
    const reqURL = new URL(url);
    for (const { compiledPattern , handler  } of middlewares){
        const res = compiledPattern.exec(reqURL);
        if (res) {
            selectedMws.push({
                handler
            });
        }
    }
    return selectedMws;
}
/**
 * Sort pages by their relative routing priority, based on the parts in the
 * route matcher
 */ function sortRoutes(routes) {
    routes.sort((a, b)=>{
        const partsA = a.pattern.split("/");
        const partsB = b.pattern.split("/");
        for(let i = 0; i < Math.max(partsA.length, partsB.length); i++){
            const partA = partsA[i];
            const partB = partsB[i];
            if (partA === undefined) return -1;
            if (partB === undefined) return 1;
            if (partA === partB) continue;
            const priorityA = partA.startsWith(":") ? partA.endsWith("*") ? 0 : 1 : 2;
            const priorityB = partB.startsWith(":") ? partB.endsWith("*") ? 0 : 1 : 2;
            return Math.max(Math.min(priorityB - priorityA, 1), -1);
        }
        return 0;
    });
}
/** Transform a filesystem URL path to a `path-to-regex` style matcher. */ function pathToPattern(path) {
    const parts = path.split("/");
    if (parts[parts.length - 1] === "index") {
        parts.pop();
    }
    const route = "/" + parts.map((part)=>{
        if (part.startsWith("[...") && part.endsWith("]")) {
            return `:${part.slice(4, part.length - 1)}*`;
        }
        if (part.startsWith("[") && part.endsWith("]")) {
            return `:${part.slice(1, part.length - 1)}`;
        }
        return part;
    }).join("/");
    return route;
}
// Normalize a path for use in a URL. Returns null if the path is unparsable.
export function normalizeURLPath(path) {
    try {
        const pathUrl = new URL("file:///");
        pathUrl.pathname = path;
        return pathUrl.pathname;
    } catch  {
        return null;
    }
}
function sanitizePathToRegex(path) {
    return path.replaceAll("\*", "\\*").replaceAll("\+", "\\+").replaceAll("\?", "\\?").replaceAll("\{", "\\{").replaceAll("\}", "\\}").replaceAll("\(", "\\(").replaceAll("\)", "\\)").replaceAll("\:", "\\:");
}
function toPascalCase(text) {
    return text.replace(/(^\w|-\w)/g, (substring)=>substring.replace(/-/, "").toUpperCase());
}
function sanitizeIslandName(name) {
    const fileName = name.replace("/", "");
    return toPascalCase(fileName);
}
function serializeCSPDirectives(csp) {
    return Object.entries(csp).filter(([_key, value])=>value !== undefined).map(([k, v])=>{
        // Turn camel case into snake case.
        const key = k.replace(/[A-Z]/g, (m)=>`-${m.toLowerCase()}`);
        const value = Array.isArray(v) ? v.join(" ") : v;
        return `${key} ${value}`;
    }).join("; ");
}
export function middlewarePathToPattern(baseRoute) {
    baseRoute = baseRoute.slice(0, -"_middleware".length);
    let pattern = pathToPattern(baseRoute);
    if (pattern.endsWith("/")) {
        pattern = pattern.slice(0, -1) + "{/*}?";
    }
    const compiledPattern = new URLPattern({
        pathname: pattern
    });
    return {
        pattern,
        compiledPattern
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4xLjIvc3JjL3NlcnZlci9jb250ZXh0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbm5JbmZvLFxuICBleHRuYW1lLFxuICBmcm9tRmlsZVVybCxcbiAgUmVxdWVzdEhhbmRsZXIsXG4gIHJ1dHQsXG4gIFN0YXR1cyxcbiAgdG9GaWxlVXJsLFxuICB0eXBlQnlFeHRlbnNpb24sXG4gIHdhbGssXG59IGZyb20gXCIuL2RlcHMudHNcIjtcbmltcG9ydCB7IGggfSBmcm9tIFwicHJlYWN0XCI7XG5pbXBvcnQgeyBNYW5pZmVzdCB9IGZyb20gXCIuL21vZC50c1wiO1xuaW1wb3J0IHsgQnVuZGxlciwgSlNYQ29uZmlnIH0gZnJvbSBcIi4vYnVuZGxlLnRzXCI7XG5pbXBvcnQgeyBBTElWRV9VUkwsIEJVSUxEX0lELCBKU19QUkVGSVgsIFJFRlJFU0hfSlNfVVJMIH0gZnJvbSBcIi4vY29uc3RhbnRzLnRzXCI7XG5pbXBvcnQgRGVmYXVsdEVycm9ySGFuZGxlciBmcm9tIFwiLi9kZWZhdWx0X2Vycm9yX3BhZ2UudHNcIjtcbmltcG9ydCB7XG4gIEFwcE1vZHVsZSxcbiAgRXJyb3JQYWdlLFxuICBFcnJvclBhZ2VNb2R1bGUsXG4gIEZyZXNoT3B0aW9ucyxcbiAgSGFuZGxlcixcbiAgSXNsYW5kLFxuICBNaWRkbGV3YXJlLFxuICBNaWRkbGV3YXJlTW9kdWxlLFxuICBNaWRkbGV3YXJlUm91dGUsXG4gIFBsdWdpbixcbiAgUmVuZGVyRnVuY3Rpb24sXG4gIFJvdXRlLFxuICBSb3V0ZU1vZHVsZSxcbiAgVW5rbm93blBhZ2UsXG4gIFVua25vd25QYWdlTW9kdWxlLFxufSBmcm9tIFwiLi90eXBlcy50c1wiO1xuaW1wb3J0IHsgcmVuZGVyIGFzIGludGVybmFsUmVuZGVyIH0gZnJvbSBcIi4vcmVuZGVyLnRzXCI7XG5pbXBvcnQgeyBDb250ZW50U2VjdXJpdHlQb2xpY3lEaXJlY3RpdmVzLCBTRUxGIH0gZnJvbSBcIi4uL3J1bnRpbWUvY3NwLnRzXCI7XG5pbXBvcnQgeyBBU1NFVF9DQUNIRV9CVVNUX0tFWSwgSU5URVJOQUxfUFJFRklYIH0gZnJvbSBcIi4uL3J1bnRpbWUvdXRpbHMudHNcIjtcbmludGVyZmFjZSBSb3V0ZXJTdGF0ZSB7XG4gIHN0YXRlOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuaW50ZXJmYWNlIFN0YXRpY0ZpbGUge1xuICAvKiogVGhlIFVSTCB0byB0aGUgc3RhdGljIGZpbGUgb24gZGlzay4gKi9cbiAgbG9jYWxVcmw6IFVSTDtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoZSBmaWxlIGFzIGl0IHdvdWxkIGJlIGluIHRoZSBpbmNvbWluZyByZXF1ZXN0LiAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKiBUaGUgc2l6ZSBvZiB0aGUgZmlsZS4gKi9cbiAgc2l6ZTogbnVtYmVyO1xuICAvKiogVGhlIGNvbnRlbnQtdHlwZSBvZiB0aGUgZmlsZS4gKi9cbiAgY29udGVudFR5cGU6IHN0cmluZztcbiAgLyoqIEhhc2ggb2YgdGhlIGZpbGUgY29udGVudHMuICovXG4gIGV0YWc6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFNlcnZlckNvbnRleHQge1xuICAjZGV2OiBib29sZWFuO1xuICAjcm91dGVzOiBSb3V0ZVtdO1xuICAjaXNsYW5kczogSXNsYW5kW107XG4gICNzdGF0aWNGaWxlczogU3RhdGljRmlsZVtdO1xuICAjYnVuZGxlcjogQnVuZGxlcjtcbiAgI3JlbmRlckZuOiBSZW5kZXJGdW5jdGlvbjtcbiAgI21pZGRsZXdhcmVzOiBNaWRkbGV3YXJlUm91dGVbXTtcbiAgI2FwcDogQXBwTW9kdWxlO1xuICAjbm90Rm91bmQ6IFVua25vd25QYWdlO1xuICAjZXJyb3I6IEVycm9yUGFnZTtcbiAgI3BsdWdpbnM6IFBsdWdpbltdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHJvdXRlczogUm91dGVbXSxcbiAgICBpc2xhbmRzOiBJc2xhbmRbXSxcbiAgICBzdGF0aWNGaWxlczogU3RhdGljRmlsZVtdLFxuICAgIHJlbmRlcmZuOiBSZW5kZXJGdW5jdGlvbixcbiAgICBtaWRkbGV3YXJlczogTWlkZGxld2FyZVJvdXRlW10sXG4gICAgYXBwOiBBcHBNb2R1bGUsXG4gICAgbm90Rm91bmQ6IFVua25vd25QYWdlLFxuICAgIGVycm9yOiBFcnJvclBhZ2UsXG4gICAgcGx1Z2luczogUGx1Z2luW10sXG4gICAgaW1wb3J0TWFwVVJMOiBVUkwsXG4gICAganN4Q29uZmlnOiBKU1hDb25maWcsXG4gICkge1xuICAgIHRoaXMuI3JvdXRlcyA9IHJvdXRlcztcbiAgICB0aGlzLiNpc2xhbmRzID0gaXNsYW5kcztcbiAgICB0aGlzLiNzdGF0aWNGaWxlcyA9IHN0YXRpY0ZpbGVzO1xuICAgIHRoaXMuI3JlbmRlckZuID0gcmVuZGVyZm47XG4gICAgdGhpcy4jbWlkZGxld2FyZXMgPSBtaWRkbGV3YXJlcztcbiAgICB0aGlzLiNhcHAgPSBhcHA7XG4gICAgdGhpcy4jbm90Rm91bmQgPSBub3RGb3VuZDtcbiAgICB0aGlzLiNlcnJvciA9IGVycm9yO1xuICAgIHRoaXMuI3BsdWdpbnMgPSBwbHVnaW5zO1xuICAgIHRoaXMuI2RldiA9IHR5cGVvZiBEZW5vLmVudi5nZXQoXCJERU5PX0RFUExPWU1FTlRfSURcIikgIT09IFwic3RyaW5nXCI7IC8vIEVudiB2YXIgaXMgb25seSBzZXQgaW4gcHJvZCAob24gRGVwbG95KS5cbiAgICB0aGlzLiNidW5kbGVyID0gbmV3IEJ1bmRsZXIoXG4gICAgICB0aGlzLiNpc2xhbmRzLFxuICAgICAgdGhpcy4jcGx1Z2lucyxcbiAgICAgIGltcG9ydE1hcFVSTCxcbiAgICAgIGpzeENvbmZpZyxcbiAgICAgIHRoaXMuI2RldixcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgdGhlIG1hbmlmZXN0IGludG8gaW5kaXZpZHVhbCBjb21wb25lbnRzIGFuZCBwYWdlcy5cbiAgICovXG4gIHN0YXRpYyBhc3luYyBmcm9tTWFuaWZlc3QoXG4gICAgbWFuaWZlc3Q6IE1hbmlmZXN0LFxuICAgIG9wdHM6IEZyZXNoT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxTZXJ2ZXJDb250ZXh0PiB7XG4gICAgLy8gR2V0IHRoZSBtYW5pZmVzdCcgYmFzZSBVUkwuXG4gICAgY29uc3QgYmFzZVVybCA9IG5ldyBVUkwoXCIuL1wiLCBtYW5pZmVzdC5iYXNlVXJsKS5ocmVmO1xuXG4gICAgY29uc3QgY29uZmlnID0gbWFuaWZlc3QuY29uZmlnIHx8IHsgaW1wb3J0TWFwOiBcIi4vaW1wb3J0X21hcC5qc29uXCIgfTtcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5pbXBvcnRNYXAgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImRlbm8uanNvbiBtdXN0IGNvbnRhaW4gYW4gJ2ltcG9ydE1hcCcgcHJvcGVydHkuXCIpO1xuICAgIH1cbiAgICBjb25zdCBpbXBvcnRNYXBVUkwgPSBuZXcgVVJMKGNvbmZpZy5pbXBvcnRNYXAsIG1hbmlmZXN0LmJhc2VVcmwpO1xuXG4gICAgY29uZmlnLmNvbXBpbGVyT3B0aW9ucyA/Pz0ge307XG5cbiAgICBsZXQganN4OiBcInJlYWN0XCIgfCBcInJlYWN0LWpzeFwiO1xuICAgIHN3aXRjaCAoY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5qc3gpIHtcbiAgICAgIGNhc2UgXCJyZWFjdFwiOlxuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIGpzeCA9IFwicmVhY3RcIjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwicmVhY3QtanN4XCI6XG4gICAgICAgIGpzeCA9IFwicmVhY3QtanN4XCI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBqc3ggb3B0aW9uOiBcIiArIGNvbmZpZy5jb21waWxlck9wdGlvbnMuanN4KTtcbiAgICB9XG5cbiAgICBjb25zdCBqc3hDb25maWc6IEpTWENvbmZpZyA9IHtcbiAgICAgIGpzeCxcbiAgICAgIGpzeEltcG9ydFNvdXJjZTogY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5qc3hJbXBvcnRTb3VyY2UsXG4gICAgfTtcblxuICAgIC8vIEV4dHJhY3QgYWxsIHJvdXRlcywgYW5kIHByZXBhcmUgdGhlbSBpbnRvIHRoZSBgUGFnZWAgc3RydWN0dXJlLlxuICAgIGNvbnN0IHJvdXRlczogUm91dGVbXSA9IFtdO1xuICAgIGNvbnN0IGlzbGFuZHM6IElzbGFuZFtdID0gW107XG4gICAgY29uc3QgbWlkZGxld2FyZXM6IE1pZGRsZXdhcmVSb3V0ZVtdID0gW107XG4gICAgbGV0IGFwcDogQXBwTW9kdWxlID0gREVGQVVMVF9BUFA7XG4gICAgbGV0IG5vdEZvdW5kOiBVbmtub3duUGFnZSA9IERFRkFVTFRfTk9UX0ZPVU5EO1xuICAgIGxldCBlcnJvcjogRXJyb3JQYWdlID0gREVGQVVMVF9FUlJPUjtcbiAgICBmb3IgKGNvbnN0IFtzZWxmLCBtb2R1bGVdIG9mIE9iamVjdC5lbnRyaWVzKG1hbmlmZXN0LnJvdXRlcykpIHtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoc2VsZiwgYmFzZVVybCkuaHJlZjtcbiAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoYmFzZVVybCArIFwicm91dGVzXCIpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQYWdlIGlzIG5vdCBhIGNoaWxkIG9mIHRoZSBiYXNlcGF0aC5cIik7XG4gICAgICB9XG4gICAgICBjb25zdCBwYXRoID0gdXJsLnN1YnN0cmluZyhiYXNlVXJsLmxlbmd0aCkuc3Vic3RyaW5nKFwicm91dGVzXCIubGVuZ3RoKTtcbiAgICAgIGNvbnN0IGJhc2VSb3V0ZSA9IHBhdGguc3Vic3RyaW5nKDEsIHBhdGgubGVuZ3RoIC0gZXh0bmFtZShwYXRoKS5sZW5ndGgpO1xuICAgICAgY29uc3QgbmFtZSA9IGJhc2VSb3V0ZS5yZXBsYWNlKFwiL1wiLCBcIi1cIik7XG4gICAgICBjb25zdCBpc01pZGRsZXdhcmUgPSBwYXRoLmVuZHNXaXRoKFwiL19taWRkbGV3YXJlLnRzeFwiKSB8fFxuICAgICAgICBwYXRoLmVuZHNXaXRoKFwiL19taWRkbGV3YXJlLnRzXCIpIHx8IHBhdGguZW5kc1dpdGgoXCIvX21pZGRsZXdhcmUuanN4XCIpIHx8XG4gICAgICAgIHBhdGguZW5kc1dpdGgoXCIvX21pZGRsZXdhcmUuanNcIik7XG4gICAgICBpZiAoIXBhdGguc3RhcnRzV2l0aChcIi9fXCIpICYmICFpc01pZGRsZXdhcmUpIHtcbiAgICAgICAgY29uc3QgeyBkZWZhdWx0OiBjb21wb25lbnQsIGNvbmZpZyB9ID0gKG1vZHVsZSBhcyBSb3V0ZU1vZHVsZSk7XG4gICAgICAgIGxldCBwYXR0ZXJuID0gcGF0aFRvUGF0dGVybihiYXNlUm91dGUpO1xuICAgICAgICBpZiAoY29uZmlnPy5yb3V0ZU92ZXJyaWRlKSB7XG4gICAgICAgICAgcGF0dGVybiA9IFN0cmluZyhjb25maWcucm91dGVPdmVycmlkZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHsgaGFuZGxlciB9ID0gKG1vZHVsZSBhcyBSb3V0ZU1vZHVsZSk7XG4gICAgICAgIGhhbmRsZXIgPz89IHt9O1xuICAgICAgICBpZiAoXG4gICAgICAgICAgY29tcG9uZW50ICYmXG4gICAgICAgICAgdHlwZW9mIGhhbmRsZXIgPT09IFwib2JqZWN0XCIgJiYgaGFuZGxlci5HRVQgPT09IHVuZGVmaW5lZFxuICAgICAgICApIHtcbiAgICAgICAgICBoYW5kbGVyLkdFVCA9IChfcmVxLCB7IHJlbmRlciB9KSA9PiByZW5kZXIoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByb3V0ZTogUm91dGUgPSB7XG4gICAgICAgICAgcGF0dGVybixcbiAgICAgICAgICB1cmwsXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBjb21wb25lbnQsXG4gICAgICAgICAgaGFuZGxlcixcbiAgICAgICAgICBjc3A6IEJvb2xlYW4oY29uZmlnPy5jc3AgPz8gZmFsc2UpLFxuICAgICAgICB9O1xuICAgICAgICByb3V0ZXMucHVzaChyb3V0ZSk7XG4gICAgICB9IGVsc2UgaWYgKGlzTWlkZGxld2FyZSkge1xuICAgICAgICBtaWRkbGV3YXJlcy5wdXNoKHtcbiAgICAgICAgICAuLi5taWRkbGV3YXJlUGF0aFRvUGF0dGVybihiYXNlUm91dGUpLFxuICAgICAgICAgIC4uLm1vZHVsZSBhcyBNaWRkbGV3YXJlTW9kdWxlLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHBhdGggPT09IFwiL19hcHAudHN4XCIgfHwgcGF0aCA9PT0gXCIvX2FwcC50c1wiIHx8XG4gICAgICAgIHBhdGggPT09IFwiL19hcHAuanN4XCIgfHwgcGF0aCA9PT0gXCIvX2FwcC5qc1wiXG4gICAgICApIHtcbiAgICAgICAgYXBwID0gbW9kdWxlIGFzIEFwcE1vZHVsZTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHBhdGggPT09IFwiL180MDQudHN4XCIgfHwgcGF0aCA9PT0gXCIvXzQwNC50c1wiIHx8XG4gICAgICAgIHBhdGggPT09IFwiL180MDQuanN4XCIgfHwgcGF0aCA9PT0gXCIvXzQwNC5qc1wiXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgeyBkZWZhdWx0OiBjb21wb25lbnQsIGNvbmZpZyB9ID0gKG1vZHVsZSBhcyBVbmtub3duUGFnZU1vZHVsZSk7XG4gICAgICAgIGxldCB7IGhhbmRsZXIgfSA9IChtb2R1bGUgYXMgVW5rbm93blBhZ2VNb2R1bGUpO1xuICAgICAgICBpZiAoY29tcG9uZW50ICYmIGhhbmRsZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGhhbmRsZXIgPSAoX3JlcSwgeyByZW5kZXIgfSkgPT4gcmVuZGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBub3RGb3VuZCA9IHtcbiAgICAgICAgICBwYXR0ZXJuOiBwYXRoVG9QYXR0ZXJuKGJhc2VSb3V0ZSksXG4gICAgICAgICAgdXJsLFxuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgY29tcG9uZW50LFxuICAgICAgICAgIGhhbmRsZXI6IGhhbmRsZXIgPz8gKChyZXEpID0+IHJ1dHQuZGVmYXVsdE90aGVySGFuZGxlcihyZXEpKSxcbiAgICAgICAgICBjc3A6IEJvb2xlYW4oY29uZmlnPy5jc3AgPz8gZmFsc2UpLFxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgcGF0aCA9PT0gXCIvXzUwMC50c3hcIiB8fCBwYXRoID09PSBcIi9fNTAwLnRzXCIgfHxcbiAgICAgICAgcGF0aCA9PT0gXCIvXzUwMC5qc3hcIiB8fCBwYXRoID09PSBcIi9fNTAwLmpzXCJcbiAgICAgICkge1xuICAgICAgICBjb25zdCB7IGRlZmF1bHQ6IGNvbXBvbmVudCwgY29uZmlnIH0gPSAobW9kdWxlIGFzIEVycm9yUGFnZU1vZHVsZSk7XG4gICAgICAgIGxldCB7IGhhbmRsZXIgfSA9IChtb2R1bGUgYXMgRXJyb3JQYWdlTW9kdWxlKTtcbiAgICAgICAgaWYgKGNvbXBvbmVudCAmJiBoYW5kbGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBoYW5kbGVyID0gKF9yZXEsIHsgcmVuZGVyIH0pID0+IHJlbmRlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXJyb3IgPSB7XG4gICAgICAgICAgcGF0dGVybjogcGF0aFRvUGF0dGVybihiYXNlUm91dGUpLFxuICAgICAgICAgIHVybCxcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIGNvbXBvbmVudCxcbiAgICAgICAgICBoYW5kbGVyOiBoYW5kbGVyID8/XG4gICAgICAgICAgICAoKHJlcSwgY3R4KSA9PiBydXR0LmRlZmF1bHRFcnJvckhhbmRsZXIocmVxLCBjdHgsIGN0eC5lcnJvcikpLFxuICAgICAgICAgIGNzcDogQm9vbGVhbihjb25maWc/LmNzcCA/PyBmYWxzZSksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRSb3V0ZXMocm91dGVzKTtcbiAgICBzb3J0Um91dGVzKG1pZGRsZXdhcmVzKTtcblxuICAgIGZvciAoY29uc3QgW3NlbGYsIG1vZHVsZV0gb2YgT2JqZWN0LmVudHJpZXMobWFuaWZlc3QuaXNsYW5kcykpIHtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoc2VsZiwgYmFzZVVybCkuaHJlZjtcbiAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoYmFzZVVybCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIklzbGFuZCBpcyBub3QgYSBjaGlsZCBvZiB0aGUgYmFzZXBhdGguXCIpO1xuICAgICAgfVxuICAgICAgY29uc3QgcGF0aCA9IHVybC5zdWJzdHJpbmcoYmFzZVVybC5sZW5ndGgpLnN1YnN0cmluZyhcImlzbGFuZHNcIi5sZW5ndGgpO1xuICAgICAgY29uc3QgYmFzZVJvdXRlID0gcGF0aC5zdWJzdHJpbmcoMSwgcGF0aC5sZW5ndGggLSBleHRuYW1lKHBhdGgpLmxlbmd0aCk7XG4gICAgICBjb25zdCBuYW1lID0gc2FuaXRpemVJc2xhbmROYW1lKGJhc2VSb3V0ZSk7XG4gICAgICBjb25zdCBpZCA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmICh0eXBlb2YgbW9kdWxlLmRlZmF1bHQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGBJc2xhbmRzIG11c3QgZGVmYXVsdCBleHBvcnQgYSBjb21wb25lbnQgKCcke3NlbGZ9JykuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGlzbGFuZHMucHVzaCh7IGlkLCBuYW1lLCB1cmwsIGNvbXBvbmVudDogbW9kdWxlLmRlZmF1bHQgfSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdGljRmlsZXM6IFN0YXRpY0ZpbGVbXSA9IFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0aWNGb2xkZXIgPSBuZXcgVVJMKFxuICAgICAgICBvcHRzLnN0YXRpY0RpciA/PyBcIi4vc3RhdGljXCIsXG4gICAgICAgIG1hbmlmZXN0LmJhc2VVcmwsXG4gICAgICApO1xuICAgICAgLy8gVE9ETyhsdWNhY2Fzb25hdG8pOiByZW1vdmUgdGhlIGV4dHJhbmlvdXMgRGVuby5yZWFkRGlyIHdoZW5cbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kZW5vbGFuZC9kZW5vX3N0ZC9pc3N1ZXMvMTMxMCBpcyBmaXhlZC5cbiAgICAgIGZvciBhd2FpdCAoY29uc3QgXyBvZiBEZW5vLnJlYWREaXIoZnJvbUZpbGVVcmwoc3RhdGljRm9sZGVyKSkpIHtcbiAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgfVxuICAgICAgY29uc3QgZW50aXJlcyA9IHdhbGsoZnJvbUZpbGVVcmwoc3RhdGljRm9sZGVyKSwge1xuICAgICAgICBpbmNsdWRlRmlsZXM6IHRydWUsXG4gICAgICAgIGluY2x1ZGVEaXJzOiBmYWxzZSxcbiAgICAgICAgZm9sbG93U3ltbGlua3M6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgICBmb3IgYXdhaXQgKGNvbnN0IGVudHJ5IG9mIGVudGlyZXMpIHtcbiAgICAgICAgY29uc3QgbG9jYWxVcmwgPSB0b0ZpbGVVcmwoZW50cnkucGF0aCk7XG4gICAgICAgIGNvbnN0IHBhdGggPSBsb2NhbFVybC5ocmVmLnN1YnN0cmluZyhzdGF0aWNGb2xkZXIuaHJlZi5sZW5ndGgpO1xuICAgICAgICBjb25zdCBzdGF0ID0gYXdhaXQgRGVuby5zdGF0KGxvY2FsVXJsKTtcbiAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSB0eXBlQnlFeHRlbnNpb24oZXh0bmFtZShwYXRoKSkgPz9cbiAgICAgICAgICBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiO1xuICAgICAgICBjb25zdCBldGFnID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXG4gICAgICAgICAgXCJTSEEtMVwiLFxuICAgICAgICAgIGVuY29kZXIuZW5jb2RlKEJVSUxEX0lEICsgcGF0aCksXG4gICAgICAgICkudGhlbigoaGFzaCkgPT5cbiAgICAgICAgICBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGhhc2gpKVxuICAgICAgICAgICAgLm1hcCgoYnl0ZSkgPT4gYnl0ZS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpKVxuICAgICAgICAgICAgLmpvaW4oXCJcIilcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3Qgc3RhdGljRmlsZTogU3RhdGljRmlsZSA9IHtcbiAgICAgICAgICBsb2NhbFVybCxcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIHNpemU6IHN0YXQuc2l6ZSxcbiAgICAgICAgICBjb250ZW50VHlwZSxcbiAgICAgICAgICBldGFnLFxuICAgICAgICB9O1xuICAgICAgICBzdGF0aWNGaWxlcy5wdXNoKHN0YXRpY0ZpbGUpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSB7XG4gICAgICAgIC8vIERvIG5vdGhpbmcuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBTZXJ2ZXJDb250ZXh0KFxuICAgICAgcm91dGVzLFxuICAgICAgaXNsYW5kcyxcbiAgICAgIHN0YXRpY0ZpbGVzLFxuICAgICAgb3B0cy5yZW5kZXIgPz8gREVGQVVMVF9SRU5ERVJfRk4sXG4gICAgICBtaWRkbGV3YXJlcyxcbiAgICAgIGFwcCxcbiAgICAgIG5vdEZvdW5kLFxuICAgICAgZXJyb3IsXG4gICAgICBvcHRzLnBsdWdpbnMgPz8gW10sXG4gICAgICBpbXBvcnRNYXBVUkwsXG4gICAgICBqc3hDb25maWcsXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGZ1bmN0aW9ucyByZXR1cm5zIGEgcmVxdWVzdCBoYW5kbGVyIHRoYXQgaGFuZGxlcyBhbGwgcm91dGVzIHJlcXVpcmVkXG4gICAqIGJ5IGZyZXNoLCBpbmNsdWRpbmcgc3RhdGljIGZpbGVzLlxuICAgKi9cbiAgaGFuZGxlcigpOiBSZXF1ZXN0SGFuZGxlciB7XG4gICAgY29uc3QgaW5uZXIgPSBydXR0LnJvdXRlcjxSb3V0ZXJTdGF0ZT4oLi4udGhpcy4jaGFuZGxlcnMoKSk7XG4gICAgY29uc3Qgd2l0aE1pZGRsZXdhcmVzID0gdGhpcy4jY29tcG9zZU1pZGRsZXdhcmVzKHRoaXMuI21pZGRsZXdhcmVzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gaGFuZGxlcihyZXE6IFJlcXVlc3QsIGNvbm5JbmZvOiBDb25uSW5mbykge1xuICAgICAgLy8gUmVkaXJlY3QgcmVxdWVzdHMgdGhhdCBlbmQgd2l0aCBhIHRyYWlsaW5nIHNsYXNoXG4gICAgICAvLyB0byB0aGVpciBub24tdHJhaWxpbmcgc2xhc2ggY291bnRlcnBhcnQuXG4gICAgICAvLyBFeDogL2Fib3V0LyAtPiAvYWJvdXRcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCk7XG4gICAgICBpZiAodXJsLnBhdGhuYW1lLmxlbmd0aCA+IDEgJiYgdXJsLnBhdGhuYW1lLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICB1cmwucGF0aG5hbWUgPSB1cmwucGF0aG5hbWUuc2xpY2UoMCwgLTEpO1xuICAgICAgICByZXR1cm4gUmVzcG9uc2UucmVkaXJlY3QodXJsLmhyZWYsIFN0YXR1cy5UZW1wb3JhcnlSZWRpcmVjdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gd2l0aE1pZGRsZXdhcmVzKHJlcSwgY29ubkluZm8sIGlubmVyKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIElkZW50aWZ5IHdoaWNoIG1pZGRsZXdhcmVzIHNob3VsZCBiZSBhcHBsaWVkIGZvciBhIHJlcXVlc3QsXG4gICAqIGNoYWluIHRoZW0gYW5kIHJldHVybiBhIGhhbmRsZXIgcmVzcG9uc2VcbiAgICovXG4gICNjb21wb3NlTWlkZGxld2FyZXMobWlkZGxld2FyZXM6IE1pZGRsZXdhcmVSb3V0ZVtdKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHJlcTogUmVxdWVzdCxcbiAgICAgIGNvbm5JbmZvOiBDb25uSW5mbyxcbiAgICAgIGlubmVyOiBydXR0LkhhbmRsZXI8Um91dGVyU3RhdGU+LFxuICAgICkgPT4ge1xuICAgICAgLy8gaWRlbnRpZnkgbWlkZGxld2FyZXMgdG8gYXBwbHksIGlmIGFueS5cbiAgICAgIC8vIG1pZGRsZXdhcmVzIHNob3VsZCBiZSBhbHJlYWR5IHNvcnRlZCBmcm9tIGRlZXBlc3QgdG8gc2hhbGxvdyBsYXllclxuICAgICAgY29uc3QgbXdzID0gc2VsZWN0TWlkZGxld2FyZXMocmVxLnVybCwgbWlkZGxld2FyZXMpO1xuXG4gICAgICBjb25zdCBoYW5kbGVyczogKCgpID0+IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT4pW10gPSBbXTtcblxuICAgICAgY29uc3QgY3R4ID0ge1xuICAgICAgICBuZXh0KCkge1xuICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVycy5zaGlmdCgpITtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGhhbmRsZXIoKSk7XG4gICAgICAgIH0sXG4gICAgICAgIC4uLmNvbm5JbmZvLFxuICAgICAgICBzdGF0ZToge30sXG4gICAgICB9O1xuXG4gICAgICBmb3IgKGNvbnN0IG13IG9mIG13cykge1xuICAgICAgICBpZiAobXcuaGFuZGxlciBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIG13LmhhbmRsZXIpIHtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goKCkgPT4gaGFuZGxlcihyZXEsIGN0eCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBoYW5kbGVyID0gbXcuaGFuZGxlcjtcbiAgICAgICAgICBoYW5kbGVycy5wdXNoKCgpID0+IGhhbmRsZXIocmVxLCBjdHgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBoYW5kbGVycy5wdXNoKCgpID0+IGlubmVyKHJlcSwgY3R4KSk7XG5cbiAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVycy5zaGlmdCgpITtcbiAgICAgIHJldHVybiBoYW5kbGVyKCk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGZ1bmN0aW9uIHJldHVybnMgYWxsIHJvdXRlcyByZXF1aXJlZCBieSBmcmVzaCBhcyBhbiBleHRlbmRlZFxuICAgKiBwYXRoLXRvLXJlZ2V4LCB0byBoYW5kbGVyIG1hcHBpbmcuXG4gICAqL1xuICAjaGFuZGxlcnMoKTogW1xuICAgIHJ1dHQuUm91dGVzPFJvdXRlclN0YXRlPixcbiAgICBydXR0LkhhbmRsZXI8Um91dGVyU3RhdGU+LFxuICAgIHJ1dHQuRXJyb3JIYW5kbGVyPFJvdXRlclN0YXRlPixcbiAgXSB7XG4gICAgY29uc3Qgcm91dGVzOiBydXR0LlJvdXRlczxSb3V0ZXJTdGF0ZT4gPSB7fTtcblxuICAgIHJvdXRlc1tgJHtJTlRFUk5BTF9QUkVGSVh9JHtKU19QUkVGSVh9LyR7QlVJTERfSUR9LzpwYXRoKmBdID0gdGhpc1xuICAgICAgLiNidW5kbGVBc3NldFJvdXRlKCk7XG5cbiAgICBpZiAodGhpcy4jZGV2KSB7XG4gICAgICByb3V0ZXNbUkVGUkVTSF9KU19VUkxdID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBqcyA9XG4gICAgICAgICAgYG5ldyBFdmVudFNvdXJjZShcIiR7QUxJVkVfVVJMfVwiKS5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbiBsaXN0ZW5lcihlKSB7IGlmIChlLmRhdGEgIT09IFwiJHtCVUlMRF9JRH1cIikgeyB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBsaXN0ZW5lcik7IGxvY2F0aW9uLnJlbG9hZCgpOyB9IH0pO2A7XG4gICAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoanMsIHtcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2phdmFzY3JpcHQ7IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICByb3V0ZXNbQUxJVkVfVVJMXSA9ICgpID0+IHtcbiAgICAgICAgbGV0IHRpbWVySWQ6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgYm9keSA9IG5ldyBSZWFkYWJsZVN0cmVhbSh7XG4gICAgICAgICAgc3RhcnQoY29udHJvbGxlcikge1xuICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGBkYXRhOiAke0JVSUxEX0lEfVxcbnJldHJ5OiAxMDBcXG5cXG5gKTtcbiAgICAgICAgICAgIHRpbWVySWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShgZGF0YTogJHtCVUlMRF9JRH1cXG5cXG5gKTtcbiAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY2FuY2VsKCkge1xuICAgICAgICAgICAgaWYgKHRpbWVySWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVySWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKGJvZHkucGlwZVRocm91Z2gobmV3IFRleHRFbmNvZGVyU3RyZWFtKCkpLCB7XG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJjb250ZW50LXR5cGVcIjogXCJ0ZXh0L2V2ZW50LXN0cmVhbVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIHN0YXRpYyBmaWxlIHJvdXRlcy5cbiAgICAvLyBlYWNoIGZpbGVzIGhhcyAyIHN0YXRpYyByb3V0ZXM6XG4gICAgLy8gLSBvbmUgc2VydmluZyB0aGUgZmlsZSBhdCBpdHMgbG9jYXRpb24gd2l0aG91dCBhIFwiY2FjaGUgYnVyc3RpbmdcIiBtZWNoYW5pc21cbiAgICAvLyAtIG9uZSBjb250YWluaW5nIHRoZSBCVUlMRF9JRCBpbiB0aGUgcGF0aCB0aGF0IGNhbiBiZSBjYWNoZWRcbiAgICBmb3IgKFxuICAgICAgY29uc3QgeyBsb2NhbFVybCwgcGF0aCwgc2l6ZSwgY29udGVudFR5cGUsIGV0YWcgfSBvZiB0aGlzLiNzdGF0aWNGaWxlc1xuICAgICkge1xuICAgICAgY29uc3Qgcm91dGUgPSBzYW5pdGl6ZVBhdGhUb1JlZ2V4KHBhdGgpO1xuICAgICAgcm91dGVzW2BHRVRAJHtyb3V0ZX1gXSA9IHRoaXMuI3N0YXRpY0ZpbGVIYW5kbGVyKFxuICAgICAgICBsb2NhbFVybCxcbiAgICAgICAgc2l6ZSxcbiAgICAgICAgY29udGVudFR5cGUsXG4gICAgICAgIGV0YWcsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGdlblJlbmRlciA9IDxEYXRhID0gdW5kZWZpbmVkPihcbiAgICAgIHJvdXRlOiBSb3V0ZTxEYXRhPiB8IFVua25vd25QYWdlIHwgRXJyb3JQYWdlLFxuICAgICAgc3RhdHVzOiBudW1iZXIsXG4gICAgKSA9PiB7XG4gICAgICBjb25zdCBpbXBvcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgaWYgKHRoaXMuI2Rldikge1xuICAgICAgICBpbXBvcnRzLnB1c2goUkVGUkVTSF9KU19VUkwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChcbiAgICAgICAgcmVxOiBSZXF1ZXN0LFxuICAgICAgICBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICAgICAgIGVycm9yPzogdW5rbm93bixcbiAgICAgICkgPT4ge1xuICAgICAgICByZXR1cm4gYXN5bmMgKGRhdGE/OiBEYXRhKSA9PiB7XG4gICAgICAgICAgaWYgKHJvdXRlLmNvbXBvbmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHBhZ2UgZG9lcyBub3QgaGF2ZSBhIGNvbXBvbmVudCB0byByZW5kZXIuXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiByb3V0ZS5jb21wb25lbnQgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgcm91dGUuY29tcG9uZW50LmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiQXN5bmNGdW5jdGlvblwiXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIFwiQXN5bmMgY29tcG9uZW50cyBhcmUgbm90IHN1cHBvcnRlZC4gRmV0Y2ggZGF0YSBpbnNpZGUgb2YgYSByb3V0ZSBoYW5kbGVyLCBhcyBkZXNjcmliZWQgaW4gdGhlIGRvY3M6IGh0dHBzOi8vZnJlc2guZGVuby5kZXYvZG9jcy9nZXR0aW5nLXN0YXJ0ZWQvZmV0Y2hpbmctZGF0YVwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBwcmVsb2Fkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgaW50ZXJuYWxSZW5kZXIoe1xuICAgICAgICAgICAgcm91dGUsXG4gICAgICAgICAgICBpc2xhbmRzOiB0aGlzLiNpc2xhbmRzLFxuICAgICAgICAgICAgcGx1Z2luczogdGhpcy4jcGx1Z2lucyxcbiAgICAgICAgICAgIGFwcDogdGhpcy4jYXBwLFxuICAgICAgICAgICAgaW1wb3J0cyxcbiAgICAgICAgICAgIHByZWxvYWRzLFxuICAgICAgICAgICAgcmVuZGVyRm46IHRoaXMuI3JlbmRlckZuLFxuICAgICAgICAgICAgdXJsOiBuZXcgVVJMKHJlcS51cmwpLFxuICAgICAgICAgICAgcGFyYW1zLFxuICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgICAgIFwiY29udGVudC10eXBlXCI6IFwidGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGNvbnN0IFtib2R5LCBjc3BdID0gcmVzcDtcbiAgICAgICAgICBpZiAoY3NwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy4jZGV2KSB7XG4gICAgICAgICAgICAgIGNzcC5kaXJlY3RpdmVzLmNvbm5lY3RTcmMgPSBbXG4gICAgICAgICAgICAgICAgLi4uKGNzcC5kaXJlY3RpdmVzLmNvbm5lY3RTcmMgPz8gW10pLFxuICAgICAgICAgICAgICAgIFNFTEYsXG4gICAgICAgICAgICAgIF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBzZXJpYWxpemVDU1BEaXJlY3RpdmVzKGNzcC5kaXJlY3RpdmVzKTtcbiAgICAgICAgICAgIGlmIChjc3AucmVwb3J0T25seSkge1xuICAgICAgICAgICAgICBoZWFkZXJzW1wiY29udGVudC1zZWN1cml0eS1wb2xpY3ktcmVwb3J0LW9ubHlcIl0gPSBkaXJlY3RpdmU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBoZWFkZXJzW1wiY29udGVudC1zZWN1cml0eS1wb2xpY3lcIl0gPSBkaXJlY3RpdmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoYm9keSwgeyBzdGF0dXMsIGhlYWRlcnMgfSk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBjb25zdCBjcmVhdGVVbmtub3duUmVuZGVyID0gZ2VuUmVuZGVyKHRoaXMuI25vdEZvdW5kLCBTdGF0dXMuTm90Rm91bmQpO1xuXG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiB0aGlzLiNyb3V0ZXMpIHtcbiAgICAgIGNvbnN0IGNyZWF0ZVJlbmRlciA9IGdlblJlbmRlcihyb3V0ZSwgU3RhdHVzLk9LKTtcbiAgICAgIGlmICh0eXBlb2Ygcm91dGUuaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHJvdXRlc1tyb3V0ZS5wYXR0ZXJuXSA9IChyZXEsIGN0eCwgcGFyYW1zKSA9PlxuICAgICAgICAgIChyb3V0ZS5oYW5kbGVyIGFzIEhhbmRsZXIpKHJlcSwge1xuICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgcGFyYW1zLFxuICAgICAgICAgICAgcmVuZGVyOiBjcmVhdGVSZW5kZXIocmVxLCBwYXJhbXMpLFxuICAgICAgICAgICAgcmVuZGVyTm90Rm91bmQ6IGNyZWF0ZVVua25vd25SZW5kZXIocmVxLCB7fSksXG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IFttZXRob2QsIGhhbmRsZXJdIG9mIE9iamVjdC5lbnRyaWVzKHJvdXRlLmhhbmRsZXIpKSB7XG4gICAgICAgICAgcm91dGVzW2Ake21ldGhvZH1AJHtyb3V0ZS5wYXR0ZXJufWBdID0gKHJlcSwgY3R4LCBwYXJhbXMpID0+XG4gICAgICAgICAgICBoYW5kbGVyKHJlcSwge1xuICAgICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgICAgcmVuZGVyOiBjcmVhdGVSZW5kZXIocmVxLCBwYXJhbXMpLFxuICAgICAgICAgICAgICByZW5kZXJOb3RGb3VuZDogY3JlYXRlVW5rbm93blJlbmRlcihyZXEsIHt9KSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdW5rbm93bkhhbmRsZXI6IHJ1dHQuSGFuZGxlcjxSb3V0ZXJTdGF0ZT4gPSAoXG4gICAgICByZXEsXG4gICAgICBjdHgsXG4gICAgKSA9PlxuICAgICAgdGhpcy4jbm90Rm91bmQuaGFuZGxlcihcbiAgICAgICAgcmVxLFxuICAgICAgICB7XG4gICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgIHJlbmRlcjogY3JlYXRlVW5rbm93blJlbmRlcihyZXEsIHt9KSxcbiAgICAgICAgfSxcbiAgICAgICk7XG5cbiAgICBjb25zdCBlcnJvckhhbmRsZXJSZW5kZXIgPSBnZW5SZW5kZXIoXG4gICAgICB0aGlzLiNlcnJvcixcbiAgICAgIFN0YXR1cy5JbnRlcm5hbFNlcnZlckVycm9yLFxuICAgICk7XG4gICAgY29uc3QgZXJyb3JIYW5kbGVyOiBydXR0LkVycm9ySGFuZGxlcjxSb3V0ZXJTdGF0ZT4gPSAoXG4gICAgICByZXEsXG4gICAgICBjdHgsXG4gICAgICBlcnJvcixcbiAgICApID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiJWNBbiBlcnJvciBvY2N1cnJlZCBkdXJpbmcgcm91dGUgaGFuZGxpbmcgb3IgcGFnZSByZW5kZXJpbmcuXCIsXG4gICAgICAgIFwiY29sb3I6cmVkXCIsXG4gICAgICAgIGVycm9yLFxuICAgICAgKTtcbiAgICAgIHJldHVybiB0aGlzLiNlcnJvci5oYW5kbGVyKFxuICAgICAgICByZXEsXG4gICAgICAgIHtcbiAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgcmVuZGVyOiBlcnJvckhhbmRsZXJSZW5kZXIocmVxLCB7fSwgZXJyb3IpLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFtyb3V0ZXMsIHVua25vd25IYW5kbGVyLCBlcnJvckhhbmRsZXJdO1xuICB9XG5cbiAgI3N0YXRpY0ZpbGVIYW5kbGVyKFxuICAgIGxvY2FsVXJsOiBVUkwsXG4gICAgc2l6ZTogbnVtYmVyLFxuICAgIGNvbnRlbnRUeXBlOiBzdHJpbmcsXG4gICAgZXRhZzogc3RyaW5nLFxuICApOiBydXR0Lk1hdGNoSGFuZGxlciB7XG4gICAgcmV0dXJuIGFzeW5jIChyZXE6IFJlcXVlc3QpID0+IHtcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCk7XG4gICAgICBjb25zdCBrZXkgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChBU1NFVF9DQUNIRV9CVVNUX0tFWSk7XG4gICAgICBpZiAoa2V5ICE9PSBudWxsICYmIEJVSUxEX0lEICE9PSBrZXkpIHtcbiAgICAgICAgdXJsLnNlYXJjaFBhcmFtcy5kZWxldGUoQVNTRVRfQ0FDSEVfQlVTVF9LRVkpO1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHVybC5wYXRobmFtZSArIHVybC5zZWFyY2g7XG4gICAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJcIiwge1xuICAgICAgICAgIHN0YXR1czogMzA3LFxuICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIFwiY29udGVudC10eXBlXCI6IFwidGV4dC9wbGFpblwiLFxuICAgICAgICAgICAgbG9jYXRpb24sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoe1xuICAgICAgICBcImNvbnRlbnQtdHlwZVwiOiBjb250ZW50VHlwZSxcbiAgICAgICAgZXRhZyxcbiAgICAgICAgdmFyeTogXCJJZi1Ob25lLU1hdGNoXCIsXG4gICAgICB9KTtcbiAgICAgIGlmIChrZXkgIT09IG51bGwpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoXCJDYWNoZS1Db250cm9sXCIsIFwicHVibGljLCBtYXgtYWdlPTMxNTM2MDAwLCBpbW11dGFibGVcIik7XG4gICAgICB9XG4gICAgICBjb25zdCBpZk5vbmVNYXRjaCA9IHJlcS5oZWFkZXJzLmdldChcImlmLW5vbmUtbWF0Y2hcIik7XG4gICAgICBpZiAoaWZOb25lTWF0Y2ggPT09IGV0YWcgfHwgaWZOb25lTWF0Y2ggPT09IFwiVy9cIiArIGV0YWcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7IHN0YXR1czogMzA0LCBoZWFkZXJzIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IERlbm8ub3Blbihsb2NhbFVybCk7XG4gICAgICAgIGhlYWRlcnMuc2V0KFwiY29udGVudC1sZW5ndGhcIiwgU3RyaW5nKHNpemUpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShmaWxlLnJlYWRhYmxlLCB7IGhlYWRlcnMgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgcm91dGVyIHRoYXQgY29udGFpbnMgYWxsIGZyZXNoIHJvdXRlcy4gU2hvdWxkIGJlIG1vdW50ZWQgYXRcbiAgICogY29uc3RhbnRzLklOVEVSTkFMX1BSRUZJWFxuICAgKi9cbiAgI2J1bmRsZUFzc2V0Um91dGUgPSAoKTogcnV0dC5NYXRjaEhhbmRsZXIgPT4ge1xuICAgIHJldHVybiBhc3luYyAoX3JlcSwgX2N0eCwgcGFyYW1zKSA9PiB7XG4gICAgICBjb25zdCBwYXRoID0gYC8ke3BhcmFtcy5wYXRofWA7XG4gICAgICBjb25zdCBmaWxlID0gYXdhaXQgdGhpcy4jYnVuZGxlci5nZXQocGF0aCk7XG4gICAgICBsZXQgcmVzO1xuICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHtcbiAgICAgICAgICBcIkNhY2hlLUNvbnRyb2xcIjogXCJwdWJsaWMsIG1heC1hZ2U9NjA0ODAwLCBpbW11dGFibGVcIixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSB0eXBlQnlFeHRlbnNpb24oZXh0bmFtZShwYXRoKSk7XG4gICAgICAgIGlmIChjb250ZW50VHlwZSkge1xuICAgICAgICAgIGhlYWRlcnMuc2V0KFwiQ29udGVudC1UeXBlXCIsIGNvbnRlbnRUeXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcyA9IG5ldyBSZXNwb25zZShmaWxlLCB7XG4gICAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXMgPz8gbmV3IFJlc3BvbnNlKG51bGwsIHtcbiAgICAgICAgc3RhdHVzOiA0MDQsXG4gICAgICB9KTtcbiAgICB9O1xuICB9O1xufVxuXG5jb25zdCBERUZBVUxUX1JFTkRFUl9GTjogUmVuZGVyRnVuY3Rpb24gPSAoX2N0eCwgcmVuZGVyKSA9PiB7XG4gIHJlbmRlcigpO1xufTtcblxuY29uc3QgREVGQVVMVF9BUFA6IEFwcE1vZHVsZSA9IHtcbiAgZGVmYXVsdDogKHsgQ29tcG9uZW50IH0pID0+IGgoQ29tcG9uZW50LCB7fSksXG59O1xuXG5jb25zdCBERUZBVUxUX05PVF9GT1VORDogVW5rbm93blBhZ2UgPSB7XG4gIHBhdHRlcm46IFwiXCIsXG4gIHVybDogXCJcIixcbiAgbmFtZTogXCJfNDA0XCIsXG4gIGhhbmRsZXI6IChyZXEpID0+IHJ1dHQuZGVmYXVsdE90aGVySGFuZGxlcihyZXEpLFxuICBjc3A6IGZhbHNlLFxufTtcblxuY29uc3QgREVGQVVMVF9FUlJPUjogRXJyb3JQYWdlID0ge1xuICBwYXR0ZXJuOiBcIlwiLFxuICB1cmw6IFwiXCIsXG4gIG5hbWU6IFwiXzUwMFwiLFxuICBjb21wb25lbnQ6IERlZmF1bHRFcnJvckhhbmRsZXIsXG4gIGhhbmRsZXI6IChfcmVxLCBjdHgpID0+IGN0eC5yZW5kZXIoKSxcbiAgY3NwOiBmYWxzZSxcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgbGlzdCBvZiBtaWRkbGV3YXJlcyB0aGF0IG5lZWRzIHRvIGJlIGFwcGxpZWQgZm9yIHJlcXVlc3QgdXJsXG4gKiBAcGFyYW0gdXJsIHRoZSByZXF1ZXN0IHVybFxuICogQHBhcmFtIG1pZGRsZXdhcmVzIEFycmF5IG9mIG1pZGRsZXdhcmVzIGhhbmRsZXJzIGFuZCB0aGVpciByb3V0ZXMgYXMgcGF0aC10by1yZWdleHAgc3R5bGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlbGVjdE1pZGRsZXdhcmVzKHVybDogc3RyaW5nLCBtaWRkbGV3YXJlczogTWlkZGxld2FyZVJvdXRlW10pIHtcbiAgY29uc3Qgc2VsZWN0ZWRNd3M6IE1pZGRsZXdhcmVbXSA9IFtdO1xuICBjb25zdCByZXFVUkwgPSBuZXcgVVJMKHVybCk7XG5cbiAgZm9yIChjb25zdCB7IGNvbXBpbGVkUGF0dGVybiwgaGFuZGxlciB9IG9mIG1pZGRsZXdhcmVzKSB7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZWRQYXR0ZXJuLmV4ZWMocmVxVVJMKTtcbiAgICBpZiAocmVzKSB7XG4gICAgICBzZWxlY3RlZE13cy5wdXNoKHsgaGFuZGxlciB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2VsZWN0ZWRNd3M7XG59XG5cbi8qKlxuICogU29ydCBwYWdlcyBieSB0aGVpciByZWxhdGl2ZSByb3V0aW5nIHByaW9yaXR5LCBiYXNlZCBvbiB0aGUgcGFydHMgaW4gdGhlXG4gKiByb3V0ZSBtYXRjaGVyXG4gKi9cbmZ1bmN0aW9uIHNvcnRSb3V0ZXM8VCBleHRlbmRzIHsgcGF0dGVybjogc3RyaW5nIH0+KHJvdXRlczogVFtdKSB7XG4gIHJvdXRlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgY29uc3QgcGFydHNBID0gYS5wYXR0ZXJuLnNwbGl0KFwiL1wiKTtcbiAgICBjb25zdCBwYXJ0c0IgPSBiLnBhdHRlcm4uc3BsaXQoXCIvXCIpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5tYXgocGFydHNBLmxlbmd0aCwgcGFydHNCLmxlbmd0aCk7IGkrKykge1xuICAgICAgY29uc3QgcGFydEEgPSBwYXJ0c0FbaV07XG4gICAgICBjb25zdCBwYXJ0QiA9IHBhcnRzQltpXTtcbiAgICAgIGlmIChwYXJ0QSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gLTE7XG4gICAgICBpZiAocGFydEIgPT09IHVuZGVmaW5lZCkgcmV0dXJuIDE7XG4gICAgICBpZiAocGFydEEgPT09IHBhcnRCKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHByaW9yaXR5QSA9IHBhcnRBLnN0YXJ0c1dpdGgoXCI6XCIpID8gcGFydEEuZW5kc1dpdGgoXCIqXCIpID8gMCA6IDEgOiAyO1xuICAgICAgY29uc3QgcHJpb3JpdHlCID0gcGFydEIuc3RhcnRzV2l0aChcIjpcIikgPyBwYXJ0Qi5lbmRzV2l0aChcIipcIikgPyAwIDogMSA6IDI7XG4gICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5taW4ocHJpb3JpdHlCIC0gcHJpb3JpdHlBLCAxKSwgLTEpO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSk7XG59XG5cbi8qKiBUcmFuc2Zvcm0gYSBmaWxlc3lzdGVtIFVSTCBwYXRoIHRvIGEgYHBhdGgtdG8tcmVnZXhgIHN0eWxlIG1hdGNoZXIuICovXG5mdW5jdGlvbiBwYXRoVG9QYXR0ZXJuKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHBhcnRzID0gcGF0aC5zcGxpdChcIi9cIik7XG4gIGlmIChwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSA9PT0gXCJpbmRleFwiKSB7XG4gICAgcGFydHMucG9wKCk7XG4gIH1cbiAgY29uc3Qgcm91dGUgPSBcIi9cIiArIHBhcnRzXG4gICAgLm1hcCgocGFydCkgPT4ge1xuICAgICAgaWYgKHBhcnQuc3RhcnRzV2l0aChcIlsuLi5cIikgJiYgcGFydC5lbmRzV2l0aChcIl1cIikpIHtcbiAgICAgICAgcmV0dXJuIGA6JHtwYXJ0LnNsaWNlKDQsIHBhcnQubGVuZ3RoIC0gMSl9KmA7XG4gICAgICB9XG4gICAgICBpZiAocGFydC5zdGFydHNXaXRoKFwiW1wiKSAmJiBwYXJ0LmVuZHNXaXRoKFwiXVwiKSkge1xuICAgICAgICByZXR1cm4gYDoke3BhcnQuc2xpY2UoMSwgcGFydC5sZW5ndGggLSAxKX1gO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhcnQ7XG4gICAgfSlcbiAgICAuam9pbihcIi9cIik7XG4gIHJldHVybiByb3V0ZTtcbn1cblxuLy8gTm9ybWFsaXplIGEgcGF0aCBmb3IgdXNlIGluIGEgVVJMLiBSZXR1cm5zIG51bGwgaWYgdGhlIHBhdGggaXMgdW5wYXJzYWJsZS5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVVUkxQYXRoKHBhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IHBhdGhVcmwgPSBuZXcgVVJMKFwiZmlsZTovLy9cIik7XG4gICAgcGF0aFVybC5wYXRobmFtZSA9IHBhdGg7XG4gICAgcmV0dXJuIHBhdGhVcmwucGF0aG5hbWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplUGF0aFRvUmVnZXgocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGhcbiAgICAucmVwbGFjZUFsbChcIlxcKlwiLCBcIlxcXFwqXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJcXCtcIiwgXCJcXFxcK1wiKVxuICAgIC5yZXBsYWNlQWxsKFwiXFw/XCIsIFwiXFxcXD9cIilcbiAgICAucmVwbGFjZUFsbChcIlxce1wiLCBcIlxcXFx7XCIpXG4gICAgLnJlcGxhY2VBbGwoXCJcXH1cIiwgXCJcXFxcfVwiKVxuICAgIC5yZXBsYWNlQWxsKFwiXFwoXCIsIFwiXFxcXChcIilcbiAgICAucmVwbGFjZUFsbChcIlxcKVwiLCBcIlxcXFwpXCIpXG4gICAgLnJlcGxhY2VBbGwoXCJcXDpcIiwgXCJcXFxcOlwiKTtcbn1cblxuZnVuY3Rpb24gdG9QYXNjYWxDYXNlKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoXG4gICAgLyheXFx3fC1cXHcpL2csXG4gICAgKHN1YnN0cmluZykgPT4gc3Vic3RyaW5nLnJlcGxhY2UoLy0vLCBcIlwiKS50b1VwcGVyQ2FzZSgpLFxuICApO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUlzbGFuZE5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZmlsZU5hbWUgPSBuYW1lLnJlcGxhY2UoXCIvXCIsIFwiXCIpO1xuICByZXR1cm4gdG9QYXNjYWxDYXNlKGZpbGVOYW1lKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplQ1NQRGlyZWN0aXZlcyhjc3A6IENvbnRlbnRTZWN1cml0eVBvbGljeURpcmVjdGl2ZXMpOiBzdHJpbmcge1xuICByZXR1cm4gT2JqZWN0LmVudHJpZXMoY3NwKVxuICAgIC5maWx0ZXIoKFtfa2V5LCB2YWx1ZV0pID0+IHZhbHVlICE9PSB1bmRlZmluZWQpXG4gICAgLm1hcCgoW2ssIHZdOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV0pID0+IHtcbiAgICAgIC8vIFR1cm4gY2FtZWwgY2FzZSBpbnRvIHNuYWtlIGNhc2UuXG4gICAgICBjb25zdCBrZXkgPSBrLnJlcGxhY2UoL1tBLVpdL2csIChtKSA9PiBgLSR7bS50b0xvd2VyQ2FzZSgpfWApO1xuICAgICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHYpID8gdi5qb2luKFwiIFwiKSA6IHY7XG4gICAgICByZXR1cm4gYCR7a2V5fSAke3ZhbHVlfWA7XG4gICAgfSlcbiAgICAuam9pbihcIjsgXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWlkZGxld2FyZVBhdGhUb1BhdHRlcm4oYmFzZVJvdXRlOiBzdHJpbmcpIHtcbiAgYmFzZVJvdXRlID0gYmFzZVJvdXRlLnNsaWNlKDAsIC1cIl9taWRkbGV3YXJlXCIubGVuZ3RoKTtcbiAgbGV0IHBhdHRlcm4gPSBwYXRoVG9QYXR0ZXJuKGJhc2VSb3V0ZSk7XG4gIGlmIChwYXR0ZXJuLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnNsaWNlKDAsIC0xKSArIFwiey8qfT9cIjtcbiAgfVxuICBjb25zdCBjb21waWxlZFBhdHRlcm4gPSBuZXcgVVJMUGF0dGVybih7IHBhdGhuYW1lOiBwYXR0ZXJuIH0pO1xuICByZXR1cm4geyBwYXR0ZXJuLCBjb21waWxlZFBhdHRlcm4gfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUVFLE9BQU8sRUFDUCxXQUFXLEVBRVgsSUFBSSxFQUNKLE1BQU0sRUFDTixTQUFTLEVBQ1QsZUFBZSxFQUNmLElBQUksUUFDQyxZQUFZO0FBQ25CLFNBQVMsQ0FBQyxRQUFRLFNBQVM7QUFFM0IsU0FBUyxPQUFPLFFBQW1CLGNBQWM7QUFDakQsU0FB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