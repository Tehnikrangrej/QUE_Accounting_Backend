module.exports = async (tx, businessId) => {

  // get last invoice of this business
  const lastInvoice = await tx.invoice.findFirst({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;

  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastNumber = parseInt(
      lastInvoice.invoiceNumber.split("-")[1]
    );

    nextNumber = lastNumber + 1;
  }

  // generate new invoice number
  return `INV-${String(nextNumber).padStart(4, "0")}`;
};