const newlineRegex = /(\r?\n)/g;
/** @internal */ export function escapeForWithinString(str, quoteKind) {
    return escapeChar(str, quoteKind).replace(newlineRegex, "\\$1");
}
/** @internal */ export function escapeChar(str, char) {
    if (char.length !== 1) {
        throw new Error(`Specified char must be one character long.`);
    }
    let result = "";
    for(let i = 0; i < str.length; i++){
        if (str[i] === char) {
            result += "\\";
        }
        result += str[i];
    }
    return result;
}
/** @internal */ export function getStringFromStrOrFunc(strOrFunc) {
    return strOrFunc instanceof Function ? strOrFunc() : strOrFunc;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvY29kZV9ibG9ja193cml0ZXJAMTEuMC4zL3V0aWxzL3N0cmluZ191dGlscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBuZXdsaW5lUmVnZXggPSAvKFxccj9cXG4pL2c7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVGb3JXaXRoaW5TdHJpbmcoc3RyOiBzdHJpbmcsIHF1b3RlS2luZDogc3RyaW5nKSB7XG4gIHJldHVybiBlc2NhcGVDaGFyKHN0ciwgcXVvdGVLaW5kKS5yZXBsYWNlKG5ld2xpbmVSZWdleCwgXCJcXFxcJDFcIik7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVDaGFyKHN0cjogc3RyaW5nLCBjaGFyOiBzdHJpbmcpIHtcbiAgaWYgKGNoYXIubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTcGVjaWZpZWQgY2hhciBtdXN0IGJlIG9uZSBjaGFyYWN0ZXIgbG9uZy5gKTtcbiAgfVxuXG4gIGxldCByZXN1bHQgPSBcIlwiO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzdHJbaV0gPT09IGNoYXIpIHtcbiAgICAgIHJlc3VsdCArPSBcIlxcXFxcIjtcbiAgICB9XG4gICAgcmVzdWx0ICs9IHN0cltpXTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RyaW5nRnJvbVN0ck9yRnVuYyhzdHJPckZ1bmM6IHN0cmluZyB8ICgoKSA9PiBzdHJpbmcpKSB7XG4gIHJldHVybiBzdHJPckZ1bmMgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IHN0ck9yRnVuYygpIDogc3RyT3JGdW5jO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sZUFBZTtBQUVyQixjQUFjLEdBQ2QsT0FBTyxTQUFTLHNCQUFzQixHQUFXLEVBQUUsU0FBaUIsRUFBRTtJQUNwRSxPQUFPLFdBQVcsS0FBSyxXQUFXLE9BQU8sQ0FBQyxjQUFjO0FBQzFELENBQUM7QUFFRCxjQUFjLEdBQ2QsT0FBTyxTQUFTLFdBQVcsR0FBVyxFQUFFLElBQVksRUFBRTtJQUNwRCxJQUFJLEtBQUssTUFBTSxLQUFLLEdBQUc7UUFDckIsTUFBTSxJQUFJLE1BQU0sQ0FBQywwQ0FBMEMsQ0FBQyxFQUFFO0lBQ2hFLENBQUM7SUFFRCxJQUFJLFNBQVM7SUFDYixJQUFLLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxNQUFNLEVBQUUsSUFBSztRQUNuQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEtBQUssTUFBTTtZQUNuQixVQUFVO1FBQ1osQ0FBQztRQUNELFVBQVUsR0FBRyxDQUFDLEVBQUU7SUFDbEI7SUFDQSxPQUFPO0FBQ1QsQ0FBQztBQUVELGNBQWMsR0FDZCxPQUFPLFNBQVMsdUJBQXVCLFNBQWtDLEVBQUU7SUFDekUsT0FBTyxxQkFBcUIsV0FBVyxjQUFjLFNBQVM7QUFDaEUsQ0FBQyJ9