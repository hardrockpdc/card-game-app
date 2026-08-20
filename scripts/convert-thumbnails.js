/**
 * convert-thumbnails.js
 *
 * The carousel/setup game thumbnails (assets/images/thumb_*.png) are opaque
 * 900x1200 illustrations — and PNG is a poor fit for photographic content. At
 * 900px they're correctly sized for their largest on-screen use (the setup
 * carousel card, ~width*0.78 * 3x DPI ≈ 900px), so we keep the dimensions and
 * just switch format: PNG -> JPEG (quality 85). ~2.4 MB -> ~0.85 MB, no visible
 * change. The .png originals are in git history (recoverable via git restore).
 *
 * This rewrites the files in place (writes .jpg, removes .png). After running,
 * update the require() paths in the screens that load them.
 *
 * Run from the project root:
 *   node scripts/convert-thumbnails.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "assets", "images");

async function run() {
  const files = fs.readdirSync(DIR).filter((f) => /^thumb_.*\.png$/i.test(f));
  let before = 0;
  let after = 0;

  for (const file of files) {
    const pngPath = path.join(DIR, file);
    const jpgPath = pngPath.replace(/\.png$/i, ".jpg");
    const origBytes = fs.statSync(pngPath).size;
    before += origBytes;

    const out = await sharp(pngPath)
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(jpgPath, out);
    fs.unlinkSync(pngPath);
    after += out.length;

    console.log(
      `  ${file.padEnd(24)} ${(origBytes / 1024).toFixed(0).padStart(5)} KB -> ${(
        out.length / 1024
      )
        .toFixed(0)
        .padStart(4)} KB  (.jpg)`,
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
