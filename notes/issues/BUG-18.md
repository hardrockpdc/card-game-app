---
id: BUG-18
type: bug
area: ui
status: fixed
severity: low
opened: 2026-09-08
verified: 2026-09-08
evidence: "OnboardingScreen.js:445 applied styles.navPrimaryBtn (flex:1, defined :707) to the standalone step 2 button, which is a direct child of the ScrollView column rather than of styles.navRow. Observed on emulator-5554 and emulator-5556 2026-09-08 as a Skip button roughly five times the height of the three above it, filling to the bottom of the screen. Style removed from that one usage; device-verified normal height on a cleared-data first run"
---

## Problem

**BUG-18. The onboarding "Skip for now" button filled the rest of the screen.**

Step 2 (profile photo) rendered Take Photo, Choose from Library and Pick an Emoji Avatar
at normal height, then a Skip button roughly five times taller running to the bottom of
the page.

Cause was a leftover. The style says what it was for:

```js
// In the Skip/Next row, the primary button fills the space beside Skip
navPrimaryBtn: { flex: 1 },
```

There is no Skip/Next row any more — the comment at `:441` records the two buttons being
merged into one ("One button, not two. Skip and Next both called setStep(3)"). With no
sibling to share a row with, `flex: 1` on a child of the vertical ScrollView made the
button absorb every remaining pixel of height.

## Verified/Fixed 2026-09-08

Removed `styles.navPrimaryBtn` from that one usage. **The style itself was kept**: step 3
uses it at `:534` inside `<View style={styles.navRow}>`, where `flex: 1` is correct and
makes the button fill the row. Deleting the style outright would have broken step 3 —
which is why the two call sites were checked before touching it.

The comment on the style now says it is row-only and must not be applied to a standalone
button in the column layout.

Device-verified on a cleared-data first run: the button matches its siblings.
