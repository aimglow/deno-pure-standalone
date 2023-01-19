import { renderToString } from "preact-render-to-string";
import { h, options } from "preact";
import { HEAD_CONTEXT } from "../runtime/head.ts";
import { CSP_CONTEXT, nonce, NONE, UNSAFE_INLINE } from "../runtime/csp.ts";
import { bundleAssetUrl } from "./constants.ts";
import { assetHashingHook } from "../runtime/utils.ts";
import { htmlEscapeJsonString } from "./htmlescape.ts";
export class RenderContext {
    #id;
    #state = new Map();
    #styles = [];
    #url;
    #route;
    #lang;
    constructor(id, url, route, lang){
        this.#id = id;
        this.#url = url;
        this.#route = route;
        this.#lang = lang;
    }
    /** A unique ID for this logical JIT render. */ get id() {
        return this.#id;
    }
    /**
   * State that is persisted between multiple renders with the same render
   * context. This is useful because one logical JIT render could have multiple
   * preact render passes due to suspense.
   */ get state() {
        return this.#state;
    }
    /**
   * All of the CSS style rules that should be inlined into the document.
   * Adding to this list across multiple renders is supported (even across
   * suspense!). The CSS rules will always be inserted on the client in the
   * order specified here.
   */ get styles() {
        return this.#styles;
    }
    /** The URL of the page being rendered. */ get url() {
        return this.#url;
    }
    /** The route matcher (e.g. /blog/:id) that the request matched for this page
   * to be rendered. */ get route() {
        return this.#route;
    }
    /** The language of the page being rendered. Defaults to "en". */ get lang() {
        return this.#lang;
    }
    set lang(lang) {
        this.#lang = lang;
    }
}
function defaultCsp() {
    return {
        directives: {
            defaultSrc: [
                NONE
            ],
            styleSrc: [
                UNSAFE_INLINE
            ]
        },
        reportOnly: false
    };
}
/**
 * This function renders out a page. Rendering is synchronous and non streaming.
 * Suspense boundaries are not supported.
 */ export async function render(opts) {
    const props = {
        params: opts.params,
        url: opts.url,
        route: opts.route.pattern,
        data: opts.data
    };
    if (opts.error) {
        props.error = opts.error;
    }
    const csp = opts.route.csp ? defaultCsp() : undefined;
    const headComponents = [];
    const vnode = h(CSP_CONTEXT.Provider, {
        value: csp,
        children: h(HEAD_CONTEXT.Provider, {
            value: headComponents,
            children: h(opts.app.default, {
                Component () {
                    return h(opts.route.component, props);
                }
            })
        })
    });
    const ctx = new RenderContext(crypto.randomUUID(), opts.url, opts.route.pattern, opts.lang ?? "en");
    if (csp) {
        // Clear the csp
        const newCsp = defaultCsp();
        csp.directives = newCsp.directives;
        csp.reportOnly = newCsp.reportOnly;
    }
    // Clear the head components
    headComponents.splice(0, headComponents.length);
    // Setup the interesting VNode types
    ISLANDS.splice(0, ISLANDS.length, ...opts.islands);
    // Clear the encountered vnodes
    ENCOUNTERED_ISLANDS.clear();
    // Clear the island props
    ISLAND_PROPS = [];
    let bodyHtml = null;
    function realRender() {
        bodyHtml = renderToString(vnode);
        return bodyHtml;
    }
    const plugins = opts.plugins.filter((p)=>p.render !== null);
    const renderResults = [];
    function render() {
        const plugin = plugins.shift();
        if (plugin) {
            const res = plugin.render({
                render
            });
            if (res === undefined) {
                throw new Error(`${plugin?.name}'s render hook did not return a PluginRenderResult object.`);
            }
            renderResults.push([
                plugin,
                res
            ]);
        } else {
            realRender();
        }
        if (bodyHtml === null) {
            throw new Error(`The 'render' function was not called by ${plugin?.name}'s render hook.`);
        }
        return {
            htmlText: bodyHtml,
            requiresHydration: ENCOUNTERED_ISLANDS.size > 0
        };
    }
    await opts.renderFn(ctx, ()=>render().htmlText);
    if (bodyHtml === null) {
        throw new Error("The `render` function was not called by the renderer.");
    }
    bodyHtml = bodyHtml;
    const imports = opts.imports.map((url)=>{
        const randomNonce = crypto.randomUUID().replace(/-/g, "");
        if (csp) {
            csp.directives.scriptSrc = [
                ...csp.directives.scriptSrc ?? [],
                nonce(randomNonce)
            ];
        }
        return [
            url,
            randomNonce
        ];
    });
    const state = [
        ISLAND_PROPS,
        []
    ];
    const styleTags = [];
    let script = `const STATE_COMPONENT = document.getElementById("__FRSH_STATE");const STATE = JSON.parse(STATE_COMPONENT?.textContent ?? "[[],[]]");`;
    for (const [plugin, res] of renderResults){
        for (const hydrate of res.scripts ?? []){
            const i = state[1].push(hydrate.state) - 1;
            const randomNonce = crypto.randomUUID().replace(/-/g, "");
            if (csp) {
                csp.directives.scriptSrc = [
                    ...csp.directives.scriptSrc ?? [],
                    nonce(randomNonce)
                ];
            }
            const url = bundleAssetUrl(`/plugin-${plugin.name}-${hydrate.entrypoint}.js`);
            imports.push([
                url,
                randomNonce
            ]);
            script += `import p${i} from "${url}";p${i}(STATE[1][${i}]);`;
        }
        styleTags.splice(styleTags.length, 0, ...res.styles ?? []);
    }
    if (ENCOUNTERED_ISLANDS.size > 0) {
        // Load the main.js script
        {
            const randomNonce1 = crypto.randomUUID().replace(/-/g, "");
            if (csp) {
                csp.directives.scriptSrc = [
                    ...csp.directives.scriptSrc ?? [],
                    nonce(randomNonce1)
                ];
            }
            const url1 = bundleAssetUrl("/main.js");
            imports.push([
                url1,
                randomNonce1
            ]);
        }
        script += `import { revive } from "${bundleAssetUrl("/main.js")}";`;
        // Prepare the inline script that loads and revives the islands
        let islandRegistry = "";
        for (const island of ENCOUNTERED_ISLANDS){
            const randomNonce2 = crypto.randomUUID().replace(/-/g, "");
            if (csp) {
                csp.directives.scriptSrc = [
                    ...csp.directives.scriptSrc ?? [],
                    nonce(randomNonce2)
                ];
            }
            const url2 = bundleAssetUrl(`/island-${island.id}.js`);
            imports.push([
                url2,
                randomNonce2
            ]);
            script += `import ${island.name} from "${url2}";`;
            islandRegistry += `${island.id}:${island.name},`;
        }
        script += `revive({${islandRegistry}}, STATE[0]);`;
    }
    if (state[0].length > 0 || state[1].length > 0) {
        // Append state to the body
        bodyHtml += `<script id="__FRSH_STATE" type="application/json">${htmlEscapeJsonString(JSON.stringify(state))}</script>`;
        // Append the inline script to the body
        const randomNonce3 = crypto.randomUUID().replace(/-/g, "");
        if (csp) {
            csp.directives.scriptSrc = [
                ...csp.directives.scriptSrc ?? [],
                nonce(randomNonce3)
            ];
        }
        bodyHtml += `<script type="module" nonce="${randomNonce3}">${script}</script>`;
    }
    if (ctx.styles.length > 0) {
        const node = h("style", {
            id: "__FRSH_STYLE",
            dangerouslySetInnerHTML: {
                __html: ctx.styles.join("\n")
            }
        });
        headComponents.splice(0, 0, node);
    }
    for (const style of styleTags){
        const node1 = h("style", {
            id: style.id,
            dangerouslySetInnerHTML: {
                __html: style.cssText
            },
            media: style.media
        });
        headComponents.splice(0, 0, node1);
    }
    const html = template({
        bodyHtml,
        headComponents,
        imports,
        preloads: opts.preloads,
        lang: ctx.lang
    });
    return [
        html,
        csp
    ];
}
export function template(opts) {
    const page = h("html", {
        lang: opts.lang
    }, h("head", null, h("meta", {
        charSet: "UTF-8"
    }), h("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0"
    }), opts.preloads.map((src)=>h("link", {
            rel: "modulepreload",
            href: src
        })), opts.imports.map(([src, nonce])=>h("script", {
            src: src,
            nonce: nonce,
            type: "module"
        })), opts.headComponents), h("body", {
        dangerouslySetInnerHTML: {
            __html: opts.bodyHtml
        }
    }));
    return "<!DOCTYPE html>" + renderToString(page);
}
// Set up a preact option hook to track when vnode with custom functions are
// created.
const ISLANDS = [];
const ENCOUNTERED_ISLANDS = new Set([]);
let ISLAND_PROPS = [];
const originalHook = options.vnode;
let ignoreNext = false;
options.vnode = (vnode)=>{
    assetHashingHook(vnode);
    const originalType = vnode.type;
    if (typeof vnode.type === "function") {
        const island = ISLANDS.find((island)=>island.component === originalType);
        if (island) {
            if (ignoreNext) {
                ignoreNext = false;
                return;
            }
            ENCOUNTERED_ISLANDS.add(island);
            vnode.type = (props)=>{
                ignoreNext = true;
                const child = h(originalType, props);
                ISLAND_PROPS.push(props);
                return h(`!--frsh-${island.id}:${ISLAND_PROPS.length - 1}--`, null, child);
            };
        }
    }
    if (originalHook) originalHook(vnode);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4xLjIvc3JjL3NlcnZlci9yZW5kZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVuZGVyVG9TdHJpbmcgfSBmcm9tIFwicHJlYWN0LXJlbmRlci10by1zdHJpbmdcIjtcbmltcG9ydCB7IENvbXBvbmVudENoaWxkcmVuLCBDb21wb25lbnRUeXBlLCBoLCBvcHRpb25zIH0gZnJvbSBcInByZWFjdFwiO1xuaW1wb3J0IHtcbiAgQXBwTW9kdWxlLFxuICBFcnJvclBhZ2UsXG4gIElzbGFuZCxcbiAgUGx1Z2luLFxuICBQbHVnaW5SZW5kZXJGdW5jdGlvblJlc3VsdCxcbiAgUGx1Z2luUmVuZGVyUmVzdWx0LFxuICBQbHVnaW5SZW5kZXJTdHlsZVRhZyxcbiAgUmVuZGVyRnVuY3Rpb24sXG4gIFJvdXRlLFxuICBVbmtub3duUGFnZSxcbn0gZnJvbSBcIi4vdHlwZXMudHNcIjtcbmltcG9ydCB7IEhFQURfQ09OVEVYVCB9IGZyb20gXCIuLi9ydW50aW1lL2hlYWQudHNcIjtcbmltcG9ydCB7IENTUF9DT05URVhULCBub25jZSwgTk9ORSwgVU5TQUZFX0lOTElORSB9IGZyb20gXCIuLi9ydW50aW1lL2NzcC50c1wiO1xuaW1wb3J0IHsgQ29udGVudFNlY3VyaXR5UG9saWN5IH0gZnJvbSBcIi4uL3J1bnRpbWUvY3NwLnRzXCI7XG5pbXBvcnQgeyBidW5kbGVBc3NldFVybCB9IGZyb20gXCIuL2NvbnN0YW50cy50c1wiO1xuaW1wb3J0IHsgYXNzZXRIYXNoaW5nSG9vayB9IGZyb20gXCIuLi9ydW50aW1lL3V0aWxzLnRzXCI7XG5pbXBvcnQgeyBodG1sRXNjYXBlSnNvblN0cmluZyB9IGZyb20gXCIuL2h0bWxlc2NhcGUudHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJPcHRpb25zPERhdGE+IHtcbiAgcm91dGU6IFJvdXRlPERhdGE+IHwgVW5rbm93blBhZ2UgfCBFcnJvclBhZ2U7XG4gIGlzbGFuZHM6IElzbGFuZFtdO1xuICBwbHVnaW5zOiBQbHVnaW5bXTtcbiAgYXBwOiBBcHBNb2R1bGU7XG4gIGltcG9ydHM6IHN0cmluZ1tdO1xuICBwcmVsb2Fkczogc3RyaW5nW107XG4gIHVybDogVVJMO1xuICBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdPjtcbiAgcmVuZGVyRm46IFJlbmRlckZ1bmN0aW9uO1xuICBkYXRhPzogRGF0YTtcbiAgZXJyb3I/OiB1bmtub3duO1xuICBsYW5nPzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBJbm5lclJlbmRlckZ1bmN0aW9uID0gKCkgPT4gc3RyaW5nO1xuXG5leHBvcnQgY2xhc3MgUmVuZGVyQ29udGV4dCB7XG4gICNpZDogc3RyaW5nO1xuICAjc3RhdGU6IE1hcDxzdHJpbmcsIHVua25vd24+ID0gbmV3IE1hcCgpO1xuICAjc3R5bGVzOiBzdHJpbmdbXSA9IFtdO1xuICAjdXJsOiBVUkw7XG4gICNyb3V0ZTogc3RyaW5nO1xuICAjbGFuZzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGlkOiBzdHJpbmcsIHVybDogVVJMLCByb3V0ZTogc3RyaW5nLCBsYW5nOiBzdHJpbmcpIHtcbiAgICB0aGlzLiNpZCA9IGlkO1xuICAgIHRoaXMuI3VybCA9IHVybDtcbiAgICB0aGlzLiNyb3V0ZSA9IHJvdXRlO1xuICAgIHRoaXMuI2xhbmcgPSBsYW5nO1xuICB9XG5cbiAgLyoqIEEgdW5pcXVlIElEIGZvciB0aGlzIGxvZ2ljYWwgSklUIHJlbmRlci4gKi9cbiAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI2lkO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXRlIHRoYXQgaXMgcGVyc2lzdGVkIGJldHdlZW4gbXVsdGlwbGUgcmVuZGVycyB3aXRoIHRoZSBzYW1lIHJlbmRlclxuICAgKiBjb250ZXh0LiBUaGlzIGlzIHVzZWZ1bCBiZWNhdXNlIG9uZSBsb2dpY2FsIEpJVCByZW5kZXIgY291bGQgaGF2ZSBtdWx0aXBsZVxuICAgKiBwcmVhY3QgcmVuZGVyIHBhc3NlcyBkdWUgdG8gc3VzcGVuc2UuXG4gICAqL1xuICBnZXQgc3RhdGUoKTogTWFwPHN0cmluZywgdW5rbm93bj4ge1xuICAgIHJldHVybiB0aGlzLiNzdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgb2YgdGhlIENTUyBzdHlsZSBydWxlcyB0aGF0IHNob3VsZCBiZSBpbmxpbmVkIGludG8gdGhlIGRvY3VtZW50LlxuICAgKiBBZGRpbmcgdG8gdGhpcyBsaXN0IGFjcm9zcyBtdWx0aXBsZSByZW5kZXJzIGlzIHN1cHBvcnRlZCAoZXZlbiBhY3Jvc3NcbiAgICogc3VzcGVuc2UhKS4gVGhlIENTUyBydWxlcyB3aWxsIGFsd2F5cyBiZSBpbnNlcnRlZCBvbiB0aGUgY2xpZW50IGluIHRoZVxuICAgKiBvcmRlciBzcGVjaWZpZWQgaGVyZS5cbiAgICovXG4gIGdldCBzdHlsZXMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLiNzdHlsZXM7XG4gIH1cblxuICAvKiogVGhlIFVSTCBvZiB0aGUgcGFnZSBiZWluZyByZW5kZXJlZC4gKi9cbiAgZ2V0IHVybCgpOiBVUkwge1xuICAgIHJldHVybiB0aGlzLiN1cmw7XG4gIH1cblxuICAvKiogVGhlIHJvdXRlIG1hdGNoZXIgKGUuZy4gL2Jsb2cvOmlkKSB0aGF0IHRoZSByZXF1ZXN0IG1hdGNoZWQgZm9yIHRoaXMgcGFnZVxuICAgKiB0byBiZSByZW5kZXJlZC4gKi9cbiAgZ2V0IHJvdXRlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3JvdXRlO1xuICB9XG5cbiAgLyoqIFRoZSBsYW5ndWFnZSBvZiB0aGUgcGFnZSBiZWluZyByZW5kZXJlZC4gRGVmYXVsdHMgdG8gXCJlblwiLiAqL1xuICBnZXQgbGFuZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNsYW5nO1xuICB9XG4gIHNldCBsYW5nKGxhbmc6IHN0cmluZykge1xuICAgIHRoaXMuI2xhbmcgPSBsYW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRDc3AoKSB7XG4gIHJldHVybiB7XG4gICAgZGlyZWN0aXZlczogeyBkZWZhdWx0U3JjOiBbTk9ORV0sIHN0eWxlU3JjOiBbVU5TQUZFX0lOTElORV0gfSxcbiAgICByZXBvcnRPbmx5OiBmYWxzZSxcbiAgfTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHJlbmRlcnMgb3V0IGEgcGFnZS4gUmVuZGVyaW5nIGlzIHN5bmNocm9ub3VzIGFuZCBub24gc3RyZWFtaW5nLlxuICogU3VzcGVuc2UgYm91bmRhcmllcyBhcmUgbm90IHN1cHBvcnRlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmRlcjxEYXRhPihcbiAgb3B0czogUmVuZGVyT3B0aW9uczxEYXRhPixcbik6IFByb21pc2U8W3N0cmluZywgQ29udGVudFNlY3VyaXR5UG9saWN5IHwgdW5kZWZpbmVkXT4ge1xuICBjb25zdCBwcm9wczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgcGFyYW1zOiBvcHRzLnBhcmFtcyxcbiAgICB1cmw6IG9wdHMudXJsLFxuICAgIHJvdXRlOiBvcHRzLnJvdXRlLnBhdHRlcm4sXG4gICAgZGF0YTogb3B0cy5kYXRhLFxuICB9O1xuICBpZiAob3B0cy5lcnJvcikge1xuICAgIHByb3BzLmVycm9yID0gb3B0cy5lcnJvcjtcbiAgfVxuXG4gIGNvbnN0IGNzcDogQ29udGVudFNlY3VyaXR5UG9saWN5IHwgdW5kZWZpbmVkID0gb3B0cy5yb3V0ZS5jc3BcbiAgICA/IGRlZmF1bHRDc3AoKVxuICAgIDogdW5kZWZpbmVkO1xuICBjb25zdCBoZWFkQ29tcG9uZW50czogQ29tcG9uZW50Q2hpbGRyZW5bXSA9IFtdO1xuXG4gIGNvbnN0IHZub2RlID0gaChDU1BfQ09OVEVYVC5Qcm92aWRlciwge1xuICAgIHZhbHVlOiBjc3AsXG4gICAgY2hpbGRyZW46IGgoSEVBRF9DT05URVhULlByb3ZpZGVyLCB7XG4gICAgICB2YWx1ZTogaGVhZENvbXBvbmVudHMsXG4gICAgICBjaGlsZHJlbjogaChvcHRzLmFwcC5kZWZhdWx0LCB7XG4gICAgICAgIENvbXBvbmVudCgpIHtcbiAgICAgICAgICByZXR1cm4gaChvcHRzLnJvdXRlLmNvbXBvbmVudCEgYXMgQ29tcG9uZW50VHlwZTx1bmtub3duPiwgcHJvcHMpO1xuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgfSksXG4gIH0pO1xuXG4gIGNvbnN0IGN0eCA9IG5ldyBSZW5kZXJDb250ZXh0KFxuICAgIGNyeXB0by5yYW5kb21VVUlEKCksXG4gICAgb3B0cy51cmwsXG4gICAgb3B0cy5yb3V0ZS5wYXR0ZXJuLFxuICAgIG9wdHMubGFuZyA/PyBcImVuXCIsXG4gICk7XG5cbiAgaWYgKGNzcCkge1xuICAgIC8vIENsZWFyIHRoZSBjc3BcbiAgICBjb25zdCBuZXdDc3AgPSBkZWZhdWx0Q3NwKCk7XG4gICAgY3NwLmRpcmVjdGl2ZXMgPSBuZXdDc3AuZGlyZWN0aXZlcztcbiAgICBjc3AucmVwb3J0T25seSA9IG5ld0NzcC5yZXBvcnRPbmx5O1xuICB9XG4gIC8vIENsZWFyIHRoZSBoZWFkIGNvbXBvbmVudHNcbiAgaGVhZENvbXBvbmVudHMuc3BsaWNlKDAsIGhlYWRDb21wb25lbnRzLmxlbmd0aCk7XG5cbiAgLy8gU2V0dXAgdGhlIGludGVyZXN0aW5nIFZOb2RlIHR5cGVzXG4gIElTTEFORFMuc3BsaWNlKDAsIElTTEFORFMubGVuZ3RoLCAuLi5vcHRzLmlzbGFuZHMpO1xuXG4gIC8vIENsZWFyIHRoZSBlbmNvdW50ZXJlZCB2bm9kZXNcbiAgRU5DT1VOVEVSRURfSVNMQU5EUy5jbGVhcigpO1xuXG4gIC8vIENsZWFyIHRoZSBpc2xhbmQgcHJvcHNcbiAgSVNMQU5EX1BST1BTID0gW107XG5cbiAgbGV0IGJvZHlIdG1sOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICBmdW5jdGlvbiByZWFsUmVuZGVyKCk6IHN0cmluZyB7XG4gICAgYm9keUh0bWwgPSByZW5kZXJUb1N0cmluZyh2bm9kZSk7XG4gICAgcmV0dXJuIGJvZHlIdG1sO1xuICB9XG5cbiAgY29uc3QgcGx1Z2lucyA9IG9wdHMucGx1Z2lucy5maWx0ZXIoKHApID0+IHAucmVuZGVyICE9PSBudWxsKTtcbiAgY29uc3QgcmVuZGVyUmVzdWx0czogW1BsdWdpbiwgUGx1Z2luUmVuZGVyUmVzdWx0XVtdID0gW107XG5cbiAgZnVuY3Rpb24gcmVuZGVyKCk6IFBsdWdpblJlbmRlckZ1bmN0aW9uUmVzdWx0IHtcbiAgICBjb25zdCBwbHVnaW4gPSBwbHVnaW5zLnNoaWZ0KCk7XG4gICAgaWYgKHBsdWdpbikge1xuICAgICAgY29uc3QgcmVzID0gcGx1Z2luLnJlbmRlciEoeyByZW5kZXIgfSk7XG4gICAgICBpZiAocmVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGAke3BsdWdpbj8ubmFtZX0ncyByZW5kZXIgaG9vayBkaWQgbm90IHJldHVybiBhIFBsdWdpblJlbmRlclJlc3VsdCBvYmplY3QuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJlbmRlclJlc3VsdHMucHVzaChbcGx1Z2luLCByZXNdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhbFJlbmRlcigpO1xuICAgIH1cbiAgICBpZiAoYm9keUh0bWwgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoZSAncmVuZGVyJyBmdW5jdGlvbiB3YXMgbm90IGNhbGxlZCBieSAke3BsdWdpbj8ubmFtZX0ncyByZW5kZXIgaG9vay5gLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGh0bWxUZXh0OiBib2R5SHRtbCxcbiAgICAgIHJlcXVpcmVzSHlkcmF0aW9uOiBFTkNPVU5URVJFRF9JU0xBTkRTLnNpemUgPiAwLFxuICAgIH07XG4gIH1cblxuICBhd2FpdCBvcHRzLnJlbmRlckZuKGN0eCwgKCkgPT4gcmVuZGVyKCkuaHRtbFRleHQpO1xuXG4gIGlmIChib2R5SHRtbCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBgcmVuZGVyYCBmdW5jdGlvbiB3YXMgbm90IGNhbGxlZCBieSB0aGUgcmVuZGVyZXIuXCIpO1xuICB9XG5cbiAgYm9keUh0bWwgPSBib2R5SHRtbCBhcyBzdHJpbmc7XG5cbiAgY29uc3QgaW1wb3J0cyA9IG9wdHMuaW1wb3J0cy5tYXAoKHVybCkgPT4ge1xuICAgIGNvbnN0IHJhbmRvbU5vbmNlID0gY3J5cHRvLnJhbmRvbVVVSUQoKS5yZXBsYWNlKC8tL2csIFwiXCIpO1xuICAgIGlmIChjc3ApIHtcbiAgICAgIGNzcC5kaXJlY3RpdmVzLnNjcmlwdFNyYyA9IFtcbiAgICAgICAgLi4uY3NwLmRpcmVjdGl2ZXMuc2NyaXB0U3JjID8/IFtdLFxuICAgICAgICBub25jZShyYW5kb21Ob25jZSksXG4gICAgICBdO1xuICAgIH1cbiAgICByZXR1cm4gW3VybCwgcmFuZG9tTm9uY2VdIGFzIGNvbnN0O1xuICB9KTtcblxuICBjb25zdCBzdGF0ZTogW2lzbGFuZHM6IHVua25vd25bXSwgcGx1Z2luczogdW5rbm93bltdXSA9IFtJU0xBTkRfUFJPUFMsIFtdXTtcbiAgY29uc3Qgc3R5bGVUYWdzOiBQbHVnaW5SZW5kZXJTdHlsZVRhZ1tdID0gW107XG5cbiAgbGV0IHNjcmlwdCA9XG4gICAgYGNvbnN0IFNUQVRFX0NPTVBPTkVOVCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiX19GUlNIX1NUQVRFXCIpO2NvbnN0IFNUQVRFID0gSlNPTi5wYXJzZShTVEFURV9DT01QT05FTlQ/LnRleHRDb250ZW50ID8/IFwiW1tdLFtdXVwiKTtgO1xuXG4gIGZvciAoY29uc3QgW3BsdWdpbiwgcmVzXSBvZiByZW5kZXJSZXN1bHRzKSB7XG4gICAgZm9yIChjb25zdCBoeWRyYXRlIG9mIHJlcy5zY3JpcHRzID8/IFtdKSB7XG4gICAgICBjb25zdCBpID0gc3RhdGVbMV0ucHVzaChoeWRyYXRlLnN0YXRlKSAtIDE7XG4gICAgICBjb25zdCByYW5kb21Ob25jZSA9IGNyeXB0by5yYW5kb21VVUlEKCkucmVwbGFjZSgvLS9nLCBcIlwiKTtcbiAgICAgIGlmIChjc3ApIHtcbiAgICAgICAgY3NwLmRpcmVjdGl2ZXMuc2NyaXB0U3JjID0gW1xuICAgICAgICAgIC4uLmNzcC5kaXJlY3RpdmVzLnNjcmlwdFNyYyA/PyBbXSxcbiAgICAgICAgICBub25jZShyYW5kb21Ob25jZSksXG4gICAgICAgIF07XG4gICAgICB9XG4gICAgICBjb25zdCB1cmwgPSBidW5kbGVBc3NldFVybChcbiAgICAgICAgYC9wbHVnaW4tJHtwbHVnaW4ubmFtZX0tJHtoeWRyYXRlLmVudHJ5cG9pbnR9LmpzYCxcbiAgICAgICk7XG4gICAgICBpbXBvcnRzLnB1c2goW3VybCwgcmFuZG9tTm9uY2VdIGFzIGNvbnN0KTtcblxuICAgICAgc2NyaXB0ICs9IGBpbXBvcnQgcCR7aX0gZnJvbSBcIiR7dXJsfVwiO3Ake2l9KFNUQVRFWzFdWyR7aX1dKTtgO1xuICAgIH1cbiAgICBzdHlsZVRhZ3Muc3BsaWNlKHN0eWxlVGFncy5sZW5ndGgsIDAsIC4uLnJlcy5zdHlsZXMgPz8gW10pO1xuICB9XG5cbiAgaWYgKEVOQ09VTlRFUkVEX0lTTEFORFMuc2l6ZSA+IDApIHtcbiAgICAvLyBMb2FkIHRoZSBtYWluLmpzIHNjcmlwdFxuICAgIHtcbiAgICAgIGNvbnN0IHJhbmRvbU5vbmNlID0gY3J5cHRvLnJhbmRvbVVVSUQoKS5yZXBsYWNlKC8tL2csIFwiXCIpO1xuICAgICAgaWYgKGNzcCkge1xuICAgICAgICBjc3AuZGlyZWN0aXZlcy5zY3JpcHRTcmMgPSBbXG4gICAgICAgICAgLi4uY3NwLmRpcmVjdGl2ZXMuc2NyaXB0U3JjID8/IFtdLFxuICAgICAgICAgIG5vbmNlKHJhbmRvbU5vbmNlKSxcbiAgICAgICAgXTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVybCA9IGJ1bmRsZUFzc2V0VXJsKFwiL21haW4uanNcIik7XG4gICAgICBpbXBvcnRzLnB1c2goW3VybCwgcmFuZG9tTm9uY2VdIGFzIGNvbnN0KTtcbiAgICB9XG5cbiAgICBzY3JpcHQgKz0gYGltcG9ydCB7IHJldml2ZSB9IGZyb20gXCIke2J1bmRsZUFzc2V0VXJsKFwiL21haW4uanNcIil9XCI7YDtcblxuICAgIC8vIFByZXBhcmUgdGhlIGlubGluZSBzY3JpcHQgdGhhdCBsb2FkcyBhbmQgcmV2aXZlcyB0aGUgaXNsYW5kc1xuICAgIGxldCBpc2xhbmRSZWdpc3RyeSA9IFwiXCI7XG4gICAgZm9yIChjb25zdCBpc2xhbmQgb2YgRU5DT1VOVEVSRURfSVNMQU5EUykge1xuICAgICAgY29uc3QgcmFuZG9tTm9uY2UgPSBjcnlwdG8ucmFuZG9tVVVJRCgpLnJlcGxhY2UoLy0vZywgXCJcIik7XG4gICAgICBpZiAoY3NwKSB7XG4gICAgICAgIGNzcC5kaXJlY3RpdmVzLnNjcmlwdFNyYyA9IFtcbiAgICAgICAgICAuLi5jc3AuZGlyZWN0aXZlcy5zY3JpcHRTcmMgPz8gW10sXG4gICAgICAgICAgbm9uY2UocmFuZG9tTm9uY2UpLFxuICAgICAgICBdO1xuICAgICAgfVxuICAgICAgY29uc3QgdXJsID0gYnVuZGxlQXNzZXRVcmwoYC9pc2xhbmQtJHtpc2xhbmQuaWR9LmpzYCk7XG4gICAgICBpbXBvcnRzLnB1c2goW3VybCwgcmFuZG9tTm9uY2VdIGFzIGNvbnN0KTtcbiAgICAgIHNjcmlwdCArPSBgaW1wb3J0ICR7aXNsYW5kLm5hbWV9IGZyb20gXCIke3VybH1cIjtgO1xuICAgICAgaXNsYW5kUmVnaXN0cnkgKz0gYCR7aXNsYW5kLmlkfToke2lzbGFuZC5uYW1lfSxgO1xuICAgIH1cbiAgICBzY3JpcHQgKz0gYHJldml2ZSh7JHtpc2xhbmRSZWdpc3RyeX19LCBTVEFURVswXSk7YDtcbiAgfVxuXG4gIGlmIChzdGF0ZVswXS5sZW5ndGggPiAwIHx8IHN0YXRlWzFdLmxlbmd0aCA+IDApIHtcbiAgICAvLyBBcHBlbmQgc3RhdGUgdG8gdGhlIGJvZHlcbiAgICBib2R5SHRtbCArPSBgPHNjcmlwdCBpZD1cIl9fRlJTSF9TVEFURVwiIHR5cGU9XCJhcHBsaWNhdGlvbi9qc29uXCI+JHtcbiAgICAgIGh0bWxFc2NhcGVKc29uU3RyaW5nKEpTT04uc3RyaW5naWZ5KHN0YXRlKSlcbiAgICB9PC9zY3JpcHQ+YDtcblxuICAgIC8vIEFwcGVuZCB0aGUgaW5saW5lIHNjcmlwdCB0byB0aGUgYm9keVxuICAgIGNvbnN0IHJhbmRvbU5vbmNlID0gY3J5cHRvLnJhbmRvbVVVSUQoKS5yZXBsYWNlKC8tL2csIFwiXCIpO1xuICAgIGlmIChjc3ApIHtcbiAgICAgIGNzcC5kaXJlY3RpdmVzLnNjcmlwdFNyYyA9IFtcbiAgICAgICAgLi4uY3NwLmRpcmVjdGl2ZXMuc2NyaXB0U3JjID8/IFtdLFxuICAgICAgICBub25jZShyYW5kb21Ob25jZSksXG4gICAgICBdO1xuICAgIH1cbiAgICBib2R5SHRtbCArPVxuICAgICAgYDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIG5vbmNlPVwiJHtyYW5kb21Ob25jZX1cIj4ke3NjcmlwdH08L3NjcmlwdD5gO1xuICB9XG5cbiAgaWYgKGN0eC5zdHlsZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG5vZGUgPSBoKFwic3R5bGVcIiwge1xuICAgICAgaWQ6IFwiX19GUlNIX1NUWUxFXCIsXG4gICAgICBkYW5nZXJvdXNseVNldElubmVySFRNTDogeyBfX2h0bWw6IGN0eC5zdHlsZXMuam9pbihcIlxcblwiKSB9LFxuICAgIH0pO1xuICAgIGhlYWRDb21wb25lbnRzLnNwbGljZSgwLCAwLCBub2RlKTtcbiAgfVxuXG4gIGZvciAoY29uc3Qgc3R5bGUgb2Ygc3R5bGVUYWdzKSB7XG4gICAgY29uc3Qgbm9kZSA9IGgoXCJzdHlsZVwiLCB7XG4gICAgICBpZDogc3R5bGUuaWQsXG4gICAgICBkYW5nZXJvdXNseVNldElubmVySFRNTDogeyBfX2h0bWw6IHN0eWxlLmNzc1RleHQgfSxcbiAgICAgIG1lZGlhOiBzdHlsZS5tZWRpYSxcbiAgICB9KTtcbiAgICBoZWFkQ29tcG9uZW50cy5zcGxpY2UoMCwgMCwgbm9kZSk7XG4gIH1cblxuICBjb25zdCBodG1sID0gdGVtcGxhdGUoe1xuICAgIGJvZHlIdG1sLFxuICAgIGhlYWRDb21wb25lbnRzLFxuICAgIGltcG9ydHMsXG4gICAgcHJlbG9hZHM6IG9wdHMucHJlbG9hZHMsXG4gICAgbGFuZzogY3R4LmxhbmcsXG4gIH0pO1xuXG4gIHJldHVybiBbaHRtbCwgY3NwXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZU9wdGlvbnMge1xuICBib2R5SHRtbDogc3RyaW5nO1xuICBoZWFkQ29tcG9uZW50czogQ29tcG9uZW50Q2hpbGRyZW5bXTtcbiAgaW1wb3J0czogKHJlYWRvbmx5IFtzdHJpbmcsIHN0cmluZ10pW107XG4gIHByZWxvYWRzOiBzdHJpbmdbXTtcbiAgbGFuZzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVtcGxhdGUob3B0czogVGVtcGxhdGVPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgcGFnZSA9IGgoXG4gICAgXCJodG1sXCIsXG4gICAgeyBsYW5nOiBvcHRzLmxhbmcgfSxcbiAgICBoKFxuICAgICAgXCJoZWFkXCIsXG4gICAgICBudWxsLFxuICAgICAgaChcIm1ldGFcIiwgeyBjaGFyU2V0OiBcIlVURi04XCIgfSksXG4gICAgICBoKFwibWV0YVwiLCB7XG4gICAgICAgIG5hbWU6IFwidmlld3BvcnRcIixcbiAgICAgICAgY29udGVudDogXCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MS4wXCIsXG4gICAgICB9KSxcbiAgICAgIG9wdHMucHJlbG9hZHMubWFwKChzcmMpID0+XG4gICAgICAgIGgoXCJsaW5rXCIsIHsgcmVsOiBcIm1vZHVsZXByZWxvYWRcIiwgaHJlZjogc3JjIH0pXG4gICAgICApLFxuICAgICAgb3B0cy5pbXBvcnRzLm1hcCgoW3NyYywgbm9uY2VdKSA9PlxuICAgICAgICBoKFwic2NyaXB0XCIsIHsgc3JjOiBzcmMsIG5vbmNlOiBub25jZSwgdHlwZTogXCJtb2R1bGVcIiB9KVxuICAgICAgKSxcbiAgICAgIG9wdHMuaGVhZENvbXBvbmVudHMsXG4gICAgKSxcbiAgICBoKFwiYm9keVwiLCB7IGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7IF9faHRtbDogb3B0cy5ib2R5SHRtbCB9IH0pLFxuICApO1xuICByZXR1cm4gXCI8IURPQ1RZUEUgaHRtbD5cIiArIHJlbmRlclRvU3RyaW5nKHBhZ2UpO1xufVxuXG4vLyBTZXQgdXAgYSBwcmVhY3Qgb3B0aW9uIGhvb2sgdG8gdHJhY2sgd2hlbiB2bm9kZSB3aXRoIGN1c3RvbSBmdW5jdGlvbnMgYXJlXG4vLyBjcmVhdGVkLlxuY29uc3QgSVNMQU5EUzogSXNsYW5kW10gPSBbXTtcbmNvbnN0IEVOQ09VTlRFUkVEX0lTTEFORFM6IFNldDxJc2xhbmQ+ID0gbmV3IFNldChbXSk7XG5sZXQgSVNMQU5EX1BST1BTOiB1bmtub3duW10gPSBbXTtcbmNvbnN0IG9yaWdpbmFsSG9vayA9IG9wdGlvbnMudm5vZGU7XG5sZXQgaWdub3JlTmV4dCA9IGZhbHNlO1xub3B0aW9ucy52bm9kZSA9ICh2bm9kZSkgPT4ge1xuICBhc3NldEhhc2hpbmdIb29rKHZub2RlKTtcbiAgY29uc3Qgb3JpZ2luYWxUeXBlID0gdm5vZGUudHlwZSBhcyBDb21wb25lbnRUeXBlPHVua25vd24+O1xuICBpZiAodHlwZW9mIHZub2RlLnR5cGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGNvbnN0IGlzbGFuZCA9IElTTEFORFMuZmluZCgoaXNsYW5kKSA9PiBpc2xhbmQuY29tcG9uZW50ID09PSBvcmlnaW5hbFR5cGUpO1xuICAgIGlmIChpc2xhbmQpIHtcbiAgICAgIGlmIChpZ25vcmVOZXh0KSB7XG4gICAgICAgIGlnbm9yZU5leHQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgRU5DT1VOVEVSRURfSVNMQU5EUy5hZGQoaXNsYW5kKTtcbiAgICAgIHZub2RlLnR5cGUgPSAocHJvcHMpID0+IHtcbiAgICAgICAgaWdub3JlTmV4dCA9IHRydWU7XG4gICAgICAgIGNvbnN0IGNoaWxkID0gaChvcmlnaW5hbFR5cGUsIHByb3BzKTtcbiAgICAgICAgSVNMQU5EX1BST1BTLnB1c2gocHJvcHMpO1xuICAgICAgICByZXR1cm4gaChcbiAgICAgICAgICBgIS0tZnJzaC0ke2lzbGFuZC5pZH06JHtJU0xBTkRfUFJPUFMubGVuZ3RoIC0gMX0tLWAsXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICBjaGlsZCxcbiAgICAgICAgKTtcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIGlmIChvcmlnaW5hbEhvb2spIG9yaWdpbmFsSG9vayh2bm9kZSk7XG59O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsY0FBYyxRQUFRLDBCQUEwQjtBQUN6RCxTQUEyQyxDQUFDLEVBQUUsT0FBTyxRQUFRLFNBQVM7QUFhdEUsU0FBUyxZQUFZLFFBQVEscUJBQXFCO0FBQ2xELFNBQVMsV0FBVyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsYUFBYSxRQUFRLG9CQUFvQjtBQUU1RSxTQUFTLGNBQWMsUUFBUSxpQkFBaUI7QUFDaEQsU0FBUyxnQkFBZ0IsUUFBUSxzQkFBc0I7QUFDdkQsU0FBUyxvQkFBb0IsUUFBUSxrQkFBa0I7QUFtQnZELE9BQU8sTUFBTTtJQUNYLENBQUMsRUFBRSxDQUFTO0lBQ1osQ0FBQyxLQUFLLEdBQXlCLElBQUksTUFBTTtJQUN6QyxDQUFDLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQyxHQUFHLENBQU07SUFDVixDQUFDLEtBQUssQ0FBUztJQUNmLENBQUMsSUFBSSxDQUFTO0lBRWQsWUFBWSxFQUFVLEVBQUUsR0FBUSxFQUFFLEtBQWEsRUFBRSxJQUFZLENBQUU7UUFDN0QsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHO1FBQ1gsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHO1FBQ1osSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHO1FBQ2QsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHO0lBQ2Y7SUFFQSw2Q0FBNkMsR0FDN0MsSUFB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