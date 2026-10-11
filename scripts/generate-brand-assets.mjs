/**
 * Regenerates Expo assets from the master logo (white matte stripped).
 * Run: npm run generate:assets
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, '../assets');
const masterCandidates = [
  path.join(assets, 'Instantcards fintech logo.png'),
  path.join(assets, 'logo.png'),
];

/** App shell background — matches tokens Colors.bg */
const APP_BG = { r: 11, g: 20, b: 16, alpha: 1 };
/** Brand green — adaptive icon + Android */
const BRAND_GREEN = { r: 26, g: 86, b: 56, alpha: 1 };

function resolveMaster() {
  for (const p of masterCandidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No logo master found in assets/');
}

/** Remove white / off-white matte; keep green + gold artwork. */
async function stripWhiteMatte(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const isNeutral = max - min < 22;

    if (isNeutral && min >= 200) {
      if (min >= 248) {
        data[i + 3] = 0;
      } else {
        const t = (min - 200) / (248 - 200);
        data[i + 3] = Math.round(255 * (1 - Math.min(1, t)));
      }
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

async function buildTrimmedLogo(masterPath) {
  const stripped = await stripWhiteMatte(masterPath);
  const trimmed = stripped.trim({ threshold: 8 });
  return trimmed.png().toBuffer();
}

async function compositeOnCanvas(logoBuf, width, height, background, logoScale = 0.82) {
  const meta = await sharp(logoBuf).metadata();
  const lw = meta.width ?? 1;
  const lh = meta.height ?? 1;
  const maxSide = Math.min(width, height) * logoScale;
  const scale = maxSide / Math.max(lw, lh);
  const targetW = Math.round(lw * scale);
  const targetH = Math.round(lh * scale);

  const scaled = await sharp(logoBuf)
    .resize(targetW, targetH, { fit: 'inside' })
    .png()
    .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background },
  })
    .composite([{ input: scaled, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  const master = resolveMaster();
  const logoBuf = await buildTrimmedLogo(master);

  const logoOut = path.join(assets, 'logo.png');
  const logoTransparentOut = path.join(assets, 'logo-transparent.png');

  await sharp(logoBuf).toFile(logoOut);
  await sharp(logoBuf).toFile(logoTransparentOut);

  const fintechMaster = path.join(assets, 'Instantcards fintech logo.png');
  if (fs.existsSync(fintechMaster)) {
    await sharp(logoBuf).toFile(fintechMaster);
  }

  const iconBuf = await compositeOnCanvas(
    logoBuf,
    1024,
    1024,
    { r: 0, g: 0, b: 0, alpha: 0 },
    0.88,
  );
  await sharp(iconBuf).toFile(path.join(assets, 'icon.png'));

  const adaptiveBuf = await compositeOnCanvas(logoBuf, 1024, 1024, BRAND_GREEN, 0.78);
  await sharp(adaptiveBuf).toFile(path.join(assets, 'adaptive-icon.png'));

  const splashLogoBuf = await compositeOnCanvas(logoBuf, 1284, 2778, APP_BG, 0.62);
  await sharp(splashLogoBuf).toFile(path.join(assets, 'splash.png'));

  const notifBuf = await compositeOnCanvas(
    logoBuf,
    96,
    96,
    { r: 0, g: 0, b: 0, alpha: 0 },
    0.9,
  );
  await sharp(notifBuf).toFile(path.join(assets, 'notification-icon.png'));

  console.log('Master:', path.basename(master));
  console.log('Wrote logo.png (transparent), logo-transparent.png, icon, adaptive-icon, splash, notification-icon');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
