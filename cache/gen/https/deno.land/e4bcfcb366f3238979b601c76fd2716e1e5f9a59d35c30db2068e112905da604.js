import { h } from "preact";
import { DEBUG } from "./constants.ts";
export default function DefaultErrorPage(props) {
    const { error  } = props;
    let message = undefined;
    if (DEBUG) {
        if (error instanceof Error) {
            message = error.stack;
        } else {
            message = String(error);
        }
    }
    return h("div", {
        style: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        }
    }, h("div", {
        style: {
            border: "#f3f4f6 2px solid",
            borderTop: "red 4px solid",
            background: "#f9fafb",
            margin: 16,
            minWidth: "300px",
            width: "50%"
        }
    }, h("p", {
        style: {
            margin: 0,
            fontSize: "12pt",
            padding: 16,
            fontFamily: "sans-serif"
        }
    }, "An error occured during route handling or page rendering."), message && h("pre", {
        style: {
            margin: 0,
            fontSize: "12pt",
            overflowY: "auto",
            padding: 16,
            paddingTop: 0,
            fontFamily: "monospace"
        }
    }, message)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZnJlc2hAMS4xLjIvc3JjL3NlcnZlci9kZWZhdWx0X2Vycm9yX3BhZ2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaCB9IGZyb20gXCJwcmVhY3RcIjtcbmltcG9ydCB7IERFQlVHIH0gZnJvbSBcIi4vY29uc3RhbnRzLnRzXCI7XG5pbXBvcnQgdHlwZSB7IEVycm9yUGFnZVByb3BzIH0gZnJvbSBcIi4vdHlwZXMudHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRGVmYXVsdEVycm9yUGFnZShwcm9wczogRXJyb3JQYWdlUHJvcHMpIHtcbiAgY29uc3QgeyBlcnJvciB9ID0gcHJvcHM7XG5cbiAgbGV0IG1lc3NhZ2UgPSB1bmRlZmluZWQ7XG4gIGlmIChERUJVRykge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBtZXNzYWdlID0gZXJyb3Iuc3RhY2s7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UgPSBTdHJpbmcoZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoKFxuICAgIFwiZGl2XCIsXG4gICAge1xuICAgICAgc3R5bGU6IHtcbiAgICAgICAgZGlzcGxheTogXCJmbGV4XCIsXG4gICAgICAgIGp1c3RpZnlDb250ZW50OiBcImNlbnRlclwiLFxuICAgICAgICBhbGlnbkl0ZW1zOiBcImNlbnRlclwiLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGgoXG4gICAgICBcImRpdlwiLFxuICAgICAge1xuICAgICAgICBzdHlsZToge1xuICAgICAgICAgIGJvcmRlcjogXCIjZjNmNGY2IDJweCBzb2xpZFwiLFxuICAgICAgICAgIGJvcmRlclRvcDogXCJyZWQgNHB4IHNvbGlkXCIsXG4gICAgICAgICAgYmFja2dyb3VuZDogXCIjZjlmYWZiXCIsXG4gICAgICAgICAgbWFyZ2luOiAxNixcbiAgICAgICAgICBtaW5XaWR0aDogXCIzMDBweFwiLFxuICAgICAgICAgIHdpZHRoOiBcIjUwJVwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGgoXCJwXCIsIHtcbiAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICBtYXJnaW46IDAsXG4gICAgICAgICAgZm9udFNpemU6IFwiMTJwdFwiLFxuICAgICAgICAgIHBhZGRpbmc6IDE2LFxuICAgICAgICAgIGZvbnRGYW1pbHk6IFwic2Fucy1zZXJpZlwiLFxuICAgICAgICB9LFxuICAgICAgfSwgXCJBbiBlcnJvciBvY2N1cmVkIGR1cmluZyByb3V0ZSBoYW5kbGluZyBvciBwYWdlIHJlbmRlcmluZy5cIiksXG4gICAgICBtZXNzYWdlICYmIGgoXCJwcmVcIiwge1xuICAgICAgICBzdHlsZToge1xuICAgICAgICAgIG1hcmdpbjogMCxcbiAgICAgICAgICBmb250U2l6ZTogXCIxMnB0XCIsXG4gICAgICAgICAgb3ZlcmZsb3dZOiBcImF1dG9cIixcbiAgICAgICAgICBwYWRkaW5nOiAxNixcbiAgICAgICAgICBwYWRkaW5nVG9wOiAwLFxuICAgICAgICAgIGZvbnRGYW1pbHk6IFwibW9ub3NwYWNlXCIsXG4gICAgICAgIH0sXG4gICAgICB9LCBtZXNzYWdlKSxcbiAgICApLFxuICApO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsQ0FBQyxRQUFRLFNBQVM7QUFDM0IsU0FBUyxLQUFLLFFBQVEsaUJBQWlCO0FBR3ZDLGVBQWUsU0FBUyxpQkFBaUIsS0FBcUIsRUFBRTtJQUM5RCxNQUFNLEVBQUUsTUFBSyxFQUFFLEdBQUc7SUFFbEIsSUFBSSxVQUFVO0lBQ2QsSUFBSSxPQUFPO1FBQ1QsSUFBSSxpQkFBaUIsT0FBTztZQUMxQixVQUFVLE1BQU0sS0FBSztRQUN2QixPQUFPO1lBQ0wsVUFBVSxPQUFPO1FBQ25CLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyxFQUNMLE9BQ0E7UUFDRSxPQUFPO1lBQ0wsU0FBUztZQUNULGdCQUFnQjtZQUNoQixZQUFZO1FBQ2Q7SUFDRixHQUNBLEVBQ0UsT0FDQTtRQUNFLE9BQU87WUFDTCxRQUFRO1lBQ1IsV0FBVztZQUNYLFlBQVk7WUFDWixRQUFRO1lBQ1IsVUFBVTtZQUNWLE9BQU87UUFDVDtJQUNGLEdBQ0EsRUFBRSxLQUFLO1FBQ0wsT0FBTztZQUNMLFFBQVE7WUFDUixVQUFVO1lBQ1YsU0FBUztZQUNULFlBQVk7UUFDZDtJQUNGLEdBQUcsOERBQ0gsV0FBVyxFQUFFLE9BQU87UUFDbEIsT0FBTztZQUNMLFFBQVE7WUFDUixVQUFVO1lBQ1YsV0FBVztZQUNYLFNBQVM7WUFDVCxZQUFZO1lBQ1osWUFBWTtRQUNkO0lBQ0YsR0FBRztBQUdULENBQUMifQ==