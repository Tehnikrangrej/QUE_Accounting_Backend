const prisma = require("../config/prisma");
const template = require("../templates/creditNoteTemplate");
const generatePdf = require("./generatePdf");
const uploadPdf = require("./uploadPdf");

//////////////////////////////////////////////////////
// GENERATE CREDIT NUMBER
//////////////////////////////////////////////////////
const generateCreditNumber = async (businessId) => {
  const count = await prisma.creditNote.count({
    where: { businessId },
  });

  return `CN-${String(count + 1).padStart(4, "0")}`;
};

//////////////////////////////////////////////////////
// CREATE CREDIT NOTE + PDF
//////////////////////////////////////////////////////
const createCreditNote = async (invoice, extraAmount) => {
  try {

    ////////////////////////////////////////////////////
    // CREATE CREDIT NOTE
    ////////////////////////////////////////////////////
    const creditNumber = await generateCreditNumber(
      invoice.businessId
    );

    const credit = await prisma.creditNote.create({
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
      include: {
        business: true,
        customer: true,
      },
    });

    console.log("✅ Credit created");

    ////////////////////////////////////////////////////
    // CREATE HTML
    ////////////////////////////////////////////////////
    const html = template(
      credit,
      credit.business,
      credit.customer
    );

    ////////////////////////////////////////////////////
    // GENERATE PDF BUFFER
    ////////////////////////////////////////////////////
    const pdfBuffer = await generatePdf(html);

    console.log("✅ PDF generated");

    ////////////////////////////////////////////////////
    // UPLOAD PDF
    ////////////////////////////////////////////////////
    const pdfUrl = await uploadPdf(
      pdfBuffer,
      credit.creditNumber
    );

    console.log("✅ Uploaded:", pdfUrl);

    ////////////////////////////////////////////////////
    // SAVE URL
    ////////////////////////////////////////////////////
    const updated = await prisma.creditNote.update({
      where: { id: credit.id },
      data: { pdfUrl },
    });

    console.log("✅ Credit updated with PDF");

    return updated;

  } catch (error) {
    console.error("❌ CREDIT NOTE PDF ERROR:", error);
  }
};

module.exports = createCreditNote;