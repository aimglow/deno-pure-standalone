import { resolveImportMap, resolveModuleSpecifier, toFileUrl } from "./deps.ts";
import { load as nativeLoad } from "./src/native_loader.ts";
import { load as portableLoad } from "./src/portable_loader.ts";
/** The default loader to use. */ export const DEFAULT_LOADER = typeof Deno.run === "function" ? "native" : "portable";
export function denoPlugin(options = {}) {
    const loader = options.loader ?? DEFAULT_LOADER;
    return {
        name: "deno",
        setup (build) {
            const infoCache = new Map();
            let importMap = null;
            build.onStart(async function onStart() {
                if (options.importMapURL !== undefined) {
                    const resp = await fetch(options.importMapURL.href);
                    const txt = await resp.text();
                    importMap = resolveImportMap(JSON.parse(txt), options.importMapURL);
                } else {
                    importMap = null;
                }
            });
            build.onResolve({
                filter: /.*/
            }, function onResolve(args) {
                const resolveDir = args.resolveDir ? `${toFileUrl(args.resolveDir).href}/` : "";
                const referrer = args.importer || resolveDir;
                let resolved;
                if (importMap !== null) {
                    const res = resolveModuleSpecifier(args.path, importMap, new URL(referrer) || undefined);
                    resolved = new URL(res);
                } else {
                    resolved = new URL(args.path, referrer);
                }
                return {
                    path: resolved.href,
                    namespace: "deno"
                };
            });
            build.onLoad({
                filter: /.*/
            }, function onLoad(args) {
                const url = new URL(args.path);
                switch(loader){
                    case "native":
                        return nativeLoad(infoCache, url, options);
                    case "portable":
                        return portableLoad(url, options);
                }
            });
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXNidWlsZF9kZW5vX2xvYWRlckAwLjUuMi9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgZXNidWlsZCxcbiAgSW1wb3J0TWFwLFxuICByZXNvbHZlSW1wb3J0TWFwLFxuICByZXNvbHZlTW9kdWxlU3BlY2lmaWVyLFxuICB0b0ZpbGVVcmwsXG59IGZyb20gXCIuL2RlcHMudHNcIjtcbmltcG9ydCB7IGxvYWQgYXMgbmF0aXZlTG9hZCB9IGZyb20gXCIuL3NyYy9uYXRpdmVfbG9hZGVyLnRzXCI7XG5pbXBvcnQgeyBsb2FkIGFzIHBvcnRhYmxlTG9hZCB9IGZyb20gXCIuL3NyYy9wb3J0YWJsZV9sb2FkZXIudHNcIjtcbmltcG9ydCB7IE1vZHVsZUVudHJ5IH0gZnJvbSBcIi4vc3JjL2Rlbm8udHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEZW5vUGx1Z2luT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTcGVjaWZ5IHRoZSBVUkwgdG8gYW4gaW1wb3J0IG1hcCB0byB1c2Ugd2hlbiByZXNvbHZpbmcgaW1wb3J0IHNwZWNpZmllcnMuXG4gICAqIFRoZSBVUkwgbXVzdCBiZSBmZXRjaGFibGUgd2l0aCBgZmV0Y2hgLlxuICAgKi9cbiAgaW1wb3J0TWFwVVJMPzogVVJMO1xuICAvKipcbiAgICogU3BlY2lmeSB3aGljaCBsb2FkZXIgdG8gdXNlLiBCeSBkZWZhdWx0IHRoaXMgd2lsbCB1c2UgdGhlIGBuYXRpdmVgIGxvYWRlcixcbiAgICogdW5sZXNzIGBEZW5vLnJ1bmAgaXMgbm90IGF2YWlsYWJsZS5cbiAgICpcbiAgICogLSBgbmF0aXZlYDogICAgIFNoZWxscyBvdXQgdG8gdGhlIERlbm8gZXhlY3VhdGJsZSB1bmRlciB0aGUgaG9vZCB0byBsb2FkXG4gICAqICAgICAgICAgICAgICAgICBmaWxlcy4gUmVxdWlyZXMgLS1hbGxvdy1yZWFkIGFuZCAtLWFsbG93LXJ1bi5cbiAgICogLSBgcG9ydGFibGVgOiAgIERvIG1vZHVsZSBkb3dubG9hZGluZyBhbmQgY2FjaGluZyB3aXRoIG9ubHkgV2ViIEFQSXMuXG4gICAqICAgICAgICAgICAgICAgICBSZXF1aXJlcyAtLWFsbG93LW5ldC5cbiAgICovXG4gIGxvYWRlcj86IFwibmF0aXZlXCIgfCBcInBvcnRhYmxlXCI7XG59XG5cbi8qKiBUaGUgZGVmYXVsdCBsb2FkZXIgdG8gdXNlLiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfTE9BREVSOiBcIm5hdGl2ZVwiIHwgXCJwb3J0YWJsZVwiID1cbiAgdHlwZW9mIERlbm8ucnVuID09PSBcImZ1bmN0aW9uXCIgPyBcIm5hdGl2ZVwiIDogXCJwb3J0YWJsZVwiO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVub1BsdWdpbihvcHRpb25zOiBEZW5vUGx1Z2luT3B0aW9ucyA9IHt9KTogZXNidWlsZC5QbHVnaW4ge1xuICBjb25zdCBsb2FkZXIgPSBvcHRpb25zLmxvYWRlciA/PyBERUZBVUxUX0xPQURFUjtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBcImRlbm9cIixcbiAgICBzZXR1cChidWlsZCkge1xuICAgICAgY29uc3QgaW5mb0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIE1vZHVsZUVudHJ5PigpO1xuICAgICAgbGV0IGltcG9ydE1hcDogSW1wb3J0TWFwIHwgbnVsbCA9IG51bGw7XG5cbiAgICAgIGJ1aWxkLm9uU3RhcnQoYXN5bmMgZnVuY3Rpb24gb25TdGFydCgpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaW1wb3J0TWFwVVJMICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2gob3B0aW9ucy5pbXBvcnRNYXBVUkwuaHJlZik7XG4gICAgICAgICAgY29uc3QgdHh0ID0gYXdhaXQgcmVzcC50ZXh0KCk7XG4gICAgICAgICAgaW1wb3J0TWFwID0gcmVzb2x2ZUltcG9ydE1hcChKU09OLnBhcnNlKHR4dCksIG9wdGlvbnMuaW1wb3J0TWFwVVJMKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbXBvcnRNYXAgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgYnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiAvLiovIH0sIGZ1bmN0aW9uIG9uUmVzb2x2ZShcbiAgICAgICAgYXJnczogZXNidWlsZC5PblJlc29sdmVBcmdzLFxuICAgICAgKTogZXNidWlsZC5PblJlc29sdmVSZXN1bHQgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZURpciA9IGFyZ3MucmVzb2x2ZURpclxuICAgICAgICAgID8gYCR7dG9GaWxlVXJsKGFyZ3MucmVzb2x2ZURpcikuaHJlZn0vYFxuICAgICAgICAgIDogXCJcIjtcbiAgICAgICAgY29uc3QgcmVmZXJyZXIgPSBhcmdzLmltcG9ydGVyIHx8IHJlc29sdmVEaXI7XG4gICAgICAgIGxldCByZXNvbHZlZDogVVJMO1xuICAgICAgICBpZiAoaW1wb3J0TWFwICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gcmVzb2x2ZU1vZHVsZVNwZWNpZmllcihcbiAgICAgICAgICAgIGFyZ3MucGF0aCxcbiAgICAgICAgICAgIGltcG9ydE1hcCxcbiAgICAgICAgICAgIG5ldyBVUkwocmVmZXJyZXIpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICApO1xuICAgICAgICAgIHJlc29sdmVkID0gbmV3IFVSTChyZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmVkID0gbmV3IFVSTChhcmdzLnBhdGgsIHJlZmVycmVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBwYXRoOiByZXNvbHZlZC5ocmVmLCBuYW1lc3BhY2U6IFwiZGVub1wiIH07XG4gICAgICB9KTtcblxuICAgICAgYnVpbGQub25Mb2FkKHsgZmlsdGVyOiAvLiovIH0sIGZ1bmN0aW9uIG9uTG9hZChcbiAgICAgICAgYXJnczogZXNidWlsZC5PbkxvYWRBcmdzLFxuICAgICAgKTogUHJvbWlzZTxlc2J1aWxkLk9uTG9hZFJlc3VsdCB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChhcmdzLnBhdGgpO1xuICAgICAgICBzd2l0Y2ggKGxvYWRlcikge1xuICAgICAgICAgIGNhc2UgXCJuYXRpdmVcIjpcbiAgICAgICAgICAgIHJldHVybiBuYXRpdmVMb2FkKGluZm9DYWNoZSwgdXJsLCBvcHRpb25zKTtcbiAgICAgICAgICBjYXNlIFwicG9ydGFibGVcIjpcbiAgICAgICAgICAgIHJldHVybiBwb3J0YWJsZUxvYWQodXJsLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSxcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUdFLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsU0FBUyxRQUNKLFlBQVk7QUFDbkIsU0FBUyxRQUFRLFVBQVUsUUFBUSx5QkFBeUI7QUFDNUQsU0FBUyxRQUFRLFlBQVksUUFBUSwyQkFBMkI7QUFxQmhFLCtCQUErQixHQUMvQixPQUFPLE1BQU0saUJBQ1gsT0FBTyxLQUFLLEdBQUcsS0FBSyxhQUFhLFdBQVcsVUFBVSxDQUFDO0FBRXpELE9BQU8sU0FBUyxXQUFXLFVBQTZCLENBQUMsQ0FBQyxFQUFrQjtJQUMxRSxNQUFNLFNBQVMsUUFBUSxNQUFNLElBQUk7SUFDakMsT0FBTztRQUNMLE1BQU07UUFDTixPQUFNLEtBQUssRUFBRTtZQUNYLE1BQU0sWUFBWSxJQUFJO1lBQ3RCLElBQUksWUFBOEIsSUFBSTtZQUV0QyxNQUFNLE9BQU8sQ0FBQyxlQUFlLFVBQVU7Z0JBQ3JDLElBQUksUUFBUSxZQUFZLEtBQUssV0FBVztvQkFDdEMsTUFBTSxPQUFPLE1BQU0sTUFBTSxRQUFRLFlBQVksQ0FBQyxJQUFJO29CQUNsRCxNQUFNLE1BQU0sTUFBTSxLQUFLLElBQUk7b0JBQzNCLFlBQVksaUJBQWlCLEtBQUssS0FBSyxDQUFDLE1BQU0sUUFBUSxZQUFZO2dCQUNwRSxPQUFPO29CQUNMLFlBQVksSUFBSTtnQkFDbEIsQ0FBQztZQUNIO1lBRUEsTUFBTSxTQUFTLENBQUM7Z0JBQUUsUUFBUTtZQUFLLEdBQUcsU0FBUyxVQUN6QyxJQUEyQixFQUNpQjtnQkFDNUMsTUFBTSxhQUFhLEtBQUssVUFBVSxHQUM5QixDQUFDLEVBQUUsVUFBVSxLQUFLLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQ3JDLEVBQUU7Z0JBQ04sTUFBTSxXQUFXLEtBQUssUUFBUSxJQUFJO2dCQUNsQyxJQUFJO2dCQUNKLElBQUksY0FBYyxJQUFJLEVBQUU7b0JBQ3RCLE1BQU0sTUFBTSx1QkFDVixLQUFLLElBQUksRUFDVCxXQUNBLElBQUksSUFBSSxhQUFhO29CQUV2QixXQUFXLElBQUksSUFBSTtnQkFDckIsT0FBTztvQkFDTCxXQUFXLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDaEMsQ0FBQztnQkFDRCxPQUFPO29CQUFFLE1BQU0sU0FBUyxJQUFJO29CQUFFLFdBQVc7Z0JBQU87WUFDbEQ7WUFFQSxNQUFNLE1BQU0sQ0FBQztnQkFBRSxRQUFRO1lBQUssR0FBRyxTQUFTLE9BQ3RDLElBQXdCLEVBQ2M7Z0JBQ3RDLE1BQU0sTUFBTSxJQUFJLElBQUksS0FBSyxJQUFJO2dCQUM3QixPQUFRO29CQUNOLEtBQUs7d0JBQ0gsT0FBTyxXQUFXLFdBQVcsS0FBSztvQkFDcEMsS0FBSzt3QkFDSCxPQUFPLGFBQWEsS0FBSztnQkFDN0I7WUFDRjtRQUNGO0lBQ0Y7QUFDRixDQUFDIn0=