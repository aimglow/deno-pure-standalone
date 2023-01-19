/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";
await start(manifest, {
    plugins: [
        twindPlugin(twindConfig)
    ]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5yZXBvcy8uaW5ib3gvLmxhYnMvZnJlc2gvZmxlc2gtcG9ydGFibGVAMS4xLjIvZnJlc2gucHVyZS9tYWluLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIG5vLWRlZmF1bHQtbGliPVwidHJ1ZVwiIC8+XG4vLy8gPHJlZmVyZW5jZSBsaWI9XCJkb21cIiAvPlxuLy8vIDxyZWZlcmVuY2UgbGliPVwiZG9tLml0ZXJhYmxlXCIgLz5cbi8vLyA8cmVmZXJlbmNlIGxpYj1cImRvbS5hc3luY2l0ZXJhYmxlXCIgLz5cbi8vLyA8cmVmZXJlbmNlIGxpYj1cImRlbm8ubnNcIiAvPlxuXG5pbXBvcnQgeyBzdGFydCB9IGZyb20gXCIkZnJlc2gvc2VydmVyLnRzXCI7XG5pbXBvcnQgbWFuaWZlc3QgZnJvbSBcIi4vZnJlc2guZ2VuLnRzXCI7XG5cbmltcG9ydCB0d2luZFBsdWdpbiBmcm9tIFwiJGZyZXNoL3BsdWdpbnMvdHdpbmQudHNcIjtcbmltcG9ydCB0d2luZENvbmZpZyBmcm9tIFwiLi90d2luZC5jb25maWcudHNcIjtcblxuYXdhaXQgc3RhcnQobWFuaWZlc3QsIHsgcGx1Z2luczogW3R3aW5kUGx1Z2luKHR3aW5kQ29uZmlnKV0gfSk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsdUNBQXVDO0FBQ3ZDLDJCQUEyQjtBQUMzQixvQ0FBb0M7QUFDcEMseUNBQXlDO0FBQ3pDLCtCQUErQjtBQUUvQixTQUFTLEtBQUssUUFBUSxtQkFBbUI7QUFDekMsT0FBTyxjQUFjLGlCQUFpQjtBQUV0QyxPQUFPLGlCQUFpQiwwQkFBMEI7QUFDbEQsT0FBTyxpQkFBaUIsb0JBQW9CO0FBRTVDLE1BQU0sTUFBTSxVQUFVO0lBQUUsU0FBUztRQUFDLFlBQVk7S0FBYTtBQUFDIn0=