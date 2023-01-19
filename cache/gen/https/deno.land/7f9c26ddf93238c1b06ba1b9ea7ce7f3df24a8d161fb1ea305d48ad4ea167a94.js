// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import { globToRegExp, isAbsolute, isGlob, joinGlobs, resolve, SEP_PATTERN } from "../path/mod.ts";
import { _createWalkEntry, _createWalkEntrySync, walk, walkSync } from "./walk.ts";
import { assert } from "../_util/assert.ts";
import { isWindows } from "../_util/os.ts";
function split(path) {
    const s = SEP_PATTERN.source;
    const segments = path.replace(new RegExp(`^${s}|${s}$`, "g"), "").split(SEP_PATTERN);
    const isAbsolute_ = isAbsolute(path);
    return {
        segments,
        isAbsolute: isAbsolute_,
        hasTrailingSep: !!path.match(new RegExp(`${s}$`)),
        winRoot: isWindows && isAbsolute_ ? segments.shift() : undefined
    };
}
function throwUnlessNotFound(error) {
    if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
    }
}
function comparePath(a, b) {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
}
/** Expand the glob string from the specified `root` directory and yield each
 * result as a `WalkEntry` object.
 *
 * See [`globToRegExp()`](../path/glob.ts#globToRegExp) for details on supported
 * syntax.
 *
 * Example:
 * ```ts
 *      import { expandGlob } from "./expand_glob.ts";
 *      for await (const file of expandGlob("**\/*.ts")) {
 *        console.log(file);
 *      }
 * ```
 */ export async function* expandGlob(glob, { root =Deno.cwd() , exclude =[] , includeDirs =true , extended =true , globstar =false , caseInsensitive  } = {}) {
    const globOptions = {
        extended,
        globstar,
        caseInsensitive
    };
    const absRoot = resolve(root);
    const resolveFromRoot = (path)=>resolve(absRoot, path);
    const excludePatterns = exclude.map(resolveFromRoot).map((s)=>globToRegExp(s, globOptions));
    const shouldInclude = (path)=>!excludePatterns.some((p)=>!!path.match(p));
    const { segments , isAbsolute: isGlobAbsolute , hasTrailingSep , winRoot  } = split(glob);
    let fixedRoot = isGlobAbsolute ? winRoot != undefined ? winRoot : "/" : absRoot;
    while(segments.length > 0 && !isGlob(segments[0])){
        const seg = segments.shift();
        assert(seg != null);
        fixedRoot = joinGlobs([
            fixedRoot,
            seg
        ], globOptions);
    }
    let fixedRootInfo;
    try {
        fixedRootInfo = await _createWalkEntry(fixedRoot);
    } catch (error) {
        return throwUnlessNotFound(error);
    }
    async function* advanceMatch(walkInfo, globSegment) {
        if (!walkInfo.isDirectory) {
            return;
        } else if (globSegment == "..") {
            const parentPath = joinGlobs([
                walkInfo.path,
                ".."
            ], globOptions);
            try {
                if (shouldInclude(parentPath)) {
                    return yield await _createWalkEntry(parentPath);
                }
            } catch (error) {
                throwUnlessNotFound(error);
            }
            return;
        } else if (globSegment == "**") {
            return yield* walk(walkInfo.path, {
                skip: excludePatterns
            });
        }
        const globPattern = globToRegExp(globSegment, globOptions);
        for await (const walkEntry of walk(walkInfo.path, {
            maxDepth: 1,
            skip: excludePatterns
        })){
            if (walkEntry.path != walkInfo.path && walkEntry.name.match(globPattern)) {
                yield walkEntry;
            }
        }
    }
    let currentMatches = [
        fixedRootInfo
    ];
    for (const segment of segments){
        // Advancing the list of current matches may introduce duplicates, so we
        // pass everything through this Map.
        const nextMatchMap = new Map();
        await Promise.all(currentMatches.map(async (currentMatch)=>{
            for await (const nextMatch of advanceMatch(currentMatch, segment)){
                nextMatchMap.set(nextMatch.path, nextMatch);
            }
        }));
        currentMatches = [
            ...nextMatchMap.values()
        ].sort(comparePath);
    }
    if (hasTrailingSep) {
        currentMatches = currentMatches.filter((entry)=>entry.isDirectory);
    }
    if (!includeDirs) {
        currentMatches = currentMatches.filter((entry)=>!entry.isDirectory);
    }
    yield* currentMatches;
}
/** Synchronous version of `expandGlob()`.
 *
 * Example:
 *
 * ```ts
 *      import { expandGlobSync } from "./expand_glob.ts";
 *      for (const file of expandGlobSync("**\/*.ts")) {
 *        console.log(file);
 *      }
 * ```
 */ export function* expandGlobSync(glob, { root =Deno.cwd() , exclude =[] , includeDirs =true , extended =true , globstar =false , caseInsensitive  } = {}) {
    const globOptions = {
        extended,
        globstar,
        caseInsensitive
    };
    const absRoot = resolve(root);
    const resolveFromRoot = (path)=>resolve(absRoot, path);
    const excludePatterns = exclude.map(resolveFromRoot).map((s)=>globToRegExp(s, globOptions));
    const shouldInclude = (path)=>!excludePatterns.some((p)=>!!path.match(p));
    const { segments , isAbsolute: isGlobAbsolute , hasTrailingSep , winRoot  } = split(glob);
    let fixedRoot = isGlobAbsolute ? winRoot != undefined ? winRoot : "/" : absRoot;
    while(segments.length > 0 && !isGlob(segments[0])){
        const seg = segments.shift();
        assert(seg != null);
        fixedRoot = joinGlobs([
            fixedRoot,
            seg
        ], globOptions);
    }
    let fixedRootInfo;
    try {
        fixedRootInfo = _createWalkEntrySync(fixedRoot);
    } catch (error) {
        return throwUnlessNotFound(error);
    }
    function* advanceMatch(walkInfo, globSegment) {
        if (!walkInfo.isDirectory) {
            return;
        } else if (globSegment == "..") {
            const parentPath = joinGlobs([
                walkInfo.path,
                ".."
            ], globOptions);
            try {
                if (shouldInclude(parentPath)) {
                    return yield _createWalkEntrySync(parentPath);
                }
            } catch (error) {
                throwUnlessNotFound(error);
            }
            return;
        } else if (globSegment == "**") {
            return yield* walkSync(walkInfo.path, {
                skip: excludePatterns
            });
        }
        const globPattern = globToRegExp(globSegment, globOptions);
        for (const walkEntry of walkSync(walkInfo.path, {
            maxDepth: 1,
            skip: excludePatterns
        })){
            if (walkEntry.path != walkInfo.path && walkEntry.name.match(globPattern)) {
                yield walkEntry;
            }
        }
    }
    let currentMatches = [
        fixedRootInfo
    ];
    for (const segment of segments){
        // Advancing the list of current matches may introduce duplicates, so we
        // pass everything through this Map.
        const nextMatchMap = new Map();
        for (const currentMatch of currentMatches){
            for (const nextMatch of advanceMatch(currentMatch, segment)){
                nextMatchMap.set(nextMatch.path, nextMatch);
            }
        }
        currentMatches = [
            ...nextMatchMap.values()
        ].sort(comparePath);
    }
    if (hasTrailingSep) {
        currentMatches = currentMatches.filter((entry)=>entry.isDirectory);
    }
    if (!includeDirs) {
        currentMatches = currentMatches.filter((entry)=>!entry.isDirectory);
    }
    yield* currentMatches;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE0MC4wL2ZzL2V4cGFuZF9nbG9iLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjIgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQge1xuICBHbG9iT3B0aW9ucyxcbiAgZ2xvYlRvUmVnRXhwLFxuICBpc0Fic29sdXRlLFxuICBpc0dsb2IsXG4gIGpvaW5HbG9icyxcbiAgcmVzb2x2ZSxcbiAgU0VQX1BBVFRFUk4sXG59IGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuaW1wb3J0IHtcbiAgX2NyZWF0ZVdhbGtFbnRyeSxcbiAgX2NyZWF0ZVdhbGtFbnRyeVN5bmMsXG4gIHdhbGssXG4gIFdhbGtFbnRyeSxcbiAgd2Fsa1N5bmMsXG59IGZyb20gXCIuL3dhbGsudHNcIjtcbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnQudHNcIjtcbmltcG9ydCB7IGlzV2luZG93cyB9IGZyb20gXCIuLi9fdXRpbC9vcy50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4cGFuZEdsb2JPcHRpb25zIGV4dGVuZHMgT21pdDxHbG9iT3B0aW9ucywgXCJvc1wiPiB7XG4gIHJvb3Q/OiBzdHJpbmc7XG4gIGV4Y2x1ZGU/OiBzdHJpbmdbXTtcbiAgaW5jbHVkZURpcnM/OiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgU3BsaXRQYXRoIHtcbiAgc2VnbWVudHM6IHN0cmluZ1tdO1xuICBpc0Fic29sdXRlOiBib29sZWFuO1xuICBoYXNUcmFpbGluZ1NlcDogYm9vbGVhbjtcbiAgLy8gRGVmaW5lZCBmb3IgYW55IGFic29sdXRlIFdpbmRvd3MgcGF0aC5cbiAgd2luUm9vdD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gc3BsaXQocGF0aDogc3RyaW5nKTogU3BsaXRQYXRoIHtcbiAgY29uc3QgcyA9IFNFUF9QQVRURVJOLnNvdXJjZTtcbiAgY29uc3Qgc2VnbWVudHMgPSBwYXRoXG4gICAgLnJlcGxhY2UobmV3IFJlZ0V4cChgXiR7c318JHtzfSRgLCBcImdcIiksIFwiXCIpXG4gICAgLnNwbGl0KFNFUF9QQVRURVJOKTtcbiAgY29uc3QgaXNBYnNvbHV0ZV8gPSBpc0Fic29sdXRlKHBhdGgpO1xuICByZXR1cm4ge1xuICAgIHNlZ21lbnRzLFxuICAgIGlzQWJzb2x1dGU6IGlzQWJzb2x1dGVfLFxuICAgIGhhc1RyYWlsaW5nU2VwOiAhIXBhdGgubWF0Y2gobmV3IFJlZ0V4cChgJHtzfSRgKSksXG4gICAgd2luUm9vdDogaXNXaW5kb3dzICYmIGlzQWJzb2x1dGVfID8gc2VnbWVudHMuc2hpZnQoKSA6IHVuZGVmaW5lZCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGhyb3dVbmxlc3NOb3RGb3VuZChlcnJvcjogdW5rbm93bik6IHZvaWQge1xuICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSkge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVQYXRoKGE6IFdhbGtFbnRyeSwgYjogV2Fsa0VudHJ5KTogbnVtYmVyIHtcbiAgaWYgKGEucGF0aCA8IGIucGF0aCkgcmV0dXJuIC0xO1xuICBpZiAoYS5wYXRoID4gYi5wYXRoKSByZXR1cm4gMTtcbiAgcmV0dXJuIDA7XG59XG5cbi8qKiBFeHBhbmQgdGhlIGdsb2Igc3RyaW5nIGZyb20gdGhlIHNwZWNpZmllZCBgcm9vdGAgZGlyZWN0b3J5IGFuZCB5aWVsZCBlYWNoXG4gKiByZXN1bHQgYXMgYSBgV2Fsa0VudHJ5YCBvYmplY3QuXG4gKlxuICogU2VlIFtgZ2xvYlRvUmVnRXhwKClgXSguLi9wYXRoL2dsb2IudHMjZ2xvYlRvUmVnRXhwKSBmb3IgZGV0YWlscyBvbiBzdXBwb3J0ZWRcbiAqIHN5bnRheC5cbiAqXG4gKiBFeGFtcGxlOlxuICogYGBgdHNcbiAqICAgICAgaW1wb3J0IHsgZXhwYW5kR2xvYiB9IGZyb20gXCIuL2V4cGFuZF9nbG9iLnRzXCI7XG4gKiAgICAgIGZvciBhd2FpdCAoY29uc3QgZmlsZSBvZiBleHBhbmRHbG9iKFwiKipcXC8qLnRzXCIpKSB7XG4gKiAgICAgICAgY29uc29sZS5sb2coZmlsZSk7XG4gKiAgICAgIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIGV4cGFuZEdsb2IoXG4gIGdsb2I6IHN0cmluZyxcbiAge1xuICAgIHJvb3QgPSBEZW5vLmN3ZCgpLFxuICAgIGV4Y2x1ZGUgPSBbXSxcbiAgICBpbmNsdWRlRGlycyA9IHRydWUsXG4gICAgZXh0ZW5kZWQgPSB0cnVlLFxuICAgIGdsb2JzdGFyID0gZmFsc2UsXG4gICAgY2FzZUluc2Vuc2l0aXZlLFxuICB9OiBFeHBhbmRHbG9iT3B0aW9ucyA9IHt9LFxuKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPFdhbGtFbnRyeT4ge1xuICBjb25zdCBnbG9iT3B0aW9uczogR2xvYk9wdGlvbnMgPSB7IGV4dGVuZGVkLCBnbG9ic3RhciwgY2FzZUluc2Vuc2l0aXZlIH07XG4gIGNvbnN0IGFic1Jvb3QgPSByZXNvbHZlKHJvb3QpO1xuICBjb25zdCByZXNvbHZlRnJvbVJvb3QgPSAocGF0aDogc3RyaW5nKTogc3RyaW5nID0+IHJlc29sdmUoYWJzUm9vdCwgcGF0aCk7XG4gIGNvbnN0IGV4Y2x1ZGVQYXR0ZXJucyA9IGV4Y2x1ZGVcbiAgICAubWFwKHJlc29sdmVGcm9tUm9vdClcbiAgICAubWFwKChzOiBzdHJpbmcpOiBSZWdFeHAgPT4gZ2xvYlRvUmVnRXhwKHMsIGdsb2JPcHRpb25zKSk7XG4gIGNvbnN0IHNob3VsZEluY2x1ZGUgPSAocGF0aDogc3RyaW5nKTogYm9vbGVhbiA9PlxuICAgICFleGNsdWRlUGF0dGVybnMuc29tZSgocDogUmVnRXhwKTogYm9vbGVhbiA9PiAhIXBhdGgubWF0Y2gocCkpO1xuICBjb25zdCB7IHNlZ21lbnRzLCBpc0Fic29sdXRlOiBpc0dsb2JBYnNvbHV0ZSwgaGFzVHJhaWxpbmdTZXAsIHdpblJvb3QgfSA9XG4gICAgc3BsaXQoZ2xvYik7XG5cbiAgbGV0IGZpeGVkUm9vdCA9IGlzR2xvYkFic29sdXRlXG4gICAgPyAod2luUm9vdCAhPSB1bmRlZmluZWQgPyB3aW5Sb290IDogXCIvXCIpXG4gICAgOiBhYnNSb290O1xuICB3aGlsZSAoc2VnbWVudHMubGVuZ3RoID4gMCAmJiAhaXNHbG9iKHNlZ21lbnRzWzBdKSkge1xuICAgIGNvbnN0IHNlZyA9IHNlZ21lbnRzLnNoaWZ0KCk7XG4gICAgYXNzZXJ0KHNlZyAhPSBudWxsKTtcbiAgICBmaXhlZFJvb3QgPSBqb2luR2xvYnMoW2ZpeGVkUm9vdCwgc2VnXSwgZ2xvYk9wdGlvbnMpO1xuICB9XG5cbiAgbGV0IGZpeGVkUm9vdEluZm86IFdhbGtFbnRyeTtcbiAgdHJ5IHtcbiAgICBmaXhlZFJvb3RJbmZvID0gYXdhaXQgX2NyZWF0ZVdhbGtFbnRyeShmaXhlZFJvb3QpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB0aHJvd1VubGVzc05vdEZvdW5kKGVycm9yKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uKiBhZHZhbmNlTWF0Y2goXG4gICAgd2Fsa0luZm86IFdhbGtFbnRyeSxcbiAgICBnbG9iU2VnbWVudDogc3RyaW5nLFxuICApOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8V2Fsa0VudHJ5PiB7XG4gICAgaWYgKCF3YWxrSW5mby5pc0RpcmVjdG9yeSkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoZ2xvYlNlZ21lbnQgPT0gXCIuLlwiKSB7XG4gICAgICBjb25zdCBwYXJlbnRQYXRoID0gam9pbkdsb2JzKFt3YWxrSW5mby5wYXRoLCBcIi4uXCJdLCBnbG9iT3B0aW9ucyk7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoc2hvdWxkSW5jbHVkZShwYXJlbnRQYXRoKSkge1xuICAgICAgICAgIHJldHVybiB5aWVsZCBhd2FpdCBfY3JlYXRlV2Fsa0VudHJ5KHBhcmVudFBhdGgpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aHJvd1VubGVzc05vdEZvdW5kKGVycm9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGdsb2JTZWdtZW50ID09IFwiKipcIikge1xuICAgICAgcmV0dXJuIHlpZWxkKiB3YWxrKHdhbGtJbmZvLnBhdGgsIHsgc2tpcDogZXhjbHVkZVBhdHRlcm5zIH0pO1xuICAgIH1cbiAgICBjb25zdCBnbG9iUGF0dGVybiA9IGdsb2JUb1JlZ0V4cChnbG9iU2VnbWVudCwgZ2xvYk9wdGlvbnMpO1xuICAgIGZvciBhd2FpdCAoXG4gICAgICBjb25zdCB3YWxrRW50cnkgb2Ygd2Fsayh3YWxrSW5mby5wYXRoLCB7XG4gICAgICAgIG1heERlcHRoOiAxLFxuICAgICAgICBza2lwOiBleGNsdWRlUGF0dGVybnMsXG4gICAgICB9KVxuICAgICkge1xuICAgICAgaWYgKFxuICAgICAgICB3YWxrRW50cnkucGF0aCAhPSB3YWxrSW5mby5wYXRoICYmIHdhbGtFbnRyeS5uYW1lLm1hdGNoKGdsb2JQYXR0ZXJuKVxuICAgICAgKSB7XG4gICAgICAgIHlpZWxkIHdhbGtFbnRyeTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBsZXQgY3VycmVudE1hdGNoZXM6IFdhbGtFbnRyeVtdID0gW2ZpeGVkUm9vdEluZm9dO1xuICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAvLyBBZHZhbmNpbmcgdGhlIGxpc3Qgb2YgY3VycmVudCBtYXRjaGVzIG1heSBpbnRyb2R1Y2UgZHVwbGljYXRlcywgc28gd2VcbiAgICAvLyBwYXNzIGV2ZXJ5dGhpbmcgdGhyb3VnaCB0aGlzIE1hcC5cbiAgICBjb25zdCBuZXh0TWF0Y2hNYXA6IE1hcDxzdHJpbmcsIFdhbGtFbnRyeT4gPSBuZXcgTWFwKCk7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoY3VycmVudE1hdGNoZXMubWFwKGFzeW5jIChjdXJyZW50TWF0Y2gpID0+IHtcbiAgICAgIGZvciBhd2FpdCAoY29uc3QgbmV4dE1hdGNoIG9mIGFkdmFuY2VNYXRjaChjdXJyZW50TWF0Y2gsIHNlZ21lbnQpKSB7XG4gICAgICAgIG5leHRNYXRjaE1hcC5zZXQobmV4dE1hdGNoLnBhdGgsIG5leHRNYXRjaCk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIGN1cnJlbnRNYXRjaGVzID0gWy4uLm5leHRNYXRjaE1hcC52YWx1ZXMoKV0uc29ydChjb21wYXJlUGF0aCk7XG4gIH1cbiAgaWYgKGhhc1RyYWlsaW5nU2VwKSB7XG4gICAgY3VycmVudE1hdGNoZXMgPSBjdXJyZW50TWF0Y2hlcy5maWx0ZXIoXG4gICAgICAoZW50cnk6IFdhbGtFbnRyeSk6IGJvb2xlYW4gPT4gZW50cnkuaXNEaXJlY3RvcnksXG4gICAgKTtcbiAgfVxuICBpZiAoIWluY2x1ZGVEaXJzKSB7XG4gICAgY3VycmVudE1hdGNoZXMgPSBjdXJyZW50TWF0Y2hlcy5maWx0ZXIoXG4gICAgICAoZW50cnk6IFdhbGtFbnRyeSk6IGJvb2xlYW4gPT4gIWVudHJ5LmlzRGlyZWN0b3J5LFxuICAgICk7XG4gIH1cbiAgeWllbGQqIGN1cnJlbnRNYXRjaGVzO1xufVxuXG4vKiogU3luY2hyb25vdXMgdmVyc2lvbiBvZiBgZXhwYW5kR2xvYigpYC5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYHRzXG4gKiAgICAgIGltcG9ydCB7IGV4cGFuZEdsb2JTeW5jIH0gZnJvbSBcIi4vZXhwYW5kX2dsb2IudHNcIjtcbiAqICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGV4cGFuZEdsb2JTeW5jKFwiKipcXC8qLnRzXCIpKSB7XG4gKiAgICAgICAgY29uc29sZS5sb2coZmlsZSk7XG4gKiAgICAgIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24qIGV4cGFuZEdsb2JTeW5jKFxuICBnbG9iOiBzdHJpbmcsXG4gIHtcbiAgICByb290ID0gRGVuby5jd2QoKSxcbiAgICBleGNsdWRlID0gW10sXG4gICAgaW5jbHVkZURpcnMgPSB0cnVlLFxuICAgIGV4dGVuZGVkID0gdHJ1ZSxcbiAgICBnbG9ic3RhciA9IGZhbHNlLFxuICAgIGNhc2VJbnNlbnNpdGl2ZSxcbiAgfTogRXhwYW5kR2xvYk9wdGlvbnMgPSB7fSxcbik6IEl0ZXJhYmxlSXRlcmF0b3I8V2Fsa0VudHJ5PiB7XG4gIGNvbnN0IGdsb2JPcHRpb25zOiBHbG9iT3B0aW9ucyA9IHsgZXh0ZW5kZWQsIGdsb2JzdGFyLCBjYXNlSW5zZW5zaXRpdmUgfTtcbiAgY29uc3QgYWJzUm9vdCA9IHJlc29sdmUocm9vdCk7XG4gIGNvbnN0IHJlc29sdmVGcm9tUm9vdCA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmcgPT4gcmVzb2x2ZShhYnNSb290LCBwYXRoKTtcbiAgY29uc3QgZXhjbHVkZVBhdHRlcm5zID0gZXhjbHVkZVxuICAgIC5tYXAocmVzb2x2ZUZyb21Sb290KVxuICAgIC5tYXAoKHM6IHN0cmluZyk6IFJlZ0V4cCA9PiBnbG9iVG9SZWdFeHAocywgZ2xvYk9wdGlvbnMpKTtcbiAgY29uc3Qgc2hvdWxkSW5jbHVkZSA9IChwYXRoOiBzdHJpbmcpOiBib29sZWFuID0+XG4gICAgIWV4Y2x1ZGVQYXR0ZXJucy5zb21lKChwOiBSZWdFeHApOiBib29sZWFuID0+ICEhcGF0aC5tYXRjaChwKSk7XG4gIGNvbnN0IHsgc2VnbWVudHMsIGlzQWJzb2x1dGU6IGlzR2xvYkFic29sdXRlLCBoYXNUcmFpbGluZ1NlcCwgd2luUm9vdCB9ID1cbiAgICBzcGxpdChnbG9iKTtcblxuICBsZXQgZml4ZWRSb290ID0gaXNHbG9iQWJzb2x1dGVcbiAgICA/ICh3aW5Sb290ICE9IHVuZGVmaW5lZCA/IHdpblJvb3QgOiBcIi9cIilcbiAgICA6IGFic1Jvb3Q7XG4gIHdoaWxlIChzZWdtZW50cy5sZW5ndGggPiAwICYmICFpc0dsb2Ioc2VnbWVudHNbMF0pKSB7XG4gICAgY29uc3Qgc2VnID0gc2VnbWVudHMuc2hpZnQoKTtcbiAgICBhc3NlcnQoc2VnICE9IG51bGwpO1xuICAgIGZpeGVkUm9vdCA9IGpvaW5HbG9icyhbZml4ZWRSb290LCBzZWddLCBnbG9iT3B0aW9ucyk7XG4gIH1cblxuICBsZXQgZml4ZWRSb290SW5mbzogV2Fsa0VudHJ5O1xuICB0cnkge1xuICAgIGZpeGVkUm9vdEluZm8gPSBfY3JlYXRlV2Fsa0VudHJ5U3luYyhmaXhlZFJvb3QpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB0aHJvd1VubGVzc05vdEZvdW5kKGVycm9yKTtcbiAgfVxuXG4gIGZ1bmN0aW9uKiBhZHZhbmNlTWF0Y2goXG4gICAgd2Fsa0luZm86IFdhbGtFbnRyeSxcbiAgICBnbG9iU2VnbWVudDogc3RyaW5nLFxuICApOiBJdGVyYWJsZUl0ZXJhdG9yPFdhbGtFbnRyeT4ge1xuICAgIGlmICghd2Fsa0luZm8uaXNEaXJlY3RvcnkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGdsb2JTZWdtZW50ID09IFwiLi5cIikge1xuICAgICAgY29uc3QgcGFyZW50UGF0aCA9IGpvaW5HbG9icyhbd2Fsa0luZm8ucGF0aCwgXCIuLlwiXSwgZ2xvYk9wdGlvbnMpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHNob3VsZEluY2x1ZGUocGFyZW50UGF0aCkpIHtcbiAgICAgICAgICByZXR1cm4geWllbGQgX2NyZWF0ZVdhbGtFbnRyeVN5bmMocGFyZW50UGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRocm93VW5sZXNzTm90Rm91bmQoZXJyb3IpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoZ2xvYlNlZ21lbnQgPT0gXCIqKlwiKSB7XG4gICAgICByZXR1cm4geWllbGQqIHdhbGtTeW5jKHdhbGtJbmZvLnBhdGgsIHsgc2tpcDogZXhjbHVkZVBhdHRlcm5zIH0pO1xuICAgIH1cbiAgICBjb25zdCBnbG9iUGF0dGVybiA9IGdsb2JUb1JlZ0V4cChnbG9iU2VnbWVudCwgZ2xvYk9wdGlvbnMpO1xuICAgIGZvciAoXG4gICAgICBjb25zdCB3YWxrRW50cnkgb2Ygd2Fsa1N5bmMod2Fsa0luZm8ucGF0aCwge1xuICAgICAgICBtYXhEZXB0aDogMSxcbiAgICAgICAgc2tpcDogZXhjbHVkZVBhdHRlcm5zLFxuICAgICAgfSlcbiAgICApIHtcbiAgICAgIGlmIChcbiAgICAgICAgd2Fsa0VudHJ5LnBhdGggIT0gd2Fsa0luZm8ucGF0aCAmJiB3YWxrRW50cnkubmFtZS5tYXRjaChnbG9iUGF0dGVybilcbiAgICAgICkge1xuICAgICAgICB5aWVsZCB3YWxrRW50cnk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbGV0IGN1cnJlbnRNYXRjaGVzOiBXYWxrRW50cnlbXSA9IFtmaXhlZFJvb3RJbmZvXTtcbiAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgLy8gQWR2YW5jaW5nIHRoZSBsaXN0IG9mIGN1cnJlbnQgbWF0Y2hlcyBtYXkgaW50cm9kdWNlIGR1cGxpY2F0ZXMsIHNvIHdlXG4gICAgLy8gcGFzcyBldmVyeXRoaW5nIHRocm91Z2ggdGhpcyBNYXAuXG4gICAgY29uc3QgbmV4dE1hdGNoTWFwOiBNYXA8c3RyaW5nLCBXYWxrRW50cnk+ID0gbmV3IE1hcCgpO1xuICAgIGZvciAoY29uc3QgY3VycmVudE1hdGNoIG9mIGN1cnJlbnRNYXRjaGVzKSB7XG4gICAgICBmb3IgKGNvbnN0IG5leHRNYXRjaCBvZiBhZHZhbmNlTWF0Y2goY3VycmVudE1hdGNoLCBzZWdtZW50KSkge1xuICAgICAgICBuZXh0TWF0Y2hNYXAuc2V0KG5leHRNYXRjaC5wYXRoLCBuZXh0TWF0Y2gpO1xuICAgICAgfVxuICAgIH1cbiAgICBjdXJyZW50TWF0Y2hlcyA9IFsuLi5uZXh0TWF0Y2hNYXAudmFsdWVzKCldLnNvcnQoY29tcGFyZVBhdGgpO1xuICB9XG4gIGlmIChoYXNUcmFpbGluZ1NlcCkge1xuICAgIGN1cnJlbnRNYXRjaGVzID0gY3VycmVudE1hdGNoZXMuZmlsdGVyKFxuICAgICAgKGVudHJ5OiBXYWxrRW50cnkpOiBib29sZWFuID0+IGVudHJ5LmlzRGlyZWN0b3J5LFxuICAgICk7XG4gIH1cbiAgaWYgKCFpbmNsdWRlRGlycykge1xuICAgIGN1cnJlbnRNYXRjaGVzID0gY3VycmVudE1hdGNoZXMuZmlsdGVyKFxuICAgICAgKGVudHJ5OiBXYWxrRW50cnkpOiBib29sZWFuID0+ICFlbnRyeS5pc0RpcmVjdG9yeSxcbiAgICApO1xuICB9XG4gIHlpZWxkKiBjdXJyZW50TWF0Y2hlcztcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsU0FFRSxZQUFZLEVBQ1osVUFBVSxFQUNWLE1BQU0sRUFDTixTQUFTLEVBQ1QsT0FBTyxFQUNQLFdBQVcsUUFDTixpQkFBaUI7QUFDeEIsU0FDRSxnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3BCLElBQUksRUFFSixRQUFRLFFBQ0gsWUFBWTtBQUNuQixTQUFTLE1BQU0sUUFBUSxxQkFBcUI7QUFDNUMsU0FBUyxTQUFTLFFBQVEsaUJBQWlCO0FBZ0IzQyxTQUFTLE1BQU0sSUFBWSxFQUFhO0lBQ3RDLE1BQU0sSUFBSSxZQUFZLE1BQU07SUFDNUIsTUFBTSxXQUFXLEtBQ2QsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sSUFDeEMsS0FBSyxDQUFDO0lBQ1QsTUFBTSxjQUFjLFdBQVc7SUFDL0IsT0FBTztRQUNMO1FBQ0EsWUFBWTtRQUNaLGdCQUFnQixDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvQyxTQUFTLGFBQWEsY0FBYyxTQUFTLEtBQUssS0FBSyxTQUFTO0lBQ2xFO0FBQ0Y7QUFFQSxTQUFTLG9CQUFvQixLQUFjLEVBQVE7SUFDakQsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEtBQUssTUFBTSxDQUFDLFFBQVEsR0FBRztRQUM1QyxNQUFNLE1BQU07SUFDZCxDQUFDO0FB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