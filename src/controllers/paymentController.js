const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const createCreditNote = require("../utils/createCreditNote");

const generatePaymentPdf = require("../utils/generatePaymentPdf");
const uploadPaymentPdf = require("../utils/uploadPaymentPdf");

//////////////////////////////////////////////////////
// CREATE PAYMENT
//////////////////////////////////////////////////////
exports.createPayment = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const { invoiceId } = req.params;

    const {
      amount,
      paymentDate,
      paymentMode,
      transactionId,
      note,
    } = req.body;

    ////////////////////////////////////////////////////
    // GET INVOICE
    ////////////////////////////////////////////////////
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: {
        payments: true,
        customer: true,
        items: true,
      },
    });

    if (!invoice) {
      return errorResponse(res, "Invoice not found", 404);
    }

    ////////////////////////////////////////////////////
    // CALCULATIONS
    ////////////////////////////////////////////////////
    const previousPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const remaining =
      Number(invoice.grandTotal || 0) - previousPaid;

    ////////////////////////////////////////////////////
    // PAYMENT NUMBER
    ////////////////////////////////////////////////////
    const lastPayment = await prisma.payment.findFirst({
      where: { businessId },
      orderBy: { paymentNumber: "desc" },
      select: { paymentNumber: true },
    });

    let paymentNumber = "P-001";

    if (lastPayment?.paymentNumber) {
      const lastNumber = parseInt(lastPayment.paymentNumber.split("-")[1]);
      paymentNumber = `P-${String(lastNumber + 1).padStart(3, "0")}`;
    }

    ////////////////////////////////////////////////////
    // CREATE PAYMENT
    ////////////////////////////////////////////////////
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId,
        businessId,
        amount: Number(amount || 0),
        paymentDate: new Date(paymentDate),
        paymentMode,
        transactionId,
        note,
        createdBy: userId,
      },
    });

    ////////////////////////////////////////////////////
    // CREDIT NOTE
    ////////////////////////////////////////////////////
    let creditNote = null;

    if (Number(amount) > remaining) {
      creditNote = await createCreditNote({
        invoice,
        businessId,
        extraAmount: Number(amount) - remaining,
      });
    }

    ////////////////////////////////////////////////////
    // UPDATE STATUS
    ////////////////////////////////////////////////////
    const totalPaid = previousPaid + Number(amount || 0);

    let status = "UNPAID";
    if (totalPaid < Number(invoice.grandTotal || 0))
      status = "PARTIALLY_PAID";
    else status = "PAID";

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    ////////////////////////////////////////////////////
    // REFRESH INVOICE (🔥 FIXED)
    ////////////////////////////////////////////////////
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        grandTotal: true, // ✅ IMPORTANT
        customer: true,
        payments: true,
      },
    });

    ////////////////////////////////////////////////////
    // GENERATE PDF (🔥 FIXED + DEBUG)
    ////////////////////////////////////////////////////
    let finalPayment = payment;

    try {
      console.log("👉 Generating PDF...");

      const settings = await prisma.settings.findUnique({
        where: { businessId },
      });

      const pdfBuffer = await generatePaymentPdf(
        payment,
        updatedInvoice,
        settings
      );

      console.log("✅ PDF Generated");

      const pdfUrl = await uploadPaymentPdf(pdfBuffer, payment.id);

      console.log("✅ Uploaded:", pdfUrl);

      finalPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: { pdfUrl },
      });

    } catch (err) {
      console.error("🔥 PDF ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "PDF generation failed",
        error: err.message,
      });
    }

    ////////////////////////////////////////////////////
    // RESPONSE
    ////////////////////////////////////////////////////
    return successResponse(
      res,
      {
        payment: finalPayment,
        creditNote,
      },
      "Payment recorded successfully"
    );

  } catch (error) {
    console.error(error);
    return errorResponse(res, "Internal server error", 500);
  }
};
//////////////////////////////////////////////////////
// GET PAYMENTS BY INVOICE
//////////////////////////////////////////////////////
exports.getInvoicePayments = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const payments = await prisma.payment.findMany({
      where: {
        invoiceId,
        businessId: req.business.id,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, payments);

  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// DOWNLOAD PAYMENT PDF
//////////////////////////////////////////////////////
exports.downloadPaymentPdf = async (req, res) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!payment?.pdfUrl) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    const downloadUrl = payment.pdfUrl.replace(
      "/upload/",
      "/upload/fl_attachment/"
    );

    return res.redirect(downloadUrl);

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// GET ALL PAYMENTS
//////////////////////////////////////////////////////
exports.getPayments = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await prisma.payment.findMany({
      where: { businessId },

      //////////////////////////////////////////////////
      // ⭐ SELECT INSTEAD OF INCLUDE
      //////////////////////////////////////////////////
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMode: true,
        transactionId: true,
        note: true,
        pdfUrl: true,
        createdBy: true,
        createdAt: true,

        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customer: {
              select: {
                company: true,
              },
            },

            ////////////////////////////////////////////
            // CREDIT NOTES ONLY HERE
            ////////////////////////////////////////////
            creditNotes: {
              select: {
                id: true,
                creditNumber: true,
                amount: true,
                status: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: Number(limit),
    });

    res.json({
      success: true,
      data: payments,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};