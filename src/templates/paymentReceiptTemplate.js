module.exports = (payment, invoice) => {

  //////////////////////////////////////////////////////
  // CALCULATIONS
  //////////////////////////////////////////////////////
  const payments = invoice.payments || [];

  const totalPaid = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const remaining =
    Number(invoice.grandTotal) - totalPaid;

  let label = "Amount Due";
  let displayAmount = Math.abs(remaining);
  let cssClass = "danger";

  if (remaining < 0) {
    label = "Amount Credited";
    cssClass = "credit";
  } else if (remaining === 0) {
    label = "Settled";
    cssClass = "settled";
  }

  //////////////////////////////////////////////////////
  // SAFE DATE FORMAT
  //////////////////////////////////////////////////////
  const paymentDate = payment.paymentDate
    ? new Date(payment.paymentDate)
        .toISOString()
        .split("T")[0]
    : "";

  const invoiceDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate)
        .toISOString()
        .split("T")[0]
    : "";

  //////////////////////////////////////////////////////
  // TEMPLATE
  //////////////////////////////////////////////////////
  return `
  <html>
  <head>
    <style>
      body {
        font-family: Arial;
        padding:40px;
        color:#333;
      }

      h2 {
        text-align:center;
        margin-bottom:30px;
      }

      .header {
        text-align:right;
      }

      .company {
        font-size:16px;
        font-weight:bold;
      }

      .section {
        margin-top:20px;
      }

      table {
        width:100%;
        border-collapse:collapse;
        margin-top:30px;
      }

      th {
        background:#2f3b4c;
        color:white;
        padding:8px;
        font-size:12px;
      }

      td {
        padding:8px;
        border-bottom:1px solid #ddd;
        font-size:12px;
      }

      .danger { color:red; font-weight:bold; }
      .credit { color:green; font-weight:bold; }
      .settled { color:#2f3b4c; font-weight:bold; }

      .green-box {
        background:#8bc34a;
        color:white;
        padding:15px;
        width:230px;
        margin-top:20px;
      }
    </style>
  </head>

  <body>

    <!-- HEADER -->
    <div class="header">
      <div class="company">
        ${invoice.customer?.company || ""}
      </div>
      <div>
        VAT Number: ${invoice.customer?.vatNumber || "-"}
      </div>
    </div>

    <h2>PAYMENT RECEIPT</h2>

    <!-- BILL TO -->
    <div class="section">
      <strong>Bill To:</strong><br/>
      ${invoice.customer?.name || ""}<br/>
      ${invoice.customer?.email || ""}
    </div>

    <div class="section">
      Payment Date: ${paymentDate}
    </div>

    <!-- TOTAL PAID BOX -->
    <div class="green-box">
      <div>Total Paid</div>
      <h3>$${Number(payment.amount).toFixed(2)}</h3>
    </div>

    <h3>Payment Details</h3>

    <table>
      <thead>
        <tr>
          <th>Invoice Number</th>
          <th>Invoice Date</th>
          <th>Invoice Amount</th>
          <th>Payment Amount</th>
          <th>${label}</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>${invoice.invoiceNumber}</td>
          <td>${invoiceDate}</td>
          <td>$${Number(invoice.grandTotal).toFixed(2)}</td>
          <td>$${Number(payment.amount).toFixed(2)}</td>
          <td class="${cssClass}">
            ${
              label === "Settled"
                ? "Settled"
                : `$${displayAmount.toFixed(2)}`
            }
          </td>
        </tr>
      </tbody>
    </table>

  </body>
  </html>
  `;
};