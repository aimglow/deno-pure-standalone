// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import * as path from "../path/mod.ts";
import { basename, normalize } from "../path/mod.ts";
/**
 * Test whether or not `dest` is a sub-directory of `src`
 * @param src src file path
 * @param dest dest file path
 * @param sep path separator
 */ export function isSubdir(src, dest, sep = path.sep) {
    if (src === dest) {
        return false;
    }
    const srcArray = src.split(sep);
    const destArray = dest.split(sep);
    return srcArray.every((current, i)=>destArray[i] === current);
}
/**
 * Get a human readable file type string.
 *
 * @param fileInfo A FileInfo describes a file and is returned by `stat`,
 *                 `lstat`
 */ export function getFileInfoType(fileInfo) {
    return fileInfo.isFile ? "file" : fileInfo.isDirectory ? "dir" : fileInfo.isSymlink ? "symlink" : undefined;
}
/** Create WalkEntry for the `path` synchronously */ export function createWalkEntrySync(path) {
    path = normalize(path);
    const name = basename(path);
    const info = Deno.statSync(path);
    return {
        path,
        name,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        isSymlink: info.isSymlink
    };
}
/** Create WalkEntry for the `path` asynchronously */ export async function createWalkEntry(path) {
    path = normalize(path);
    const name = basename(path);
    const info = await Deno.stat(path);
    return {
        path,
        name,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        isSymlink: info.isSymlink
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE1MC4wL2ZzL191dGlsLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjIgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuaW1wb3J0IHsgYmFzZW5hbWUsIG5vcm1hbGl6ZSB9IGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBvciBub3QgYGRlc3RgIGlzIGEgc3ViLWRpcmVjdG9yeSBvZiBgc3JjYFxuICogQHBhcmFtIHNyYyBzcmMgZmlsZSBwYXRoXG4gKiBAcGFyYW0gZGVzdCBkZXN0IGZpbGUgcGF0aFxuICogQHBhcmFtIHNlcCBwYXRoIHNlcGFyYXRvclxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdWJkaXIoXG4gIHNyYzogc3RyaW5nLFxuICBkZXN0OiBzdHJpbmcsXG4gIHNlcDogc3RyaW5nID0gcGF0aC5zZXAsXG4pOiBib29sZWFuIHtcbiAgaWYgKHNyYyA9PT0gZGVzdCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBzcmNBcnJheSA9IHNyYy5zcGxpdChzZXApO1xuICBjb25zdCBkZXN0QXJyYXkgPSBkZXN0LnNwbGl0KHNlcCk7XG4gIHJldHVybiBzcmNBcnJheS5ldmVyeSgoY3VycmVudCwgaSkgPT4gZGVzdEFycmF5W2ldID09PSBjdXJyZW50KTtcbn1cblxuZXhwb3J0IHR5cGUgUGF0aFR5cGUgPSBcImZpbGVcIiB8IFwiZGlyXCIgfCBcInN5bWxpbmtcIjtcblxuLyoqXG4gKiBHZXQgYSBodW1hbiByZWFkYWJsZSBmaWxlIHR5cGUgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSBmaWxlSW5mbyBBIEZpbGVJbmZvIGRlc2NyaWJlcyBhIGZpbGUgYW5kIGlzIHJldHVybmVkIGJ5IGBzdGF0YCxcbiAqICAgICAgICAgICAgICAgICBgbHN0YXRgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlSW5mb1R5cGUoZmlsZUluZm86IERlbm8uRmlsZUluZm8pOiBQYXRoVHlwZSB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBmaWxlSW5mby5pc0ZpbGVcbiAgICA/IFwiZmlsZVwiXG4gICAgOiBmaWxlSW5mby5pc0RpcmVjdG9yeVxuICAgID8gXCJkaXJcIlxuICAgIDogZmlsZUluZm8uaXNTeW1saW5rXG4gICAgPyBcInN5bWxpbmtcIlxuICAgIDogdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGtFbnRyeSBleHRlbmRzIERlbm8uRGlyRW50cnkge1xuICBwYXRoOiBzdHJpbmc7XG59XG5cbi8qKiBDcmVhdGUgV2Fsa0VudHJ5IGZvciB0aGUgYHBhdGhgIHN5bmNocm9ub3VzbHkgKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVXYWxrRW50cnlTeW5jKHBhdGg6IHN0cmluZyk6IFdhbGtFbnRyeSB7XG4gIHBhdGggPSBub3JtYWxpemUocGF0aCk7XG4gIGNvbnN0IG5hbWUgPSBiYXNlbmFtZShwYXRoKTtcbiAgY29uc3QgaW5mbyA9IERlbm8uc3RhdFN5bmMocGF0aCk7XG4gIHJldHVybiB7XG4gICAgcGF0aCxcbiAgICBuYW1lLFxuICAgIGlzRmlsZTogaW5mby5pc0ZpbGUsXG4gICAgaXNEaXJlY3Rvcnk6IGluZm8uaXNEaXJlY3RvcnksXG4gICAgaXNTeW1saW5rOiBpbmZvLmlzU3ltbGluayxcbiAgfTtcbn1cblxuLyoqIENyZWF0ZSBXYWxrRW50cnkgZm9yIHRoZSBgcGF0aGAgYXN5bmNocm9ub3VzbHkgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVXYWxrRW50cnkocGF0aDogc3RyaW5nKTogUHJvbWlzZTxXYWxrRW50cnk+IHtcbiAgcGF0aCA9IG5vcm1hbGl6ZShwYXRoKTtcbiAgY29uc3QgbmFtZSA9IGJhc2VuYW1lKHBhdGgpO1xuICBjb25zdCBpbmZvID0gYXdhaXQgRGVuby5zdGF0KHBhdGgpO1xuICByZXR1cm4ge1xuICAgIHBhdGgsXG4gICAgbmFtZSxcbiAgICBpc0ZpbGU6IGluZm8uaXNGaWxlLFxuICAgIGlzRGlyZWN0b3J5OiBpbmZvLmlzRGlyZWN0b3J5LFxuICAgIGlzU3ltbGluazogaW5mby5pc1N5bWxpbmssXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLFlBQVksVUFBVSxpQkFBaUI7QUFDdkMsU0FBUyxRQUFRLEVBQUUsU0FBUyxRQUFRLGlCQUFpQjtBQUVyRDs7Ozs7Q0FLQyxHQUNELE9BQU8sU0FBUyxTQUNkLEdBQVcsRUFDWCxJQUFZLEVBQ1osTUFBYyxLQUFLLEdBQUcsRUFDYjtJQUNULElBQUksUUFBUSxNQUFNO1FBQ2hCLE9BQU8sS0FBSztJQUNkLENBQUM7SUFDRCxNQUFNLFdBQVcsSUFBSSxLQUFLLENBQUM7SUFDM0IsTUFBTSxZQUFZLEtBQUssS0FBSyxDQUFDO0lBQzdCLE9BQU8sU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTLElBQU0sU0FBUyxDQUFDLEVBQUUsS0FBSztBQUN6RCxDQUFDO0FBSUQ7Ozs7O0NBS0MsR0FDRCxPQUFPLFNBQVMsZ0JBQWdCLFFBQXVCLEVBQXdCO0lBQzdFLE9BQU8sU0FBUyxNQUFNLEdBQ2xCLFNBQ0EsU0FBUyxXQUFXLEdBQ3BCLFFBQ0EsU0FBUyxTQUFTLEdBQ2xCLFlBQ0EsU0FBUztBQUNmLENBQUM7QUFNRCxrREFBa0QsR0FDbEQsT0FBTyxTQUFTLG9CQUFvQixJQUFZLEVBQWE7SUFDM0QsT0FBTyxVQUFVO0lBQ2pCLE1BQU0sT0FBTyxTQUFTO0lBQ3RCLE1BQU0sT0FBTyxLQUFLLFFBQVEsQ0FBQztJQUMzQixPQUFPO1FBQ0w7UUFDQTtRQUNBLFFBQVEsS0FBSyxNQUFNO1FBQ25CLGFBQWEsS0FBSyxXQUFXO1FBQzdCLFdBQVcsS0FBSyxTQUFTO0lBQzNCO0FBQ0YsQ0FBQztBQUVELG1EQUFtRCxHQUNuRCxPQUFPLGVBQWUsZ0JBQWdCLElBQVksRUFBc0I7SUFDdEUsT0FBTyxVQUFVO0lBQ2pCLE1BQU0sT0FBTyxTQUFTO0lBQ3RCLE1BQU0sT0FBTyxNQUFNLEtBQUssSUFBSSxDQUFDO0lBQzdCLE9BQU87UUFDTDtRQUNBO1FBQ0EsUUFBUSxLQUFLLE1BQU07UUFDbkIsYUFBYSxLQUFLLFdBQVc7UUFDN0IsV0FBVyxLQUFLLFNBQVM7SUFDM0I7QUFDRixDQUFDIn0=