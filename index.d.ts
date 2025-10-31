/**
 * climg - Render PNG and JPEG images beautifully in your terminal
 * using ANSI colors and Unicode blocks.
 * 
 * https://github.com/TonyGeez/climg
 */

export interface Pixel {
  /** Red channel (0–255) */
  r: number;
  /** Green channel (0–255) */
  g: number;
  /** Blue channel (0–255) */
  b: number;
  /** Alpha channel (0–255) */
  a: number;
}

export interface ImageData {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** 2D pixel matrix (rows × columns) */
  pixels: Pixel[][];
}

export interface ClimgOptions {
  /** Width in pixels (number) or percentage (string like "50%") */
  width?: number | string;
  /** Height in pixels (number) or percentage (string like "80%") */
  height?: number | string;
  /** Use 24-bit true color. Default: true */
  trueColor?: boolean;
}

/**
 * Load a PNG or JPEG image and return structured pixel data.
 * @param filepath Path to image (PNG or JPEG)
 */
export function loadImage(filepath: string): Promise<ImageData>;

/**
 * Render pixel data into an ANSI-colored terminal string.
 * @param pixels 2D pixel matrix (from loadImage)
 * @param options Optional rendering options
 */
export function renderImage(pixels: Pixel[][], options?: ClimgOptions): string;

/**
 * Display a PNG or JPEG file directly in the terminal.
 * @param filepath Path to image (PNG or JPEG)
 * @param options Optional rendering options
 */
export function climg(filepath: string, options?: ClimgOptions): Promise<void>;
