const prisma = require("../config/prisma");
const generateInvoicePdf = require("../utils/generateInvoicePdf");
const uploadInvoicePdf = require("../utils/uploadInvoicePdf");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");

//////////////////////////////////////////////////////
// CREATE INVOICE
//////////////////////////////////////////////////////
exports.createInvoice = async (req, res) => {
  try {
    const {
      customerId,
      invoiceDate,
      dueDate,
      currency = "AED",
      poNumber,
      poDate,
      adminNote,
      terms,
      discount = 0,
      items = [],
    } = req.body;

    if (!customerId || !invoiceDate || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerId, invoiceDate and items are required",
      });
    }

    //////////////////////////////////////////////////////
    // CREATE INVOICE (TRANSACTION)
    //////////////////////////////////////////////////////
    const invoice = await prisma.$transaction(async (tx) => {

      const invoiceNumber = await generateInvoiceNumber(
        tx,
        req.business.id
      );

      let subtotal = 0;
      let totalTax = 0;

      const invoiceItems = items.map((i) => {
        const hours = Number(i.hours);
        const rate = Number(i.rate);

        const amount = hours * rate;
        const taxAmount = (amount * Number(i.taxPercent || 0)) / 100;

        subtotal += amount;
        totalTax += taxAmount;

        return {
          description: i.description,
          hours,
          rate,
          taxPercent: Number(i.taxPercent || 0),
          taxAmount,
          amount,
        };
      });

      const grandTotal = subtotal + totalTax - Number(discount);

      return tx.invoice.create({
        data: {
          businessId: req.business.id,
          customerId,
          invoiceNumber,

          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,

          currency,
          poNumber,
          poDate: poDate ? new Date(poDate) : null,

          adminNote,
          terms,

          subtotal,
          totalTax,
          discount,
          grandTotal,

          items: { create: invoiceItems },
        },
        include: { customer: true, items: true },
      });
    });
    //////////////////////////////////////////////////////
    // PDF GENERATION + CLOUDINARY UPLOAD
    //////////////////////////////////////////////////////
    let finalInvoice = invoice;

    try {
      const settings = await prisma.settings.findUnique({
        where: { businessId: req.business.id },
      });

      const pdfBuffer = await generateInvoicePdf(invoice, settings);

      const pdfUrl = await uploadInvoicePdf(
        pdfBuffer,
        invoice.invoiceNumber
      );

      // 🔥 UPDATE & RETURN UPDATED DATA
      finalInvoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
        include: { customer: true, items: true },
      });

    } catch (pdfError) {
      console.error("PDF generation failed:", pdfError);
    }

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    return res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: finalInvoice,
    });

  } catch (error) {
    console.error("createInvoice error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL INVOICES
//////////////////////////////////////////////////////
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { businessId: req.business.id },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: invoices });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE INVOICE
//////////////////////////////////////////////////////
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
      include: { customer: true, items: true },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.json({ success: true, data: invoice });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE STATUS
//////////////////////////////////////////////////////
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: {
        id_businessId: {
          id: req.params.id,
          businessId: req.business.id,
        },
      },
      data: { status: req.body.status },
    });

    res.json({ success: true, data: invoice });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// DELETE INVOICE
//////////////////////////////////////////////////////
exports.deleteInvoice = async (req, res) => {
  try {
    await prisma.invoice.delete({
      where: {
        id_businessId: {
          id: req.params.id,
          businessId: req.business.id,
        },
      },
    });

    res.json({
      success: true,
      message: "Invoice deleted",
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// DOWNLOAD PDF
//////////////////////////////////////////////////////
exports.downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!invoice?.pdfUrl) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    const downloadUrl = invoice.pdfUrl.replace(
      "/upload/",
      "/upload/fl_attachment/"
    );

    return res.redirect(downloadUrl);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
