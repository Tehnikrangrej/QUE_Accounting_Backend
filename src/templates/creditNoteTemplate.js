module.exports = (credit) => {

  const customer = credit.customer;
  const overpaid = Number(credit.amount || 0);

  // 5% weight deduction
  const weight = overpaid * 0.05;
  const subTotal = overpaid - weight;

  const date = new Date(credit.createdAt)
    .toISOString()
    .split("T")[0];

  //////////////////////////////////////////////////////
  // SINGLE BLANK ITEM ROW (Qty = 1)
  //////////////////////////////////////////////////////
  const rows = `
      <tr>
        <td>1</td>
        <td></td>
        <td>1</td>
        <td>${overpaid.toFixed(2)}</td>
        <td>${overpaid.toFixed(2)}</td>
      </tr>
  `;

  return `
<html>
<head>
<style>
body{font-family:Arial;padding:40px;color:#333;}
.header{text-align:right;}
table{width:100%;border-collapse:collapse;margin-top:30px;}
th{background:#2f3b4c;color:#fff;padding:8px;}
td{padding:8px;border-bottom:1px solid #ddd;text-align:center;}
td:nth-child(2){text-align:left;}
.totals{width:300px;margin-left:auto;margin-top:20px;}
</style>
</head>

<body>

<div class="header">
<h2>CREDIT NOTE</h2>
<div># ${credit.creditNumber}</div>
<div>Credit Note Date: ${date}</div>
</div>

<h3>Bill To</h3>
${customer?.companyName || ""}

<table>
<thead>
<tr>
<th>#</th>
<th>Item</th>
<th>Qty</th>
<th>Rate</th>
<th>Amount</th>
</tr>
</thead>

<tbody>
${rows}
</tbody>
</table>

<div class="totals">
<div>Total Overpaid: ${overpaid.toFixed(2)}</div>
<div>Weight (5%): ${weight.toFixed(2)}</div>
<div><b>Sub Total: ${subTotal.toFixed(2)}</b></div>
<div>Credits Remaining: ${subTotal.toFixed(2)}</div>
</div>

<br/><br/>
Authorized Signature ___________________

</body>
</html>
`;
};