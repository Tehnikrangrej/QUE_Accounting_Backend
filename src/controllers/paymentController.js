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
    // GET FULL INVOICE WITH PAYMENTS + CUSTOMER
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
    // CALCULATE PREVIOUS PAYMENTS
    ////////////////////////////////////////////////////
    const previousPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    const remainingBeforePayment =
      Number(invoice.grandTotal) - previousPaid;

    ////////////////////////////////////////////////////
    // CREATE PAYMENT
    ////////////////////////////////////////////////////
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        businessId,
        amount: Number(amount),
        createdBy: userId,
        paymentDate: new Date(paymentDate),
        paymentMode,
        transactionId,
        note,
      },
    });

    ////////////////////////////////////////////////////
    // CREDIT NOTE LOGIC (CORRECT FORMULA)
    ////////////////////////////////////////////////////
    let creditNote = null;

    if (Number(amount) > remainingBeforePayment) {
      const extraAmount =
        Number(amount) - remainingBeforePayment;

      creditNote = await createCreditNote({
        invoice, // full invoice with customer
        businessId,
        extraAmount,
      });
    }

    ////////////////////////////////////////////////////
    // UPDATE INVOICE STATUS
    ////////////////////////////////////////////////////
    const newTotalPaid =
      previousPaid + Number(amount);

    let status = "UNPAID";

    if (newTotalPaid < invoice.grandTotal) {
      status = "PARTIALLY_PAID";
    } else {
      status = "PAID";
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    ////////////////////////////////////////////////////
    // REFRESH INVOICE AFTER PAYMENT
    ////////////////////////////////////////////////////
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        customer: true,
      },
    });

    ////////////////////////////////////////////////////
    // GENERATE PAYMENT PDF (USING UPDATED DATA)
    ////////////////////////////////////////////////////
    let finalPayment = payment;

    try {
      const settings = await prisma.settings.findUnique({
        where: { businessId },
      });

      const pdfBuffer = await generatePaymentPdf(
        payment,
        updatedInvoice,
        settings
      );

      const pdfUrl = await uploadPaymentPdf(
        pdfBuffer,
        payment.id
      );

      finalPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: { pdfUrl },
      });

    } catch (pdfError) {
      console.error("Payment PDF generation failed:", pdfError);
    }

    ////////////////////////////////////////////////////
    // RESPONSE
    ////////////////////////////////////////////////////
    return successResponse(
      res,
      {
        payment: finalPayment,
        creditNote: creditNote
          ? {
              ...creditNote,
              downloadUrl: `${req.protocol}://${req.get(
                "host"
              )}/api/credit-notes/${creditNote.id}/download`,
            }
          : null,
      },
      "Payment recorded"
    );

  } catch (error) {
    console.error("Payment Error:", error);
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
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customer: {
              select: {
                company: true,
              },
            },

            //////////////////////////////////////////////////
            // ⭐ CREDIT NOTES FROM INVOICE
            //////////////////////////////////////////////////
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