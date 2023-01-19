export const INTERNAL_PREFIX = "/_frsh";
export const ASSET_CACHE_BUST_KEY = "__frsh_c";
export const IS_BROWSER = typeof document !== "undefined";
/**
 * Create a "locked" asset path. This differs from a plain path in that it is
 * specific to the current version of the application, and as such can be safely
 * served with a very long cache lifetime (1 year).
 */ export function asset(path) {
    if (!path.startsWith("/") || path.startsWith("//")) return path;
    try {
        const url = new URL(path, "https://freshassetcache.local");
        if (url.protocol !== "https:" || url.host !== "freshassetcache.local" || url.searchParams.has(ASSET_CACHE_BUST_KEY)) {
            return path;
        }
        url.searchParams.set(ASSET_CACHE_BUST_KEY, __FRSH_BUILD_ID);
        return url.pathname + url.search + url.hash;
    } catch (err) {
        console.warn(`Failed to create asset() URL, falling back to regular path ('${path}'):`, err);
        return path;
    }
}
/** Apply the `asset` function to urls in a `srcset` attribute. */ export function assetSrcSet(srcset) {
    if (srcset.includes("(")) return srcset; // Bail if the srcset contains complicated syntax.
    const parts = srcset.split(",");
    const constructed = [];
    for (const part of parts){
        const trimmed = part.trimStart();
        const leadingWhitespace = part.length - trimmed.length;
        if (trimmed === "") return srcset; // Bail if the srcset is malformed.
        let urlEnd = trimmed.indexOf(" ");
        if (urlEnd === -1) urlEnd = trimmed.length;
        const leading = part.substring(0, leadingWhitespace);
        const url = trimmed.substring(0, urlEnd);
        const trailing = trimmed.substring(urlEnd);
        constructed.push(leading + asset(url) + trailing);
    }
    return constructed.join(",");
}
export function assetHashingHook(vnode) {
    if (vnode.type === "img" || vnode.type === "source") {
        const { props  } = vnode;
        if (props["data-fresh-disable-lock"]) return;
        if (typeof props.src === "string") {
            props.src = asset(props.src);
        }
        if (typeof props.srcset === "string") {
            props.srcset = assetSrcSet(props.srcset);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4xLjIvc3JjL3J1bnRpbWUvdXRpbHMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVk5vZGUgfSBmcm9tIFwicHJlYWN0XCI7XG5cbmV4cG9ydCBjb25zdCBJTlRFUk5BTF9QUkVGSVggPSBcIi9fZnJzaFwiO1xuZXhwb3J0IGNvbnN0IEFTU0VUX0NBQ0hFX0JVU1RfS0VZID0gXCJfX2Zyc2hfY1wiO1xuXG5leHBvcnQgY29uc3QgSVNfQlJPV1NFUiA9IHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIjtcblxuLyoqXG4gKiBDcmVhdGUgYSBcImxvY2tlZFwiIGFzc2V0IHBhdGguIFRoaXMgZGlmZmVycyBmcm9tIGEgcGxhaW4gcGF0aCBpbiB0aGF0IGl0IGlzXG4gKiBzcGVjaWZpYyB0byB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIHRoZSBhcHBsaWNhdGlvbiwgYW5kIGFzIHN1Y2ggY2FuIGJlIHNhZmVseVxuICogc2VydmVkIHdpdGggYSB2ZXJ5IGxvbmcgY2FjaGUgbGlmZXRpbWUgKDEgeWVhcikuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NldChwYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFwYXRoLnN0YXJ0c1dpdGgoXCIvXCIpIHx8IHBhdGguc3RhcnRzV2l0aChcIi8vXCIpKSByZXR1cm4gcGF0aDtcbiAgdHJ5IHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHBhdGgsIFwiaHR0cHM6Ly9mcmVzaGFzc2V0Y2FjaGUubG9jYWxcIik7XG4gICAgaWYgKFxuICAgICAgdXJsLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHVybC5ob3N0ICE9PSBcImZyZXNoYXNzZXRjYWNoZS5sb2NhbFwiIHx8XG4gICAgICB1cmwuc2VhcmNoUGFyYW1zLmhhcyhBU1NFVF9DQUNIRV9CVVNUX0tFWSlcbiAgICApIHtcbiAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbiAgICB1cmwuc2VhcmNoUGFyYW1zLnNldChBU1NFVF9DQUNIRV9CVVNUX0tFWSwgX19GUlNIX0JVSUxEX0lEKTtcbiAgICByZXR1cm4gdXJsLnBhdGhuYW1lICsgdXJsLnNlYXJjaCArIHVybC5oYXNoO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oXG4gICAgICBgRmFpbGVkIHRvIGNyZWF0ZSBhc3NldCgpIFVSTCwgZmFsbGluZyBiYWNrIHRvIHJlZ3VsYXIgcGF0aCAoJyR7cGF0aH0nKTpgLFxuICAgICAgZXJyLFxuICAgICk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cbn1cblxuLyoqIEFwcGx5IHRoZSBgYXNzZXRgIGZ1bmN0aW9uIHRvIHVybHMgaW4gYSBgc3Jjc2V0YCBhdHRyaWJ1dGUuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXRTcmNTZXQoc3Jjc2V0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoc3Jjc2V0LmluY2x1ZGVzKFwiKFwiKSkgcmV0dXJuIHNyY3NldDsgLy8gQmFpbCBpZiB0aGUgc3Jjc2V0IGNvbnRhaW5zIGNvbXBsaWNhdGVkIHN5bnRheC5cbiAgY29uc3QgcGFydHMgPSBzcmNzZXQuc3BsaXQoXCIsXCIpO1xuICBjb25zdCBjb25zdHJ1Y3RlZCA9IFtdO1xuICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcbiAgICBjb25zdCB0cmltbWVkID0gcGFydC50cmltU3RhcnQoKTtcbiAgICBjb25zdCBsZWFkaW5nV2hpdGVzcGFjZSA9IHBhcnQubGVuZ3RoIC0gdHJpbW1lZC5sZW5ndGg7XG4gICAgaWYgKHRyaW1tZWQgPT09IFwiXCIpIHJldHVybiBzcmNzZXQ7IC8vIEJhaWwgaWYgdGhlIHNyY3NldCBpcyBtYWxmb3JtZWQuXG4gICAgbGV0IHVybEVuZCA9IHRyaW1tZWQuaW5kZXhPZihcIiBcIik7XG4gICAgaWYgKHVybEVuZCA9PT0gLTEpIHVybEVuZCA9IHRyaW1tZWQubGVuZ3RoO1xuICAgIGNvbnN0IGxlYWRpbmcgPSBwYXJ0LnN1YnN0cmluZygwLCBsZWFkaW5nV2hpdGVzcGFjZSk7XG4gICAgY29uc3QgdXJsID0gdHJpbW1lZC5zdWJzdHJpbmcoMCwgdXJsRW5kKTtcbiAgICBjb25zdCB0cmFpbGluZyA9IHRyaW1tZWQuc3Vic3RyaW5nKHVybEVuZCk7XG4gICAgY29uc3RydWN0ZWQucHVzaChsZWFkaW5nICsgYXNzZXQodXJsKSArIHRyYWlsaW5nKTtcbiAgfVxuICByZXR1cm4gY29uc3RydWN0ZWQuam9pbihcIixcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NldEhhc2hpbmdIb29rKFxuICB2bm9kZTogVk5vZGU8e1xuICAgIHNyYz86IHN0cmluZztcbiAgICBzcmNzZXQ/OiBzdHJpbmc7XG4gICAgW1wiZGF0YS1mcmVzaC1kaXNhYmxlLWxvY2tcIl0/OiBib29sZWFuO1xuICB9Pixcbikge1xuICBpZiAodm5vZGUudHlwZSA9PT0gXCJpbWdcIiB8fCB2bm9kZS50eXBlID09PSBcInNvdXJjZVwiKSB7XG4gICAgY29uc3QgeyBwcm9wcyB9ID0gdm5vZGU7XG4gICAgaWYgKHByb3BzW1wiZGF0YS1mcmVzaC1kaXNhYmxlLWxvY2tcIl0pIHJldHVybjtcbiAgICBpZiAodHlwZW9mIHByb3BzLnNyYyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgcHJvcHMuc3JjID0gYXNzZXQocHJvcHMuc3JjKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcm9wcy5zcmNzZXQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHByb3BzLnNyY3NldCA9IGFzc2V0U3JjU2V0KHByb3BzLnNyY3NldCk7XG4gICAgfVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxNQUFNLGtCQUFrQixTQUFTO0FBQ3hDLE9BQU8sTUFBTSx1QkFBdUIsV0FBVztBQUUvQyxPQUFPLE1BQU0sYUFBYSxPQUFPLGFBQWEsWUFBWTtBQUUxRDs7OztDQUlDLEdBQ0QsT0FBTyxTQUFTLE1BQU0sSUFBWSxFQUFFO0lBQ2xDLElBQUksQ0FBQyxLQUFLLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLE9BQU8sT0FBTztJQUMzRCxJQUFJO1FBQ0YsTUFBTSxNQUFNLElBQUksSUFBSSxNQUFNO1FBQzFCLElBQ0UsSUFBSSxRQUFRLEtBQUssWUFBWSxJQUFJLElBQUksS0FBSywyQkFDMUMsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLHVCQUNyQjtZQUNBLE9BQU87UUFDVCxDQUFDO1FBQ0QsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLHNCQUFzQjtRQUMzQyxPQUFPLElBQUksUUFBUSxHQUFHLElBQUksTUFBTSxHQUFHLElBQUksSUFBSTtJQUM3QyxFQUFFLE9BQU8sS0FBSztRQUNaLFFBQVEsSUFBSSxDQUNWLENBQUMsNkRBQTZELEVBQUUsS0FBSyxHQUFHLENBQUMsRUFDekU7UUFFRixPQUFPO0lBQ1Q7QUFDRixDQUFDO0FBRUQsZ0VBQWdFLEdBQ2hFLE9BQU8sU0FBUyxZQUFZLE1BQWMsRUFBVTtJQUNsRCxJQUFJLE9BQU8sUUFBUSxDQUFDLE1BQU0sT0FBTyxRQUFRLGtEQUFrRDtJQUMzRixNQUFNLFFBQVEsT0FBTyxLQUFLLENBQUM7SUFDM0IsTUFBTSxjQUFjLEVBQUU7SUFDdEIsS0FBSyxNQUFNLFFBQVEsTUFBTztRQUN4QixNQUFNLFVBQVUsS0FBSyxTQUFTO1FBQzlCLE1BQU0sb0JBQW9CLEtBQUssTUFBTSxHQUFHLFFBQVEsTUFBTTtRQUN0RCxJQUFJLFlBQVksSUFBSSxPQUFPLFFBQVEsbUNBQW1DO1FBQ3RFLElBQUksU0FBUyxRQUFRLE9BQU8sQ0FBQztRQUM3QixJQUFJLFdBQVcsQ0FBQyxHQUFHLFNBQVMsUUFBUSxNQUFNO1FBQzFDLE1BQU0sVUFBVSxLQUFLLFNBQVMsQ0FBQyxHQUFHO1FBQ2xDLE1BQU0sTUFBTSxRQUFRLFNBQVMsQ0FBQyxHQUFHO1FBQ2pDLE1BQU0sV0FBVyxRQUFRLFNBQVMsQ0FBQztRQUNuQyxZQUFZLElBQUksQ0FBQyxVQUFVLE1BQU0sT0FBTztJQUMxQztJQUNBLE9BQU8sWUFBWSxJQUFJLENBQUM7QUFDMUIsQ0FBQztBQUVELE9BQU8sU0FBUyxpQkFDZCxLQUlFLEVBQ0Y7SUFDQSxJQUFJLE1BQU0sSUFBSSxLQUFLLFNBQVMsTUFBTSxJQUFJLEtBQUssVUFBVTtRQUNuRCxNQUFNLEVBQUUsTUFBSyxFQUFFLEdBQUc7UUFDbEIsSUFBSSxLQUFLLENBQUMsMEJBQTBCLEVBQUU7UUFDdEMsSUFBSSxPQUFPLE1BQU0sR0FBRyxLQUFLLFVBQVU7WUFDakMsTUFBTSxHQUFHLEdBQUcsTUFBTSxNQUFNLEdBQUc7UUFDN0IsQ0FBQztRQUNELElBQUksT0FBTyxNQUFNLE1BQU0sS0FBSyxVQUFVO1lBQ3BDLE1BQU0sTUFBTSxHQUFHLFlBQVksTUFBTSxNQUFNO1FBQ3pDLENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQyJ9