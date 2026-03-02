module.exports = ({ customer, ledger }) => {

const rows = ledger.data.map(row => `
<tr>
  <td class="date">${new Date(row.date).toISOString().split("T")[0]}</td>
  <td class="type">${row.type}</td>
  <td class="ref">${row.refNo}</td>
  <td class="num">${row.debit ? row.debit.toFixed(2) : ""}</td>
  <td class="num">${row.credit ? row.credit.toFixed(2) : ""}</td>
  <td class="num">${row.balance.toFixed(2)}</td>
</tr>
`).join("");

return `
<html>
<head>

<style>

body{
  font-family: Arial, Helvetica, sans-serif;
  padding:40px;
  color:#222;
}

/* HEADER */
.title{
  font-size:24px;
  font-weight:bold;
}

.period{
  margin-top:5px;
  margin-bottom:25px;
}

/* TABLE */
table{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed; /* ⭐ IMPORTANT */
}

thead{
  background:#d9d9d9;
}

th{
  padding:12px;
  text-align:left;
  font-weight:600;
  border-bottom:2px solid #bfbfbf;
}

td{
  padding:12px;
  border-bottom:1px solid #ececec;
  vertical-align:top;
}

/* COLUMN WIDTH FIX */
.date{ width:120px; white-space:nowrap; }
.type{ width:130px; }
.ref{ width:260px; word-break:break-word; }
.num{ width:130px; text-align:right; }

/* ROW STRIPES */
tbody tr:nth-child(even){
  background:#f7f7f7;
}

</style>

</head>

<body>

<div class="title">${customer.company}</div>
<div class="period">${ledger.fromDate} To ${ledger.toDate}</div>

<table>

<thead>
<tr>
  <th>Date</th>
  <th>Type</th>
  <th>Ref No</th>
  <th>Debit</th>
  <th>Credit</th>
  <th>Balance</th>
</tr>
</thead>

<tbody>
${rows}
</tbody>

</table>

</body>
</html>
`;
};