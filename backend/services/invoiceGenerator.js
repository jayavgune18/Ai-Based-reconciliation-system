const PDFDocument = require('pdfkit');

class InvoiceGenerator {
  /**
   * Generates a beautifully styled, corporate Tax Invoice PDF
   * @param {Object} invoice - Invoice document
   * @param {Object} user - User document
   * @param {Object} subscription - Subscription document
   * @param {res} res - Express response stream
   */
  static generateInvoicePdf(invoice, user, subscription, res) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set headers for inline display or download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`
    );

    doc.pipe(res);

    const primaryColor = '#0f172a'; // slate-900
    const accentColor = '#0284c7';  // sky-600
    const subtleColor = '#64748b';  // slate-500
    const lightBg = '#f8fafc';      // slate-50
    const borderColor = '#e2e8f0';  // slate-200
    const emeraldGreen = '#059669'; // emerald-600

    // ── 1. HEADER & BRANDING ──
    doc.rect(0, 0, 595.28, 8).fill(accentColor); // Top accent stripe

    doc.fillColor(primaryColor)
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('ANTIGRAVITY RECON', 40, 40);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(subtleColor)
       .text('AI-Powered Financial Reconciliation & Risk Audit Platform', 40, 66)
       .text('Antigravity Financial Technologies Pvt. Ltd.', 40, 78)
       .text('GSTIN: 27AABCA1234F1Z5 | Corporate CIN: U72200MH2024PTC123456', 40, 90)
       .text('Email: billing@antigravityrecon.com | Web: https://antigravityrecon.com', 40, 102);

    // INVOICE BADGE & NUMBER (Right Side)
    doc.fillColor(primaryColor)
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('TAX INVOICE', 380, 40, { align: 'right' });

    doc.rect(450, 68, 105, 20).fill(lightBg);
    doc.strokeColor(borderColor).rect(450, 68, 105, 20).stroke();
    doc.fillColor(primaryColor)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text(invoice.invoiceNumber, 455, 74, { width: 95, align: 'center' });

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(subtleColor)
       .text(`Date of Issue: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 380, 94, { align: 'right' })
       .text(`Status: `, 480, 106, { align: 'right' });

    doc.font('Helvetica-Bold')
       .fillColor(invoice.status === 'paid' ? emeraldGreen : '#dc2626')
       .text(invoice.status.toUpperCase(), 520, 106, { align: 'right' });

    doc.moveTo(40, 125).lineTo(555, 125).strokeColor(borderColor).stroke();

    // ── 2. BILL TO & INVOICE DETAILS CARDS ──
    const billToY = 140;

    // Bill To Card
    doc.rect(40, billToY, 250, 90).fill(lightBg);
    doc.strokeColor(borderColor).rect(40, billToY, 250, 90).stroke();

    doc.fillColor(primaryColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('BILLED TO:', 52, billToY + 10);

    const clientName = invoice.customerDetails?.name || user?.name || 'Valued Customer';
    const clientEmail = invoice.customerDetails?.email || user?.email || 'customer@recon.com';
    const clientContact = invoice.customerDetails?.contact || 'N/A';
    const clientCompany = invoice.customerDetails?.company || 'Authorized Enterprise Account';

    doc.fillColor(primaryColor)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text(clientName, 52, billToY + 26);

    doc.font('Helvetica')
       .fillColor(subtleColor)
       .text(clientCompany, 52, billToY + 38)
       .text(`Email: ${clientEmail}`, 52, billToY + 50)
       .text(`Contact: ${clientContact}`, 52, billToY + 62);

    // Subscription & Billing Cycle Card
    doc.rect(305, billToY, 250, 90).fill(lightBg);
    doc.strokeColor(borderColor).rect(305, billToY, 250, 90).stroke();

    doc.fillColor(primaryColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('SUBSCRIPTION DETAILS:', 317, billToY + 10);

    const periodStart = invoice.billingPeriod?.start
      ? new Date(invoice.billingPeriod.start).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');
    const periodEnd = invoice.billingPeriod?.end
      ? new Date(invoice.billingPeriod.end).toLocaleDateString('en-IN')
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(primaryColor)
       .text(`Plan: `, 317, billToY + 26, { continued: true })
       .font('Helvetica-Bold')
       .text(`${invoice.planName} (${(invoice.billingCycle || 'monthly').toUpperCase()})`)
       .font('Helvetica')
       .fillColor(subtleColor)
       .text(`Billing Period: ${periodStart} - ${periodEnd}`, 317, billToY + 40)
       .text(`Payment Gateway: Razorpay Checkout (Secure)`, 317, billToY + 54)
       .text(`Payment ID: ${invoice.razorpayPaymentId || 'pay_verified'}`, 317, billToY + 68);

    // ── 3. LINE ITEMS TABLE ──
    const tableY = 245;

    // Header Row
    doc.rect(40, tableY, 515, 24).fill(primaryColor);
    doc.fillColor('#ffffff')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('#', 50, tableY + 7, { width: 20 })
       .text('DESCRIPTION & SPECIFICATION', 80, tableY + 7, { width: 230 })
       .text('CYCLE', 320, tableY + 7, { width: 60, align: 'center' })
       .text('TAX RATE', 390, tableY + 7, { width: 60, align: 'right' })
       .text('AMOUNT (INR)', 460, tableY + 7, { width: 85, align: 'right' });

    // Item Row 1
    const rowY = tableY + 24;
    doc.rect(40, rowY, 515, 45).fill('#ffffff');
    doc.strokeColor(borderColor).rect(40, rowY, 515, 45).stroke();

    doc.fillColor(primaryColor)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('1', 50, rowY + 10, { width: 20 })
       .text(`${invoice.planName} Subscription`, 80, rowY + 10, { width: 230 });

    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(subtleColor)
       .text(`AI automated reconciliation ledger sync, fraud detection & audit exports.`, 80, rowY + 24, { width: 230 });

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(primaryColor)
       .text((invoice.billingCycle || 'monthly').toUpperCase(), 320, rowY + 12, { width: 60, align: 'center' })
       .text(`${invoice.taxRatePercentage || 18}% GST`, 390, rowY + 12, { width: 60, align: 'right' })
       .font('Helvetica-Bold')
       .text(`Rs. ${Number(invoice.subtotal || invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 460, rowY + 12, { width: 85, align: 'right' });

    // ── 4. SUMMARY / TAX COMPUTATION ──
    const summaryY = rowY + 55;
    const summaryX = 330;
    const summaryW = 225;

    doc.rect(summaryX, summaryY, summaryW, 110).fill(lightBg);
    doc.strokeColor(borderColor).rect(summaryX, summaryY, summaryW, 110).stroke();

    const subtotal = invoice.subtotal || Math.round((invoice.amount / 1.18) * 100) / 100;
    const taxAmount = invoice.taxAmount || Math.round((invoice.amount - subtotal) * 100) / 100;
    const cgst = Math.round((taxAmount / 2) * 100) / 100;
    const sgst = cgst;

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(subtleColor)
       .text('Subtotal:', summaryX + 15, summaryY + 12)
       .text(`Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 110, summaryY + 12, { width: 100, align: 'right' })

       .text('CGST (9%):', summaryX + 15, summaryY + 28)
       .text(`Rs. ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 110, summaryY + 28, { width: 100, align: 'right' })

       .text('SGST (9%):', summaryX + 15, summaryY + 44)
       .text(`Rs. ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 110, summaryY + 44, { width: 100, align: 'right' });

    doc.moveTo(summaryX + 10, summaryY + 62).lineTo(summaryX + summaryW - 10, summaryY + 62).strokeColor(borderColor).stroke();

    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor(primaryColor)
       .text('Total Amount Paid:', summaryX + 15, summaryY + 74)
       .fillColor(accentColor)
       .text(`Rs. ${Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 110, summaryY + 74, { width: 100, align: 'right' });

    // ── 5. PAYMENT VERIFICATION STAMP ──
    const stampY = summaryY;
    doc.rect(40, stampY, 260, 110).fill(lightBg);
    doc.strokeColor(borderColor).rect(40, stampY, 260, 110).stroke();

    doc.fillColor(primaryColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('PAYMENT VERIFICATION', 52, stampY + 12);

    doc.font('Helvetica')
       .fontSize(8)
       .fillColor(subtleColor)
       .text('This invoice confirms that the full subscription amount was processed and cryptographically verified via Razorpay Payment Gateway.', 52, stampY + 28, { width: 236 })
       .text(`Method: ${(invoice.method || 'UPI/Card').toUpperCase()}`, 52, stampY + 58)
       .text(`Order ID: ${invoice.razorpayOrderId || 'N/A'}`, 52, stampY + 70)
       .text(`Paid Timestamp: ${new Date(invoice.paidAt || Date.now()).toLocaleString('en-IN')}`, 52, stampY + 82);

    // ── 6. FOOTER & NOTES ──
    const footerY = 510;
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderColor).stroke();

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(subtleColor)
       .text('Notes & Terms:', 40, footerY + 12)
       .text('1. Subscriptions auto-renew unless cancelled before the renewal date inside your ReconSystem Dashboard.', 40, footerY + 24)
       .text('2. This is a computer-generated official tax invoice and does not require a physical signature.', 40, footerY + 36)
       .text('3. For billing support, write to support@antigravityrecon.com or access Settings > Subscriptions.', 40, footerY + 48);

    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Authorized Signatory', 440, footerY + 40, { align: 'right' })
       .font('Helvetica')
       .fillColor(subtleColor)
       .text('Antigravity Financial Technologies', 440, footerY + 52, { align: 'right' });

    // Bottom accent stripe
    doc.rect(0, 834, 595.28, 8).fill(primaryColor);

    doc.end();
  }
}

module.exports = InvoiceGenerator;
