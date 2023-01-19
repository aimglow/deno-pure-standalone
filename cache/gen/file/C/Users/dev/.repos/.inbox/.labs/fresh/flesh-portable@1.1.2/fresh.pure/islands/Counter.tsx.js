import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useState } from "preact/hooks";
import { Button } from "../components/Button.tsx";
export default function Counter(props) {
    const [count, setCount] = useState(props.start);
    return /*#__PURE__*/ _jsxs("div", {
        class: "flex gap-2 w-full",
        children: [
            /*#__PURE__*/ _jsx("p", {
                class: "flex-grow-1 font-bold text-xl",
                children: count
            }),
            /*#__PURE__*/ _jsx(Button, {
                onClick: ()=>setCount(count - 1),
                children: "-1"
            }),
            /*#__PURE__*/ _jsx(Button, {
                onClick: ()=>setCount(count + 1),
                children: "+1"
            })
        ]
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5yZXBvcy8uaW5ib3gvLmxhYnMvZnJlc2gvZmxlc2gtcG9ydGFibGVAMS4xLjIvZnJlc2gucHVyZS9pc2xhbmRzL0NvdW50ZXIudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSBcInByZWFjdC9ob29rc1wiO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIi4uL2NvbXBvbmVudHMvQnV0dG9uLnRzeFwiO1xuXG5pbnRlcmZhY2UgQ291bnRlclByb3BzIHtcbiAgc3RhcnQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQ291bnRlcihwcm9wczogQ291bnRlclByb3BzKSB7XG4gIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUocHJvcHMuc3RhcnQpO1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3M9XCJmbGV4IGdhcC0yIHctZnVsbFwiPlxuICAgICAgPHAgY2xhc3M9XCJmbGV4LWdyb3ctMSBmb250LWJvbGQgdGV4dC14bFwiPntjb3VudH08L3A+XG4gICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldENvdW50KGNvdW50IC0gMSl9Pi0xPC9CdXR0b24+XG4gICAgICA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldENvdW50KGNvdW50ICsgMSl9PisxPC9CdXR0b24+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxTQUFTLFFBQVEsUUFBUSxlQUFlO0FBQ3hDLFNBQVMsTUFBTSxRQUFRLDJCQUEyQjtBQU1sRCxlQUFlLFNBQVMsUUFBUSxLQUFtQixFQUFFO0lBQ25ELE1BQU0sQ0FBQyxPQUFPLFNBQVMsR0FBRyxTQUFTLE1BQU0sS0FBSztJQUM5QyxxQkFDRSxNQUFDO1FBQUksT0FBTTs7MEJBQ1QsS0FBQztnQkFBRSxPQUFNOzBCQUFpQzs7MEJBQzFDLEtBQUM7Z0JBQU8sU0FBUyxJQUFNLFNBQVMsUUFBUTswQkFBSTs7MEJBQzVDLEtBQUM7Z0JBQU8sU0FBUyxJQUFNLFNBQVMsUUFBUTswQkFBSTs7OztBQUdsRCxDQUFDIn0=