module.exports = (invoice, settings = {}) => {
  const template = invoice.designTemplate || "modern";
  
  // Helper to format currency
  const fmt = (val) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Determine dynamic headers based on item types
  const hasGoods = (invoice.items || []).some(i => i.itemType === 'GOODS');
  const hasServices = (invoice.items || []).some(i => i.itemType === 'SERVICE');
  
  let hsnHeader = "HSN/SAC";
  let qtyHeader = "Qty/Hrs";
  
  if (hasGoods && !hasServices) {
    hsnHeader = "HSN";
    qtyHeader = "Qty";
  } else if (!hasGoods && hasServices) {
    hsnHeader = "SAC";
    qtyHeader = "Hours";
  }

  // Collect all unique taxes across items for the breakdown
  const taxSummary = {};
  const itemizedTaxes = [];

  (invoice.items || []).forEach((item, idx) => {
    const taxes = item.taxDetails || [];
    const itemTaxes = [];
    
    taxes.forEach(t => {
      if (!taxSummary[t.name]) taxSummary[t.name] = 0;
      taxSummary[t.name] += Number(t.amount);
      
      itemTaxes.push({
        name: t.name,
        rate: t.rate,
        amount: t.amount,
        base: Number(item.hours) * Number(item.rate)
      });
    });

    itemizedTaxes.push({
      index: idx + 1,
      description: item.description,
      taxes: itemTaxes
    });
  });

  const taxBreakdownHtml = `
    <div style="background:#f8f9fa; border:1px solid #eee; padding:10px; font-size: 9px;">
      <div style="font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:5px; margin-bottom:10px; text-transform:uppercase;">Tax Breakdown</div>
      ${Object.entries(taxSummary).map(([name, amt]) => `
        <div style="margin-bottom:3px;">${name}: ${invoice.currency} ${fmt(amt)}</div>
      `).join('')}
      <div style="margin-top:10px; font-weight:bold; border-top:1px solid #ddd; padding-top:5px;">ITEMIZED TAX DETAILS:</div>
      ${itemizedTaxes.map(item => `
        <div style="margin-top:5px; font-size:8px; border-bottom:1px dashed #eee; padding-bottom:3px;">
          <strong>Item ${item.index}: ${item.description}</strong><br/>
          ${item.taxes.map(t => `• ${t.name} (${t.rate}%): ${invoice.currency} ${fmt(t.amount)} (on ${fmt(t.base)})`).join('<br/>')}
        </div>
      `).join('')}
    </div>
  `;

  const bankDetailsHtml = `
    <div style="background:#f8f9fa; border:1px solid #eee; padding:12px; margin-top:15px; width: 100%;">
      <div style="color:#1f4e79; font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase;">Bank Details</div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div>
          <strong>Bank Name:</strong> ${settings.bankName || '-'}<br/>
          <strong>Account Name:</strong> ${settings.accountName || '-'}
        </div>
        <div>
          <strong>IBAN:</strong> ${settings.accountNumber || settings.iban || '-'}<br/>
          <strong>Swift:</strong> ${settings.swiftCode || '-'}
        </div>
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; }
  html, body { height: 100%; margin: 0; padding: 0; }
  body{ font-family: 'Helvetica', 'Arial', sans-serif; font-size:10px; color:#222; background:#fff; width: 210mm; min-height: 297mm; display: flex; flex-direction: column; }
  .page-wrapper { flex: 1; display: flex; flex-direction: column; width: 100%; }
  .content-padding { padding: 30px; flex: 1; display: flex; flex-direction: column; }
  
  table { width:100%; border-collapse:collapse; margin-bottom:15px; }
  th { padding:8px; background:#f4f4f4; border:1px solid #ddd; text-align:left; font-size:9px; text-transform:uppercase; color: #444; }
  td { padding:8px; border:1px solid #ddd; vertical-align:top; }
  .text-right { text-align:right; }
  .text-center { text-align:center; }
  .bold { font-weight:bold; }
  
  /* MODERN DESIGN */
  .design-modern .header { display:grid; grid-template-columns: 1fr 1.2fr 1fr; align-items:start; border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:15px; }
  .design-modern .invoice-title { color:#1f4e79; font-size:24px; font-weight:900; }
  .design-modern .info-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background:#ddd; border:1px solid #ddd; margin-bottom:15px; }
  .design-modern .info-box { background:#f8f9fa; padding:8px; }
  .design-modern .info-box label { display:block; color:#222; font-weight:bold; margin-bottom:4px; font-size:9px; }
  .design-modern .address-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom:15px; }
  .design-modern .address-box { background:#f8f9fa; border:1px solid #eee; padding:10px; }
  .design-modern .address-box label { color:#1f4e79; font-weight:bold; display:block; border-bottom:1px solid #ddd; padding-bottom:5px; margin-bottom:8px; }
  .design-modern th { background:#1f4e79; color:#fff; border:1px solid #1f4e79; }
  
  /* CLASSIC DESIGN */
  .design-classic .top-bar { background:#1f4e79; color:#fff; padding:35px 40px; display:flex; justify-content:space-between; align-items:center; }
  .design-classic .top-bar h1 { font-size:40px; margin:0; text-transform:uppercase; font-weight: 900; letter-spacing: -1px; }
  .design-classic .logo-container { background: #fff; padding: 8px; border-radius: 4px; display: inline-block; margin-bottom: 10px; }
  .design-classic th { background:#1f4e79; color:#fff; border:none; }
  .design-classic .footer-bar { background:#1f4e79; color:#fff; text-align:center; padding:12px; font-size: 10px; margin-top: auto; }
  
  /* MINIMAL DESIGN */
  .design-minimal .box-grid { display:grid; grid-template-columns:1fr 1fr; border:1.5px solid #000; margin-bottom:20px; }
  .design-minimal .box-grid > div { padding:15px; border:0.75px solid #000; }
  .design-minimal th, .design-minimal td { border:1.5px solid #000; }
  .design-minimal th { background:#fff; color:#000; font-weight: 900; }

  .summary-table { width: 100%; border:none; }
  .summary-table td { border: none; border-bottom: 1px solid #eee; padding: 6px 10px; }
  .summary-table .total-row { background:#1f4e79; color:#fff; font-size: 12px; }
  
  .spacer { flex: 1; min-height: 20px; }
  .signature-box { text-align: right; margin-top: 30px; }
  .signature-box img { max-width: 150px; max-height: 70px; margin-bottom: 5px; }
  .signature-line { border-top: 2.5px solid #000; display: inline-block; width: 220px; padding-top: 8px; text-align: center; }
</style>
</head>

<body class="design-${template}">

<div class="page-wrapper">

  ${template === 'modern' ? `
    <div class="content-padding">
      <div class="header">
        <div>
          ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-height:80px;" />` : ''}
        </div>
        <div class="text-center">
          <div class="bold" style="font-size:14px;">${settings.companyName}</div>
          <div style="color:#444; margin-top:3px; font-size:10px;">${settings.address || ''}<br/>${settings.phone || ''}<br/>TRN: ${settings.trn || ''}</div>
        </div>
        <div class="text-right">
          <div class="invoice-title">TAX INVOICE</div>
          <div class="bold" style="font-size:11px; margin-top:5px; color:#1f4e79;">${invoice.invoiceNumber}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box"><label>Date</label>${new Date(invoice.invoiceDate).toDateString()}</div>
        <div class="info-box"><label>Due</label>${invoice.dueDate ? new Date(invoice.dueDate).toDateString() : '-'}</div>
        <div class="info-box"><label>SO</label>${invoice.poNumber || '-'}</div>
        <div class="info-box"><label>Terms</label>${invoice.terms || 'Payment due within 30 days'}</div>
      </div>

      <div class="address-grid">
        <div class="address-box">
          <label>BILL TO</label>
          <div class="bold">${invoice.customer?.company || ''}</div>
          <div style="margin-top:5px; line-height:1.4; color:#444;">
            ${invoice.customer?.billingStreet || ''}<br/>
            ${invoice.customer?.billingCity || ''}, ${invoice.customer?.billingCountry || ''}<br/>
            TRN: ${invoice.customer?.vatNumber || ''}
          </div>
        </div>
        <div class="address-box">
          <label>SHIP TO</label>
          <div class="bold">${invoice.customer?.company || ''}</div>
          <div style="margin-top:5px; line-height:1.4; color:#444;">
            ${invoice.customer?.shippingStreet || invoice.customer?.billingStreet || ''}<br/>
            ${invoice.customer?.shippingCity || ''}, ${invoice.customer?.billingCountry || ''}<br/>
            TRN: ${invoice.customer?.vatNumber || ''}
          </div>
        </div>
      </div>
  ` : ''}

  ${template === 'classic' ? `
    <div class="top-bar">
      <h1>Invoice</h1>
      <div style="text-align:right">
        ${settings.companyLogo ? `<div class="logo-container"><img src="${settings.companyLogo}" style="height:40px; display:block;" /></div>` : ''}
        <div style="font-size:14px; font-weight:bold;">${settings.companyName}</div>
        <div style="opacity:0.8; font-size:10px;">${settings.address || ''}<br/>${settings.phone || ''}</div>
      </div>
    </div>
    <div class="content-padding">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
        <div>
          <div class="section-title" style="color:#1f4e79; font-weight:bold; border-bottom:2px solid #eee; margin-bottom:10px;">Billing Details</div>
          <div style="font-size:12px; font-weight:bold;">${invoice.customer?.company || ''}</div>
          <div style="color:#555; margin-top:5px; line-height:1.4;">
            ${invoice.customer?.billingStreet || ''}<br/>
            ${invoice.customer?.billingCity || ''}, ${invoice.customer?.billingCountry || ''}<br/>
            Phone: ${invoice.customer?.phone || ''}
          </div>
        </div>
        <div class="text-right">
          <div class="section-title" style="color:#1f4e79; font-weight:bold; border-bottom:2px solid #eee; margin-bottom:10px;">Invoice Info</div>
          <div style="color:#555; line-height:1.4;">
            <strong>No:</strong> ${invoice.invoiceNumber}<br/>
            <strong>Date:</strong> ${new Date(invoice.invoiceDate).toDateString()}<br/>
            <strong>Currency:</strong> ${invoice.currency}
          </div>
        </div>
      </div>
  ` : ''}

  ${template === 'minimal' ? `
    <div class="content-padding">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
         <div>
           ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-height:60px; margin-bottom:10px;" />` : ''}
           <h1 style="font-size:36px; margin:0; font-weight:900;">INVOICE</h1>
         </div>
         <div class="text-right">
           <div style="font-size:14px; font-weight:900;">${settings.companyName}</div>
           <div style="color:#666;">${settings.address || ''}</div>
         </div>
      </div>
      <div class="box-grid">
        <div><strong>BILL TO:</strong><br/>${invoice.customer?.company || ''}<br/>${invoice.customer?.billingStreet || ''}</div>
        <div><strong>INVOICE INFO:</strong><br/>No: ${invoice.invoiceNumber}<br/>Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}</div>
      </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th width="30" class="text-center">#</th>
        <th>Description</th>
        <th width="80" class="text-center">${hsnHeader}</th>
        <th width="50" class="text-center">${qtyHeader}</th>
        <th width="80" class="text-center">Rate</th>
        <th width="90" class="text-center">Taxes</th>
        <th width="80" class="text-center">Tax Amount</th>
        <th width="90" class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${(invoice.items || []).map((i, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${i.description}</td>
        <td class="text-center">${i.hsnSacCode || '-'}</td>
        <td class="text-center">${i.hours}</td>
        <td class="text-center">${fmt(i.rate)}</td>
        <td class="text-center" style="font-size:8px;">${(i.taxDetails || []).map(t => `${t.name} (${t.rate}%)`).join('<br/>')}</td>
        <td class="text-center">${fmt(i.totalTax)}</td>
        <td class="text-right">${fmt(i.totalAmount)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 10px;">
    <div>
      ${taxBreakdownHtml}
      ${bankDetailsHtml}
      <div style="margin-top:20px; color:#666; font-size:9px; line-height:1.4;">
        <strong>Terms:</strong> ${invoice.terms || settings.defaultTerms || 'Standard terms apply.'}<br/>
        ${invoice.adminNote || ''}
      </div>
    </div>
    <div style="display:flex; flex-direction:column;">
      <div style="border:1px solid #eee; padding:0;">
        <table class="summary-table" style="margin:0;">
          <tr><td>Subtotal</td><td class="text-right">${invoice.currency} ${fmt(invoice.subtotal)}</td></tr>
          <tr><td>Total Tax</td><td class="text-right">${invoice.currency} ${fmt(invoice.totalTax)}</td></tr>
          <tr class="total-row"><td class="bold">Total</td><td class="text-right bold">${invoice.currency} ${fmt(invoice.grandTotal)}</td></tr>
        </table>
      </div>
      
      <div class="spacer"></div>
      
      <div class="signature-box">
        ${settings.signatureUrl ? `<img src="${settings.signatureUrl}" />` : '<div style="height:60px;"></div>'}
        <div class="signature-line">
          <div class="bold" style="font-size:11px;">Authorized Signature</div>
        </div>
      </div>
    </div>
  </div>

  ${template === 'classic' ? `</div><div class="footer-bar">Professional Invoice generated by ${settings.companyName}</div>` : ''}
  ${template !== 'classic' ? `</div>` : ''}

</div>

</body>
</html>
`;
};