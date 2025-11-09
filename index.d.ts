#!/usr/bin/env node

/**
 * Represents a single pixel with RGBA color values
 */
export interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Represents image data with dimensions and pixel array
 */
export interface ImageData {
  width: number;
  height: number;
  pixels: Pixel[][];
}

/**
 * Options for rendering images to the terminal
 */
export interface RenderOptions {
  /**
   * Width in pixels or percentage (e.g., 80 or "50%")
   */
  width?: number | string;
  
  /**
   * Height in pixels or percentage (e.g., 40 or "80%")
   */
  height?: number | string;
  
  /**
   * Use true color (24-bit RGB) instead of 256 colors
   * @default true
   */
  trueColor?: boolean;
  
  /**
   * Show image and terminal information
   * @default false
   */
  showInfo?: boolean;
}

/**
 * Terminal size information
 */
export interface TerminalSize {
  width: number;
  height: number;
}

/**
 * Get the current terminal size dynamically
 * @returns Terminal width and height
 */
export function getTerminalSize(): TerminalSize;

/**
 * Load an image from a file path (supports PNG and JPEG)
 * @param filepath - Path to the image file
 * @returns Promise resolving to image data with dimensions and pixels
 * @throws Error if file format is unsupported or loading fails
 */
export function loadImage(filepath: string): Promise<ImageData>;

/**
 * Sample a pixel using bilinear interpolation for better quality
 * @param pixels - 2D array of pixels
 * @param x - X coordinate (can be fractional)
 * @param y - Y coordinate (can be fractional)
 * @returns Interpolated pixel color
 */
export function bilinearSample(pixels: Pixel[][], x: number, y: number): Pixel;

/**
 * Resize an image with optional interpolation
 * @param pixels - Original pixel array
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param useInterpolation - Whether to use bilinear interpolation
 * @returns Resized pixel array
 */
export function resizeImage(
  pixels: Pixel[][],
  maxWidth: number,
  maxHeight: number,
  useInterpolation?: boolean
): Pixel[][];

/**
 * Parse size parameter (can be pixels or percentage)
 * @param value - Size value (number or string like "50%")
 * @param max - Maximum value to use for percentage calculations
 * @returns Parsed size in pixels
 */
export function parseSize(value: number | string | undefined, max: number): number;

/**
 * Render image pixels to terminal using ANSI escape codes
 * @param pixels - 2D array of pixels to render
 * @param options - Rendering options
 * @returns ANSI-formatted string ready for terminal output
 */
export function renderImage(pixels: Pixel[][], options?: RenderOptions): string;

/**
 * Convert RGB color to ANSI 256 color code
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns ANSI 256 color code (16-231)
 */
export function rgbToAnsi256(r: number, g: number, b: number): number;

/**
 * Main function to display an image in the terminal
 * @param filepath - Path to the image file (PNG or JPEG)
 * @param options - Rendering options
 * @returns Promise that resolves when image is displayed
 * @throws Error if image cannot be loaded or rendered
 */
export function climg(filepath: string, options?: RenderOptions): Promise<void>;

/**
 * ANSI color codes used throughout the module
 */
export const RED: string;
export const GREEN: string;
export const BLUE: string;
export const CYAN: string;
export const YELLOW: string;
export const BOLD: string;
export const DIM: string;
export const RESET: string;
export const WARNING: string;
export const ERROR: string;
export const SUCCESS: string;
export const POINTER: string;
export const HEAD: string;