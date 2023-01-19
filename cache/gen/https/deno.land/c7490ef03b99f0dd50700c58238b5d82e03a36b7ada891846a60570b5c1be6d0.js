import { options as preactOptions } from "preact";
import { setup as twSetup, tw } from "twind";
export const STYLE_ELEMENT_ID = "__FRSH_TWIND";
export function setup(options, sheet) {
    const config = {
        ...options,
        mode: "silent",
        sheet
    };
    twSetup(config);
    const originalHook = preactOptions.vnode;
    // deno-lint-ignore no-explicit-any
    preactOptions.vnode = (vnode)=>{
        if (typeof vnode.type === "string" && typeof vnode.props === "object") {
            const { props  } = vnode;
            const classes = [];
            if (props.class) {
                classes.push(tw(props.class));
                props.class = undefined;
            }
            if (props.className) {
                classes.push(tw(props.className));
            }
            if (classes.length) {
                props.class = classes.join(" ");
            }
        }
        originalHook?.(vnode);
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4xLjIvcGx1Z2lucy90d2luZC9zaGFyZWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSlNYLCBvcHRpb25zIGFzIHByZWFjdE9wdGlvbnMsIFZOb2RlIH0gZnJvbSBcInByZWFjdFwiO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgc2V0dXAgYXMgdHdTZXR1cCwgU2hlZXQsIHR3IH0gZnJvbSBcInR3aW5kXCI7XG5cbmV4cG9ydCBjb25zdCBTVFlMRV9FTEVNRU5UX0lEID0gXCJfX0ZSU0hfVFdJTkRcIjtcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIGV4dGVuZHMgT21pdDxDb25maWd1cmF0aW9uLCBcIm1vZGVcIiB8IFwic2hlZXRcIj4ge1xuICAvKiogVGhlIGltcG9ydC5tZXRhLnVybCBvZiB0aGUgbW9kdWxlIGRlZmluaW5nIHRoZXNlIG9wdGlvbnMuICovXG4gIHNlbGZVUkw6IHN0cmluZztcbn1cblxuZGVjbGFyZSBtb2R1bGUgXCJwcmVhY3RcIiB7XG4gIG5hbWVzcGFjZSBKU1gge1xuICAgIGludGVyZmFjZSBET01BdHRyaWJ1dGVzPFRhcmdldCBleHRlbmRzIEV2ZW50VGFyZ2V0PiB7XG4gICAgICBjbGFzcz86IHN0cmluZztcbiAgICAgIGNsYXNzTmFtZT86IHN0cmluZztcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKG9wdGlvbnM6IE9wdGlvbnMsIHNoZWV0OiBTaGVldCkge1xuICBjb25zdCBjb25maWc6IENvbmZpZ3VyYXRpb24gPSB7XG4gICAgLi4ub3B0aW9ucyxcbiAgICBtb2RlOiBcInNpbGVudFwiLFxuICAgIHNoZWV0LFxuICB9O1xuICB0d1NldHVwKGNvbmZpZyk7XG5cbiAgY29uc3Qgb3JpZ2luYWxIb29rID0gcHJlYWN0T3B0aW9ucy52bm9kZTtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgcHJlYWN0T3B0aW9ucy52bm9kZSA9ICh2bm9kZTogVk5vZGU8SlNYLkRPTUF0dHJpYnV0ZXM8YW55Pj4pID0+IHtcbiAgICBpZiAodHlwZW9mIHZub2RlLnR5cGUgPT09IFwic3RyaW5nXCIgJiYgdHlwZW9mIHZub2RlLnByb3BzID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBjb25zdCB7IHByb3BzIH0gPSB2bm9kZTtcbiAgICAgIGNvbnN0IGNsYXNzZXM6IHN0cmluZ1tdID0gW107XG4gICAgICBpZiAocHJvcHMuY2xhc3MpIHtcbiAgICAgICAgY2xhc3Nlcy5wdXNoKHR3KHByb3BzLmNsYXNzKSk7XG4gICAgICAgIHByb3BzLmNsYXNzID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKHByb3BzLmNsYXNzTmFtZSkge1xuICAgICAgICBjbGFzc2VzLnB1c2godHcocHJvcHMuY2xhc3NOYW1lKSk7XG4gICAgICB9XG4gICAgICBpZiAoY2xhc3Nlcy5sZW5ndGgpIHtcbiAgICAgICAgcHJvcHMuY2xhc3MgPSBjbGFzc2VzLmpvaW4oXCIgXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG9yaWdpbmFsSG9vaz8uKHZub2RlKTtcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFjLFdBQVcsYUFBYSxRQUFlLFNBQVM7QUFDOUQsU0FBd0IsU0FBUyxPQUFPLEVBQVMsRUFBRSxRQUFRLFFBQVE7QUFFbkUsT0FBTyxNQUFNLG1CQUFtQixlQUFlO0FBZ0IvQyxPQUFPLFNBQVMsTUFBTSxPQUFnQixFQUFFLEtBQVksRUFBRTtJQUNwRCxNQUFNLFNBQXdCO1FBQzVCLEdBQUcsT0FBTztRQUNWLE1BQU07UUFDTjtJQUNGO0lBQ0EsUUFBUTtJQUVSLE1BQU0sZUFBZSxjQUFjLEtBQUs7SUFDeEMsbUNBQW1DO0lBQ25DLGNBQWMsS0FBSyxHQUFHLENBQUMsUUFBeUM7UUFDOUQsSUFBSSxPQUFPLE1BQU0sSUFBSSxLQUFLLFlBQVksT0FBTyxNQUFNLEtBQUssS0FBSyxVQUFVO1lBQ3JFLE1BQU0sRUFBRSxNQUFLLEVBQUUsR0FBRztZQUNsQixNQUFNLFVBQW9CLEVBQUU7WUFDNUIsSUFBSSxNQUFNLEtBQUssRUFBRTtnQkFDZixRQUFRLElBQUksQ0FBQyxHQUFHLE1BQU0sS0FBSztnQkFDM0IsTUFBTSxLQUFLLEdBQUc7WUFDaEIsQ0FBQztZQUNELElBQUksTUFBTSxTQUFTLEVBQUU7Z0JBQ25CLFFBQVEsSUFBSSxDQUFDLEdBQUcsTUFBTSxTQUFTO1lBQ2pDLENBQUM7WUFDRCxJQUFJLFFBQVEsTUFBTSxFQUFFO2dCQUNsQixNQUFNLEtBQUssR0FBRyxRQUFRLElBQUksQ0FBQztZQUM3QixDQUFDO1FBQ0gsQ0FBQztRQUVELGVBQWU7SUFDakI7QUFDRixDQUFDIn0=