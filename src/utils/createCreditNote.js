const prisma = require("../config/prisma");

const generateCreditNumber = async (businessId) => {
  const count = await prisma.creditNote.count({
    where: { businessId },
  });

  return `CN-${String(count + 1).padStart(4, "0")}`;
};

const createCreditNote = async (invoice, extraAmount) => {
  const creditNumber = await generateCreditNumber(
    invoice.businessId
  );

  return await prisma.creditNote.create({
    data: {
      businessId: invoice.businessId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      creditNumber,
      amount: extraAmount,
      remainingAmount: extraAmount,
      reason: "Invoice Overpayment",
      status: "OPEN",
    },
  });
};

module.exports = createCreditNote;