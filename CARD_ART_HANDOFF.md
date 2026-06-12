# Card Art Handoff (for an external image tool)

Use this to regenerate the card decks (sharper + suit-under-rank + a joker) with
an image model, then drop the results straight back into the app. Do **one theme
at a time**: zip a theme folder, hand it over with the prompt below, verify the
output, repeat.

Theme folders live in `assets/`:

| Theme   | Folder                |
| ------- | --------------------- |
| Classic | `card_images_classic` |
| Neon    | `cards`               |
| Cowboy  | `cards_cowboy`        |
| Girly   | `card_images_girly`   |
| Wizards | `card_images_hp`      |
| Gothic  | `card_images_gothic`  |
| Pirate  | `card_images_pirate`  |

> Higher-res originals (300×420) are in `assets/_card_originals_backup` — prefer
> those as the source so the tool has the sharpest reference to match.

---

## Prompt to paste into ChatGPT (per theme)

> I'm giving you a zip of a themed deck of playing-card images. Regenerate the
> whole deck in the **same art style and color palette**, but:
>
> 1. **Sharper / cleaner** than the originals.
> 2. Add a **corner index**: the rank in the top-left corner,
>    with a **small suit symbol directly underneath the rank**, in addition to the usual large center suit/figure.
> 3. Create a **joker** card in the same style and frame, with:
>    - the word **JOKER spelled vertically** (one letter stacked per line) in the
>      **top-left corner**, instead of a rank + suit;
>    - a **themed character face in the center** that fits this deck's style
>      (e.g. Gothic → a skull in a red/black jester hat; Pirate → a pirate
>      jester; Wizards → a wizard jester; etc.) — **not** the card's background
>      pattern, and no suit symbols.
>
> Hard requirements so the files drop back into my app unchanged:
>
> - Output **PNG**, **full-bleed** (square corners — do NOT round them; the app
>   rounds corners itself).
> - **Every card identical pixel size**, **5:7 aspect ratio**, rendered at
>   **600×840** (or larger, same ratio).
> - Keep the **exact original filenames** (see list below) and add `joker.png`.
> - Transparent or solid background — match whatever the originals use.
>
> Return all 54 files

---

## Exact filenames each theme must contain

**52 ranks** — `{rank}_{suit}.png` where
rank ∈ `a 2 3 4 5 6 7 8 9 10 j q k` and suit ∈ `spades hearts diamonds clubs`:

```
a_spades   2_spades   3_spades   4_spades   5_spades   6_spades   7_spades
8_spades   9_spades   10_spades  j_spades   q_spades   k_spades
a_hearts   2_hearts   ... (same 13 for hearts)
a_diamonds 2_diamonds ... (same 13 for diamonds)
a_clubs    2_clubs    ... (same 13 for clubs)
```

**Plus:**

- `card_back.png`
- `joker.png` ← NEW
- `blank.png` ← Neon (`cards`) only, keep as-is

Total = **54 per theme** (55 for Neon).

---

## After the art comes back (Pedro)

1. Drop the regenerated PNGs into each `assets/<theme>/` folder using the **same
   filenames** (overwrite the old ones; add `joker.png`).
2. **Sharpness vs app size:** `scripts/compress-cards.js` currently shrinks every
   card to **200×280** — that's why they look soft. To keep them sharper, raise
   that target (≈**300×420**) or skip recompression. Caveat: the compression was
   a deliberate **performance/crash fix** for low-end Android (big textures =
   memory pressure), so don't go to full-res blindly — pick ~300×420 and test on
   a device.
3. Also copy `joker.png` into `assets/_card_originals_backup/<theme>/` so the
   script's `--restore` stays consistent.
4. **Ping me** — I'll wire the joker in code (one small change in
   `game/cardTheme.js`): add `joker: require(...)` to each theme map and make
   `getCardImage` return it for `rank === "JOKER"` (Rummy's Canasta variant deals
   jokers, which currently render blank). Nothing else needs code.

## Heads-up

Image models are unreliable at producing 52 consistent cards (wrong rank,
garbled pip, mismatched size). Verify each card — **uniform pixel size is the #1
thing** that must be right, or the app will crop/stretch them. The Last Card
(UNO-style) deck in `assets/card_images_lastcard` is a separate system; its
"wild" cards aren't classic jokers, so leave it out of this.
