import { fromFileUrl } from "../deps.ts";
import * as deno from "./deno.ts";
import { mediaTypeToLoader, transformRawIntoContent } from "./shared.ts";
export async function load(infoCache, url, options) {
    switch(url.protocol){
        case "http:":
        case "https:":
        case "data:":
            return await loadFromCLI(infoCache, url, options);
        case "file:":
            {
                const res = await loadFromCLI(infoCache, url, options);
                res.watchFiles = [
                    fromFileUrl(url.href)
                ];
                return res;
            }
    }
    return null;
}
async function loadFromCLI(infoCache, specifier, options) {
    const specifierRaw = specifier.href;
    if (!infoCache.has(specifierRaw)) {
        const { modules , redirects  } = await deno.info(specifier, {
            importMap: options.importMapURL?.href
        });
        for (const module of modules){
            infoCache.set(module.specifier, module);
        }
        for (const [specifier1, redirect] of Object.entries(redirects)){
            const redirected = infoCache.get(redirect);
            if (!redirected) {
                throw new TypeError("Unreachable.");
            }
            infoCache.set(specifier1, redirected);
        }
    }
    const module1 = infoCache.get(specifierRaw);
    if (!module1) {
        throw new TypeError("Unreachable.");
    }
    if (module1.error) throw new Error(module1.error);
    if (!module1.local) throw new Error("Module not downloaded yet.");
    const mediaType = module1.mediaType ?? "Unknown";
    const loader = mediaTypeToLoader(mediaType);
    const raw = await Deno.readFile(module1.local);
    const contents = transformRawIntoContent(raw, mediaType);
    return {
        contents,
        loader
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXNidWlsZF9kZW5vX2xvYWRlckAwLjUuMi9zcmMvbmF0aXZlX2xvYWRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2J1aWxkLCBmcm9tRmlsZVVybCB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgKiBhcyBkZW5vIGZyb20gXCIuL2Rlbm8udHNcIjtcbmltcG9ydCB7IG1lZGlhVHlwZVRvTG9hZGVyLCB0cmFuc2Zvcm1SYXdJbnRvQ29udGVudCB9IGZyb20gXCIuL3NoYXJlZC50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvYWRPcHRpb25zIHtcbiAgaW1wb3J0TWFwVVJMPzogVVJMO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZChcbiAgaW5mb0NhY2hlOiBNYXA8c3RyaW5nLCBkZW5vLk1vZHVsZUVudHJ5PixcbiAgdXJsOiBVUkwsXG4gIG9wdGlvbnM6IExvYWRPcHRpb25zLFxuKTogUHJvbWlzZTxlc2J1aWxkLk9uTG9hZFJlc3VsdCB8IG51bGw+IHtcbiAgc3dpdGNoICh1cmwucHJvdG9jb2wpIHtcbiAgICBjYXNlIFwiaHR0cDpcIjpcbiAgICBjYXNlIFwiaHR0cHM6XCI6XG4gICAgY2FzZSBcImRhdGE6XCI6XG4gICAgICByZXR1cm4gYXdhaXQgbG9hZEZyb21DTEkoaW5mb0NhY2hlLCB1cmwsIG9wdGlvbnMpO1xuICAgIGNhc2UgXCJmaWxlOlwiOiB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBsb2FkRnJvbUNMSShpbmZvQ2FjaGUsIHVybCwgb3B0aW9ucyk7XG4gICAgICByZXMud2F0Y2hGaWxlcyA9IFtmcm9tRmlsZVVybCh1cmwuaHJlZildO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRGcm9tQ0xJKFxuICBpbmZvQ2FjaGU6IE1hcDxzdHJpbmcsIGRlbm8uTW9kdWxlRW50cnk+LFxuICBzcGVjaWZpZXI6IFVSTCxcbiAgb3B0aW9uczogTG9hZE9wdGlvbnMsXG4pOiBQcm9taXNlPGVzYnVpbGQuT25Mb2FkUmVzdWx0PiB7XG4gIGNvbnN0IHNwZWNpZmllclJhdyA9IHNwZWNpZmllci5ocmVmO1xuICBpZiAoIWluZm9DYWNoZS5oYXMoc3BlY2lmaWVyUmF3KSkge1xuICAgIGNvbnN0IHsgbW9kdWxlcywgcmVkaXJlY3RzIH0gPSBhd2FpdCBkZW5vLmluZm8oc3BlY2lmaWVyLCB7XG4gICAgICBpbXBvcnRNYXA6IG9wdGlvbnMuaW1wb3J0TWFwVVJMPy5ocmVmLFxuICAgIH0pO1xuICAgIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgIGluZm9DYWNoZS5zZXQobW9kdWxlLnNwZWNpZmllciwgbW9kdWxlKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbc3BlY2lmaWVyLCByZWRpcmVjdF0gb2YgT2JqZWN0LmVudHJpZXMocmVkaXJlY3RzKSkge1xuICAgICAgY29uc3QgcmVkaXJlY3RlZCA9IGluZm9DYWNoZS5nZXQocmVkaXJlY3QpO1xuICAgICAgaWYgKCFyZWRpcmVjdGVkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJVbnJlYWNoYWJsZS5cIik7XG4gICAgICB9XG4gICAgICBpbmZvQ2FjaGUuc2V0KHNwZWNpZmllciwgcmVkaXJlY3RlZCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbW9kdWxlID0gaW5mb0NhY2hlLmdldChzcGVjaWZpZXJSYXcpO1xuICBpZiAoIW1vZHVsZSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJVbnJlYWNoYWJsZS5cIik7XG4gIH1cblxuICBpZiAobW9kdWxlLmVycm9yKSB0aHJvdyBuZXcgRXJyb3IobW9kdWxlLmVycm9yKTtcbiAgaWYgKCFtb2R1bGUubG9jYWwpIHRocm93IG5ldyBFcnJvcihcIk1vZHVsZSBub3QgZG93bmxvYWRlZCB5ZXQuXCIpO1xuICBjb25zdCBtZWRpYVR5cGUgPSBtb2R1bGUubWVkaWFUeXBlID8/IFwiVW5rbm93blwiO1xuXG4gIGNvbnN0IGxvYWRlciA9IG1lZGlhVHlwZVRvTG9hZGVyKG1lZGlhVHlwZSk7XG5cbiAgY29uc3QgcmF3ID0gYXdhaXQgRGVuby5yZWFkRmlsZShtb2R1bGUubG9jYWwpO1xuICBjb25zdCBjb250ZW50cyA9IHRyYW5zZm9ybVJhd0ludG9Db250ZW50KHJhdywgbWVkaWFUeXBlKTtcblxuICByZXR1cm4geyBjb250ZW50cywgbG9hZGVyIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBa0IsV0FBVyxRQUFRLGFBQWE7QUFDbEQsWUFBWSxVQUFVLFlBQVk7QUFDbEMsU0FBUyxpQkFBaUIsRUFBRSx1QkFBdUIsUUFBUSxjQUFjO0FBTXpFLE9BQU8sZUFBZSxLQUNwQixTQUF3QyxFQUN4QyxHQUFRLEVBQ1IsT0FBb0IsRUFDa0I7SUFDdEMsT0FBUSxJQUFJLFFBQVE7UUFDbEIsS0FBSztRQUNMLEtBQUs7UUFDTCxLQUFLO1lBQ0gsT0FBTyxNQUFNLFlBQVksV0FBVyxLQUFLO1FBQzNDLEtBQUs7WUFBUztnQkFDWixNQUFNLE1BQU0sTUFBTSxZQUFZLFdBQVcsS0FBSztnQkFDOUMsSUFBSSxVQUFVLEdBQUc7b0JBQUMsWUFBWSxJQUFJLElBQUk7aUJBQUU7Z0JBQ3hDLE9BQU87WUFDVDtJQUNGO0lBQ0EsT0FBTyxJQUFJO0FBQ2IsQ0FBQztBQUVELGVBQWUsWUFDYixTQUF3QyxFQUN4QyxTQUFjLEVBQ2QsT0FBb0IsRUFDVztJQUMvQixNQUFNLGVBQWUsVUFBVSxJQUFJO0lBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxlQUFlO1FBQ2hDLE1BQU0sRUFBRSxRQUFPLEVBQUUsVUFBUyxFQUFFLEdBQUcsTUFBTSxLQUFLLElBQUksQ0FBQyxXQUFXO1lBQ3hELFdBQVcsUUFBUSxZQUFZLEVBQUU7UUFDbkM7UUFDQSxLQUFLLE1BQU0sVUFBVSxRQUFTO1lBQzVCLFVBQVUsR0FBRyxDQUFDLE9BQU8sU0FBUyxFQUFFO1FBQ2xDO1FBQ0EsS0FBSyxNQUFNLENBQUMsWUFBVyxTQUFTLElBQUksT0FBTyxPQUFPLENBQUMsV0FBWTtZQUM3RCxNQUFNLGFBQWEsVUFBVSxHQUFHLENBQUM7WUFDakMsSUFBSSxDQUFDLFlBQVk7Z0JBQ2YsTUFBTSxJQUFJLFVBQVUsZ0JBQWdCO1lBQ3RDLENBQUM7WUFDRCxVQUFVLEdBQUcsQ0FBQyxZQUFXO1FBQzNCO0lBQ0YsQ0FBQztJQUVELE1BQU0sVUFBUyxVQUFVLEdBQUcsQ0FBQztJQUM3QixJQUFJLENBQUMsU0FBUTtRQUNYLE1BQU0sSUFBSSxVQUFVLGdCQUFnQjtJQUN0QyxDQUFDO0lBRUQsSUFBSSxRQUFPLEtBQUssRUFBRSxNQUFNLElBQUksTUFBTSxRQUFPLEtBQUssRUFBRTtJQUNoRCxJQUFJLENBQUMsUUFBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLE1BQU0sOEJBQThCO0lBQ2pFLE1BQU0sWUFBWSxRQUFPLFNBQVMsSUFBSTtJQUV0QyxNQUFNLFNBQVMsa0JBQWtCO0lBRWpDLE1BQU0sTUFBTSxNQUFNLEtBQUssUUFBUSxDQUFDLFFBQU8sS0FBSztJQUM1QyxNQUFNLFdBQVcsd0JBQXdCLEtBQUs7SUFFOUMsT0FBTztRQUFFO1FBQVU7SUFBTztBQUM1QiJ9