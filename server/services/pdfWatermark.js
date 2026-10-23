'use strict';
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');

// Footer template: use {{member_name}}, {{member_id}}, {{access_datetime}}
const FOOTER_LINE1 = process.env.PDF_FOOTER_LINE1 ||
  'Licensed to: {{member_name}} | Member ID: {{member_id}} | SAP Security Expert';
const FOOTER_LINE2 = process.env.PDF_FOOTER_LINE2 ||
  '© SAP Security Expert | For individual use only | Accessed: {{access_datetime}}';
const WATERMARK_TEMPLATE = process.env.PDF_WATERMARK_TEXT ||
  'LICENSED TO: {{member_name}} • {{member_id}} • SAP SECURITY EXPERT';

function fill(tpl, vars) {
  return tpl
    .replace(/\{\{member_name\}\}/g, vars.member_name)
    .replace(/\{\{member_id\}\}/g, String(vars.member_id))
    .replace(/\{\{access_datetime\}\}/g, vars.access_datetime);
}

/**
 * Take a PDF buffer and inject a per-member footer + diagonal watermark.
 * Returns a new Buffer with the personalized PDF.
 */
async function personalizePdf(pdfBuffer, member) {
  const vars = {
    member_name: sanitize(member.name || 'Member'),
    member_id: member.id || '?',
    access_datetime: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
  };

  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const footerL1 = fill(FOOTER_LINE1, vars);
  const footerL2 = fill(FOOTER_LINE2, vars);
  const watermarkText = fill(WATERMARK_TEMPLATE, vars);

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerSize = 7;
    const footerMargin = 8;
    const footerY2 = footerMargin;
    const footerY1 = footerY2 + footerSize + 2;

    // White backing strip so footer is readable on any page colour
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: footerY1 + footerSize + 4,
      color: rgb(1, 1, 1),
      opacity: 0.75,
    });

    page.drawText(footerL1, {
      x: footerMargin,
      y: footerY1,
      size: footerSize,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(footerL2, {
      x: footerMargin,
      y: footerY2,
      size: footerSize,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    // ── Diagonal watermark ────────────────────────────────────────────────────
    const wmSize = Math.min(width, height) * 0.032;
    const wmWidth = helveticaBold.widthOfTextAtSize(watermarkText, wmSize);
    page.drawText(watermarkText, {
      x: (width - wmWidth) / 2,
      y: (height - wmSize) / 2,
      size: wmSize,
      font: helveticaBold,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.18,
      rotate: degrees(35),
    });

    // Second watermark at 45° offset for difficult-to-crop coverage
    page.drawText(watermarkText, {
      x: width * 0.05,
      y: height * 0.15,
      size: wmSize * 0.8,
      font: helveticaBold,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.12,
      rotate: degrees(35),
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Strip characters that could break PDF text rendering
function sanitize(str) {
  return String(str).replace(/[\x00-\x1f\x7f-\x9f]/g, '').slice(0, 100);
}

module.exports = { personalizePdf };
