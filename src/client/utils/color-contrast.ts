/**
 * Color contrast utilities for WCAG-compliant text rendering
 * Based on WCAG 2.1 relative luminance formula
 */

import Phaser from 'phaser';

/**
 * Calculate relative luminance per WCAG formula
 * @param hexColor - Hex color string (e.g., "#D2691E" or "D2691E")
 * @returns Relative luminance (0-1 range, 0=black, 1=white)
 */
export function calculateLuminance(hexColor: string): number {
  // Ensure hex string has # prefix
  const hex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;

  const color = Phaser.Display.Color.HexStringToColor(hex);
  const r = color.red / 255;
  const g = color.green / 255;
  const b = color.blue / 255;

  // Apply sRGB gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance (ITU-R BT.709 coefficients)
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Get contrasting text color (black or white) for optimal readability
 * @param bgColor - Background hex color
 * @returns "#000000" for bright backgrounds, "#FFFFFF" for dark backgrounds
 */
export function getContrastingTextColor(bgColor: string): string {
  const luminance = calculateLuminance(bgColor);
  // Use black text on bright backgrounds (L > 0.5), white text on dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
