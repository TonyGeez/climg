# Print image in your terminal
A Node.js utility that displays images directly in your terminal using ANSI escape codes and Unicode characters.

<img width="992" height="1032" alt="climg" src="https://github.com/user-attachments/assets/b28a84d0-43e5-4049-8638-7c87e22a0151" />


## Features
- Display PNG and JPEG images in the terminal
- True color (24-bit RGB) support for high-quality rendering
- Fallback to 256-color mode for older terminals
- Flexible sizing with pixel or percentage values
- Automatic image resizing to fit terminal dimensions
- No external commands required - pure JavaScript implementation

## Installation
```bash
npm install climg -g
```

## Usage
### Basic Usage
Display an image with default settings (fills terminal width):

```bash
climg image.jpg
```

### Size Options
Set custom width and height using pixels:

```bash
climg image.jpg -w 100 -h 30
```

Set custom width and height using percentages:
```bash
climg image.jpg -w 50% -h 80%
```

Set only width (height will be calculated to maintain aspect ratio):
```bash
climg image.jpg -w 120
```

Set only height (width will be calculated to maintain aspect ratio):

```bash
climg image.jpg -h 40
```

### Color Mode

Disable true color and use 256-color mode instead:
```bash
climg image.jpg -t
```

## Command Line Options

```
Usage: climg <image.png|jpg> [options]

Options:
  -w <size>      Set width in pixels or percentage (e.g., 80 or 50%)
  -h <size>      Set height in pixels or percentage (e.g., 40 or 80%)
  -t             Disable true color, use 256 colors instead
```

## Examples

Display a photo at 75% of terminal width:
```bash
climg photo.jpg -w 75%
```

Display a logo at exact dimensions:
```bash
climg logo.png -w 60 -h 20
```

Display using 256 colors for compatibility:
```bash
climg image.jpg -w 100 -t
```

## How It Works
1. Loading and decoding PNG or JPEG images using `pngjs` and `jpeg-js` libraries
2. Resizing the image to fit the specified or terminal dimensions
3. Converting RGB pixel values to ANSI escape codes
4. Using the half-block character (▀) to display two vertical pixels per character
5. Setting foreground color for the top pixel and background color for the bottom pixel

## Supported Formats

- PNG (.png)
- JPEG (.jpg, .jpeg)

## Terminal Compatibility

Works best with terminals that support true color (24-bit):
- iTerm2 (macOS)
- Windows Terminal
- GNOME Terminal (recent versions)
- Konsole
- Alacritty
- Kitty
- Hyper

For older terminals, use the `-t` flag to enable 256-color mode.

## Requirements

- Node.js (version 10 or higher)
- Terminal with ANSI color support

## API Usage

You can also use climg as a module in your own Node.js programs:

```javascript
import { climg, loadImage, renderImage, ClimgOptions, ImageData } from "climg";

(async () => {
  // Define rendering options (with full IntelliSense)
  const options: ClimgOptions = {
    width: 100,
    height: 30,
    trueColor: true,
  };

  // Display an image directly in the terminal
  await climg("image.jpg", options);

  // Load an image and inspect its pixel data
  const image: ImageData = await loadImage("image.jpg");
  console.log(`Image dimensions: ${image.width}x${image.height}`);

  // Render the image to an ANSI string (instead of printing directly)
  const output: string = renderImage(image.pixels, {
    width: 80,
    trueColor: true,
  });

  // Print the ANSI-rendered image manually
  console.log(output);
})();
```

You can also run it in plain JavaScript (same syntax, just replace import with require).

## Notes

- Size percentages are calculated based on terminal dimensions at runtime
- When only width or height is specified, the aspect ratio is preserved
- Image quality depends on terminal color support and font rendering
- Very large images are automatically scaled down to fit the terminal
