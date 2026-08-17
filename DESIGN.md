---
name: Card Night
description: Dark-navy card-table app shell with per-game felt identities and a casino-red hub
colors:
  surface: "#1a1a2e"
  surface-raised: "#16213e"
  surface-sunken: "#2a2a4a"
  header-navy: "#0F1B2D"
  border: "#334"
  text-primary: "#ffffff"
  text-secondary: "#c4c4d4"
  text-muted: "#9090a8"
  text-faint: "#9aa4c4"
  brand-red: "#e94560"
  accent-blue: "#7fb3ff"
  gold: "#ffd700"
  go-green: "#2e9e54"
  positive-green: "#4caf50"
  error: "#e94560"
  warning: "#ffd479"
  highlight-purple: "#7c6cff"
  highlight-purple-dim: "#5b4fc7"
typography:
  display:
    fontFamily: "Poppins_700Bold, System"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.5px"
  body:
    fontFamily: "System (Roboto on Android, San Francisco on iOS)"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "System"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.3px"
rounded:
  xs: "4px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "16px"
  lg: "22px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-red}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "18px 44px"
  button-go:
    backgroundColor: "{colors.go-green}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "18px 44px"
  pill:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  header-card:
    backgroundColor: "{colors.header-navy}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
---

# Design System: Card Night

## Overview

**Creative North Star: "The Home Table"**

Card Night reads like a felt table under low light: a dark navy shell everywhere you're not actively playing (Home, Profile, Setup, Lobby, Stats), and a saturated felt color the moment a game starts. The hub screen carries a deliberate "casino energy" — a warm red CTA with a soft glow — while each of the 9 games gets its own table color and accent (forest green + gold for Blackjack/Poker, ocean blue + pale aqua for Go Fish, crimson + cream for Rummy/Conquián, and so on), so a screenshot alone tells you which game is open. Surfaces are dark, flat rectangles with soft rounded corners and a black ambient shadow; the rare colored glow (green for an owned/active cosmetic, gold for a price) is reserved for state, not decoration.

Confirmed rejection: this is not a Material Design skin. Buttons, pills, and cards use a custom radius/shadow/color vocabulary, not stock Material components — see Do's and Don'ts.

**Key Characteristics:**
- One dark navy shell (`#1a1a2e`) behind every non-gameplay screen.
- Per-game table felt + accent pair is the primary way a screen signals "which game is this."
- A single warm red (`#e94560`) is the Home hub's identity color and, separately, the app's error/status color — same hex, deliberately different roles.
- Rounded, bordered, drop-shadowed surfaces throughout; no sharp corners, no flat unbordered fills.
- One display typeface (Poppins Bold) reserved for large screen titles only; everything else stays on the OS system font.

## Colors

Dark and saturated: a near-black navy base, a handful of loud accent colors each doing exactly one job, and per-game felt colors that override the base the moment you're at a table.

### Primary
- **Casino Red** (`#e94560`): the Home hub's primary CTA and overall brand identity color. A deliberate choice — Home should feel like game night starting, not a settings screen. Also reused, separately, as the app-wide error/invalid-input color; the two roles share a hex value today but are treated as distinct tokens (`brand-red` vs `error`) because only one of them is free to change independently.

### Secondary
- **Sky Accent** (`#7fb3ff`): links, focus states, and general highlights outside the per-game felt system. Also happens to be Solitaire's table accent.
- **Coin Gold** (`#ffd700`): coins, prices, and reward moments anywhere in the app.

### Tertiary
- **Go Green** (`#2e9e54`): the single-player entry CTA on Home specifically — a distinct token from `positive-green`, not a duplicate.
- **Violet Highlight** (`#7c6cff` / dim `#5b4fc7`): avatar rings, the Profile entry, and other secondary-interactive purple accents (consolidated in 2026 from four unrelated purples that had drifted apart).

### Neutral
- **Navy Surface** (`#1a1a2e`): base app background for every menu/chrome screen.
- **Raised Navy** (`#16213e`): cards, modals, pills, panels sitting above the base surface.
- **Sunken Navy** (`#2a2a4a`): wells and inactive chip backgrounds.
- **Header Navy** (`#0F1B2D`): the in-game header card specifically — one step darker than raised navy.
- **Hairline** (`#334`): borders and outlined-button strokes on dark surfaces.
- **Text White** (`#ffffff`): primary text.
- **Text Secondary** (`#c4c4d4`): subtitles, secondary copy.
- **Text Muted** (`#9090a8`) / **Text Faint** (`#9aa4c4`): de-emphasized text; faint is the floor — nothing dimmer should carry meaning (an earlier `#444` hint-text color sat near 1.4:1 contrast and was effectively invisible).

### Status
- **Warning** (`#ffd479`).
- **Positive** (`#4caf50`): success states, "your turn" banners — distinct from Go Green even though both are green and both mean "affirmative."

### Named Rules
**The One Red, Two Jobs Rule.** `#e94560` is Home's brand identity AND the app's error color, on purpose, because the two never appear together in a way that reads as a mistake. Any new use of this hex must be one of those two jobs, not a third.

**The Table Overrides Chrome Rule.** Inside a game screen, the per-game felt + accent (`game/tableThemes.js`) is the palette — Home's red and green CTAs don't follow the player into a game.

## Typography

**Display Font:** Poppins Bold (`Poppins_700Bold`, loaded via `@expo-google-fonts/poppins`)
**Body/Label Font:** OS system font (Roboto on Android, San Francisco on iOS) — no custom font loaded for it.

**Character:** One loud, rounded-geometric display face for the handful of large screen titles; everything else stays on the platform's native font so small UI text (badges, pills, button labels) keeps the exact metrics the layouts were tuned against.

### Hierarchy
- **Display** (700, 44px base — scales 34px on small phones to 56px on tablets, line-height 1.1, +0.5px tracking): screen titles only (e.g. "Card Night" on Home). Carries a soft red text-shadow (`rgba(233,69,96,0.35)`, 14px blur) for a glow, not a hard drop shadow.
- **Label** (700, 13px, +0.3px tracking): pill and badge text (name pill, coin pill, kicker labels like "BLACKJACK").
- **Body** (400–700, 14–20px depending on context): everything else — subtitles, button labels, menu items — on the system font, no fixed single size; sizes step with screen width via `scale()`/`scaleFont()`.

### Named Rules
**The Titles-Only Rule.** Poppins Bold is scoped to large screen-title text exclusively. A prior attempt at broader use caused a real truncation bug on a small badge; keep custom type off anything smaller than a screen title.

## Layout

Portrait-locked everywhere except Solitaire (landscape-locked). Content is centered in a single column with a `maxWidth` of 420–520px even on tablets — this is a phone-first app, not a responsive grid. Sizing scales off a 390px reference width (`game/responsive.js`'s `scale()`/`scaleFont()`), clamped to a 0.85×–1.5× factor, so the same layout holds from small phones to tablets without separate breakpoint layouts. In-game headers additionally compact themselves (hide kicker/subtitle, shrink the bar) whenever width exceeds height, since landscape is scarce vertical real estate.

## Elevation & Depth

Hybrid: flat navy surfaces at rest, lifted with a conventional black drop shadow (iOS `shadow*` + Android `elevation`, always paired) for anything interactive or floating — primary buttons, the header card, the avatar ring. A second, rarer shadow role uses a colored glow instead of black, tied to a state rather than a surface type: green for an owned/active cosmetic item, gold-tinted borders for price-bearing pills. The colored glow is a signal, not a style — reserve it for state changes worth noticing.

### Shadow Vocabulary
- **Ambient Lift** (`shadowColor: #000, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: {0,4}, elevation: 5`): default raised-surface shadow — primary/secondary Home buttons, similar panels.
- **Deep Lift** (`shadowColor: #000, shadowOpacity: 0.5, shadowRadius: 12, elevation: 12`): heavier shadow for modal-weight tiles (shop items, larger cards).
- **State Glow** (`shadowColor: <state color>, shadowOpacity: 0.35–0.6, shadowRadius: 6–8, elevation: 6`): colored version of the same pattern, used only to mark an owned/active/selected state (e.g. green glow on an unlocked shop item, purple glow on the avatar ring).

### Named Rules
**The Black-By-Default Rule.** Shadows are black unless they're marking a specific state. A colored shadow always means something changed or is currently true — never decoration.

## Shapes

Everything is rounded, bordered, and rectangular — no sharp corners, no circles except pills and the avatar ring. Radius scales with the surface's importance: small badges/underlines sit at 4px, standard interactive surfaces (buttons, header cards, menu buttons) at 12–16px, larger feature tiles and modal-weight cards at 20px, and fully rounded pill shapes (999px) for compact status chips (name pill, coin pill, quit pill). Borders are thin hairlines (1–1.5px), usually the neutral `#334` stroke, occasionally swapped for a role color (gold `#b8860b` border on the coin pill) — the border does the "this is a distinct chip" work instead of a filled contrasting background.

## Components

### Buttons
- **Shape:** 16px radius, 1px border in a lighter tint of the fill color (e.g. red fill with a lighter red border).
- **Primary (multiplayer/hub CTA):** Casino Red fill (`#e94560`), white bold text, Ambient Lift shadow.
- **Go (single-player CTA):** Go Green fill (`#2e9e54`), white bold text, Ambient Lift shadow.
- **Ghost (Profile entry):** `highlight-purple-dim` at ~12% alpha as a translucent wash background, 2px `highlight-purple-dim` border, no shadow — visually quieter than the two filled CTAs above it.
- **States:** no distinct pressed/hover treatment observed beyond the platform's default touch feedback plus haptic feedback (`HapticTouchable`/`HapticPressable` wrap most interactive elements).

### Pills / Chips
- **Style:** Raised Navy background, 1.5px border, 999px radius, bold 13px label text.
- **Variants:** name pill (neutral `#334` border), coin pill (gold `#b8860b` border, gold text) — the border color is what distinguishes a pill's role, not the fill.

### In-Game Header (signature component)
Standardized `GameHeader` + `StatsStrip` + hamburger-menu pattern shared across all 9 games. Header Navy (`#0F1B2D`) background, 16px radius, compacts to a shorter bar in landscape. The hamburger button is a small (14px radius) circular-ish square with its own pressed/open state styling; opening it reveals menu items below a divider rather than a separate screen or modal.

### Game Table Theming (signature component)
Every game screen sets its felt (table background) and accent color from `game/tableThemes.js`, independent of the app chrome's navy/red palette:

| Game | Table | Accent |
|---|---|---|
| Blackjack / Poker | `#35654D` forest green | `#FFD700` gold |
| Solitaire | `#01889F` casino blue | `#7FB3FF` pale blue |
| Rummy / Conquián | `#B22222` crimson | `#FFE4B5` cream |
| Go Fish | `#0D6E8C` ocean blue | `#A8E6FF` pale aqua |
| Last Card | `#1a1a2e` dark navy | `#e94560` red-pink |
| Who Am I? | `#241432` deep plum | `#c792ea` lavender |

Rummy, Poker, and Go Fish additionally expose a switchable felt (Indigo/Green/Teal) via `TableThemePicker`, remembered per game. A new game should pick its own table/accent pair from this same family rather than inheriting Home's red or another game's felt.

### Cards (playing cards)
Rendered as PNG image assets per deck theme (not drawn shapes) with a shared corner radius and a themed card-back image for face-down cards. See card-theme assets for the actual art.

## Do's and Don'ts

### Do:
- **Do** route new color literals through `game/colors.js` tokens instead of hand-typed hex — the token file exists specifically because ~935 scattered hex literals made a single accent change into a project-wide find-and-replace.
- **Do** give each new game its own table + accent pair from the established felt family (`game/tableThemes.js`), so the game is identifiable from a screenshot alone.
- **Do** scale sizes, spacing, and font sizes with `scale()`/`scaleFont()` (`game/responsive.js`) rather than hardcoding pixel values, so layouts hold from small phones to tablets.
- **Do** keep Poppins Bold scoped to large screen titles only; leave body/label text on the system font.
- **Do** check `AccessibilityInfo.isReduceMotionEnabled()` and snap straight to the end state for any new animation.
- **Do** pair a black Ambient Lift shadow with `elevation` on any new raised/interactive surface (iOS shadow props alone are invisible on Android).

### Don't:
- **Don't** introduce Material Design components or defaults (Material buttons, FABs, standard elevation tiers) — this is a custom card-table skin, not a Material-themed app, even though it ships to Android.
- **Don't** put an emoji and its label in a single `Text` node — a prior version of this exact pattern rendered emoji-only after a re-layout on Android.
- **Don't** let a game screen borrow Home's red/green CTA colors, or vice versa — chrome and table are separate palettes by design.
- **Don't** strip `Platform.select` branches or iOS-specific config to "simplify" for the Android-only release; cross-platform code is kept on purpose.
- **Don't** add any visual affordance that implies real-money purchase near coin-economy UI — coins are earned-only and cosmetic-only.
