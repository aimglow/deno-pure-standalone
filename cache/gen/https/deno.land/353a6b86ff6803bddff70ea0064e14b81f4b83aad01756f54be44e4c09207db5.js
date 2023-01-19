import { BUILD_ID } from "./constants.ts";
import { denoPlugin, esbuild, toFileUrl } from "./deps.ts";
let esbuildInitialized = false;
async function ensureEsbuildInitialized() {
    if (esbuildInitialized === false) {
        if (Deno.run === undefined) {
            esbuildInitialized = esbuild.initialize({
                wasmURL: "https://deno.land/x/esbuild@v0.14.51/esbuild.wasm",
                worker: false
            });
        } else {
            esbuild.initialize({});
        }
        await esbuildInitialized;
        esbuildInitialized = true;
    } else if (esbuildInitialized instanceof Promise) {
        await esbuildInitialized;
    }
}
const JSX_RUNTIME_MODE = {
    "react": "transform",
    "react-jsx": "automatic"
};
export class Bundler {
    #importMapURL;
    #jsxConfig;
    #islands;
    #plugins;
    #cache = undefined;
    #dev;
    constructor(islands, plugins, importMapURL, jsxConfig, dev){
        this.#islands = islands;
        this.#plugins = plugins;
        this.#importMapURL = importMapURL;
        this.#jsxConfig = jsxConfig;
        this.#dev = dev;
    }
    async bundle() {
        const entryPoints = {
            main: this.#dev ? new URL("../../src/runtime/main_dev.ts", import.meta.url).href : new URL("../../src/runtime/main.ts", import.meta.url).href
        };
        for (const island of this.#islands){
            entryPoints[`island-${island.id}`] = island.url;
        }
        for (const plugin of this.#plugins){
            for (const [name, url] of Object.entries(plugin.entrypoints ?? {})){
                entryPoints[`plugin-${plugin.name}-${name}`] = url;
            }
        }
        const absWorkingDir = Deno.cwd();
        await ensureEsbuildInitialized();
        // In dev-mode we skip identifier minification to be able to show proper
        // component names in Preact DevTools instead of single characters.
        const minifyOptions = this.#dev ? {
            minifyIdentifiers: false,
            minifySyntax: true,
            minifyWhitespace: true
        } : {
            minify: true
        };
        const bundle = await esbuild.build({
            bundle: true,
            define: {
                __FRSH_BUILD_ID: `"${BUILD_ID}"`
            },
            entryPoints,
            format: "esm",
            metafile: true,
            ...minifyOptions,
            outdir: ".",
            // This is requried to ensure the format of the outputFiles path is the same
            // between windows and linux
            absWorkingDir,
            outfile: "",
            platform: "neutral",
            plugins: [
                denoPlugin({
                    importMapURL: this.#importMapURL
                })
            ],
            sourcemap: this.#dev ? "linked" : false,
            splitting: true,
            target: [
                "chrome99",
                "firefox99",
                "safari15"
            ],
            treeShaking: true,
            write: false,
            jsx: JSX_RUNTIME_MODE[this.#jsxConfig.jsx],
            jsxImportSource: this.#jsxConfig.jsxImportSource
        });
        // const metafileOutputs = bundle.metafile!.outputs;
        // for (const path in metafileOutputs) {
        //   const meta = metafileOutputs[path];
        //   const imports = meta.imports
        //     .filter(({ kind }) => kind === "import-statement")
        //     .map(({ path }) => `/${path}`);
        //   this.#preloads.set(`/${path}`, imports);
        // }
        const cache = new Map();
        const absDirUrlLength = toFileUrl(absWorkingDir).href.length;
        for (const file of bundle.outputFiles){
            cache.set(toFileUrl(file.path).href.substring(absDirUrlLength), file.contents);
        }
        this.#cache = cache;
        return;
    }
    async cache() {
        if (this.#cache === undefined) {
            this.#cache = this.bundle();
        }
        if (this.#cache instanceof Promise) {
            await this.#cache;
        }
        return this.#cache;
    }
    async get(path) {
        const cache = await this.cache();
        return cache.get(path) ?? null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4xLjIvc3JjL3NlcnZlci9idW5kbGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQnVpbGRPcHRpb25zIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3gvZXNidWlsZEB2MC4xNC41MS9tb2QuanNcIjtcbmltcG9ydCB7IEJVSUxEX0lEIH0gZnJvbSBcIi4vY29uc3RhbnRzLnRzXCI7XG5pbXBvcnQgeyBkZW5vUGx1Z2luLCBlc2J1aWxkLCB0b0ZpbGVVcmwgfSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBJc2xhbmQsIFBsdWdpbiB9IGZyb20gXCIuL3R5cGVzLnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSlNYQ29uZmlnIHtcbiAganN4OiBcInJlYWN0XCIgfCBcInJlYWN0LWpzeFwiO1xuICBqc3hJbXBvcnRTb3VyY2U/OiBzdHJpbmc7XG59XG5cbmxldCBlc2J1aWxkSW5pdGlhbGl6ZWQ6IGJvb2xlYW4gfCBQcm9taXNlPHZvaWQ+ID0gZmFsc2U7XG5hc3luYyBmdW5jdGlvbiBlbnN1cmVFc2J1aWxkSW5pdGlhbGl6ZWQoKSB7XG4gIGlmIChlc2J1aWxkSW5pdGlhbGl6ZWQgPT09IGZhbHNlKSB7XG4gICAgaWYgKERlbm8ucnVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVzYnVpbGRJbml0aWFsaXplZCA9IGVzYnVpbGQuaW5pdGlhbGl6ZSh7XG4gICAgICAgIHdhc21VUkw6IFwiaHR0cHM6Ly9kZW5vLmxhbmQveC9lc2J1aWxkQHYwLjE0LjUxL2VzYnVpbGQud2FzbVwiLFxuICAgICAgICB3b3JrZXI6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVzYnVpbGQuaW5pdGlhbGl6ZSh7fSk7XG4gICAgfVxuICAgIGF3YWl0IGVzYnVpbGRJbml0aWFsaXplZDtcbiAgICBlc2J1aWxkSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9IGVsc2UgaWYgKGVzYnVpbGRJbml0aWFsaXplZCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICBhd2FpdCBlc2J1aWxkSW5pdGlhbGl6ZWQ7XG4gIH1cbn1cblxuY29uc3QgSlNYX1JVTlRJTUVfTU9ERSA9IHtcbiAgXCJyZWFjdFwiOiBcInRyYW5zZm9ybVwiLFxuICBcInJlYWN0LWpzeFwiOiBcImF1dG9tYXRpY1wiLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IGNsYXNzIEJ1bmRsZXIge1xuICAjaW1wb3J0TWFwVVJMOiBVUkw7XG4gICNqc3hDb25maWc6IEpTWENvbmZpZztcbiAgI2lzbGFuZHM6IElzbGFuZFtdO1xuICAjcGx1Z2luczogUGx1Z2luW107XG4gICNjYWNoZTogTWFwPHN0cmluZywgVWludDhBcnJheT4gfCBQcm9taXNlPHZvaWQ+IHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAjZGV2OiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGlzbGFuZHM6IElzbGFuZFtdLFxuICAgIHBsdWdpbnM6IFBsdWdpbltdLFxuICAgIGltcG9ydE1hcFVSTDogVVJMLFxuICAgIGpzeENvbmZpZzogSlNYQ29uZmlnLFxuICAgIGRldjogYm9vbGVhbixcbiAgKSB7XG4gICAgdGhpcy4jaXNsYW5kcyA9IGlzbGFuZHM7XG4gICAgdGhpcy4jcGx1Z2lucyA9IHBsdWdpbnM7XG4gICAgdGhpcy4jaW1wb3J0TWFwVVJMID0gaW1wb3J0TWFwVVJMO1xuICAgIHRoaXMuI2pzeENvbmZpZyA9IGpzeENvbmZpZztcbiAgICB0aGlzLiNkZXYgPSBkZXY7XG4gIH1cblxuICBhc3luYyBidW5kbGUoKSB7XG4gICAgY29uc3QgZW50cnlQb2ludHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICBtYWluOiB0aGlzLiNkZXZcbiAgICAgICAgPyBuZXcgVVJMKFwiLi4vLi4vc3JjL3J1bnRpbWUvbWFpbl9kZXYudHNcIiwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmXG4gICAgICAgIDogbmV3IFVSTChcIi4uLy4uL3NyYy9ydW50aW1lL21haW4udHNcIiwgaW1wb3J0Lm1ldGEudXJsKS5ocmVmLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGlzbGFuZCBvZiB0aGlzLiNpc2xhbmRzKSB7XG4gICAgICBlbnRyeVBvaW50c1tgaXNsYW5kLSR7aXNsYW5kLmlkfWBdID0gaXNsYW5kLnVybDtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHBsdWdpbiBvZiB0aGlzLiNwbHVnaW5zKSB7XG4gICAgICBmb3IgKGNvbnN0IFtuYW1lLCB1cmxdIG9mIE9iamVjdC5lbnRyaWVzKHBsdWdpbi5lbnRyeXBvaW50cyA/PyB7fSkpIHtcbiAgICAgICAgZW50cnlQb2ludHNbYHBsdWdpbi0ke3BsdWdpbi5uYW1lfS0ke25hbWV9YF0gPSB1cmw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYWJzV29ya2luZ0RpciA9IERlbm8uY3dkKCk7XG4gICAgYXdhaXQgZW5zdXJlRXNidWlsZEluaXRpYWxpemVkKCk7XG4gICAgLy8gSW4gZGV2LW1vZGUgd2Ugc2tpcCBpZGVudGlmaWVyIG1pbmlmaWNhdGlvbiB0byBiZSBhYmxlIHRvIHNob3cgcHJvcGVyXG4gICAgLy8gY29tcG9uZW50IG5hbWVzIGluIFByZWFjdCBEZXZUb29scyBpbnN0ZWFkIG9mIHNpbmdsZSBjaGFyYWN0ZXJzLlxuICAgIGNvbnN0IG1pbmlmeU9wdGlvbnM6IFBhcnRpYWw8QnVpbGRPcHRpb25zPiA9IHRoaXMuI2RldlxuICAgICAgPyB7IG1pbmlmeUlkZW50aWZpZXJzOiBmYWxzZSwgbWluaWZ5U3ludGF4OiB0cnVlLCBtaW5pZnlXaGl0ZXNwYWNlOiB0cnVlIH1cbiAgICAgIDogeyBtaW5pZnk6IHRydWUgfTtcbiAgICBjb25zdCBidW5kbGUgPSBhd2FpdCBlc2J1aWxkLmJ1aWxkKHtcbiAgICAgIGJ1bmRsZTogdHJ1ZSxcbiAgICAgIGRlZmluZTogeyBfX0ZSU0hfQlVJTERfSUQ6IGBcIiR7QlVJTERfSUR9XCJgIH0sXG4gICAgICBlbnRyeVBvaW50cyxcbiAgICAgIGZvcm1hdDogXCJlc21cIixcbiAgICAgIG1ldGFmaWxlOiB0cnVlLFxuICAgICAgLi4ubWluaWZ5T3B0aW9ucyxcbiAgICAgIG91dGRpcjogXCIuXCIsXG4gICAgICAvLyBUaGlzIGlzIHJlcXVyaWVkIHRvIGVuc3VyZSB0aGUgZm9ybWF0IG9mIHRoZSBvdXRwdXRGaWxlcyBwYXRoIGlzIHRoZSBzYW1lXG4gICAgICAvLyBiZXR3ZWVuIHdpbmRvd3MgYW5kIGxpbnV4XG4gICAgICBhYnNXb3JraW5nRGlyLFxuICAgICAgb3V0ZmlsZTogXCJcIixcbiAgICAgIHBsYXRmb3JtOiBcIm5ldXRyYWxcIixcbiAgICAgIHBsdWdpbnM6IFtkZW5vUGx1Z2luKHsgaW1wb3J0TWFwVVJMOiB0aGlzLiNpbXBvcnRNYXBVUkwgfSldLFxuICAgICAgc291cmNlbWFwOiB0aGlzLiNkZXYgPyBcImxpbmtlZFwiIDogZmFsc2UsXG4gICAgICBzcGxpdHRpbmc6IHRydWUsXG4gICAgICB0YXJnZXQ6IFtcImNocm9tZTk5XCIsIFwiZmlyZWZveDk5XCIsIFwic2FmYXJpMTVcIl0sXG4gICAgICB0cmVlU2hha2luZzogdHJ1ZSxcbiAgICAgIHdyaXRlOiBmYWxzZSxcbiAgICAgIGpzeDogSlNYX1JVTlRJTUVfTU9ERVt0aGlzLiNqc3hDb25maWcuanN4XSxcbiAgICAgIGpzeEltcG9ydFNvdXJjZTogdGhpcy4janN4Q29uZmlnLmpzeEltcG9ydFNvdXJjZSxcbiAgICB9KTtcbiAgICAvLyBjb25zdCBtZXRhZmlsZU91dHB1dHMgPSBidW5kbGUubWV0YWZpbGUhLm91dHB1dHM7XG5cbiAgICAvLyBmb3IgKGNvbnN0IHBhdGggaW4gbWV0YWZpbGVPdXRwdXRzKSB7XG4gICAgLy8gICBjb25zdCBtZXRhID0gbWV0YWZpbGVPdXRwdXRzW3BhdGhdO1xuICAgIC8vICAgY29uc3QgaW1wb3J0cyA9IG1ldGEuaW1wb3J0c1xuICAgIC8vICAgICAuZmlsdGVyKCh7IGtpbmQgfSkgPT4ga2luZCA9PT0gXCJpbXBvcnQtc3RhdGVtZW50XCIpXG4gICAgLy8gICAgIC5tYXAoKHsgcGF0aCB9KSA9PiBgLyR7cGF0aH1gKTtcbiAgICAvLyAgIHRoaXMuI3ByZWxvYWRzLnNldChgLyR7cGF0aH1gLCBpbXBvcnRzKTtcbiAgICAvLyB9XG5cbiAgICBjb25zdCBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBVaW50OEFycmF5PigpO1xuICAgIGNvbnN0IGFic0RpclVybExlbmd0aCA9IHRvRmlsZVVybChhYnNXb3JraW5nRGlyKS5ocmVmLmxlbmd0aDtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYnVuZGxlLm91dHB1dEZpbGVzKSB7XG4gICAgICBjYWNoZS5zZXQoXG4gICAgICAgIHRvRmlsZVVybChmaWxlLnBhdGgpLmhyZWYuc3Vic3RyaW5nKGFic0RpclVybExlbmd0aCksXG4gICAgICAgIGZpbGUuY29udGVudHMsXG4gICAgICApO1xuICAgIH1cbiAgICB0aGlzLiNjYWNoZSA9IGNhY2hlO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgYXN5bmMgY2FjaGUoKTogUHJvbWlzZTxNYXA8c3RyaW5nLCBVaW50OEFycmF5Pj4ge1xuICAgIGlmICh0aGlzLiNjYWNoZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLiNjYWNoZSA9IHRoaXMuYnVuZGxlKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLiNjYWNoZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgIGF3YWl0IHRoaXMuI2NhY2hlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jY2FjaGUgYXMgTWFwPHN0cmluZywgVWludDhBcnJheT47XG4gIH1cblxuICBhc3luYyBnZXQocGF0aDogc3RyaW5nKTogUHJvbWlzZTxVaW50OEFycmF5IHwgbnVsbD4ge1xuICAgIGNvbnN0IGNhY2hlID0gYXdhaXQgdGhpcy5jYWNoZSgpO1xuICAgIHJldHVybiBjYWNoZS5nZXQocGF0aCkgPz8gbnVsbDtcbiAgfVxuXG4gIC8vIGdldFByZWxvYWRzKHBhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgLy8gICByZXR1cm4gdGhpcy4jcHJlbG9hZHMuZ2V0KHBhdGgpID8/IFtdO1xuICAvLyB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsU0FBUyxRQUFRLFFBQVEsaUJBQWlCO0FBQzFDLFNBQVMsVUFBVSxFQUFFLE9BQU8sRUFBRSxTQUFTLFFBQVEsWUFBWTtBQVEzRCxJQUFJLHFCQUE4QyxLQUFLO0FBQ3ZELGVBQWUsMkJBQTJCO0lBQ3hDLElBQUksdUJBQXVCLEtBQUssRUFBRTtRQUNoQyxJQUFJLEtBQUssR0FBRyxLQUFLLFdBQVc7WUFDMUIscUJBQXFCLFFBQVEsVUFBVSxDQUFDO2dCQUN0QyxTQUFTO2dCQUNULFFBQVEsS0FBSztZQUNmO1FBQ0YsT0FBTztZQUNMLFFBQVEsVUFBVSxDQUFDLENBQUM7UUFDdEIsQ0FBQztRQUNELE1BQU07UUFDTixxQkFBcUIsSUFBSTtJQUMzQixPQUFPLElBQUksOEJBQThCLFNBQVM7UUFDaEQsTUFBTTtJQUNSLENBQUM7QUFDSDtBQUVBLE1BQU0sbUJBQW1CO0lBQ3ZCLFNBQVM7SUFDVCxhQUFhO0FBQ2Y7QUFFQSxPQUFPLE1BQU07SUFDWCxDQUFDLFlBQVksQ0FBTTtJQUNuQixDQUFDLFNBQVMsQ0FBWTtJQUN0QixDQUFDLE9BQU8sQ0FBVztJQUNuQixDQUFDLE9BQU8sQ0FBVztJQUNuQixDQUFDLEtBQUssR0FBd0QsVUFBVTtJQUN4RSxDQUFDLEdBQUcsQ0FBVTtJQUVkLFlBQ0UsT0FBaUIsRUFDakIsT0FBaUIsRUFDakIsWUFBaUIsRUFDakIsU0FBb0IsRUFDcEIsR0FBWSxDQUNaO1FBQ0EsSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHO1FBQ2hCLElBQUksQ0FBQyxDQUFDLE9BQU8sR0FBRztRQUNoQixJQUFJLENBQUMsQ0FBQyxZQUFZLEdBQUc7UUFDckIsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHO1FBQ2xCLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRztJQUNkO0lBRUEsTUFBTSxTQUFTO1FBQ2IsTUFBTSxjQUFzQztZQUMx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