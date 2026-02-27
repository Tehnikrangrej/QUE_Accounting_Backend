module.exports = (credit) => {

  const amount = Number(credit.amount || 0);

  const date = credit.createdAt
    ? new Date(credit.createdAt).toISOString().split("T")[0]
    : "";

  return `
  <html>
  <body style="font-family:Arial;padding:40px">

    <div style="text-align:right">
      <h2>CREDIT NOTE</h2>
      <div># ${credit.creditNumber || "-"}</div>
      <div>${credit.status || ""}</div>
    </div>

    <div style="margin-top:40px">
      <h3>Bill To</h3>
      ${credit.customer?.companyName || ""}
    </div>

    <p><b>Credit Note Date:</b> ${date}</p>

    <table width="100%" border="0" cellspacing="0" cellpadding="8">
      <thead style="background:#2f3b4c;color:white">
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>1</td>
          <td>${credit.reason}</td>
          <td>1</td>
          <td>${amount.toFixed(2)}</td>
          <td>${amount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div style="width:300px;margin-left:auto;margin-top:30px">
      <div>Sub Total ${amount.toFixed(2)}</div>
      <div>Tax 0.00</div>
      <div><b>Total ${amount.toFixed(2)}</b></div>
      <div>Credits Remaining ${Number(
        credit.remainingAmount || 0
      ).toFixed(2)}</div>
    </div>

    <div style="margin-top:60px">
      Authorized Signature ____________________
    </div>

  </body>
  </html>
  `;
};