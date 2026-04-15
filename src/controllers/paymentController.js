const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const createCreditNote = require("../utils/createCreditNote");
const generateCreditNumber = require("../utils/generateCreditNumber");

const generatePaymentPdf = require("../utils/generatePaymentPdf"); // invoice
const generateBillPaymentPdf = require("../utils/generateBillPaymentPdf"); // bill

const uploadPaymentPdf = require("../utils/uploadPaymentPdf");

//////////////////////////////////////////////////////
// CREATE PAYMENT (INVOICE + BILL)
//////////////////////////////////////////////////////
exports.createPayment = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;

    const { invoiceId, billId } = req.params;

    const {
      amount,
      paymentDate,
      paymentMode,
      transactionId,
      note,
    } = req.body;

//////////////////////////////////////////////////////
// 🔥 BILL PAYMENT (UPDATED & FIXED)
//////////////////////////////////////////////////////
if (billId) {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, businessId },
    include: { payments: true, vendor: true },
  });

  if (!bill) {
    return errorResponse(res, "Bill not found", 404);
  }

  ////////////////////////////////////////////////////
  // ❌ PREVENT PAYMENT IF BILL IS ALREADY PAID
  ////////////////////////////////////////////////////
  if (bill.status === "PAID") {
    return errorResponse(res, "Bill is already paid", 400);
  }

  ////////////////////////////////////////////////////
  // CALCULATIONS (FIXED)
  ////////////////////////////////////////////////////
  const previousPaid = bill.payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const currentAmount = Number(amount || 0);

  const totalPaid = previousPaid + currentAmount;

  const billTotal = Number(bill.totalAmount || 0);

  const remaining = billTotal - totalPaid;

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
  let payment = await prisma.payment.create({
    data: {
      paymentNumber,
      billId,
      businessId,
      amount: currentAmount,
      paymentDate: new Date(paymentDate),
      paymentMode,
      transactionId,
      note,
      createdBy: userId,
    },
  });

  ////////////////////////////////////////////////////
  // GENERATE BILL PAYMENT PDF
  ////////////////////////////////////////////////////
  const settings = await prisma.settings.findUnique({
    where: { businessId },
  });

  const pdfBuffer = await generateBillPaymentPdf(payment, bill, settings);

  const pdfUrl = await uploadPaymentPdf(pdfBuffer, payment.id);

  payment = await prisma.payment.update({
    where: { id: payment.id },
    data: { pdfUrl },
  });

  ////////////////////////////////////////////////////
  // CREDIT NOTE (ONLY IF OVERPAYMENT)
  ////////////////////////////////////////////////////
  let creditNote = null;

  if (totalPaid > billTotal) {
    const extraAmount = totalPaid - billTotal;

    const creditNumber = await generateCreditNumber(
      businessId,
      "BILL"
    );

    creditNote = await prisma.creditNote.create({
      data: {
        business: {
          connect: { id: businessId },
        },
        vendor: {
          connect: { id: bill.vendorId },
        },
        creditNumber,
        type: "BILL",
        amount: extraAmount,
        remainingAmount: extraAmount,
        reason: "Overpayment from bill",
        status: "OPEN",
      },
    });
  }

  ////////////////////////////////////////////////////
  // UPDATE BILL STATUS
  ////////////////////////////////////////////////////
  let status = "UNPAID";

  if (totalPaid === 0) {
    status = "UNPAID";
  } else if (totalPaid < billTotal) {
    status = "PARTIALLY_PAID";
  } else {
    status = "PAID"; // includes overpayment
  }

  await prisma.bill.update({
    where: { id: billId },
    data: { status },
  });

  ////////////////////////////////////////////////////
  // RESPONSE
  ////////////////////////////////////////////////////
  return successResponse(
    res,
    {
      payment,
      remaining: Math.max(billTotal - totalPaid, 0),
      creditNote,
    },
    "Bill payment recorded successfully"
  );
}
    ////////////////////////////////////////////////////
    // 🔥 INVOICE PAYMENT
    ////////////////////////////////////////////////////

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: { payments: true, customer: true, items: true },
    });

    if (!invoice) {
      return errorResponse(res, "Invoice not found", 404);
    }

    const previousPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const remaining =
      Number(invoice.grandTotal || 0) - previousPaid;

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
    let payment = await prisma.payment.create({
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
    // CREDIT NOTE (INVOICE)
    ////////////////////////////////////////////////////
    let creditNote = null;

    if (Number(amount) > remaining) {
      creditNote = await createCreditNote({
        invoice,
        businessId,
        extraAmount: Number(amount) - remaining,
        type: "INVOICE",
      });
    }

    ////////////////////////////////////////////////////
    // UPDATE INVOICE STATUS
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
    // GENERATE INVOICE PAYMENT PDF
    ////////////////////////////////////////////////////
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        grandTotal: true,
        customer: true,
        payments: true,
      },
    });

    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    const pdfBuffer2 = await generatePaymentPdf(
      payment,
      updatedInvoice,
      settings
    );

    const pdfUrl2 = await uploadPaymentPdf(pdfBuffer2, payment.id);

    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { pdfUrl: pdfUrl2 },
    });

    return successResponse(
      res,
      { payment, creditNote },
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
      where: { invoiceId, businessId: req.business.id },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, payments);

  } catch (err) {
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// 🔥 GET PAYMENTS BY BILL (NEW)
//////////////////////////////////////////////////////
exports.getBillPayments = async (req, res) => {
  try {
    const { billId } = req.params;

    const payments = await prisma.payment.findMany({
      where: { billId, businessId: req.business.id },
      orderBy: { createdAt: "desc" },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            vendor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return successResponse(res, payments);

  } catch (err) {
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// GET ALL PAYMENTS (UPDATED WITH BILL)
//////////////////////////////////////////////////////
exports.getPayments = async (req, res) => {
  try {
    const businessId = req.business.id;

    const payments = await prisma.payment.findMany({
      where: { businessId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            vendor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: payments,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
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
// 