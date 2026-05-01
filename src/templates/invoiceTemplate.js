module.exports = (invoice, settings = {}) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
*{ box-sizing:border-box; }

body{
  font-family: Arial, Helvetica, sans-serif;
  font-size:12px;
  color:#222;
  margin:0;
  padding:40px;
  background:#fff;
}

.container{ width:100%; }

/* HEADER */
.header{
  display:flex;
  justify-content:space-between;
  border-bottom:1.5px solid #cfcfcf;
  padding-bottom:18px;
  margin-bottom:18px;
}

.logo img{ width:140px; }

.company{ font-size:12px; line-height:1.6; font-weight:600; }

.invoice-title{
  text-align:right;
  color:#1f4e79;
  font-weight:700;
  font-size:28px;
}

.meta{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  background:#f3f3f3;
  border:1px solid #cfcfcf;
  margin-bottom:18px;
}

.meta div{
  padding:10px;
  border-right:1px solid #cfcfcf;
}

.address-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:20px;
  margin-bottom:18px;
}

.box{
  border:1px solid #cfcfcf;
  background:#f6f6f6;
  padding:12px;
}

table{
  width:100%;
  border-collapse:collapse;
}

thead th{
  background:#1f4e79;
  color:#fff;
  padding:10px;
  text-align:center;
}

tbody td{
  padding:9px;
  border-bottom:1px solid #e5e5e5;
  text-align:center;
}

tbody td:nth-child(2){
  text-align:left;
}

.summary{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:20px;
  margin-top:18px;
}

.summary-box{
  background:#f5f5f5;
  border:1px solid #cfcfcf;
  padding:12px;
}

.total-blue{
  background:#1f4e79;
  color:#fff;
  font-weight:bold;
}
</style>
</head>

<body>
<div class="container">

<!-- HEADER -->
<div class="header">
  <div class="logo">
    ${settings.companyLogo ? `<img src="${settings.companyLogo}" />` : ""}
  </div>

  <div class="company">
    <strong>${settings.companyName || "Company"}</strong><br/>
    ${settings.address || ""}<br/>
    ${settings.phone || ""}<br/>
    ${settings.country?.toLowerCase() === 'india' ? 'GST' : 'TRN'}: ${settings.trn || settings.taxNumber || "-"}
  </div>

  <div class="invoice-title">
    TAX INVOICE<br/>
    <span style="font-size:14px">${invoice.invoiceNumber}</span>
  </div>
</div>

<!-- META -->
<div class="meta">
  <div><strong>Date</strong><br/>${new Date(invoice.invoiceDate).toDateString()}</div>
  <div><strong>Due</strong><br/>${invoice.dueDate ? new Date(invoice.dueDate).toDateString() : "-"}</div>
  <div><strong>SO</strong><br/>${invoice.salesOrder?.orderNumber || "-"}</div>
  <div><strong>Terms</strong><br/>${invoice.terms || "-"}</div>
</div>

<!-- BILL -->
<div class="address-row">
  <div class="box">
    <strong>BILL TO</strong><br/>
    ${invoice.customer?.company || "-"}<br/>
    ${invoice.customer?.billingStreet || "-"}<br/>
    ${invoice.customer?.country?.toLowerCase() === 'india' ? 'GST' : 'TRN'}: ${invoice.customer?.vatNumber || "-"}
  </div>

  <div class="box">
    <strong>SHIP TO</strong><br/>
    ${invoice.customer?.company || "-"}<br/>
    ${invoice.customer?.shippingStreet || "-"}
  </div>
</div>

<!-- ITEMS -->
<table>
<thead>
<tr>
<th>#</th>
<th>Description</th>
<th>HSN/SAC</th>
<th>Qty</th>
<th>Rate</th>
<th>Taxes</th>
<th>Tax Amount</th>
<th>Total</th>
</tr>
</thead>

<tbody>
${(invoice.items || []).map((i, idx) => `
<tr>
<td>${idx + 1}</td>
<td>${i.description || "-"}</td>
<td>${i.itemType === 'SERVICE' ? 'SAC:' : 'HSN:'} ${i.hsnSacCode || i.taxCode || "-"}</td>
<td>${i.hours || 0}</td>
<td>${i.rate || 0}</td>

<td>
${(i.taxDetails || [])
  .map(t => `${t.name} (${t.rate}%)`)
  .join("<br/>")}
</td>

<td>
${(i.taxDetails || [])
  .map(t => t.amount)
  .join("<br/>")}
</td>

<td>${i.totalAmount || i.amount || 0}</td>
</tr>
`).join("")}
</tbody>
</table>

<!-- SUMMARY -->
<div class="summary">

  <div class="summary-box">
    <strong>TAX BREAKDOWN</strong><br/><br/>

    ${Object.values(
      (invoice.items || []).flatMap(i => i.taxDetails || [])
        .reduce((acc, t) => {
          const key = `${t.name}_${t.rate}%`;
          acc[key] = acc[key] || { name: t.name, rate: t.rate, amount: 0, count: 0 };
          acc[key].amount += t.amount;
          acc[key].count += 1;
          return acc;
        }, {})
    ).map(t => `${t.name} (${t.rate}%): ${t.amount.toFixed(2)}<br/>`).join("")}

    <br/>
    <strong>ITEMIZED TAX DETAILS:</strong><br/>
    ${(invoice.items || []).map((item, index) => `
      <div style="margin-bottom: 8px; font-size: 11px;">
        <strong>Item ${index + 1}: ${item.description}</strong><br/>
        ${(item.taxDetails || []).map(t => 
          `• ${t.name}: ${t.rate}% on ${item.amount} = ${t.amount.toFixed(2)}`
        ).join('<br/>')}
      </div>
    `).join('')}

  </div>

  <div class="summary-box">
    <table width="100%">
      <tr><td>Subtotal</td><td align="right">${invoice.subtotal || 0}</td></tr>
      <tr><td>Total Tax</td><td align="right">${invoice.totalTax || 0}</td></tr>
      <tr class="total-blue">
        <td>Total</td>
        <td align="right">${invoice.grandTotal || 0}</td>
      </tr>
    </table>
  </div>

</div>

</div>
</body>
</html>
`;