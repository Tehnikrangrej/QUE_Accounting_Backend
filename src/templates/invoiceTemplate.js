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
  font-size:10px;
  color:#000;
  margin:0;
  padding:20px;
}

.container{
  width:100%;
}

/* ================= HEADER ================= */
.header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  border-bottom:1px solid #bcbcbc;
  padding-bottom:8px;
  margin-bottom:10px;
}

.logo img{
  width:110px;
  height:auto;
}

.company{
  font-size:10px;
  line-height:1.35;
  font-weight:bold;
}

.invoice-title{
  text-align:right;
  color:#0a3d91;
  font-weight:bold;
  font-size:30px;
  line-height:1.1;
}

/* ================= META ================= */
.meta{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  border:1px solid #ccc;
  margin-bottom:8px;
}

.meta div{
  padding:6px;
  border-right:1px solid #ccc;
  line-height:1.4;
}
.meta div:last-child{border-right:none;}

/* ================= BILL + SHIP ================= */
.address-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin-bottom:8px;
}

.box{
  border:1px solid #ccc;
  padding:6px;
  line-height:1.4;
}

/* ================= TABLE ================= */
table{
  width:100%;
  border-collapse:collapse;
  margin-top:4px;
}

thead th{
  background:#0a3d91;
  color:#fff;
  font-size:10px;
  padding:5px;
  text-align:center;
}

tbody td{
  border-bottom:1px solid #ddd;
  font-size:10px;
  padding:5px;
  text-align:center;
}

tbody td:nth-child(2){
  text-align:left;
}

/* ================= SUMMARY ================= */
.summary{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin-top:8px;
}

.summary-box{
  border:1px solid #ccc;
  padding:6px;
  background:#fafafa;
  line-height:1.5;
}

.totals table td{
  padding:4px;
  font-size:10px;
}

.total-blue{
  background:#0a3d91;
  color:#fff;
  font-weight:bold;
}

/* ================= WORDS ================= */
.words{
  border:1px solid #ccc;
  margin-top:6px;
  padding:5px;
  font-size:10px;
}

/* ================= BANK ================= */
.bank{
  border:1px solid #ccc;
  margin-top:6px;
  padding:6px;
  line-height:1.4;
}

/* ================= FOOTER ================= */
.signature{
  margin-top:18px;
  text-align:right;
  font-size:10px;
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
