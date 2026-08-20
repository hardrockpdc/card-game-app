// Display typeface for screen titles only — everything else stays on the OS
// default system font. Scoped deliberately: custom fonts have different
// metrics than the system font, and this app's smaller text (tags, pills,
// badges, button labels) was tuned against system-font metrics — an app-wide
// swap risks reintroducing the kind of truncation bug already fixed once
// this session ("COLOR MATC…" on the Last Card tile). Titles are large, short,
// centered strings with room to breathe, so they're the safe subset.
//
// Loaded via useFonts() in App.js, which gates the first render until the
// font has either loaded or failed — so by the time any screen's title
// renders, TITLE_FONT is either a real registered font name or (on load
// failure) simply an unregistered name that RN silently falls back to the
// system font for. Never blocks indefinitely: see App.js's font-loading gate.
export const TITLE_FONT = "Poppins_700Bold";
