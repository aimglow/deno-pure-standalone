/**
 * @file Rutt is a tiny http router designed for use with deno and deno deploy.
 * It is written in about 200 lines of code and is pretty fast, using an
 * extended type of the web-standard {@link URLPattern} to provide fast and
 * easy route matching.
 */ /**
 * The default other handler for the router. By default it responds with `null`
 * body and a status of 404.
 */ export function defaultOtherHandler(_req) {
    return new Response(null, {
        status: 404
    });
}
/**
 * The default error handler for the router. By default it responds with `null`
 * body and a status of 500 along with `console.error` logging the caught error.
 */ export function defaultErrorHandler(_req, _ctx, err) {
    console.error(err);
    return new Response(null, {
        status: 500
    });
}
/**
 * The default unknown method handler for the router. By default it responds
 * with `null` body, a status of 405 and the `Accept` header set to all
 * {@link METHODS known methods}.
 */ export function defaultUnknownMethodHandler(_req, _ctx, knownMethods) {
    return new Response(null, {
        status: 405,
        headers: {
            Accept: knownMethods.join(", ")
        }
    });
}
/**
 * All known HTTP methods.
 */ export const METHODS = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "PATCH"
];
const methodRegex = new RegExp(`(?<=^(?:${METHODS.join("|")}))@`);
/**
 * Builds an {@link InternalRoutes} array from a {@link Routes} record.
 *
 * @param routes A {@link Routes} record
 * @returns The built {@link InternalRoutes}
 */ export function buildInternalRoutes(routes) {
    const internalRoutesRecord = {};
    for (const [route, handler] of Object.entries(routes)){
        let [methodOrPath, path] = route.split(methodRegex);
        let method = methodOrPath;
        if (!path) {
            path = methodOrPath;
            method = "any";
        }
        const r = internalRoutesRecord[path] ?? {
            pattern: new URLPattern({
                pathname: path
            }),
            methods: {}
        };
        r.methods[method] = handler;
        internalRoutesRecord[path] = r;
    }
    return Object.values(internalRoutesRecord);
}
/**
 * A simple and tiny router for deno
 *
 * @example
 * ```ts
 * import { serve } from "https://deno.land/std/http/server.ts";
 * import { router } from "https://deno.land/x/rutt/mod.ts";
 *
 * await serve(
 *   router({
 *     "/": (_req) => new Response("Hello world!", { status: 200 }),
 *   }),
 * );
 * ```
 *
 * @param routes A record of all routes and their corresponding handler functions
 * @param other An optional parameter which contains a handler for anything that
 * doesn't match the `routes` parameter
 * @param error An optional parameter which contains a handler for any time it
 * fails to run the default request handling code
 * @param unknownMethod An optional parameter which contains a handler for any
 * time a method that is not defined is used
 * @returns A deno std compatible request handler
 */ export function router(routes, other = defaultOtherHandler, error = defaultErrorHandler, unknownMethod = defaultUnknownMethodHandler) {
    const internalRoutes = Array.isArray(routes) ? routes : buildInternalRoutes(routes);
    return async (req, ctx)=>{
        try {
            for (const { pattern , methods  } of internalRoutes){
                let res;
                let groups;
                if (pattern instanceof URLPattern) {
                    res = pattern.exec(req.url);
                    groups = res?.pathname.groups ?? {};
                } else {
                    res = pattern.exec(req.url);
                    groups = res?.groups ?? {};
                }
                if (res !== null) {
                    for (const [method, handler] of Object.entries(methods)){
                        if (req.method === method) {
                            return await handler(req, ctx, groups);
                        }
                    }
                    if (methods["any"]) {
                        return await methods["any"](req, ctx, groups);
                    } else {
                        return await unknownMethod(req, ctx, Object.keys(methods));
                    }
                }
            }
            return await other(req, ctx);
        } catch (err) {
            return error(req, ctx, err);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcnV0dEAwLjAuMTMvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGUgUnV0dCBpcyBhIHRpbnkgaHR0cCByb3V0ZXIgZGVzaWduZWQgZm9yIHVzZSB3aXRoIGRlbm8gYW5kIGRlbm8gZGVwbG95LlxuICogSXQgaXMgd3JpdHRlbiBpbiBhYm91dCAyMDAgbGluZXMgb2YgY29kZSBhbmQgaXMgcHJldHR5IGZhc3QsIHVzaW5nIGFuXG4gKiBleHRlbmRlZCB0eXBlIG9mIHRoZSB3ZWItc3RhbmRhcmQge0BsaW5rIFVSTFBhdHRlcm59IHRvIHByb3ZpZGUgZmFzdCBhbmRcbiAqIGVhc3kgcm91dGUgbWF0Y2hpbmcuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb25uSW5mbyB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAMC4xNTIuMC9odHRwL3NlcnZlci50c1wiO1xuXG4vKipcbiAqIFByb3ZpZGVzIGFyYml0cmFyeSBjb250ZXh0IHRvIHtAbGluayBIYW5kbGVyfSBmdW5jdGlvbnMgYWxvbmcgd2l0aFxuICoge0BsaW5rIENvbm5JbmZvIGNvbm5lY3Rpb24gaW5mb3JtYXRpb259LlxuICovXG5leHBvcnQgdHlwZSBIYW5kbGVyQ29udGV4dDxUID0gdW5rbm93bj4gPSBUICYgQ29ubkluZm87XG5cbi8qKlxuICogQSBoYW5kbGVyIGZvciBIVFRQIHJlcXVlc3RzLiBDb25zdW1lcyBhIHJlcXVlc3QgYW5kIHtAbGluayBIYW5kbGVyQ29udGV4dH1cbiAqIGFuZCByZXR1cm5zIGFuIG9wdGlvbmFsbHkgYXN5bmMgcmVzcG9uc2UuXG4gKi9cbmV4cG9ydCB0eXBlIEhhbmRsZXI8VCA9IHVua25vd24+ID0gKFxuICByZXE6IFJlcXVlc3QsXG4gIGN0eDogSGFuZGxlckNvbnRleHQ8VD4sXG4pID0+IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT47XG5cbi8qKlxuICogQSBoYW5kbGVyIHR5cGUgZm9yIGFueXRpbWUgdGhlIGBNYXRjaEhhbmRsZXJgIG9yIGBvdGhlcmAgcGFyYW1ldGVyIGhhbmRsZXJcbiAqIGZhaWxzXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9ySGFuZGxlcjxUID0gdW5rbm93bj4gPSAoXG4gIHJlcTogUmVxdWVzdCxcbiAgY3R4OiBIYW5kbGVyQ29udGV4dDxUPixcbiAgZXJyOiB1bmtub3duLFxuKSA9PiBSZXNwb25zZSB8IFByb21pc2U8UmVzcG9uc2U+O1xuXG4vKipcbiAqIEEgaGFuZGxlciB0eXBlIGZvciBhbnl0aW1lIGEgbWV0aG9kIGlzIHJlY2VpdmVkIHRoYXQgaXMgbm90IGRlZmluZWRcbiAqL1xuZXhwb3J0IHR5cGUgVW5rbm93bk1ldGhvZEhhbmRsZXI8VCA9IHVua25vd24+ID0gKFxuICByZXE6IFJlcXVlc3QsXG4gIGN0eDogSGFuZGxlckNvbnRleHQ8VD4sXG4gIGtub3duTWV0aG9kczogc3RyaW5nW10sXG4pID0+IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT47XG5cbi8qKlxuICogQSBoYW5kbGVyIHR5cGUgZm9yIGEgcm91dGVyIHBhdGggbWF0Y2ggd2hpY2ggZ2V0cyBwYXNzZWQgdGhlIG1hdGNoZWQgdmFsdWVzXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoSGFuZGxlcjxUID0gdW5rbm93bj4gPSAoXG4gIHJlcTogUmVxdWVzdCxcbiAgY3R4OiBIYW5kbGVyQ29udGV4dDxUPixcbiAgbWF0Y2g6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4pID0+IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT47XG5cbi8qKlxuICogQSByZWNvcmQgb2Ygcm91dGUgcGF0aHMgYW5kIHtAbGluayBNYXRjaEhhbmRsZXJ9cyB3aGljaCBhcmUgY2FsbGVkIHdoZW4gYSBtYXRjaCBpc1xuICogZm91bmQgYWxvbmcgd2l0aCBpdCdzIHZhbHVlcy5cbiAqXG4gKiBUaGUgcm91dGUgcGF0aHMgZm9sbG93IHRoZSB7QGxpbmsgVVJMUGF0dGVybn0gZm9ybWF0IHdpdGggdGhlIGFkZGl0aW9uIG9mXG4gKiBiZWluZyBhYmxlIHRvIHByZWZpeCBhIHJvdXRlIHdpdGggYSBtZXRob2QgbmFtZSBhbmQgdGhlIGBAYCBzaWduLiBGb3JcbiAqIGV4YW1wbGUgYSByb3V0ZSBvbmx5IGFjY2VwdGluZyBgR0VUYCByZXF1ZXN0cyB3b3VsZCBsb29rIGxpa2U6IGBHRVRAL2AuXG4gKi9cbi8vIGRlbm8tbGludC1pZ25vcmUgYmFuLXR5cGVzXG5leHBvcnQgdHlwZSBSb3V0ZXM8VCA9IHt9PiA9IFJlY29yZDxzdHJpbmcsIE1hdGNoSGFuZGxlcjxUPj47XG5cbi8qKlxuICogVGhlIGludGVybmFsIHJvdXRlIG9iamVjdCBjb250YWlucyBlaXRoZXIgYSB7QGxpbmsgUmVnRXhwfSBwYXR0ZXJuIG9yXG4gKiB7QGxpbmsgVVJMUGF0dGVybn0gd2hpY2ggaXMgbWF0Y2hlZCBhZ2FpbnN0IHRoZSBpbmNvbWluZyByZXF1ZXN0XG4gKiBVUkwuIElmIGEgbWF0Y2ggaXMgZm91bmQgZm9yIGJvdGggdGhlIHBhdHRlcm4gYW5kIG1ldGhvZCB0aGUgYXNzb2NpYXRlZFxuICoge0BsaW5rIE1hdGNoSGFuZGxlcn0gaXMgY2FsbGVkLlxuICovXG4vLyBkZW5vLWxpbnQtaWdub3JlIGJhbi10eXBlc1xuZXhwb3J0IHR5cGUgSW50ZXJuYWxSb3V0ZTxUID0ge30+ID0ge1xuICBwYXR0ZXJuOiBSZWdFeHAgfCBVUkxQYXR0ZXJuO1xuICBtZXRob2RzOiBSZWNvcmQ8c3RyaW5nLCBNYXRjaEhhbmRsZXI8VD4+O1xufTtcblxuLyoqXG4gKiBBbiBhcnJheSBvZiB7QGxpbmsgSW50ZXJuYWxSb3V0ZSBpbnRlcm5hbCByb3V0ZX0gb2JqZWN0cyB3aGljaCB0aGVcbiAqIHtAbGluayBSb3V0ZXMgcm91dGVzfSByZWNvcmQgaXMgbWFwcGVkIGludG8uIFRoaXMgYXJyYXkgaXMgdXNlZCBpbnRlcm5hbGx5XG4gKiBpbiB0aGUge0BsaW5rIHJvdXRlcn0gZnVuY3Rpb24gYW5kIGNhbiBldmVuIGJlIHBhc3NlZCBkaXJlY3RseSB0byBpdCBpZiB5b3VcbiAqIGRvIG5vdCB3aXNoIHRvIHVzZSB0aGUge0BsaW5rIFJvdXRlcyByb3V0ZXN9IHJlY29yZCBvciB3YW50IG1vcmUgZmluZSBncmFpbmVkXG4gKiBjb250cm9sIG92ZXIgbWF0Y2hlcywgZm9yIGV4YW1wbGUgYnkgdXNpbmcgYSB7QGxpbmsgUmVnRXhwfSBwYXR0ZXJuIGluc3RlYWRcbiAqIG9mIGEge0BsaW5rIFVSTFBhdHRlcm59LlxuICovXG4vLyBkZW5vLWxpbnQtaWdub3JlIGJhbi10eXBlc1xuZXhwb3J0IHR5cGUgSW50ZXJuYWxSb3V0ZXM8VCA9IHt9PiA9IEludGVybmFsUm91dGU8VD5bXTtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBvdGhlciBoYW5kbGVyIGZvciB0aGUgcm91dGVyLiBCeSBkZWZhdWx0IGl0IHJlc3BvbmRzIHdpdGggYG51bGxgXG4gKiBib2R5IGFuZCBhIHN0YXR1cyBvZiA0MDQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0T3RoZXJIYW5kbGVyKF9yZXE6IFJlcXVlc3QpOiBSZXNwb25zZSB7XG4gIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge1xuICAgIHN0YXR1czogNDA0LFxuICB9KTtcbn1cblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBlcnJvciBoYW5kbGVyIGZvciB0aGUgcm91dGVyLiBCeSBkZWZhdWx0IGl0IHJlc3BvbmRzIHdpdGggYG51bGxgXG4gKiBib2R5IGFuZCBhIHN0YXR1cyBvZiA1MDAgYWxvbmcgd2l0aCBgY29uc29sZS5lcnJvcmAgbG9nZ2luZyB0aGUgY2F1Z2h0IGVycm9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdEVycm9ySGFuZGxlcihcbiAgX3JlcTogUmVxdWVzdCxcbiAgX2N0eDogSGFuZGxlckNvbnRleHQsXG4gIGVycjogdW5rbm93bixcbik6IFJlc3BvbnNlIHtcbiAgY29uc29sZS5lcnJvcihlcnIpO1xuXG4gIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge1xuICAgIHN0YXR1czogNTAwLFxuICB9KTtcbn1cblxuLyoqXG4gKiBUaGUgZGVmYXVsdCB1bmtub3duIG1ldGhvZCBoYW5kbGVyIGZvciB0aGUgcm91dGVyLiBCeSBkZWZhdWx0IGl0IHJlc3BvbmRzXG4gKiB3aXRoIGBudWxsYCBib2R5LCBhIHN0YXR1cyBvZiA0MDUgYW5kIHRoZSBgQWNjZXB0YCBoZWFkZXIgc2V0IHRvIGFsbFxuICoge0BsaW5rIE1FVEhPRFMga25vd24gbWV0aG9kc30uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0VW5rbm93bk1ldGhvZEhhbmRsZXIoXG4gIF9yZXE6IFJlcXVlc3QsXG4gIF9jdHg6IEhhbmRsZXJDb250ZXh0LFxuICBrbm93bk1ldGhvZHM6IHN0cmluZ1tdLFxuKTogUmVzcG9uc2Uge1xuICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtcbiAgICBzdGF0dXM6IDQwNSxcbiAgICBoZWFkZXJzOiB7XG4gICAgICBBY2NlcHQ6IGtub3duTWV0aG9kcy5qb2luKFwiLCBcIiksXG4gICAgfSxcbiAgfSk7XG59XG5cbi8qKlxuICogQWxsIGtub3duIEhUVFAgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGNvbnN0IE1FVEhPRFMgPSBbXG4gIFwiR0VUXCIsXG4gIFwiSEVBRFwiLFxuICBcIlBPU1RcIixcbiAgXCJQVVRcIixcbiAgXCJERUxFVEVcIixcbiAgXCJPUFRJT05TXCIsXG4gIFwiUEFUQ0hcIixcbl0gYXMgY29uc3Q7XG5cbmNvbnN0IG1ldGhvZFJlZ2V4ID0gbmV3IFJlZ0V4cChgKD88PV4oPzoke01FVEhPRFMuam9pbihcInxcIil9KSlAYCk7XG5cbi8qKlxuICogQnVpbGRzIGFuIHtAbGluayBJbnRlcm5hbFJvdXRlc30gYXJyYXkgZnJvbSBhIHtAbGluayBSb3V0ZXN9IHJlY29yZC5cbiAqXG4gKiBAcGFyYW0gcm91dGVzIEEge0BsaW5rIFJvdXRlc30gcmVjb3JkXG4gKiBAcmV0dXJucyBUaGUgYnVpbHQge0BsaW5rIEludGVybmFsUm91dGVzfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRJbnRlcm5hbFJvdXRlczxUID0gdW5rbm93bj4oXG4gIHJvdXRlczogUm91dGVzPFQ+LFxuKTogSW50ZXJuYWxSb3V0ZXM8VD4ge1xuICBjb25zdCBpbnRlcm5hbFJvdXRlc1JlY29yZDogUmVjb3JkPFxuICAgIHN0cmluZyxcbiAgICB7IHBhdHRlcm46IFVSTFBhdHRlcm47IG1ldGhvZHM6IFJlY29yZDxzdHJpbmcsIE1hdGNoSGFuZGxlcjxUPj4gfVxuICA+ID0ge307XG4gIGZvciAoY29uc3QgW3JvdXRlLCBoYW5kbGVyXSBvZiBPYmplY3QuZW50cmllcyhyb3V0ZXMpKSB7XG4gICAgbGV0IFttZXRob2RPclBhdGgsIHBhdGhdID0gcm91dGUuc3BsaXQobWV0aG9kUmVnZXgpO1xuICAgIGxldCBtZXRob2QgPSBtZXRob2RPclBhdGg7XG4gICAgaWYgKCFwYXRoKSB7XG4gICAgICBwYXRoID0gbWV0aG9kT3JQYXRoO1xuICAgICAgbWV0aG9kID0gXCJhbnlcIjtcbiAgICB9XG4gICAgY29uc3QgciA9IGludGVybmFsUm91dGVzUmVjb3JkW3BhdGhdID8/IHtcbiAgICAgIHBhdHRlcm46IG5ldyBVUkxQYXR0ZXJuKHsgcGF0aG5hbWU6IHBhdGggfSksXG4gICAgICBtZXRob2RzOiB7fSxcbiAgICB9O1xuICAgIHIubWV0aG9kc1ttZXRob2RdID0gaGFuZGxlcjtcbiAgICBpbnRlcm5hbFJvdXRlc1JlY29yZFtwYXRoXSA9IHI7XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhpbnRlcm5hbFJvdXRlc1JlY29yZCk7XG59XG5cbi8qKlxuICogQSBzaW1wbGUgYW5kIHRpbnkgcm91dGVyIGZvciBkZW5vXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBzZXJ2ZSB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGQvaHR0cC9zZXJ2ZXIudHNcIjtcbiAqIGltcG9ydCB7IHJvdXRlciB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC94L3J1dHQvbW9kLnRzXCI7XG4gKlxuICogYXdhaXQgc2VydmUoXG4gKiAgIHJvdXRlcih7XG4gKiAgICAgXCIvXCI6IChfcmVxKSA9PiBuZXcgUmVzcG9uc2UoXCJIZWxsbyB3b3JsZCFcIiwgeyBzdGF0dXM6IDIwMCB9KSxcbiAqICAgfSksXG4gKiApO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHJvdXRlcyBBIHJlY29yZCBvZiBhbGwgcm91dGVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIGhhbmRsZXIgZnVuY3Rpb25zXG4gKiBAcGFyYW0gb3RoZXIgQW4gb3B0aW9uYWwgcGFyYW1ldGVyIHdoaWNoIGNvbnRhaW5zIGEgaGFuZGxlciBmb3IgYW55dGhpbmcgdGhhdFxuICogZG9lc24ndCBtYXRjaCB0aGUgYHJvdXRlc2AgcGFyYW1ldGVyXG4gKiBAcGFyYW0gZXJyb3IgQW4gb3B0aW9uYWwgcGFyYW1ldGVyIHdoaWNoIGNvbnRhaW5zIGEgaGFuZGxlciBmb3IgYW55IHRpbWUgaXRcbiAqIGZhaWxzIHRvIHJ1biB0aGUgZGVmYXVsdCByZXF1ZXN0IGhhbmRsaW5nIGNvZGVcbiAqIEBwYXJhbSB1bmtub3duTWV0aG9kIEFuIG9wdGlvbmFsIHBhcmFtZXRlciB3aGljaCBjb250YWlucyBhIGhhbmRsZXIgZm9yIGFueVxuICogdGltZSBhIG1ldGhvZCB0aGF0IGlzIG5vdCBkZWZpbmVkIGlzIHVzZWRcbiAqIEByZXR1cm5zIEEgZGVubyBzdGQgY29tcGF0aWJsZSByZXF1ZXN0IGhhbmRsZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdXRlcjxUID0gdW5rbm93bj4oXG4gIHJvdXRlczogUm91dGVzPFQ+IHwgSW50ZXJuYWxSb3V0ZXM8VD4sXG4gIG90aGVyOiBIYW5kbGVyPFQ+ID0gZGVmYXVsdE90aGVySGFuZGxlcixcbiAgZXJyb3I6IEVycm9ySGFuZGxlcjxUPiA9IGRlZmF1bHRFcnJvckhhbmRsZXIsXG4gIHVua25vd25NZXRob2Q6IFVua25vd25NZXRob2RIYW5kbGVyPFQ+ID0gZGVmYXVsdFVua25vd25NZXRob2RIYW5kbGVyLFxuKTogSGFuZGxlcjxUPiB7XG4gIGNvbnN0IGludGVybmFsUm91dGVzID0gQXJyYXkuaXNBcnJheShyb3V0ZXMpXG4gICAgPyByb3V0ZXNcbiAgICA6IGJ1aWxkSW50ZXJuYWxSb3V0ZXMocm91dGVzKTtcblxuICByZXR1cm4gYXN5bmMgKHJlcSwgY3R4KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGZvciAoY29uc3QgeyBwYXR0ZXJuLCBtZXRob2RzIH0gb2YgaW50ZXJuYWxSb3V0ZXMpIHtcbiAgICAgICAgbGV0IHJlczogVVJMUGF0dGVyblJlc3VsdCB8IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XG4gICAgICAgIGxldCBncm91cHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbiAgICAgICAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBVUkxQYXR0ZXJuKSB7XG4gICAgICAgICAgcmVzID0gcGF0dGVybi5leGVjKHJlcS51cmwpO1xuICAgICAgICAgIGdyb3VwcyA9IHJlcz8ucGF0aG5hbWUuZ3JvdXBzID8/IHt9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcyA9IHBhdHRlcm4uZXhlYyhyZXEudXJsKTtcbiAgICAgICAgICBncm91cHMgPSByZXM/Lmdyb3VwcyA/PyB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXMgIT09IG51bGwpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IFttZXRob2QsIGhhbmRsZXJdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGhvZHMpKSB7XG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gbWV0aG9kKSB7XG4gICAgICAgICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVyKFxuICAgICAgICAgICAgICAgIHJlcSxcbiAgICAgICAgICAgICAgICBjdHgsXG4gICAgICAgICAgICAgICAgZ3JvdXBzLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtZXRob2RzW1wiYW55XCJdKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgbWV0aG9kc1tcImFueVwiXShcbiAgICAgICAgICAgICAgcmVxLFxuICAgICAgICAgICAgICBjdHgsXG4gICAgICAgICAgICAgIGdyb3VwcyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB1bmtub3duTWV0aG9kKFxuICAgICAgICAgICAgICByZXEsXG4gICAgICAgICAgICAgIGN0eCxcbiAgICAgICAgICAgICAgT2JqZWN0LmtleXMobWV0aG9kcyksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gYXdhaXQgb3RoZXIocmVxLCBjdHgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcmV0dXJuIGVycm9yKHJlcSwgY3R4LCBlcnIpO1xuICAgIH1cbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Q0FLQyxHQUVELEFBK0VBOzs7Q0FHQyxHQUNELE9BQU8sU0FBUyxvQkFBb0IsSUFBYSxFQUFZO0lBQzNELE9BQU8sSUFBSSxTQUFTLElBQUksRUFBRTtRQUN4QixRQUFRO0lBQ1Y7QUFDRixDQUFDO0FBRUQ7OztDQUdDLEdBQ0QsT0FBTyxTQUFTLG9CQUNkLElBQWEsRUFDYixJQUFvQixFQUNwQixHQUFZLEVBQ0Y7SUFDVixRQUFRLEtBQUssQ0FBQztJQUVkLE9BQU8sSUFBSSxTQUFTLElBQUksRUFBRTtRQUN4QixRQUFRO0lBQ1Y7QUFDRixDQUFDO0FBRUQ7Ozs7Q0FJQyxHQUNELE9BQU8sU0FBUyw0QkFDZCxJQUFhLEVBQ2IsSUFBb0IsRUFDcEIsWUFBc0IsRUFDWjtJQUNWLE9BQU8sSUFBSSxTQUFTLElBQUksRUFBRTtRQUN4QixRQUFRO1FBQ1IsU0FBUztZQUNQLFFBQVEsYUFBYSxJQUFJLENBQUM7UUFDNUI7SUFDRjtBQUNGLENBQUM7QUFFRDs7Q0FFQyxHQUNELE9BQU8sTUFBTSxVQUFVO0lBQ3JCO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0NBQ0QsQ0FBVTtBQUVYLE1BQU0sY0FBYyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUM7QUFFaEU7Ozs7O0NBS0MsR0FDRCxPQUFPLFNBQVMsb0JBQ2QsTUFBaUIsRUFDRTtJQUNuQixNQUFNLHVCQUdGLENBQUM7SUFDTCxLQUFLLE1BQU0sQ0FBQyxPQUFPLFFBQVEsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFTO1FBQ3JELElBQUksQ0FBQyxjQUFjLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQztRQUN2QyxJQUFJLFNBQVM7UUFDYixJQUFJLENBQUMsTUFBTTtZQUNULE9BQU87WUFDUCxTQUFTO1FBQ1gsQ0FBQztRQUNELE1BQU0sSUFBSSxvQkFBb0IsQ0FBQyxLQUFLLElBQUk7WUFDdEMsU0FBUyxJQUFJLFdBQVc7Z0JBQUUsVUFBVTtZQUFLO1lBQ3pDLFNBQVMsQ0FBQztRQUNaO1FBQ0EsRUFBRSxPQUFPLENBQUMsT0FBTyxHQUFHO1FBQ3BCLG9CQUFvQixDQUFDLEtBQUssR0FBRztJQUMvQjtJQUVBLE9BQU8sT0FBTyxNQUFNLENBQUM7QUFDdkIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQXVCQyxHQUNELE9BQU8sU0FBUyxPQUNkLE1BQXFDLEVBQ3JDLFFBQW9CLG1CQUFtQixFQUN2QyxRQUF5QixtQkFBbUIsRUFDNUMsZ0JBQXlDLDJCQUEyQixFQUN4RDtJQUNaLE1BQU0saUJBQWlCLE1BQU0sT0FBTyxDQUFDLFVBQ2pDLFNBQ0Esb0JBQW9CLE9BQU87SUFFL0IsT0FBTyxPQUFPLEtBQUssTUFBUTtRQUN6QixJQUFJO1lBQ0YsS0FBSyxNQUFNLEVBQUUsUUFBTyxFQUFFLFFBQU8sRUFBRSxJQUFJLGVBQWdCO2dCQUNqRCxJQUFJO2dCQUNKLElBQUk7Z0JBRUosSUFBSSxtQkFBbUIsWUFBWTtvQkFDakMsTUFBTSxRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUc7b0JBQzFCLFNBQVMsS0FBSyxTQUFTLE1BQU0sSUFBSSxDQUFDO2dCQUNwQyxPQUFPO29CQUNMLE1BQU0sUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHO29CQUMxQixTQUFTLEtBQUssVUFBVSxDQUFDO2dCQUMzQixDQUFDO2dCQUVELElBQUksUUFBUSxJQUFJLEVBQUU7b0JBQ2hCLEtBQUssTUFBTSxDQUFDLFFBQVEsUUFBUSxJQUFJLE9BQU8sT0FBTyxDQUFDLFNBQVU7d0JBQ3ZELElBQUksSUFBSSxNQUFNLEtBQUssUUFBUTs0QkFDekIsT0FBTyxNQUFNLFFBQ1gsS0FDQSxLQUNBO3dCQUVKLENBQUM7b0JBQ0g7b0JBRUEsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO3dCQUNsQixPQUFPLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FDekIsS0FDQSxLQUNBO29CQUVKLE9BQU87d0JBQ0wsT0FBTyxNQUFNLGNBQ1gsS0FDQSxLQUNBLE9BQU8sSUFBSSxDQUFDO29CQUVoQixDQUFDO2dCQUNILENBQUM7WUFDSDtZQUVBLE9BQU8sTUFBTSxNQUFNLEtBQUs7UUFDMUIsRUFBRSxPQUFPLEtBQUs7WUFDWixPQUFPLE1BQU0sS0FBSyxLQUFLO1FBQ3pCO0lBQ0Y7QUFDRixDQUFDIn0=