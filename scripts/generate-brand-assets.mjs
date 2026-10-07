/**
 * Regenerates Expo assets from assets/logo.png
 * Run: node scripts/generate-brand-assets.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, '../assets');
const source = path.join(assets, 'logo.png');

const APP_BG = { r: 10, g: 22, b: 40, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  const meta = await sharp(source).metadata();
  const aspect = (meta.width ?? 1) / (meta.height ?? 1);

  await sharp(source)
    .resize(1024, 1024, { fit: 'contain', background: WHITE })
    .png()
    .toFile(path.join(assets, 'icon.png'));

  await sharp(source)
    .resize(1024, 1024, { fit: 'contain', background: WHITE })
    .png()
    .toFile(path.join(assets, 'adaptive-icon.png'));

  const splashLogoW = 1000;
  const splashLogoH = Math.round(splashLogoW / aspect);
  const logoBuf = await sharp(source)
    .resize(splashLogoW, splashLogoH, { fit: 'inside', background: WHITE })
    .png()
    .toBuffer();

  await sharp({
    create: { width: 1284, height: 2778, channels: 4, background: APP_BG },
  })
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(assets, 'splash.png'));

  await sharp(source)
    .resize(96, 96, { fit: 'contain', background: WHITE })
    .png()
    .toFile(path.join(assets, 'notification-icon.png'));

  console.log('Generated icon.png, adaptive-icon.png, splash.png, notification-icon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
