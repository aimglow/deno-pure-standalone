// Jokes courtesy of https://punsandoneliners.com/randomness/programmer-jokes/
const JOKES = [
    "Why do Java developers often wear glasses? They can't C#.",
    "A SQL query walks into a bar, goes up to two tables and says “can I join you?”",
    "Wasn't hard to crack Forrest Gump's password. 1forrest1.",
    "I love pressing the F5 key. It's refreshing.",
    "Called IT support and a chap from Australia came to fix my network connection.  I asked “Do you come from a LAN down under?”",
    "There are 10 types of people in the world. Those who understand binary and those who don't.",
    "Why are assembly programmers often wet? They work below C level.",
    "My favourite computer based band is the Black IPs.",
    "What programme do you use to predict the music tastes of former US presidential candidates? An Al Gore Rhythm.",
    "An SEO expert walked into a bar, pub, inn, tavern, hostelry, public house."
];
export const handler = (_req, _ctx)=>{
    const randomIndex = Math.floor(Math.random() * JOKES.length);
    const body = JOKES[randomIndex];
    return new Response(body);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5yZXBvcy8uaW5ib3gvLmxhYnMvZnJlc2gvZmxlc2gtcG9ydGFibGVAMS4xLjIvZnJlc2gucHVyZS9yb3V0ZXMvYXBpL2pva2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSGFuZGxlckNvbnRleHQgfSBmcm9tIFwiJGZyZXNoL3NlcnZlci50c1wiO1xuXG4vLyBKb2tlcyBjb3VydGVzeSBvZiBodHRwczovL3B1bnNhbmRvbmVsaW5lcnMuY29tL3JhbmRvbW5lc3MvcHJvZ3JhbW1lci1qb2tlcy9cbmNvbnN0IEpPS0VTID0gW1xuICBcIldoeSBkbyBKYXZhIGRldmVsb3BlcnMgb2Z0ZW4gd2VhciBnbGFzc2VzPyBUaGV5IGNhbid0IEMjLlwiLFxuICBcIkEgU1FMIHF1ZXJ5IHdhbGtzIGludG8gYSBiYXIsIGdvZXMgdXAgdG8gdHdvIHRhYmxlcyBhbmQgc2F5cyDigJxjYW4gSSBqb2luIHlvdT/igJ1cIixcbiAgXCJXYXNuJ3QgaGFyZCB0byBjcmFjayBGb3JyZXN0IEd1bXAncyBwYXNzd29yZC4gMWZvcnJlc3QxLlwiLFxuICBcIkkgbG92ZSBwcmVzc2luZyB0aGUgRjUga2V5LiBJdCdzIHJlZnJlc2hpbmcuXCIsXG4gIFwiQ2FsbGVkIElUIHN1cHBvcnQgYW5kIGEgY2hhcCBmcm9tIEF1c3RyYWxpYSBjYW1lIHRvIGZpeCBteSBuZXR3b3JrIGNvbm5lY3Rpb24uICBJIGFza2VkIOKAnERvIHlvdSBjb21lIGZyb20gYSBMQU4gZG93biB1bmRlcj/igJ1cIixcbiAgXCJUaGVyZSBhcmUgMTAgdHlwZXMgb2YgcGVvcGxlIGluIHRoZSB3b3JsZC4gVGhvc2Ugd2hvIHVuZGVyc3RhbmQgYmluYXJ5IGFuZCB0aG9zZSB3aG8gZG9uJ3QuXCIsXG4gIFwiV2h5IGFyZSBhc3NlbWJseSBwcm9ncmFtbWVycyBvZnRlbiB3ZXQ/IFRoZXkgd29yayBiZWxvdyBDIGxldmVsLlwiLFxuICBcIk15IGZhdm91cml0ZSBjb21wdXRlciBiYXNlZCBiYW5kIGlzIHRoZSBCbGFjayBJUHMuXCIsXG4gIFwiV2hhdCBwcm9ncmFtbWUgZG8geW91IHVzZSB0byBwcmVkaWN0IHRoZSBtdXNpYyB0YXN0ZXMgb2YgZm9ybWVyIFVTIHByZXNpZGVudGlhbCBjYW5kaWRhdGVzPyBBbiBBbCBHb3JlIFJoeXRobS5cIixcbiAgXCJBbiBTRU8gZXhwZXJ0IHdhbGtlZCBpbnRvIGEgYmFyLCBwdWIsIGlubiwgdGF2ZXJuLCBob3N0ZWxyeSwgcHVibGljIGhvdXNlLlwiLFxuXTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSAoX3JlcTogUmVxdWVzdCwgX2N0eDogSGFuZGxlckNvbnRleHQpOiBSZXNwb25zZSA9PiB7XG4gIGNvbnN0IHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogSk9LRVMubGVuZ3RoKTtcbiAgY29uc3QgYm9keSA9IEpPS0VTW3JhbmRvbUluZGV4XTtcbiAgcmV0dXJuIG5ldyBSZXNwb25zZShib2R5KTtcbn07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsOEVBQThFO0FBQzlFLE1BQU0sUUFBUTtJQUNaO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0NBQ0Q7QUFFRCxPQUFPLE1BQU0sVUFBVSxDQUFDLE1BQWUsT0FBbUM7SUFDeEUsTUFBTSxjQUFjLEtBQUssS0FBSyxDQUFDLEtBQUssTUFBTSxLQUFLLE1BQU0sTUFBTTtJQUMzRCxNQUFNLE9BQU8sS0FBSyxDQUFDLFlBQVk7SUFDL0IsT0FBTyxJQUFJLFNBQVM7QUFDdEIsRUFBRSJ9