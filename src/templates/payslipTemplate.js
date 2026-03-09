module.exports = (payslip, settings) => {

const allowances = payslip.allowanceList || [];
const deductions = payslip.deductionList || [];

const totalAllowance = allowances.reduce(
  (sum,a)=>sum + Number(a.amount || 0),0
);

const totalDeduction = deductions.reduce(
  (sum,d)=>sum + Number(d.amount || 0),0
);

const totalEarnings = payslip.basicSalary + totalAllowance;

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>

body{
font-family:Arial;
padding:40px;
}

.header{
display:flex;
justify-content:space-between;
align-items:center;
}

.logo img{
width:150px;
}

.company{
font-weight:bold;
color:#666;
}

.title{
text-align:center;
font-size:30px;
font-weight:bold;
color:#2f5d8c;
margin:20px 0;
}

.meta{
display:flex;
justify-content:space-between;
margin-bottom:25px;
}

.meta div{
line-height:1.7;
}

table{
width:100%;
border-collapse:collapse;
}

th,td{
border:1px solid #7ea6d9;
padding:8px;
}

th{
background:#5b9bd5;
color:white;
}

.amount{
text-align:right;
}

.total{
font-weight:bold;
}

.footer{
text-align:center;
margin-top:30px;
}

</style>

</head>

<body>

<div class="header">

<div class="company">
${settings?.companyName || ""} – Private & Confidential
</div>

<div class="logo">
${settings?.companyLogo ? `<img src="${settings.companyLogo}" />` : ""}
</div>

</div>

<div class="title">Payslip</div>

<div class="meta">

<div>
<strong>Date :</strong> ${new Date().toLocaleDateString()}<br>
<strong>Pay Period :</strong> ${payslip.month}/${payslip.year}<br>
<strong>Date of Joining :</strong> ${payslip.employee?.joinDate || ""}
</div>

<div>
<strong>Employee ID :</strong> ${payslip.employeeId}<br>
<strong>Employee Name :</strong> ${payslip.employeeName}<br>
<strong>Designation :</strong> ${payslip.employee?.designation || ""}
</div>

</div>

<table>

<tr>
<th>Earnings</th>
<th>Amount (Rs)</th>
<th>Deductions</th>
<th>Amount (Rs)</th>
</tr>

<tr>
<td>Basic Pay</td>
<td class="amount">${payslip.basicSalary}</td>
<td></td>
<td></td>
</tr>

${allowances.map(a=>`
<tr>
<td>${a.name}</td>
<td class="amount">${a.amount}</td>
<td></td>
<td></td>
</tr>
`).join("")}

${deductions.map(d=>`
<tr>
<td></td>
<td></td>
<td>${d.name}</td>
<td class="amount">${d.amount}</td>
</tr>
`).join("")}

<tr class="total">
<td>Total Earnings</td>
<td class="amount">${totalEarnings}</td>
<td>Total Deductions</td>
<td class="amount">${totalDeduction}</td>
</tr>

<tr class="total">
<td colspan="3">Net Pay</td>
<td class="amount">${payslip.netSalary}</td>
</tr>

</table>

<div class="footer">

<strong>Rs ${payslip.netSalary}</strong><br>
Rupees ${payslip.netSalary} Only

<br><br>

<em>
This is a system generated statement and does not require any signature or stamp
</em>

</div>

</body>
</html>
`;
};