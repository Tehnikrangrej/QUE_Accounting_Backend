module.exports = (invoice, settings = {}) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>

*{
  box-sizing:border-box;
}

body{
  font-family: Arial, Helvetica, sans-serif;
  font-size:12px;
  color:#222;
  margin:0;
  padding:40px;
  background:#fff;
}

.container{
  width:100%;
}

/* ================= HEADER ================= */

.header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  border-bottom:1.5px solid #cfcfcf;
  padding-bottom:18px;
  margin-bottom:18px;
}

.logo img{
  width:140px;
}

.company{
  font-size:12px;
  line-height:1.6;
  font-weight:600;
}

.invoice-title{
  text-align:right;
  color:#1f4e79;
  font-weight:700;
  font-size:28px;
}

.invoice-title span{
  font-size:13px;
  font-weight:600;
  color:#1f4e79;
}

/* ================= META ================= */

.meta{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  background:#f3f3f3;
  border:1px solid #cfcfcf;
  margin-bottom:18px;
}

.meta div{
  padding:10px 12px;
  border-right:1px solid #cfcfcf;
}

.meta div:last-child{
  border-right:none;
}

.meta strong{
  color:#1f4e79;
  font-size:11px;
}

/* ================= BILL / SHIP ================= */

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
  line-height:1.6;
}

.box strong{
  color:#1f4e79;
  font-size:12px;
}

/* ================= TABLE ================= */

table{
  width:100%;
  border-collapse:collapse;
}

thead th{
  background:#1f4e79;
  color:#fff;
  font-size:12px;
  padding:10px;
  text-align:center;
}

tbody td{
  padding:9px;
  border-bottom:1px solid #e5e5e5;
  font-size:12px;
  text-align:center;
}

tbody td:nth-child(2){
  text-align:left;
}

/* ================= SUMMARY ================= */

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

.summary-box strong{
  color:#1f4e79;
}

.totals table td{
  padding:7px;
  font-size:12px;
}

.total-blue{
  background:#1f4e79;
  color:#fff;
  font-weight:bold;
}

/* ================= WORDS ================= */

.words{
  border:1px solid #cfcfcf;
  padding:10px;
  margin-top:12px;
  background:#f7f7f7;
}

/* ================= BANK ================= */

.bank{
  border:1px solid #cfcfcf;
  margin-top:18px;
  background:#f5f5f5;
  padding:14px;
  line-height:1.7;
}

.bank strong{
  color:#1f4e79;
}

/* ================= NOTE ================= */

.note{
  border:1px solid #cfcfcf;
  margin-top:12px;
  padding:10px;
  background:#f7f7f7;
}

/* ================= SIGNATURE ================= */

.signature{
  margin-top:60px;
  text-align:right;
  font-size:12px;
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
    TRN: ${settings.trn || "-"}
  </div>

  <div class="invoice-title">
    TAX INVOICE<br/>
    <span style="font-size:14px">${invoice.invoiceNumber}</span>
  </div>

</div>

<!-- META -->
<div class="meta">
  <div>
    <strong>Invoice Date</strong><br/>
    ${new Date(invoice.invoiceDate).toDateString()}
  </div>
  <div>
    <strong>Due Date</strong><br/>
    ${invoice.dueDate ? new Date(invoice.dueDate).toDateString() : "-"}
  </div>
  <div>
    <strong>Terms</strong><br/>
    ${invoice.terms || "-"}
  </div>
</div>

<!-- BILL / SHIP -->
<div class="address-row">
  <div class="box">
    <strong>BILL TO</strong><br/>
    ${invoice.customer?.company || "-"}<br/>
    ${invoice.customer?.billingStreet || "-"}<br/>
    ${invoice.customer?.billingCity || ""}<br/>
    TRN: ${invoice.customer?.vatNumber || "-"}
  </div>

  <div class="box">
    <strong>SHIP TO</strong><br/>
    ${invoice.customer?.company || "-"}<br/>
    ${invoice.customer?.shippingStreet || "-"}<br/>
    ${invoice.customer?.shippingCity || ""}<br/>
    TRN: ${invoice.customer?.vatNumber || "-"}
  </div>
</div>

<!-- ITEMS -->
<table>
<thead>
<tr>
<th>#</th>
<th>Item & Description</th>
<th>Hours</th>
<th>Rate</th>
<th>Tax %</th>
<th>Tax</th>
<th>Amount</th>
</tr>
</thead>
<tbody>
${(invoice.items || []).map((i,idx)=>`
<tr>
<td>${idx+1}</td>
<td>${i.description || "-"}</td>
<td>${i.hours || 0}</td>
<td>${i.rate || 0}</td>
<td>${i.taxPercent || 0}</td>
<td>${i.taxAmount || 0}</td>
<td>${i.amount || 0}</td>
</tr>
`).join("")}
</tbody>
</table>

<!-- SUMMARY -->
<div class="summary">

  <div class="summary-box">
    <strong>TAX SUMMARY</strong><br/><br/>
    Taxable Amount: ${invoice.subtotal || 0}<br/>
    Tax: ${invoice.totalTax || 0}
  </div>

  <div class="summary-box totals">
    <table width="100%">
      <tr><td>Sub Total</td><td align="right">${invoice.subtotal || 0}</td></tr>
      <tr><td>Total Tax</td><td align="right">${invoice.totalTax || 0}</td></tr>
      <tr class="total-blue">
        <td>Total (AED)</td>
        <td align="right">${invoice.grandTotal || 0}</td>
      </tr>
    </table>
  </div>

</div>

<div class="words">
  <strong>Total In Words:</strong> ${invoice.grandTotal || 0} AED only
</div>

<div class="bank">
  <strong>BANK DETAILS</strong><br/><br/>
  Bank Name: ${settings.bankName || "-"}<br/>
  Account Name: ${settings.accountName || "-"}<br/>
  IBAN: ${settings.iban || "-"}<br/>
  Swift: ${settings.swiftCode || "-"}
</div>

<div class="signature">
  _______________________<br/>
  Authorized Signature
</div>

</div>
</body>
</html>
`;
