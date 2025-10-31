#!/usr/bin/env node

const fs = require('fs');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const path = require('path');

// Load image (PNG or JPEG)
function loadImage(filepath) {
  return new Promise((resolve, reject) => {
    const buffer = fs.readFileSync(filepath);
    const ext = path.extname(filepath).toLowerCase();

    try {
      if (ext === '.png') {
        const png = PNG.sync.read(buffer);
        const pixels = [];
        
        for (let y = 0; y < png.height; y++) {
          const row = [];
          for (let x = 0; x < png.width; x++) {
            const idx = (png.width * y + x) * 4;
            row.push({
              r: png.data[idx],
              g: png.data[idx + 1],
              b: png.data[idx + 2],
              a: png.data[idx + 3]
            });
          }
          pixels.push(row);
        }
        
        resolve({ width: png.width, height: png.height, pixels });
      } else if (ext === '.jpg' || ext === '.jpeg') {
        const jpegData = jpeg.decode(buffer);
        const pixels = [];
        
        for (let y = 0; y < jpegData.height; y++) {
          const row = [];
          for (let x = 0; x < jpegData.width; x++) {
            const idx = (jpegData.width * y + x) * 4;
            row.push({
              r: jpegData.data[idx],
              g: jpegData.data[idx + 1],
              b: jpegData.data[idx + 2],
              a: jpegData.data[idx + 3]
            });
          }
          pixels.push(row);
        }
        
        resolve({ width: jpegData.width, height: jpegData.height, pixels });
      } else {
        reject(new Error('Unsupported format. Use PNG or JPEG.'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Resize image to fit terminal
function resizeImage(pixels, maxWidth, maxHeight) {
  const height = pixels.length;
  const width = pixels[0].length;

  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.floor(height * (maxWidth / width));
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.floor(width * (maxHeight / height));
  }

  const resized = [];
  for (let y = 0; y < newHeight; y++) {
    const row = [];
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x * width / newWidth);
      const srcY = Math.floor(y * height / newHeight);
      row.push(pixels[srcY][srcX]);
    }
    resized.push(row);
  }

  return resized;
}

// Parse size parameter (can be pixels or percentage)
function parseSize(value, max) {
  if (!value) return max;
  
  const str = String(value);
  if (str.endsWith('%')) {
    const percent = parseInt(str);
    return Math.floor(max * percent / 100);
  }
  return parseInt(str);
}

// Render image to terminal (climg style - background colors with spaces)
function renderImage(pixels, options = {}) {
  const termWidth = process.stdout.columns;
  const termHeight = process.stdout.rows - 1;
  
  const { trueColor = true } = options;
  
  let width = parseSize(options.width, termWidth);
  let height = parseSize(options.height, termHeight);
  
  // For climg, each character is 1 pixel wide, 2 pixels tall
  const resized = resizeImage(pixels, width, height * 2);
  const lines = [];

  // Process two rows at a time (top and bottom half of character)
  for (let y = 0; y < resized.length; y += 2) {
    let line = '';
    
    for (let x = 0; x < resized[y].length; x++) {
      const topPixel = resized[y][x];
      const bottomPixel = y + 1 < resized.length ? resized[y + 1][x] : { r: 0, g: 0, b: 0, a: 255 };

      if (trueColor) {
        // Use true color (24-bit RGB) - this is the key to quality!
        // Top half as foreground, bottom half as background
        line += `\x1b[38;2;${topPixel.r};${topPixel.g};${topPixel.b}m`;
        line += `\x1b[48;2;${bottomPixel.r};${bottomPixel.g};${bottomPixel.b}m`;
        line += '▀';
      } else {
        // Fallback to 256 colors
        const topColor = rgbToAnsi256(topPixel.r, topPixel.g, topPixel.b);
        const bottomColor = rgbToAnsi256(bottomPixel.r, bottomPixel.g, bottomPixel.b);
        line += `\x1b[38;5;${topColor}m`;
        line += `\x1b[48;5;${bottomColor}m`;
        line += '▀';
      }
    }
    
    line += '\x1b[0m';
    lines.push(line);
  }

  return lines.join('\n');
}

// Convert RGB to ANSI 256 color (for non-truecolor terminals)
function rgbToAnsi256(r, g, b) {
  // Check if grayscale
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(232 + (r * 23 / 255));
  }

  // Use 6x6x6 color cube
  return 16 + Math.round(r / 255 * 5) * 36 + Math.round(g / 255 * 5) * 6 + Math.round(b / 255 * 5);
}

// Main function
async function climg(filepath, options = {}) {
  try {
    const image = await loadImage(filepath);
    const output = renderImage(image.pixels, options);
    console.log(output);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: climg <image.png|jpg> [options]');
    console.log('');
    console.log('Options:');
    console.log('  -w <size>      Set width in pixels or percentage (e.g., 80 or 50%)');
    console.log('  -h <size>      Set height in pixels or percentage (e.g., 40 or 80%)');
    console.log('  -t             Disable true color, use 256 colors instead');
    console.log('');
    console.log('Examples:');
    console.log('  climg image.jpg');
    console.log('  climg image.jpg -w 100 -h 30');
    console.log('  climg image.jpg -w 50%');
    console.log('  climg image.jpg -w 80% -h 50%');
    console.log('');
    process.exit(1);
  }

  const filepath = args[0];
  const options = { trueColor: true };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '-w' && args[i + 1]) {
      options.width = args[i + 1];
      i++;
    } else if (args[i] === '-h' && args[i + 1]) {
      options.height = args[i + 1];
      i++;
    } else if (args[i] === '-t') {
      options.trueColor = false;
    }
  }

  climg(filepath, options);
}

module.exports = { climg, loadImage, renderImage };