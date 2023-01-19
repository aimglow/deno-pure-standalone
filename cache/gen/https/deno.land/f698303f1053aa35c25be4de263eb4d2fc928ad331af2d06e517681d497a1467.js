export function mediaTypeToLoader(mediaType) {
    switch(mediaType){
        case "JavaScript":
        case "Mjs":
            return "js";
        case "JSX":
            return "jsx";
        case "TypeScript":
        case "Mts":
            return "ts";
        case "TSX":
            return "tsx";
        case "Json":
            return "js";
        default:
            throw new Error(`Unhandled media type ${mediaType}.`);
    }
}
export function transformRawIntoContent(raw, mediaType) {
    switch(mediaType){
        case "Json":
            return jsonToESM(raw);
        default:
            return raw;
    }
}
function jsonToESM(source) {
    const sourceString = new TextDecoder().decode(source);
    let json = JSON.stringify(JSON.parse(sourceString), null, 2);
    json = json.replaceAll(`"__proto__":`, `["__proto__"]:`);
    return `export default ${json};`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZXNidWlsZF9kZW5vX2xvYWRlckAwLjUuMi9zcmMvc2hhcmVkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGVzYnVpbGQgfSBmcm9tIFwiLi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgTWVkaWFUeXBlIH0gZnJvbSBcIi4vZGVuby50c1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gbWVkaWFUeXBlVG9Mb2FkZXIobWVkaWFUeXBlOiBNZWRpYVR5cGUpOiBlc2J1aWxkLkxvYWRlciB7XG4gIHN3aXRjaCAobWVkaWFUeXBlKSB7XG4gICAgY2FzZSBcIkphdmFTY3JpcHRcIjpcbiAgICBjYXNlIFwiTWpzXCI6XG4gICAgICByZXR1cm4gXCJqc1wiO1xuICAgIGNhc2UgXCJKU1hcIjpcbiAgICAgIHJldHVybiBcImpzeFwiO1xuICAgIGNhc2UgXCJUeXBlU2NyaXB0XCI6XG4gICAgY2FzZSBcIk10c1wiOlxuICAgICAgcmV0dXJuIFwidHNcIjtcbiAgICBjYXNlIFwiVFNYXCI6XG4gICAgICByZXR1cm4gXCJ0c3hcIjtcbiAgICBjYXNlIFwiSnNvblwiOlxuICAgICAgcmV0dXJuIFwianNcIjtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmhhbmRsZWQgbWVkaWEgdHlwZSAke21lZGlhVHlwZX0uYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybVJhd0ludG9Db250ZW50KFxuICByYXc6IFVpbnQ4QXJyYXksXG4gIG1lZGlhVHlwZTogTWVkaWFUeXBlLFxuKTogc3RyaW5nIHwgVWludDhBcnJheSB7XG4gIHN3aXRjaCAobWVkaWFUeXBlKSB7XG4gICAgY2FzZSBcIkpzb25cIjpcbiAgICAgIHJldHVybiBqc29uVG9FU00ocmF3KTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHJhdztcbiAgfVxufVxuXG5mdW5jdGlvbiBqc29uVG9FU00oc291cmNlOiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgY29uc3Qgc291cmNlU3RyaW5nID0gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHNvdXJjZSk7XG4gIGxldCBqc29uID0gSlNPTi5zdHJpbmdpZnkoSlNPTi5wYXJzZShzb3VyY2VTdHJpbmcpLCBudWxsLCAyKTtcbiAganNvbiA9IGpzb24ucmVwbGFjZUFsbChgXCJfX3Byb3RvX19cIjpgLCBgW1wiX19wcm90b19fXCJdOmApO1xuICByZXR1cm4gYGV4cG9ydCBkZWZhdWx0ICR7anNvbn07YDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLFNBQVMsa0JBQWtCLFNBQW9CLEVBQWtCO0lBQ3RFLE9BQVE7UUFDTixLQUFLO1FBQ0wsS0FBSztZQUNILE9BQU87UUFDVCxLQUFLO1lBQ0gsT0FBTztRQUNULEtBQUs7UUFDTCxLQUFLO1lBQ0gsT0FBTztRQUNULEtBQUs7WUFDSCxPQUFPO1FBQ1QsS0FBSztZQUNILE9BQU87UUFDVDtZQUNFLE1BQU0sSUFBSSxNQUFNLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRTtJQUMxRDtBQUNGLENBQUM7QUFFRCxPQUFPLFNBQVMsd0JBQ2QsR0FBZSxFQUNmLFNBQW9CLEVBQ0M7SUFDckIsT0FBUTtRQUNOLEtBQUs7WUFDSCxPQUFPLFVBQVU7UUFDbkI7WUFDRSxPQUFPO0lBQ1g7QUFDRixDQUFDO0FBRUQsU0FBUyxVQUFVLE1BQWtCLEVBQVU7SUFDN0MsTUFBTSxlQUFlLElBQUksY0FBYyxNQUFNLENBQUM7SUFDOUMsSUFBSSxPQUFPLEtBQUssU0FBUyxDQUFDLEtBQUssS0FBSyxDQUFDLGVBQWUsSUFBSSxFQUFFO0lBQzFELE9BQU8sS0FBSyxVQUFVLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQztJQUN2RCxPQUFPLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2xDIn0=