/**
 * compress-cards.js
 *
 * Resizes all card theme PNGs from 300×420 → 200×280 and re-saves as
 * indexed-color PNG (palette mode), which is smaller than full RGBA.
 *
 * Run ONCE from the project root:
 *   npm install --save-dev sharp
 *   node scripts/compress-cards.js
 *
 * To restore originals from the auto-created backup:
 *   node scripts/compress-cards.js --restore
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const BACKUP_DIR = path.join(ASSETS_DIR, "_card_originals_backup");

const THEME_FOLDERS = [
  "cards",
  "cards_cowboy",
  "card_images_girly",
  "card_images_wizards",
  "card_images_classic",
  "card_images_gothic",
  "card_images_pirate",
];

const TARGET_WIDTH = 200;
const TARGET_HEIGHT = 280;

// ─── Restore mode ─────────────────────────────────────────────────────────────
if (process.argv.includes("--restore")) {
  console.log("=== Restoring originals from backup ===\n");
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error("No backup found at:", BACKUP_DIR);
    process.exit(1);
  }
  let restored = 0;
  for (const folder of THEME_FOLDERS) {
    const backupFolder = path.join(BACKUP_DIR, folder);
    const destFolder = path.join(ASSETS_DIR, folder);
    if (!fs.existsSync(backupFolder)) continue;
    for (const file of fs
      .readdirSync(backupFolder)
      .filter((f) => f.endsWith(".png"))) {
      fs.copyFileSync(
        path.join(backupFolder, file),
        path.join(destFolder, file),
      );
      restored++;
    }
  }
  console.log(`Restored ${restored} files.`);
  process.exit(0);
}

// ─── Compress mode ────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Card Night — Image Compressor (v2) ===\n");

  // Collect all PNGs across all theme folders
  const allFiles = [];
  for (const folder of THEME_FOLDERS) {
    const fullPath = path.join(ASSETS_DIR, folder);
    if (!fs.existsSync(fullPath)) {
      console.warn(`  ⚠️  Skipping missing folder: ${folder}`);
      continue;
    }
    const pngs = fs
      .readdirSync(fullPath)
      .filter((f) => f.endsWith(".png"))
      .map((f) => ({ folder, file: f, fullPath: path.join(fullPath, f) }));
    allFiles.push(...pngs);
  }

  console.log(
    `Found ${allFiles.length} PNG files across ${THEME_FOLDERS.length} theme folders.\n`,
  );

  // Report current sizes
  let totalBefore = 0;
  for (const { fullPath } of allFiles) {
    totalBefore += fs.statSync(fullPath).size;
  }

  // Detect if we're starting from originals or from the previous (bloated) run
  const avgKB = totalBefore / allFiles.length / 1024;
  if (avgKB > 15) {
    console.log(
      `NOTE: Current files appear to be the larger RGBA version from the first run.`,
    );
    console.log(
      `This script will restore from backup first, then re-compress correctly.\n`,
    );
    // Auto-restore from backup
    console.log("Restoring originals from backup...");
    let restored = 0;
    for (const { folder, file } of allFiles) {
      const backupSrc = path.join(BACKUP_DIR, folder, file);
      const dest = path.join(ASSETS_DIR, folder, file);
      if (fs.existsSync(backupSrc)) {
        fs.copyFileSync(backupSrc, dest);
        restored++;
      }
    }
    console.log(`Restored ${restored} originals.\n`);
    // Recalculate before-size from restored originals
    totalBefore = 0;
    for (const { fullPath } of allFiles) {
      totalBefore += fs.statSync(fullPath).size;
    }
  }

  console.log(
    `On-disk size before: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`,
  );
  console.log(
    `Decoded RAM before (est.): ${((allFiles.length * 300 * 420 * 4) / 1024 / 1024).toFixed(0)} MB worst-case\n`,
  );

  // Create / refresh backup
  console.log(`Saving backup to assets/_card_originals_backup/ ...`);
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
  for (const { folder, file, fullPath } of allFiles) {
    const backupFolder = path.join(BACKUP_DIR, folder);
    if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder);
    const backupDest = path.join(backupFolder, file);
    if (!fs.existsSync(backupDest)) {
      fs.copyFileSync(fullPath, backupDest);
    }
  }
  console.log(`Backup ready.\n`);

  // Resize + re-encode as palette PNG
  console.log(
    `Resizing ${allFiles.length} images to ${TARGET_WIDTH}×${TARGET_HEIGHT} px (indexed-color palette)...\n`,
  );
  let done = 0;
  for (const { fullPath } of allFiles) {
    await sharp(fullPath)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "fill" })
      .png({
        palette: true, // indexed-color (like the originals) — keeps file size small
        quality: 100, // max quality within the palette
        compressionLevel: 9, // max zlib compression
        dither: 1.0, // smooth color transitions
      })
      .toFile(fullPath + ".tmp");

    fs.renameSync(fullPath + ".tmp", fullPath);
    done++;
    if (done % 50 === 0) {
      console.log(`  ... ${done}/${allFiles.length} done`);
    }
  }

  // Report after sizes
  let totalAfter = 0;
  for (const { fullPath } of allFiles) {
    totalAfter += fs.statSync(fullPath).size;
  }

  const diskSavingsPct = (
    ((totalBefore - totalAfter) / totalBefore) *
    100
  ).toFixed(0);
  const ramAfterMB = (
    (allFiles.length * TARGET_WIDTH * TARGET_HEIGHT * 4) /
    1024 /
    1024
  ).toFixed(0);

  console.log(`\n=== Done! ===`);
  console.log(
    `On-disk:  ${(totalAfter / 1024 / 1024).toFixed(2)} MB  (was ${(totalBefore / 1024 / 1024).toFixed(2)} MB — ${diskSavingsPct}% savings)`,
  );
  console.log(
    `Decoded RAM after (est.): ${ramAfterMB} MB worst-case  (was 206 MB)`,
  );
  console.log(`\nOriginals backed up to: assets/_card_originals_backup/`);
  console.log(`To undo everything: node scripts/compress-cards.js --restore`);
  console.log(
    `\nNext step: run your app and spot-check a few cards look right visually.`,
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
