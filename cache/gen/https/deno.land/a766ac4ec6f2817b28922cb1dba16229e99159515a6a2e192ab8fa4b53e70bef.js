import { virtualSheet } from "twind/sheets";
import { setup, STYLE_ELEMENT_ID } from "./twind/shared.ts";
export default function twind(options) {
    const sheet = virtualSheet();
    setup(options, sheet);
    const main = `data:application/javascript,import hydrate from "${new URL("./twind/main.ts", import.meta.url).href}";
import options from "${options.selfURL}";
export default function(state) { hydrate(options, state); }`;
    return {
        name: "twind",
        entrypoints: {
            "main": main
        },
        render (ctx) {
            sheet.reset(undefined);
            const res = ctx.render();
            const cssTexts = [
                ...sheet.target
            ];
            const snapshot = sheet.reset();
            const scripts = [];
            let cssText;
            if (res.requiresHydration) {
                const precedences = snapshot[1];
                cssText = cssTexts.map((cssText, i)=>`${cssText}/*${precedences[i].toString(36)}*/`).join("\n");
                const mappings = [];
                for (const [key, value] of snapshot[3].entries()){
                    if (key === value) {
                        mappings.push(key);
                    } else {
                        mappings.push([
                            key,
                            value
                        ]);
                    }
                }
                scripts.push({
                    entrypoint: "main",
                    state: mappings
                });
            } else {
                cssText = cssTexts.join("\n");
            }
            return {
                scripts,
                styles: [
                    {
                        cssText,
                        id: STYLE_ELEMENT_ID
                    }
                ]
            };
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4xLjIvcGx1Z2lucy90d2luZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2aXJ0dWFsU2hlZXQgfSBmcm9tIFwidHdpbmQvc2hlZXRzXCI7XG5pbXBvcnQgeyBQbHVnaW4gfSBmcm9tIFwiLi4vc2VydmVyLnRzXCI7XG5cbmltcG9ydCB7IE9wdGlvbnMsIHNldHVwLCBTVFlMRV9FTEVNRU5UX0lEIH0gZnJvbSBcIi4vdHdpbmQvc2hhcmVkLnRzXCI7XG5leHBvcnQgdHlwZSB7IE9wdGlvbnMgfTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdHdpbmQob3B0aW9uczogT3B0aW9ucyk6IFBsdWdpbiB7XG4gIGNvbnN0IHNoZWV0ID0gdmlydHVhbFNoZWV0KCk7XG4gIHNldHVwKG9wdGlvbnMsIHNoZWV0KTtcbiAgY29uc3QgbWFpbiA9IGBkYXRhOmFwcGxpY2F0aW9uL2phdmFzY3JpcHQsaW1wb3J0IGh5ZHJhdGUgZnJvbSBcIiR7XG4gICAgbmV3IFVSTChcIi4vdHdpbmQvbWFpbi50c1wiLCBpbXBvcnQubWV0YS51cmwpLmhyZWZcbiAgfVwiO1xuaW1wb3J0IG9wdGlvbnMgZnJvbSBcIiR7b3B0aW9ucy5zZWxmVVJMfVwiO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RhdGUpIHsgaHlkcmF0ZShvcHRpb25zLCBzdGF0ZSk7IH1gO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwidHdpbmRcIixcbiAgICBlbnRyeXBvaW50czogeyBcIm1haW5cIjogbWFpbiB9LFxuICAgIHJlbmRlcihjdHgpIHtcbiAgICAgIHNoZWV0LnJlc2V0KHVuZGVmaW5lZCk7XG4gICAgICBjb25zdCByZXMgPSBjdHgucmVuZGVyKCk7XG4gICAgICBjb25zdCBjc3NUZXh0cyA9IFsuLi5zaGVldC50YXJnZXRdO1xuICAgICAgY29uc3Qgc25hcHNob3QgPSBzaGVldC5yZXNldCgpO1xuICAgICAgY29uc3Qgc2NyaXB0cyA9IFtdO1xuICAgICAgbGV0IGNzc1RleHQ6IHN0cmluZztcbiAgICAgIGlmIChyZXMucmVxdWlyZXNIeWRyYXRpb24pIHtcbiAgICAgICAgY29uc3QgcHJlY2VkZW5jZXMgPSBzbmFwc2hvdFsxXSBhcyBudW1iZXJbXTtcbiAgICAgICAgY3NzVGV4dCA9IGNzc1RleHRzLm1hcCgoY3NzVGV4dCwgaSkgPT5cbiAgICAgICAgICBgJHtjc3NUZXh0fS8qJHtwcmVjZWRlbmNlc1tpXS50b1N0cmluZygzNil9Ki9gXG4gICAgICAgICkuam9pbihcIlxcblwiKTtcbiAgICAgICAgY29uc3QgbWFwcGluZ3M6IChzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddKVtdID0gW107XG4gICAgICAgIGZvciAoXG4gICAgICAgICAgY29uc3QgW2tleSwgdmFsdWVdIG9mIChzbmFwc2hvdFszXSBhcyBNYXA8c3RyaW5nLCBzdHJpbmc+KS5lbnRyaWVzKClcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKGtleSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIG1hcHBpbmdzLnB1c2goa2V5KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFwcGluZ3MucHVzaChba2V5LCB2YWx1ZV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzY3JpcHRzLnB1c2goeyBlbnRyeXBvaW50OiBcIm1haW5cIiwgc3RhdGU6IG1hcHBpbmdzIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3NzVGV4dCA9IGNzc1RleHRzLmpvaW4oXCJcXG5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzY3JpcHRzLFxuICAgICAgICBzdHlsZXM6IFt7IGNzc1RleHQsIGlkOiBTVFlMRV9FTEVNRU5UX0lEIH1dLFxuICAgICAgfTtcbiAgICB9LFxuICB9O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsWUFBWSxRQUFRLGVBQWU7QUFHNUMsU0FBa0IsS0FBSyxFQUFFLGdCQUFnQixRQUFRLG9CQUFvQjtBQUdyRSxlQUFlLFNBQVMsTUFBTSxPQUFnQixFQUFVO0lBQ3RELE1BQU0sUUFBUTtJQUNkLE1BQU0sU0FBUztJQUNmLE1BQU0sT0FBTyxDQUFDLGlEQUFpRCxFQUM3RCxJQUFJLElBQUksbUJBQW1CLFlBQVksR0FBRyxFQUFFLElBQUksQ0FDakQ7cUJBQ2tCLEVBQUUsUUFBUSxPQUFPLENBQUM7MkRBQ29CLENBQUM7SUFDMUQsT0FBTztRQUNMLE1BQU07UUFDTixhQUFhO1lBQUUsUUFBUTtRQUFLO1FBQzVCLFFBQU8sR0FBRyxFQUFFO1lBQ1YsTUFBTSxLQUFLLENBQUM7WUFDWixNQUFNLE1BQU0sSUFBSSxNQUFNO1lBQ3RCLE1BQU0sV0FBVzttQkFBSSxNQUFNLE1BQU07YUFBQztZQUNsQyxNQUFNLFdBQVcsTUFBTSxLQUFLO1lBQzVCLE1BQU0sVUFBVSxFQUFFO1lBQ2xCLElBQUk7WUFDSixJQUFJLElBQUksaUJBQWlCLEVBQUU7Z0JBQ3pCLE1BQU0sY0FBYyxRQUFRLENBQUMsRUFBRTtnQkFDL0IsVUFBVSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsSUFDL0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQzlDLElBQUksQ0FBQztnQkFDUCxNQUFNLFdBQTBDLEVBQUU7Z0JBQ2xELEtBQ0UsTUFBTSxDQUFDLEtBQUssTUFBTSxJQUFJLEFBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsT0FBTyxHQUNsRTtvQkFDQSxJQUFJLFFBQVEsT0FBTzt3QkFDakIsU0FBUyxJQUFJLENBQUM7b0JBQ2hCLE9BQU87d0JBQ0wsU0FBUyxJQUFJLENBQUM7NEJBQUM7NEJBQUs7eUJBQU07b0JBQzVCLENBQUM7Z0JBQ0g7Z0JBQ0EsUUFBUSxJQUFJLENBQUM7b0JBQUUsWUFBWTtvQkFBUSxPQUFPO2dCQUFTO1lBQ3JELE9BQU87Z0JBQ0wsVUFBVSxTQUFTLElBQUksQ0FBQztZQUMxQixDQUFDO1lBQ0QsT0FBTztnQkFDTDtnQkFDQSxRQUFRO29CQUFDO3dCQUFFO3dCQUFTLElBQUk7b0JBQWlCO2lCQUFFO1lBQzdDO1FBQ0Y7SUFDRjtBQUNGLENBQUMifQ==