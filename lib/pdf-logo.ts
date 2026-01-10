// Loanease Logo utilities for PDF generation
// Brand color: #00D37F (green)

import fs from 'fs';
import path from 'path';

export const LOANCASE_BRAND_COLOR = {
  r: 0,
  g: 211,
  b: 127,
  hex: '#00D37F'
};

// Logo dimensions for PDF (width in mm)
export const LOGO_WIDTH = 40;
export const LOGO_HEIGHT = 13;

// Function to draw the Loanease logo as styled text in the brand color (fallback)
export function drawLoaneaseLogo(
  doc: any,
  x: number,
  y: number,
  options?: { fontSize?: number }
): void {
  const fontSize = options?.fontSize || 24;

  // Set brand color and font
  doc.setTextColor(LOANCASE_BRAND_COLOR.r, LOANCASE_BRAND_COLOR.g, LOANCASE_BRAND_COLOR.b);
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');

  // Draw the logo text
  doc.text('Loanease', x, y);

  // Reset to defaults
  doc.setFont('helvetica', 'normal');
}

// Function to add the actual Loanease logo image to the PDF
export function addLoaneaseLogoImage(
  doc: any,
  x: number,
  y: number,
  options?: { width?: number; height?: number }
): boolean {
  try {
    // Default dimensions (maintaining aspect ratio)
    const width = options?.width || 35;
    const height = options?.height || 12;

    // Read logo file from public directory
    const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');

    if (!fs.existsSync(logoPath)) {
      console.warn('Logo file not found at:', logoPath);
      return false;
    }

    const logoData = fs.readFileSync(logoPath);
    const base64Logo = logoData.toString('base64');
    const logoDataUrl = `data:image/jpeg;base64,${base64Logo}`;

    // Add image to PDF
    doc.addImage(logoDataUrl, 'JPEG', x, y, width, height);

    return true;
  } catch (error) {
    console.error('Error adding logo image to PDF:', error);
    return false;
  }
}
