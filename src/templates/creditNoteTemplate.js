module.exports = (credit, business, customer) => `
<html>
<body style="font-family:Arial;padding:40px">

<h2>CREDIT NOTE</h2>

<p><b>${business.name}</b></p>

<hr/>

<p><b>Credit Number:</b> ${credit.creditNumber}</p>
<p><b>Date:</b> ${new Date().toDateString()}</p>

<h3>Customer</h3>
<p>${customer.company}</p>

<table border="1" width="100%" cellpadding="10">
<tr>
<th>Description</th>
<th>Amount</th>
</tr>

<tr>
<td>${credit.reason}</td>
<td>${credit.amount}</td>
</tr>

</table>

<h2>Total Credit: ${credit.amount}</h2>

</body>
</html>
`;