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
      salesOrderId,
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

    //////////////////////////////////////////////////////
    // BASIC VALIDATION
    //////////////////////////////////////////////////////
    if (!invoiceDate) {
      return res.status(400).json({
        success: false,
        message: "invoiceDate is required",
      });
    }

    let finalCustomerId = customerId;
    let finalItems = items;

    //////////////////////////////////////////////////////
    // HANDLE SALES ORDER
    //////////////////////////////////////////////////////
    if (salesOrderId) {
      const salesOrder = await prisma.salesOrder.findFirst({
        where: {
          id: salesOrderId,
          businessId: req.business.id,
        },
        include: { items: true },
      });

      if (!salesOrder) {
        return res.status(400).json({
          success: false,
          message: "Sales Order not found",
        });
      }

      const existing = await prisma.invoice.findFirst({
        where: { salesOrderId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Invoice already created for this Sales Order",
        });
      }

      finalCustomerId = salesOrder.customerId;

      finalItems = salesOrder.items.map((item) => ({
        description: item.name,
        hours: item.quantity,
        rate: item.price,
        taxPercent: 0,
      }));
    }

    //////////////////////////////////////////////////////
    // VALIDATE CUSTOMER
    //////////////////////////////////////////////////////
    const customer = await prisma.customer.findFirst({
      where: {
        id: finalCustomerId,
        businessId: req.business.id,
      },
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Customer not found",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE ITEMS
    //////////////////////////////////////////////////////
    if (!finalItems || finalItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items are required",
      });
    }

    //////////////////////////////////////////////////////
    // SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    const finalAdminNote =
      adminNote && adminNote.trim() !== ""
        ? adminNote
        : settings?.defaultFooterNote || null;

    const finalTerms =
      terms && terms.trim() !== ""
        ? terms
        : settings?.defaultTerms || null;

    //////////////////////////////////////////////////////
    // TRANSACTION
    //////////////////////////////////////////////////////
    const invoice = await prisma.$transaction(async (tx) => {

      const invoiceNumber = await generateInvoiceNumber(req.business.id);

      let subtotal = 0;
      let totalTax = 0;

      const invoiceItems = finalItems.map((i) => {
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

      //////////////////////////////////////////////////////
      // CREATE INVOICE
      //////////////////////////////////////////////////////
      const created = await tx.invoice.create({
        data: {
          businessId: req.business.id,
          customerId: finalCustomerId,
          salesOrderId,

          invoiceNumber,

          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,

          currency,
          poNumber,
          poDate: poDate ? new Date(poDate) : null,

          adminNote: finalAdminNote,
          terms: finalTerms,

          subtotal,
          totalTax,
          discount,
          grandTotal,

          items: { create: invoiceItems },
        },
        include: { customer: true, items: true, salesOrder: true },
      });

      //////////////////////////////////////////////////////
      // 🔥 ACCOUNTING (ADDED)
      //////////////////////////////////////////////////////
      const accounts = await tx.account.findMany({
        where: {
          businessId: req.business.id,
          name: { in: ["Cash", "Sales", "Tax Payable"] },
        },
      });

      const cash = accounts.find((a) => a.name === "Cash");
      const sales = accounts.find((a) => a.name === "Sales");
      const tax = accounts.find((a) => a.name === "Tax Payable");

      if (!cash || !sales) {
        throw new Error("Required accounts not found (Cash / Sales)");
      }

      const journalEntries = [
        {
          accountId: cash.id,
          debit: grandTotal,
        },
        {
          accountId: sales.id,
          credit: subtotal,
        },
      ];

      if (totalTax > 0 && tax) {
        journalEntries.push({
          accountId: tax.id,
          credit: totalTax,
        });
      }

      await Promise.all(
        journalEntries.map((entry) =>
          tx.journalEntry.create({
            data: {
              ...entry,
              businessId: req.business.id,
              description: `Invoice ${invoiceNumber}`,
            },
          })
        )
      );

      //////////////////////////////////////////////////////
      // UPDATE SALES ORDER
      //////////////////////////////////////////////////////
      if (salesOrderId) {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: "Completed" },
        });
      }

      return created;
    });

    //////////////////////////////////////////////////////
    // PDF GENERATION
    //////////////////////////////////////////////////////
    let finalInvoice = invoice;

    try {
      const pdfBuffer = await generateInvoicePdf(invoice, settings);

      const pdfUrl = await uploadInvoicePdf(
        pdfBuffer,
        invoice.invoiceNumber
      );

      finalInvoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
        include: { customer: true, items: true, salesOrder: true },
      });

    } catch (pdfError) {
      console.error("PDF ERROR:", pdfError);
    }

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
      include: { customer: true, items: true, salesOrder: true},
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
      include: { customer: true, items: true, salesOrder: true },
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
exports.updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { items = [], discount = 0, ...invoiceData } = req.body;

    const invoice = await prisma.$transaction(async (tx) => {

      //////////////////////////////////////////////////////
      // 1️⃣ CALCULATE ITEMS + TOTALS
      //////////////////////////////////////////////////////
      let subtotal = 0;
      let totalTax = 0;

      const newItems = items.map((i) => {
        const hours = Number(i.hours);
        const rate = Number(i.rate);

        const amount = hours * rate;
        const taxAmount =
          (amount * Number(i.taxPercent || 0)) / 100;

        subtotal += amount;
        totalTax += taxAmount;

        return {
          invoiceId,
          description: i.description,
          hours,
          rate,
          taxPercent: Number(i.taxPercent || 0),
          taxAmount,
          amount,
        };
      });

      const grandTotal = subtotal + totalTax - Number(discount);

      //////////////////////////////////////////////////////
      // 2️⃣ UPDATE INVOICE
      //////////////////////////////////////////////////////
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...invoiceData,

          invoiceDate: invoiceData.invoiceDate
            ? new Date(invoiceData.invoiceDate)
            : undefined,

          dueDate: invoiceData.dueDate
            ? new Date(invoiceData.dueDate)
            : undefined,

          poDate: invoiceData.poDate
            ? new Date(invoiceData.poDate)
            : undefined,

          discount: Number(discount),
          subtotal,
          totalTax,
          grandTotal,
        },
      });

      //////////////////////////////////////////////////////
      // 3️⃣ REPLACE ITEMS
      //////////////////////////////////////////////////////
      if (items.length > 0) {

        // delete old items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId },
        });

        // create new items
        await tx.invoiceItem.createMany({
          data: newItems,
        });
      }

      //////////////////////////////////////////////////////
      // 4️⃣ RETURN UPDATED DATA
      //////////////////////////////////////////////////////
      return tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          items: true,
          salesOrder: true,
        },
      });
    });

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    res.json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });

  } catch (error) {
    console.error("updateInvoice error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//////////////////////////////////////////////////////
// DELETE INVOICE
//////////////////////////////////////////////////////
exports.deleteInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({
        where: { invoiceId },
      }),

      prisma.invoice.delete({
        where: { id: invoiceId },
      }),
    ]);

    res.json({
      success: true,
      message: "Invoice deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
