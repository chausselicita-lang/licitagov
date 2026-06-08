import sharp from 'sharp';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');
const src   = join(root, 'public', 'icons', 'logo-source.jpeg');
const out192 = join(root, 'public', 'icons', 'icon-192.png');
const out512 = join(root, 'public', 'icons', 'icon-512.png');

if (!existsSync(src)) {
  console.error('Logo source not found:', src);
  process.exit(1);
}

await sharp(src).resize(192, 192, { fit: 'cover' }).png().toFile(out192);
console.log('✓ icon-192.png');

await sharp(src).resize(512, 512, { fit: 'cover' }).png().toFile(out512);
console.log('✓ icon-512.png');

console.log('Icons generated successfully!');
