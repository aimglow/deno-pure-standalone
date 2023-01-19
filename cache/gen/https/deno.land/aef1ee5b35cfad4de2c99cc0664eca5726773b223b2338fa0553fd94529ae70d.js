import { ensureDir, ensureDirSync } from "https://deno.land/std@0.140.0/fs/ensure_dir.ts";
import { expandGlob, expandGlobSync } from "https://deno.land/std@0.140.0/fs/expand_glob.ts";
import * as stdPath from "https://deno.land/std@0.140.0/path/mod.ts";
export class DenoRuntime {
    fs = new DenoRuntimeFileSystem();
    path = new DenoRuntimePath();
    getEnvVar(name) {
        return Deno.env.get(name);
    }
    getEndOfLine() {
        return Deno.build.os === "windows" ? "\r\n" : "\n";
    }
    getPathMatchesPattern(path, pattern) {
        return stdPath.globToRegExp(pattern, {
            extended: true,
            globstar: true,
            os: "linux"
        }).test(path);
    }
}
class DenoRuntimePath {
    join(...paths) {
        return stdPath.join(...paths);
    }
    normalize(path) {
        return stdPath.normalize(path);
    }
    relative(from, to) {
        return stdPath.relative(from, to);
    }
}
class DenoRuntimeFileSystem {
    delete(path) {
        return Deno.remove(path, {
            recursive: true
        });
    }
    deleteSync(path) {
        Deno.removeSync(path, {
            recursive: true
        });
    }
    readDirSync(dirPath) {
        return Array.from(Deno.readDirSync(dirPath));
    }
    readFile(filePath, _encoding = "utf-8") {
        return Deno.readTextFile(filePath);
    }
    readFileSync(filePath, _encoding = "utf-8") {
        return Deno.readTextFileSync(filePath);
    }
    writeFile(filePath, fileText) {
        return Deno.writeTextFile(filePath, fileText);
    }
    writeFileSync(filePath, fileText) {
        return Deno.writeTextFileSync(filePath, fileText);
    }
    async mkdir(dirPath) {
        await ensureDir(dirPath);
    }
    mkdirSync(dirPath) {
        ensureDirSync(dirPath);
    }
    move(srcPath, destPath) {
        return Deno.rename(srcPath, destPath);
    }
    moveSync(srcPath, destPath) {
        Deno.renameSync(srcPath, destPath);
    }
    copy(srcPath, destPath) {
        return Deno.copyFile(srcPath, destPath);
    }
    copySync(srcPath, destPath) {
        return Deno.copyFileSync(srcPath, destPath);
    }
    async stat(filePath) {
        const stat = await Deno.stat(filePath);
        return this._toStat(stat);
    }
    statSync(path) {
        const stat = Deno.statSync(path);
        return this._toStat(stat);
    }
    _toStat(stat) {
        return {
            isFile () {
                return stat.isFile;
            },
            isDirectory () {
                return stat.isDirectory;
            }
        };
    }
    realpathSync(path) {
        return Deno.realPathSync(path);
    }
    getCurrentDirectory() {
        return Deno.cwd();
    }
    async glob(patterns) {
        const { excludePatterns , pattern  } = globPatternsToPattern(patterns);
        const result = [];
        const globEntries = expandGlob(pattern, {
            root: this.getCurrentDirectory(),
            extended: true,
            globstar: true,
            exclude: excludePatterns
        });
        for await (const globEntry of globEntries){
            if (globEntry.isFile) result.push(globEntry.path);
        }
        return result;
    }
    globSync(patterns) {
        const { excludePatterns , pattern  } = globPatternsToPattern(patterns);
        const result = [];
        const globEntries = expandGlobSync(pattern, {
            root: this.getCurrentDirectory(),
            extended: true,
            globstar: true,
            exclude: excludePatterns
        });
        for (const globEntry of globEntries){
            if (globEntry.isFile) result.push(globEntry.path);
        }
        return result;
    }
    isCaseSensitive() {
        const platform = Deno.build.os;
        return platform !== "windows" && platform !== "darwin";
    }
}
function globPatternsToPattern(patterns) {
    const excludePatterns = [];
    const includePatterns = [];
    for (const pattern of patterns){
        if (isNegatedGlob(pattern)) excludePatterns.push(pattern);
        else includePatterns.push(pattern);
    }
    return {
        excludePatterns,
        pattern: includePatterns.length === 0 ? "." : includePatterns.length === 1 ? includePatterns[0] : `{${includePatterns.join(",")}}`
    };
    function isNegatedGlob(glob) {
        // https://github.com/micromatch/is-negated-glob/blob/master/index.js
        return glob[0] === "!" && glob[1] !== "(";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvdHNfbW9ycGhAMTYuMC4wL2NvbW1vbi9EZW5vUnVudGltZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlbnN1cmVEaXIsIGVuc3VyZURpclN5bmMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQDAuMTQwLjAvZnMvZW5zdXJlX2Rpci50c1wiO1xuaW1wb3J0IHsgZXhwYW5kR2xvYiwgZXhwYW5kR2xvYlN5bmMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQDAuMTQwLjAvZnMvZXhwYW5kX2dsb2IudHNcIjtcbmltcG9ydCAqIGFzIHN0ZFBhdGggZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE0MC4wL3BhdGgvbW9kLnRzXCI7XG5cbmV4cG9ydCBjbGFzcyBEZW5vUnVudGltZSB7XG4gIGZzID0gbmV3IERlbm9SdW50aW1lRmlsZVN5c3RlbSgpO1xuICBwYXRoID0gbmV3IERlbm9SdW50aW1lUGF0aCgpO1xuXG4gIGdldEVudlZhcihuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gRGVuby5lbnYuZ2V0KG5hbWUpO1xuICB9XG5cbiAgZ2V0RW5kT2ZMaW5lKCkge1xuICAgIHJldHVybiBEZW5vLmJ1aWxkLm9zID09PSBcIndpbmRvd3NcIiA/IFwiXFxyXFxuXCIgOiBcIlxcblwiO1xuICB9XG5cbiAgZ2V0UGF0aE1hdGNoZXNQYXR0ZXJuKHBhdGg6IHN0cmluZywgcGF0dGVybjogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0ZFBhdGguZ2xvYlRvUmVnRXhwKHBhdHRlcm4sIHtcbiAgICAgIGV4dGVuZGVkOiB0cnVlLFxuICAgICAgZ2xvYnN0YXI6IHRydWUsXG4gICAgICBvczogXCJsaW51eFwiLCAvLyB1c2UgdGhlIHNhbWUgYmVoYXZpb3VyIGFjcm9zcyBhbGwgb3BlcmF0aW5nIHN5c3RlbXNcbiAgICB9KS50ZXN0KHBhdGgpO1xuICB9XG59XG5cbmNsYXNzIERlbm9SdW50aW1lUGF0aCB7XG4gIGpvaW4oLi4ucGF0aHM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHN0ZFBhdGguam9pbiguLi5wYXRocyk7XG4gIH1cblxuICBub3JtYWxpemUocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0ZFBhdGgubm9ybWFsaXplKHBhdGgpO1xuICB9XG5cbiAgcmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0ZFBhdGgucmVsYXRpdmUoZnJvbSwgdG8pO1xuICB9XG59XG5cbmNsYXNzIERlbm9SdW50aW1lRmlsZVN5c3RlbSB7XG4gIGRlbGV0ZShwYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gRGVuby5yZW1vdmUocGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH1cblxuICBkZWxldGVTeW5jKHBhdGg6IHN0cmluZykge1xuICAgIERlbm8ucmVtb3ZlU3luYyhwYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgfVxuXG4gIHJlYWREaXJTeW5jKGRpclBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBBcnJheS5mcm9tKERlbm8ucmVhZERpclN5bmMoZGlyUGF0aCkpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZVBhdGg6IHN0cmluZywgX2VuY29kaW5nID0gXCJ1dGYtOFwiKSB7XG4gICAgcmV0dXJuIERlbm8ucmVhZFRleHRGaWxlKGZpbGVQYXRoKTtcbiAgfVxuXG4gIHJlYWRGaWxlU3luYyhmaWxlUGF0aDogc3RyaW5nLCBfZW5jb2RpbmcgPSBcInV0Zi04XCIpIHtcbiAgICByZXR1cm4gRGVuby5yZWFkVGV4dEZpbGVTeW5jKGZpbGVQYXRoKTtcbiAgfVxuXG4gIHdyaXRlRmlsZShmaWxlUGF0aDogc3RyaW5nLCBmaWxlVGV4dDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8ud3JpdGVUZXh0RmlsZShmaWxlUGF0aCwgZmlsZVRleHQpO1xuICB9XG5cbiAgd3JpdGVGaWxlU3luYyhmaWxlUGF0aDogc3RyaW5nLCBmaWxlVGV4dDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8ud3JpdGVUZXh0RmlsZVN5bmMoZmlsZVBhdGgsIGZpbGVUZXh0KTtcbiAgfVxuXG4gIGFzeW5jIG1rZGlyKGRpclBhdGg6IHN0cmluZykge1xuICAgIGF3YWl0IGVuc3VyZURpcihkaXJQYXRoKTtcbiAgfVxuXG4gIG1rZGlyU3luYyhkaXJQYXRoOiBzdHJpbmcpIHtcbiAgICBlbnN1cmVEaXJTeW5jKGRpclBhdGgpO1xuICB9XG5cbiAgbW92ZShzcmNQYXRoOiBzdHJpbmcsIGRlc3RQYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gRGVuby5yZW5hbWUoc3JjUGF0aCwgZGVzdFBhdGgpO1xuICB9XG5cbiAgbW92ZVN5bmMoc3JjUGF0aDogc3RyaW5nLCBkZXN0UGF0aDogc3RyaW5nKSB7XG4gICAgRGVuby5yZW5hbWVTeW5jKHNyY1BhdGgsIGRlc3RQYXRoKTtcbiAgfVxuXG4gIGNvcHkoc3JjUGF0aDogc3RyaW5nLCBkZXN0UGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8uY29weUZpbGUoc3JjUGF0aCwgZGVzdFBhdGgpO1xuICB9XG5cbiAgY29weVN5bmMoc3JjUGF0aDogc3RyaW5nLCBkZXN0UGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8uY29weUZpbGVTeW5jKHNyY1BhdGgsIGRlc3RQYXRoKTtcbiAgfVxuXG4gIGFzeW5jIHN0YXQoZmlsZVBhdGg6IHN0cmluZykge1xuICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBEZW5vLnN0YXQoZmlsZVBhdGgpO1xuICAgIHJldHVybiB0aGlzLl90b1N0YXQoc3RhdCk7XG4gIH1cblxuICBzdGF0U3luYyhwYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdGF0ID0gRGVuby5zdGF0U3luYyhwYXRoKTtcbiAgICByZXR1cm4gdGhpcy5fdG9TdGF0KHN0YXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfdG9TdGF0KHN0YXQ6IGFueSkge1xuICAgIHJldHVybiB7XG4gICAgICBpc0ZpbGUoKSB7XG4gICAgICAgIHJldHVybiBzdGF0LmlzRmlsZTtcbiAgICAgIH0sXG4gICAgICBpc0RpcmVjdG9yeSgpIHtcbiAgICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3Rvcnk7XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICByZWFscGF0aFN5bmMocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8ucmVhbFBhdGhTeW5jKHBhdGgpO1xuICB9XG5cbiAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBEZW5vLmN3ZCgpO1xuICB9XG5cbiAgYXN5bmMgZ2xvYihwYXR0ZXJuczogUmVhZG9ubHlBcnJheTxzdHJpbmc+KSB7XG4gICAgY29uc3QgeyBleGNsdWRlUGF0dGVybnMsIHBhdHRlcm4gfSA9IGdsb2JQYXR0ZXJuc1RvUGF0dGVybihwYXR0ZXJucyk7XG4gICAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGdsb2JFbnRyaWVzID0gZXhwYW5kR2xvYihwYXR0ZXJuLCB7XG4gICAgICByb290OiB0aGlzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICAgIGV4dGVuZGVkOiB0cnVlLFxuICAgICAgZ2xvYnN0YXI6IHRydWUsXG4gICAgICBleGNsdWRlOiBleGNsdWRlUGF0dGVybnMsXG4gICAgfSk7XG4gICAgZm9yIGF3YWl0IChjb25zdCBnbG9iRW50cnkgb2YgZ2xvYkVudHJpZXMpIHtcbiAgICAgIGlmIChnbG9iRW50cnkuaXNGaWxlKVxuICAgICAgICByZXN1bHQucHVzaChnbG9iRW50cnkucGF0aCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnbG9iU3luYyhwYXR0ZXJuczogUmVhZG9ubHlBcnJheTxzdHJpbmc+KSB7XG4gICAgY29uc3QgeyBleGNsdWRlUGF0dGVybnMsIHBhdHRlcm4gfSA9IGdsb2JQYXR0ZXJuc1RvUGF0dGVybihwYXR0ZXJucyk7XG4gICAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGdsb2JFbnRyaWVzID0gZXhwYW5kR2xvYlN5bmMocGF0dGVybiwge1xuICAgICAgcm9vdDogdGhpcy5nZXRDdXJyZW50RGlyZWN0b3J5KCksXG4gICAgICBleHRlbmRlZDogdHJ1ZSxcbiAgICAgIGdsb2JzdGFyOiB0cnVlLFxuICAgICAgZXhjbHVkZTogZXhjbHVkZVBhdHRlcm5zLFxuICAgIH0pO1xuICAgIGZvciAoY29uc3QgZ2xvYkVudHJ5IG9mIGdsb2JFbnRyaWVzKSB7XG4gICAgICBpZiAoZ2xvYkVudHJ5LmlzRmlsZSlcbiAgICAgICAgcmVzdWx0LnB1c2goZ2xvYkVudHJ5LnBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaXNDYXNlU2Vuc2l0aXZlKCkge1xuICAgIGNvbnN0IHBsYXRmb3JtID0gRGVuby5idWlsZC5vcztcbiAgICByZXR1cm4gcGxhdGZvcm0gIT09IFwid2luZG93c1wiICYmIHBsYXRmb3JtICE9PSBcImRhcndpblwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdsb2JQYXR0ZXJuc1RvUGF0dGVybihwYXR0ZXJuczogUmVhZG9ubHlBcnJheTxzdHJpbmc+KSB7XG4gIGNvbnN0IGV4Y2x1ZGVQYXR0ZXJucyA9IFtdO1xuICBjb25zdCBpbmNsdWRlUGF0dGVybnMgPSBbXTtcblxuICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcbiAgICBpZiAoaXNOZWdhdGVkR2xvYihwYXR0ZXJuKSlcbiAgICAgIGV4Y2x1ZGVQYXR0ZXJucy5wdXNoKHBhdHRlcm4pO1xuICAgIGVsc2VcbiAgICAgIGluY2x1ZGVQYXR0ZXJucy5wdXNoKHBhdHRlcm4pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBleGNsdWRlUGF0dGVybnMsXG4gICAgcGF0dGVybjogaW5jbHVkZVBhdHRlcm5zLmxlbmd0aCA9PT0gMCA/IFwiLlwiIDogaW5jbHVkZVBhdHRlcm5zLmxlbmd0aCA9PT0gMSA/IGluY2x1ZGVQYXR0ZXJuc1swXSA6IGB7JHtpbmNsdWRlUGF0dGVybnMuam9pbihcIixcIil9fWAsXG4gIH07XG5cbiAgZnVuY3Rpb24gaXNOZWdhdGVkR2xvYihnbG9iOiBzdHJpbmcpIHtcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWljcm9tYXRjaC9pcy1uZWdhdGVkLWdsb2IvYmxvYi9tYXN0ZXIvaW5kZXguanNcbiAgICByZXR1cm4gZ2xvYlswXSA9PT0gXCIhXCIgJiYgZ2xvYlsxXSAhPT0gXCIoXCI7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLFNBQVMsRUFBRSxhQUFhLFFBQVEsaURBQWlEO0FBQzFGLFNBQVMsVUFBVSxFQUFFLGNBQWMsUUFBUSxrREFBa0Q7QUFDN0YsWUFBWSxhQUFhLDRDQUE0QztBQUVyRSxPQUFPLE1BQU07SUFDWCxLQUFLLElBQUksd0JBQXdCO0lBQ2pDLE9BQU8sSUFBSSxrQkFBa0I7SUFFN0IsVUFBVSxJQUFZLEVBQUU7UUFDdEIsT0FBTyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFDdEI7SUFFQSxlQUFlO1FBQ2IsT0FBTyxLQUFLLEtBQUssQ0FBQyxFQUFFLEtBQUssWUFBWSxTQUFTLElBQUk7SUFDcEQ7SUFFQSxzQkFBc0IsSUFBWSxFQUFFLE9BQWUsRUFBRTtRQUNuRCxPQUFPLFFBQVEsWUFBWSxDQUFDLFNBQVM7WUFDbkMsVUFBVSxJQUFJO1lBQ2QsVUFBVSxJQUFJO1lBQ2QsSUFBSTtRQUNOLEdBQUcsSUFBSSxDQUFDO0lBQ1Y7QUFDRixDQUFDO0FBRUQsTUFBTTtJQUNKLEtBQUssR0FBRyxLQUFlLEVBQUU7UUFDdkIsT0FBTyxRQUFRLElBQUksSUFBSTtJQUN6QjtJQUVBLFVBQVUsSUFBWSxFQUFFO1FBQ3RCLE9BQU8sUUFBUSxTQUFTLENBQUM7SUFDM0I7SUFFQSxTQUFTLElBQVksRUFBRSxFQUFVLEVBQUU7UUFDakMsT0FBTyxRQUFRLFFBQVEsQ0FBQyxNQUFNO0lBQ2hDO0FBQ0Y7QUFFQSxNQUFNO0lBQ0osT0FBTyxJQUFZLEVBQUU7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