module.exports = (payslip, settings) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>

body{
  font-family: Arial;
  padding:40px;
}

.header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:20px;
}

.logo img{
  width:140px;
}

.title{
  text-align:center;
  font-size:24px;
  font-weight:bold;
}

.meta{
  margin-bottom:20px;
  line-height:1.6;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  border:1px solid #ccc;
  padding:8px;
  text-align:left;
}

th{
  background:#f2f2f2;
}

.total{
  font-weight:bold;
}

</style>
</head>

<body>

<div class="header">
  <div class="logo">
    ${settings.companyLogo ? `<img src="${settings.companyLogo}" />` : ""}
  </div>

  <div>
    <strong>${settings.companyName || ""}</strong><br/>
    ${settings.address || ""}
  </div>
</div>

<div class="title">
Payslip
</div>

<div class="meta">

Employee Name : ${payslip.employeeName}<br/>
Pay Period : ${payslip.month}/${payslip.year}<br/>

</div>

<table>

<tr>
<th>Earnings</th>
<th>Amount</th>
<th>Deductions</th>
<th>Amount</th>
</tr>

<tr>
<td>Basic Salary</td>
<td>${payslip.basicSalary}</td>
<td></td>
<td></td>
</tr>

<tr>
<td>Allowance</td>
<td>${payslip.allowance}</td>
<td></td>
<td></td>
</tr>

<tr>
<td></td>
<td></td>
<td>Deduction</td>
<td>${payslip.deduction}</td>
</tr>

<tr class="total">
<td>Total</td>
<td>${payslip.basicSalary + payslip.allowance}</td>
<td>Total Deduction</td>
<td>${payslip.deduction}</td>
</tr>

<tr class="total">
<td colspan="3">Net Salary</td>
<td>${payslip.netSalary}</td>
</tr>

</table>

</body>
</html>
`;