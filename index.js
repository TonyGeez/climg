#!/usr/bin/env node

const fs = require('fs');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const path = require('path');

const RED = `\x1b[0;31m`;
const GREEN = `\x1b[0;32m`;
const BLUE = `\x1B[38;5;74m`;
const CYAN = `\x1b[0;36m`;
const YELLOW = `\x1b[0;33m`;

const BOLD = `\x1B[1m`;
const DIM = `\x1B[2m`;
const RESET = `\x1B[0m`;

const WARNING = `${BOLD}${YELLOW}⚠${RESET}${YELLOW}`;
const ERROR = `${BOLD}${RED}✘${RESET}${RED}`;
const SUCCESS = `${BOLD}${GREEN}✔${RESET}${GREEN}`;
const POINTER = `${BOLD}${BLUE}▍`;
const HEAD = `${BOLD}${BLUE}█████${RESET}${RESET}${BOLD}${CYAN}`;

// Get current terminal size dynamically
function getTerminalSize() {
  return {
    width: process.stdout.columns || 80,
    height: (process.stdout.rows || 24) - 1 // -1 to leave room for prompt
  };
}

// CHANGED: Switched to fs.readFile for true async operation.
function loadImage(filepath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, (err, buffer) => {
      if (err) {
        return reject(err);
      }
      
      const ext = path.extname(filepath).toLowerCase();
      try {
        let decodedData;
        if (ext === '.png') {
          decodedData = PNG.sync.read(buffer);
        } else if (ext === '.jpg' || ext === '.jpeg') {
          decodedData = jpeg.decode(buffer);
          // jpeg-js doesn't add an alpha channel by default, let's add it for consistency
          if (decodedData.data.length === decodedData.width * decodedData.height * 3) {
            const withAlpha = Buffer.alloc(decodedData.width * decodedData.height * 4);
            for (let i = 0; i < decodedData.width * decodedData.height; i++) {
              withAlpha[i * 4 + 0] = decodedData.data[i * 3 + 0];
              withAlpha[i * 4 + 1] = decodedData.data[i * 3 + 1];
              withAlpha[i * 4 + 2] = decodedData.data[i * 3 + 2];
              withAlpha[i * 4 + 3] = 255; // Full opacity
            }
            decodedData.data = withAlpha;
          }
        } else {
          return reject(new Error('Unsupported format. Use PNG or JPEG.'));
        }
        
        const { width, height, data } = decodedData;
        const pixels = [];
        
        for (let y = 0; y < height; y++) {
          const row = [];
          for (let x = 0; x < width; x++) {
            const idx = (width * y + x) * 4;
            row.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
              a: data[idx + 3]
            });
          }
          pixels.push(row);
        }
        
        resolve({ width, height, pixels });

      } catch (error) {
        reject(error);
      }
    });
  });
}

// Bilinear interpolation for better quality when resizing
function bilinearSample(pixels, x, y) {
  const height = pixels.length;
  const width = pixels[0].length;
  
  const x1 = Math.floor(x);
  const x2 = Math.min(x1 + 1, width - 1);
  const y1 = Math.floor(y);
  const y2 = Math.min(y1 + 1, height - 1);
  
  const dx = x - x1;
  const dy = y - y1;
  
  const p11 = pixels[y1][x1];
  const p12 = pixels[y1][x2];
  const p21 = pixels[y2][x1];
  const p22 = pixels[y2][x2];
  
  return {
    r: Math.round(
      p11.r * (1 - dx) * (1 - dy) +
      p12.r * dx * (1 - dy) +
      p21.r * (1 - dx) * dy +
      p22.r * dx * dy
    ),
    g: Math.round(
      p11.g * (1 - dx) * (1 - dy) +
      p12.g * dx * (1 - dy) +
      p21.g * (1 - dx) * dy +
      p22.g * dx * dy
    ),
    b: Math.round(
      p11.b * (1 - dx) * (1 - dy) +
      p12.b * dx * (1 - dy) +
      p21.b * (1 - dx) * dy +
      p22.b * dx * dy
    ),
    a: Math.round(
      p11.a * (1 - dx) * (1 - dy) +
      p12.a * dx * (1 - dy) +
      p21.a * (1 - dx) * dy +
      p22.a * dx * dy
    )
  };
}

// Resize image with better interpolation
function resizeImage(pixels, maxWidth, maxHeight, useInterpolation = true) {
  const height = pixels.length;
  const width = pixels[0].length;

  let newWidth = width;
  let newHeight = height;

  // Calculate aspect ratio preserving dimensions
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scale = Math.min(widthRatio, heightRatio);

  newWidth = Math.floor(width * scale);
  newHeight = Math.floor(height * scale);

  // Ensure at least 1x1
  newWidth = Math.max(1, newWidth);
  newHeight = Math.max(1, newHeight);

  const resized = [];
  
  if (useInterpolation && (scale < 1 || scale > 2) && width > 1 && height > 1) {
    // Use bilinear interpolation for better quality
    for (let y = 0; y < newHeight; y++) {
      const row = [];
      for (let x = 0; x < newWidth; x++) {
        const srcX = x * (width - 1) / (newWidth - 1 || 1);
        const srcY = y * (height - 1) / (newHeight - 1 || 1);
        row.push(bilinearSample(pixels, srcX, srcY));
      }
      resized.push(row);
    }
  } else {
    // Use nearest neighbor for small adjustments or upscaling
    for (let y = 0; y < newHeight; y++) {
      const row = [];
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x * width / newWidth);
        const srcY = Math.floor(y * height / newHeight);
        row.push(pixels[srcY][srcX]);
      }
      resized.push(row);
    }
  }

  return resized;
}

// Parse size parameter (can be pixels or percentage)
function parseSize(value, max) {
  if (!value) return max;
  
  const str = String(value);
  if (str.endsWith('%')) {
    const percent = parseInt(str, 10);
    return Math.floor(max * percent / 100);
  }
  return parseInt(str, 10);
}

// CHANGED: This function is heavily modified for quality and transparency.
function renderImage(pixels, options = {}) {
  // Get current terminal size dynamically
  const term = getTerminalSize();
  const termWidth = term.width;
  const termHeight = term.height;
  
  const { trueColor = true, showInfo = false } = options;
  
  let width = parseSize(options.width, termWidth);
  let height = parseSize(options.height, termHeight);
  
  // Ensure we don't exceed terminal bounds
  width = Math.min(width, termWidth);
  height = Math.min(height, termHeight);
  
  // For climg, each character is 1 pixel wide, 2 pixels tall (using half blocks)
  const resized = resizeImage(pixels, width, height * 2, true);
  const resizedHeight = resized.length;
  const resizedWidth = resized[0].length;
  
  const lines = [];

  if (showInfo) {
    lines.push(`${POINTER} Terminal: ${RESET}${BLUE}${termWidth}x${termHeight}${RESET}`);
    lines.push(`${POINTER} Render size: ${RESET}${BLUE}${resizedWidth}x${Math.ceil(resizedHeight / 2)}${RESET} (chars)`);
    lines.push(`${POINTER} Scaled size: ${RESET}${BLUE}${resizedWidth}x${resizedHeight}${RESET} (pixels)`);
    lines.push(`${POINTER} Image size: ${RESET}${BLUE}${pixels[0].length}x${pixels.length}${RESET} (pixels)`);
    lines.push('');
  }

  // Process two rows at a time (top and bottom half of character)
  for (let y = 0; y < resizedHeight; y += 2) {
    let line = '';
    
    for (let x = 0; x < resizedWidth; x++) {
      const topPixel = resized[y][x];
      // Use a transparent pixel if we're on the last row and it's odd
      const bottomPixel = (y + 1 < resizedHeight) ? resized[y + 1][x] : { r: 0, g: 0, b: 0, a: 0 };

      // Check opacity
      const topOpaque = topPixel.a > 128;
      const bottomOpaque = bottomPixel.a > 128;

      if (trueColor) {
        if (topOpaque && bottomOpaque) {
          // Top and bottom are opaque: '▀' with FG and BG
          line += `\x1b[38;2;${topPixel.r};${topPixel.g};${topPixel.b}m`;
          line += `\x1b[48;2;${bottomPixel.r};${bottomPixel.g};${bottomPixel.b}m`;
          line += '▀';
        } else if (topOpaque && !bottomOpaque) {
          // Only top is opaque: '▀' with FG only
          line += `\x1b[38;2;${topPixel.r};${topPixel.g};${topPixel.b}m`;
          line += '\x1b[49m'; // Reset background
          line += '▀';
        } else if (!topOpaque && bottomOpaque) {
          // Only bottom is opaque: '▄' with FG only
          line += `\x1b[38;2;${bottomPixel.r};${bottomPixel.g};${bottomPixel.b}m`;
          line += '\x1b[49m'; // Reset background
          line += '▄';
        } else {
          // Both are transparent: ' '
          line += '\x1b[39m\x1b[49m '; // Reset FG and BG
        }
      } else {
        // Fallback to 256 colors
        const topColor = rgbToAnsi256(topPixel.r, topPixel.g, topPixel.b);
        const bottomColor = rgbToAnsi256(bottomPixel.r, bottomPixel.g, bottomPixel.b);
        
        if (topOpaque && bottomOpaque) {
          line += `\x1b[38;5;${topColor}m`;
          line += `\x1b[48;5;${bottomColor}m`;
          line += '▀';
        } else if (topOpaque && !bottomOpaque) {
          line += `\x1b[38;5;${topColor}m`;
          line += '\x1b[49m';
          line += '▀';
        } else if (!topOpaque && bottomOpaque) {
          line += `\x1b[38;5;${bottomColor}m`;
          line += '\x1b[49m';
          line += '▄';
        } else {
          line += '\x1b[39m\x1b[49m ';
        }
      }
    }
    
    line += '\x1b[0m'; // Reset all at end of line
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
    const image = await loadImage(filepath); // This is now truly async
    const output = renderImage(image.pixels, options);
    console.log(output);
  } catch (error) {
    console.error(`${ERROR} ${error.message}${RESET}`);
    process.exit(1);
  }
}

// CHANGED: This block is rewritten to be more robust.
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = { trueColor: true, showInfo: false };
  const remainingArgs = [];

  // Parse args
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-w' && args[i + 1]) {
      options.width = args[i + 1];
      i++;
    } else if (arg === '-h' && args[i + 1]) {
      options.height = args[i + 1];
      i++;
    } else if (arg === '-t') {
      options.trueColor = false;
    } else if (arg === '-i') {
      options.showInfo = true;
    } else if (arg === '-h' || arg === '--help') {
      // Allow for help flag
      remainingArgs.push(null); // Signal to show help
      break;
    } else if (!arg.startsWith('-')) {
      // Assume it's a filepath
      remainingArgs.push(arg);
    } else {
      console.error(`${WARNING} Unknown option: ${arg}${RESET}`);
    }
  }

  const filepath = remainingArgs[0];

  if (!filepath) {
    console.log(`${HEAD} climg - Terminal Image Viewer ${RESET}`);
    console.log('');
    console.log(`${BOLD}Usage:${RESET} climg <image.png|jpg> [options]`);
    console.log('');
    console.log(`${BOLD}Options:${RESET}`);
    console.log(`  ${CYAN}-w <size>${RESET}      Set width in pixels or percentage (e.g., 80 or 50%)`);
    console.log(`  ${CYAN}-h <size>${RESET}      Set height in pixels or percentage (e.g., 40 or 80%)`);
    console.log(`  ${CYAN}-t${RESET}             Disable true color, use 256 colors instead`);
    console.log(`  ${CYAN}-i${RESET}             Show image and terminal info`);
    console.log(`  ${CYAN}-h, --help${RESET}   Show this help message`);
    console.log('');
    console.log(`${BOLD}Examples:${RESET}`);
    console.log(`  ${DIM}climg image.jpg${RESET}`);
    console.log(`  ${DIM}climg -i image.jpg -w 50%${RESET}`);
    console.log(`  ${DIM}climg image.jpg -w 100 -h 30${RESET}`);
    console.log('');
    process.exit(1);
  }

  climg(filepath, options);
}

module.exports = { climg, loadImage, renderImage };
