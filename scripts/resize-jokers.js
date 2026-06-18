/**
 * resize-jokers.js
 *
 * The joker image in each card theme shipped at 600x840 (3x the resolution of
 * every other card, which is 200x280) and 300-913 KB each — ~4 MB total for 7
 * images that render at the exact same small on-screen size as any other card.
 *
 * This downscales every assets/**\/joker.png to 200x280 to match the rest of the
 * deck and re-encodes as optimized PNG. No visible change (same rendered size),
 * big app-size win. Originals are in git history, so this is recoverable
 * (git restore).
 *
 * Run from the project root:
 *   node scripts/resize-jokers.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");
const CARD_W = 200;
const CARD_H = 280; // matches every other card image in the deck

function findJokers(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findJokers(full, out);
    else if (/^joker\.png$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function run() {
  const jokers = findJokers(ASSETS);
  let before = 0;
  let after = 0;

  for (const full of jokers) {
    const origBytes = fs.statSync(full).size;
    before += origBytes;

    const out = await sharp(full)
      .resize({ width: CARD_W, height: CARD_H, fit: "fill" })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    fs.writeFileSync(full, out);
    after += out.length;

    console.log(
      `  ${path
        .relative(ASSETS, full)
        .padEnd(34)} ${(origBytes / 1024).toFixed(0).padStart(5)} KB -> ${(
        out.length / 1024
      )
        .toFixed(0)
        .padStart(4)} KB`,
    );
  }

  console.log(
    `\n  Total: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(
      after /
      1024 /
      1024
    ).toFixed(2)} MB  (${jokers.length} files)`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
