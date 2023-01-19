// Lifted from https://raw.githubusercontent.com/denoland/deno_graph/89affe43c9d3d5c9165c8089687c107d53ed8fe1/lib/media_type.ts
let tempDir;
export async function info(specifier, options) {
    const cmd = [
        Deno.execPath(),
        "info",
        "--json"
    ];
    if (options.importMap !== undefined) {
        cmd.push("--import-map", options.importMap);
    }
    cmd.push(specifier.href);
    if (!tempDir) {
        tempDir = Deno.makeTempDirSync();
    }
    let proc;
    try {
        proc = Deno.run({
            cmd,
            stdout: "piped",
            cwd: tempDir
        });
        const raw = await proc.output();
        const status = await proc.status();
        if (!status.success) {
            throw new Error(`Failed to call 'deno info' on '${specifier.href}'`);
        }
        const txt = new TextDecoder().decode(raw);
        return JSON.parse(txt);
    } finally{
        try {
            proc?.stdout.close();
        } catch (err) {
            if (err instanceof Deno.errors.BadResource) {
            // ignore the error
            } else {
                // deno-lint-ignore no-unsafe-finally
                throw err;
            }
        }
        proc?.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXNidWlsZF9kZW5vX2xvYWRlckAwLjUuMi9zcmMvZGVuby50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBMaWZ0ZWQgZnJvbSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vZGVub2xhbmQvZGVub19ncmFwaC84OWFmZmU0M2M5ZDNkNWM5MTY1YzgwODk2ODdjMTA3ZDUzZWQ4ZmUxL2xpYi9tZWRpYV90eXBlLnRzXG5leHBvcnQgdHlwZSBNZWRpYVR5cGUgPVxuICB8IFwiSmF2YVNjcmlwdFwiXG4gIHwgXCJNanNcIlxuICB8IFwiQ2pzXCJcbiAgfCBcIkpTWFwiXG4gIHwgXCJUeXBlU2NyaXB0XCJcbiAgfCBcIk10c1wiXG4gIHwgXCJDdHNcIlxuICB8IFwiRHRzXCJcbiAgfCBcIkRtdHNcIlxuICB8IFwiRGN0c1wiXG4gIHwgXCJUU1hcIlxuICB8IFwiSnNvblwiXG4gIHwgXCJXYXNtXCJcbiAgfCBcIlRzQnVpbGRJbmZvXCJcbiAgfCBcIlNvdXJjZU1hcFwiXG4gIHwgXCJVbmtub3duXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5mb091dHB1dCB7XG4gIHJvb3RzOiBzdHJpbmdbXTtcbiAgbW9kdWxlczogTW9kdWxlRW50cnlbXTtcbiAgcmVkaXJlY3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZUVudHJ5IHtcbiAgc3BlY2lmaWVyOiBzdHJpbmc7XG4gIHNpemU6IG51bWJlcjtcbiAgbWVkaWFUeXBlPzogTWVkaWFUeXBlO1xuICBsb2NhbD86IHN0cmluZztcbiAgY2hlY2tzdW0/OiBzdHJpbmc7XG4gIGVtaXQ/OiBzdHJpbmc7XG4gIG1hcD86IHN0cmluZztcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBEZW5vSW5mb09wdGlvbnMge1xuICBpbXBvcnRNYXA/OiBzdHJpbmc7XG59XG5cbmxldCB0ZW1wRGlyOiBudWxsIHwgc3RyaW5nO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5mbyhcbiAgc3BlY2lmaWVyOiBVUkwsXG4gIG9wdGlvbnM6IERlbm9JbmZvT3B0aW9ucyxcbik6IFByb21pc2U8SW5mb091dHB1dD4ge1xuICBjb25zdCBjbWQgPSBbXG4gICAgRGVuby5leGVjUGF0aCgpLFxuICAgIFwiaW5mb1wiLFxuICAgIFwiLS1qc29uXCIsXG4gIF07XG4gIGlmIChvcHRpb25zLmltcG9ydE1hcCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY21kLnB1c2goXCItLWltcG9ydC1tYXBcIiwgb3B0aW9ucy5pbXBvcnRNYXApO1xuICB9XG4gIGNtZC5wdXNoKHNwZWNpZmllci5ocmVmKTtcblxuICBpZiAoIXRlbXBEaXIpIHtcbiAgICB0ZW1wRGlyID0gRGVuby5tYWtlVGVtcERpclN5bmMoKTtcbiAgfVxuXG4gIGxldCBwcm9jO1xuXG4gIHRyeSB7XG4gICAgcHJvYyA9IERlbm8ucnVuKHtcbiAgICAgIGNtZCxcbiAgICAgIHN0ZG91dDogXCJwaXBlZFwiLFxuICAgICAgY3dkOiB0ZW1wRGlyLFxuICAgIH0pO1xuICAgIGNvbnN0IHJhdyA9IGF3YWl0IHByb2Mub3V0cHV0KCk7XG4gICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgcHJvYy5zdGF0dXMoKTtcbiAgICBpZiAoIXN0YXR1cy5zdWNjZXNzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjYWxsICdkZW5vIGluZm8nIG9uICcke3NwZWNpZmllci5ocmVmfSdgKTtcbiAgICB9XG4gICAgY29uc3QgdHh0ID0gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHJhdyk7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UodHh0KTtcbiAgfSBmaW5hbGx5IHtcbiAgICB0cnkge1xuICAgICAgcHJvYz8uc3Rkb3V0LmNsb3NlKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRGVuby5lcnJvcnMuQmFkUmVzb3VyY2UpIHtcbiAgICAgICAgLy8gaWdub3JlIHRoZSBlcnJvclxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby11bnNhZmUtZmluYWxseVxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICAgIHByb2M/LmNsb3NlKCk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwrSEFBK0g7QUF3Qy9ILElBQUk7QUFFSixPQUFPLGVBQWUsS0FDcEIsU0FBYyxFQUNkLE9BQXdCLEVBQ0g7SUFDckIsTUFBTSxNQUFNO1FBQ1YsS0FBSyxRQUFRO1FBQ2I7UUFDQTtLQUNEO0lBQ0QsSUFBSSxRQUFRLFNBQVMsS0FBSyxXQUFXO1FBQ25DLElBQUksSUFBSSxDQUFDLGdCQUFnQixRQUFRLFNBQVM7SUFDNUMsQ0FBQztJQUNELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSTtJQUV2QixJQUFJLENBQUMsU0FBUztRQUNaLFVBQVUsS0FBSyxlQUFlO0lBQ2hDLENBQUM7SUFFRCxJQUFJO0lBRUosSUFBSTtRQUNGLE9BQU8sS0FBSyxHQUFHLENBQUM7WUFDZDtZQUNBLFFBQVE7WUFDUixLQUFLO1FBQ1A7UUFDQSxNQUFNLE1BQU0sTUFBTSxLQUFLLE1BQU07UUFDN0IsTUFBTSxTQUFTLE1BQU0sS0FBSyxNQUFNO1FBQ2hDLElBQUksQ0FBQyxPQUFPLE9BQU8sRUFBRTtZQUNuQixNQUFNLElBQUksTUFBTSxDQUFDLCtCQUErQixFQUFFLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ3ZFLENBQUM7UUFDRCxNQUFNLE1BQU0sSUFBSSxjQUFjLE1BQU0sQ0FBQztRQUNyQyxPQUFPLEtBQUssS0FBSyxDQUFDO0lBQ3BCLFNBQVU7UUFDUixJQUFJO1lBQ0YsTUFBTSxPQUFPLEtBQUs7UUFDcEIsRUFBRSxPQUFPLEtBQUs7WUFDWixJQUFJLGVBQWUsS0FBSyxNQUFNLENBQUMsV0FBVyxFQUFFO1lBQzFDLG1CQUFtQjtZQUNyQixPQUFPO2dCQUNMLHFDQUFxQztnQkFDckMsTUFBTSxJQUFJO1lBQ1osQ0FBQztRQUNIO1FBQ0EsTUFBTTtJQUNSO0FBQ0YsQ0FBQyJ9