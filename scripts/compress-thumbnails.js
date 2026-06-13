/**
 * compress-thumbnails.js
 *
 * Shrinks the carousel game thumbnails (assets/images/thumb_*.png). They ship
 * far larger than the ~300px carousel card needs, bloating the app. This resizes
 * them to a sensible width and re-encodes as optimized PNG.
 *
 * Run from the project root:
 *   node scripts/compress-thumbnails.js
 *
 * The originals are in git history, so this is recoverable (git restore).
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "assets", "images");
const TARGET_WIDTH = 900; // ~3x the on-screen card width; crisp on high-DPI

async function run() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /^thumb_.*\.png$/i.test(f));

  let before = 0;
  let after = 0;

  for (const file of files) {
    const full = path.join(DIR, file);
    const origBytes = fs.statSync(full).size;
    before += origBytes;

    const out = await sharp(full)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .png({ palette: true, quality: 90, compressionLevel: 9, effort: 10 })
      .toBuffer();

    fs.writeFileSync(full, out);
    after += out.length;

    console.log(
      `  ${file.padEnd(24)} ${(origBytes / 1024).toFixed(0).padStart(5)} KB -> ${(
        out.length / 1024
      )
        .toFixed(0)
        .padStart(5)} KB`,
    );
  }

  console.log(
    `\n  Total: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(
      after /
      1024 /
      1024
    ).toFixed(2)} MB  (${files.length} files)`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
