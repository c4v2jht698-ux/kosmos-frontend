// Generate PNG icons from SVG using Node.js built-in
const fs = require('fs');

function svgIcon(size) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a1a"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${size*0.35}" ry="${size*0.11}" transform="rotate(-20 ${cx} ${cy})" fill="none" stroke="#4a90e2" stroke-width="${size*0.012}" opacity="0.5"/>
  <circle cx="${cx}" cy="${cy}" r="${size*0.19}" fill="#0f0f25"/>
  <text x="${cx}" y="${cy+size*0.07}" text-anchor="middle" fill="#4a90e2" font-family="-apple-system,system-ui,sans-serif" font-size="${size*0.21}">К</text>
  <circle cx="${cx+size*0.35}" cy="${cy-size*0.17}" r="${size*0.028}" fill="#4a90e2" opacity="0.9"/>
</svg>`;
}

if (!fs.existsSync('icons')) fs.mkdirSync('icons');
fs.writeFileSync('icons/icon-192.svg', svgIcon(192));
fs.writeFileSync('icons/icon-512.svg', svgIcon(512));
console.log('SVG Icons generated!');
