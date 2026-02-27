const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");
const generatePdf = require("./generatePdf");
const creditTemplate = require("../templates/creditNoteTemplate");

module.exports = async ({ invoice, businessId, extraAmount }) => {
  try {

    //////////////////////////////////////////////////////
    // CREDIT NUMBER
    //////////////////////////////////////////////////////
    const count = await prisma.creditNote.count({
      where: { businessId },
    });

    const creditNumber = `CN-${String(count + 1).padStart(4, "0")}`;

    //////////////////////////////////////////////////////
    // CREATE CREDIT NOTE
    //////////////////////////////////////////////////////
    const credit = await prisma.creditNote.create({
      data: {
        businessId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        creditNumber,
        amount: Number(extraAmount),
        remainingAmount: Number(extraAmount),
        reason: "Invoice Overpayment",
        status: "OPEN",
      },
    });

    //////////////////////////////////////////////////////
    // 🔥 FETCH COMPLETE DATA
    //////////////////////////////////////////////////////
    const creditData = await prisma.creditNote.findUnique({
      where: { id: credit.id },
      include: {
        customer: true,
        invoice: {
          include:{
            items: true,
            },
        },
      },
    });

    //////////////////////////////////////////////////////
    // GENERATE PDF
    //////////////////////////////////////////////////////
    const html = creditTemplate(creditData);

    const pdfBuffer = await generatePdf(html);

    //////////////////////////////////////////////////////
    // CLOUDINARY BUFFER UPLOAD (IMPORTANT)
    //////////////////////////////////////////////////////
    const upload = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          public_id: `credit-note-pdfs/${creditNumber}`,
          format: "pdf",
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      stream.end(pdfBuffer);
    });

    //////////////////////////////////////////////////////
    // SAVE URL
    //////////////////////////////////////////////////////
    const updated = await prisma.creditNote.update({
      where: { id: credit.id },
      data: {
        pdfUrl: upload.secure_url,
      },
      include: {
        customer: true,
        invoice: true,
      },
    });

    return updated;

  } catch (error) {
    console.error("Credit Note Creation Error:", error);
    throw new Error("Failed to create credit note");
  }
};