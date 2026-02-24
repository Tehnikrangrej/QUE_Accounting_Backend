const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");
const createCreditNote = require("../utils/createCreditNote");

//////////////////////////////////////////////////////
// CREATE PAYMENT
//////////////////////////////////////////////////////
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
    // GET INVOICE + EXISTING PAYMENTS
    ////////////////////////////////////////////////////
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: { payments: true },
    });

    if (!invoice) {
      return errorResponse(res, "Invoice not found", 404);
    }

    ////////////////////////////////////////////////////
    // CALCULATE PREVIOUS PAYMENTS
    ////////////////////////////////////////////////////
    const previousPaid = invoice.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const remainingBeforePayment =
      invoice.grandTotal - previousPaid;

    ////////////////////////////////////////////////////
    // CREATE PAYMENT
    ////////////////////////////////////////////////////
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        businessId,
        amount,
        createdBy: userId,
        paymentDate: new Date(paymentDate),
        paymentMode,
        transactionId,
        note,
      },
    });

    ////////////////////////////////////////////////////
    // CREDIT NOTE LOGIC (CORRECT)
    ////////////////////////////////////////////////////
    let extraAmount = 0;

    if (amount > remainingBeforePayment) {
      extraAmount = amount - remainingBeforePayment;
    }

    if (extraAmount > 0) {
      await createCreditNote(invoice, extraAmount);
    }

    ////////////////////////////////////////////////////
    // CALCULATE NEW TOTAL PAID
    ////////////////////////////////////////////////////
    const newTotalPaid = previousPaid + amount;

    ////////////////////////////////////////////////////
    // UPDATE INVOICE STATUS
    ////////////////////////////////////////////////////
    let status = "UNPAID";

    if (newTotalPaid === 0) {
      status = "UNPAID";
    } else if (newTotalPaid < invoice.grandTotal) {
      status = "PARTIALLY_PAID";
    } else {
      status = "PAID";
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    return successResponse(res, payment, "Payment recorded");
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
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, payments);
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error", 500);
  }
};