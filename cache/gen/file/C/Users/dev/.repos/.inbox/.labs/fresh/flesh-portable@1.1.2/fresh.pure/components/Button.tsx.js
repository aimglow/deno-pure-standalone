import { jsx as _jsx } from "preact/jsx-runtime";
import { IS_BROWSER } from "$fresh/runtime.ts";
export function Button(props) {
    return /*#__PURE__*/ _jsx("button", {
        ...props,
        disabled: !IS_BROWSER || props.disabled,
        class: "px-2 py-1 border(gray-100 2) hover:bg-gray-200"
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5yZXBvcy8uaW5ib3gvLmxhYnMvZnJlc2gvZmxlc2gtcG9ydGFibGVAMS4xLjIvZnJlc2gucHVyZS9jb21wb25lbnRzL0J1dHRvbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSlNYIH0gZnJvbSBcInByZWFjdFwiO1xuaW1wb3J0IHsgSVNfQlJPV1NFUiB9IGZyb20gXCIkZnJlc2gvcnVudGltZS50c1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gQnV0dG9uKHByb3BzOiBKU1guSFRNTEF0dHJpYnV0ZXM8SFRNTEJ1dHRvbkVsZW1lbnQ+KSB7XG4gIHJldHVybiAoXG4gICAgPGJ1dHRvblxuICAgICAgey4uLnByb3BzfVxuICAgICAgZGlzYWJsZWQ9eyFJU19CUk9XU0VSIHx8IHByb3BzLmRpc2FibGVkfVxuICAgICAgY2xhc3M9XCJweC0yIHB5LTEgYm9yZGVyKGdyYXktMTAwIDIpIGhvdmVyOmJnLWdyYXktMjAwXCJcbiAgICAvPlxuICApO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0EsU0FBUyxVQUFVLFFBQVEsb0JBQW9CO0FBRS9DLE9BQU8sU0FBUyxPQUFPLEtBQTRDLEVBQUU7SUFDbkUscUJBQ0UsS0FBQztRQUNFLEdBQUcsS0FBSztRQUNULFVBQVUsQ0FBQyxjQUFjLE1BQU0sUUFBUTtRQUN2QyxPQUFNOztBQUdaLENBQUMifQ==