const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// CREATE PAYMENT
//////////////////////////////////////////////////////
exports.createPayment = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { invoiceId } = req.params;

    const {
      amount,
      paymentDate,
      paymentMode,
      transactionId,
      note,
    } = req.body;

    ////////////////////////////////////////////////////
    // CHECK INVOICE
    ////////////////////////////////////////////////////
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId,
      },
    });

    if (!invoice) {
      return errorResponse(res, "Invoice not found", 404);
    }

    ////////////////////////////////////////////////////
    // CREATE PAYMENT
    ////////////////////////////////////////////////////
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        businessId,
        amount,
        paymentDate: new Date(paymentDate),
        paymentMode,
        transactionId,
        note,
      },
    });

    ////////////////////////////////////////////////////
    // UPDATE INVOICE STATUS
    ////////////////////////////////////////////////////
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID" },
    });

    return successResponse(res, payment, "Payment recorded");
  } catch (error) {
    console.error("Payment Error:", error); // 👈 IMPORTANT
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