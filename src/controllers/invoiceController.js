const prisma = require("../config/prisma");
const generateInvoicePdf = require("../utils/generateInvoicePdf");
const uploadInvoicePdf = require("../utils/uploadInvoicePdf");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");

//////////////////////////////////////////////////////
// CREATE INVOICE
//////////////////////////////////////////////////////
exports.createInvoice = async (req, res) => {
  console.log("=== CREATE INVOICE CALLED ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  
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

    if (!invoiceDate) {
      return res.status(400).json({ success: false, message: "invoiceDate is required" });
    }

    let finalCustomerId = customerId;
    let finalItems = items;

    // SALES ORDER
    if (salesOrderId) {
      const salesOrder = await prisma.salesOrder.findFirst({
        where: { id: salesOrderId, businessId: req.business.id },
        include: { items: true },
      });

      if (!salesOrder) {
        return res.status(400).json({ success: false, message: "Sales Order not found" });
      }

      const existing = await prisma.invoice.findFirst({ where: { salesOrderId } });

      if (existing) {
        return res.status(400).json({ success: false, message: "Invoice already created" });
      }

      finalCustomerId = salesOrder.customerId;

      finalItems = salesOrder.items.map((item) => ({
        description: item.name,
        hours: item.quantity,
        rate: item.price,
        taxes: [],
      }));
    }

    // CUSTOMER
    const customer = await prisma.customer.findFirst({
      where: { id: finalCustomerId, businessId: req.business.id },
    });

    if (!customer) {
      return res.status(400).json({ success: false, message: "Customer not found" });
    }

    if (!finalItems.length) {
      return res.status(400).json({ success: false, message: "Items required" });
    }

    //////////////////////////////////////////////////////
    // ✅ FETCH BUSINESS SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    // ✅ AUTO DEFAULT LOGIC
    const finalAdminNote =
      adminNote && adminNote.trim() !== ""
        ? adminNote
        : settings?.defaultFooterNote || settings?.footerNote || "Thank you for your business";

    const finalTerms =
      terms && terms.trim() !== ""
        ? terms
        : settings?.defaultTerms || "Payment due within 30 days";

    // ✅ DEFAULT SETTINGS FOR PDF TEMPLATE
    const pdfSettings = settings || {
      companyName: "Your Company",
      companyLogo: null,
      companyAddress: "Your Address",
      companyPhone: "Your Phone",
      companyEmail: "your@email.com",
      website: "yourwebsite.com",
      taxNumber: "Your Tax Number",
      bankName: "Your Bank",
      bankAccount: "Your Account",
      bankIban: "Your IBAN",
      signature: "Your Signature"
    };

    const invoice = await prisma.$transaction(async (tx) => {

      const invoiceNumber = await generateInvoiceNumber(req.business.id);

      let subtotal = 0;
      let totalTax = 0;

      const invoiceItems = finalItems.map((i) => {
        const amount = Number(i.hours) * Number(i.rate);
        subtotal += amount;

        const taxes = i.taxes || [];

        const taxDetails = taxes.map(t => ({
          name: t.name,
          rate: Number(t.rate),
          amount: (amount * Number(t.rate)) / 100,
        }));

        const itemTax = taxDetails.reduce((sum, t) => sum + t.amount, 0);
        totalTax += itemTax;

        // Determine if item is service or goods based on description keywords
        const isService = i.description && (
          i.description.toLowerCase().includes('service') ||
          i.description.toLowerCase().includes('consulting') ||
          i.description.toLowerCase().includes('development') ||
          i.description.toLowerCase().includes('installation') ||
          i.description.toLowerCase().includes('maintenance') ||
          i.description.toLowerCase().includes('support') ||
          i.type === 'SERVICE'
        );

        return {
          description: i.description,
          hsnSacCode: i.hsnSacCode || i.taxCode || null,
          itemType: isService ? 'SERVICE' : 'GOODS',
          hours: Number(i.hours),
          rate: Number(i.rate),
          amount,
          taxDetails,
          totalTax: itemTax,
          totalAmount: amount + itemTax,
        };
      });

      const grandTotal = subtotal + totalTax - Number(discount);

      return tx.invoice.create({
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
          items: { 
          create: invoiceItems.map(item => ({
            description: item.description,
            hsnSacCode: item.hsnSacCode,
            itemType: item.itemType,
            hours: item.hours,
            rate: item.rate,
            amount: item.amount,
            taxDetails: item.taxDetails,
            totalTax: item.totalTax,
            totalAmount: item.totalAmount,
          }))
        },
        },
        include: { customer: true, items: true },
      });
    });

    //////////////////////////////////////////////////////
    // PDF GENERATION
    //////////////////////////////////////////////////////
    let finalInvoice = invoice;

    try {
      console.log("Starting PDF generation for invoice:", invoice.invoiceNumber);
      console.log("About to generate PDF...");
      const pdfBuffer = await generateInvoicePdf(invoice, pdfSettings);
      console.log("PDF generated, buffer type:", typeof pdfBuffer, "size:", pdfBuffer ? pdfBuffer.length : "null");

      console.log("About to upload PDF...");
      const pdfUrl = await uploadInvoicePdf(
        pdfBuffer,
        invoice.invoiceNumber
      );
      console.log("PDF uploaded, URL type:", typeof pdfUrl, "value:", pdfUrl);

      finalInvoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
        include: { customer: true, items: true },
      });
      console.log("Invoice updated with PDF URL");

    } catch (pdfError) {
      console.error("PDF generation failed:", pdfError);
      // Don't return error - still create invoice without PDF
    }

    res.status(201).json({ success: true, data: finalInvoice });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL
//////////////////////////////////////////////////////
exports.getInvoices = async (req, res) => {
  const data = await prisma.invoice.findMany({
    where: { businessId: req.business.id },
    include: { customer: true, items: true },
  });
  res.json({ success: true, data });
};

//////////////////////////////////////////////////////
// GET ONE
//////////////////////////////////////////////////////
exports.getInvoiceById = async (req, res) => {
  const data = await prisma.invoice.findFirst({
    where: { id: req.params.id, businessId: req.business.id },
    include: { customer: true, items: true },
  });

  if (!data) return res.status(404).json({ success: false });

  res.json({ success: true, data });
};

//////////////////////////////////////////////////////
// UPDATE
//////////////////////////////////////////////////////
exports.updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { items = [], discount = 0 } = req.body;

    let subtotal = 0;
    let totalTax = 0;

    const newItems = items.map((i) => {
      const amount = Number(i.hours) * Number(i.rate);
      subtotal += amount;

      const taxes = i.taxes || [];

      const taxDetails = taxes.map(t => ({
        name: t.name,
        rate: Number(t.rate),
        amount: (amount * Number(t.rate)) / 100,
      }));

      const itemTax = taxDetails.reduce((sum, t) => sum + t.amount, 0);
      totalTax += itemTax;

      return {
        invoiceId,
        description: i.description,
        hours: Number(i.hours),
        rate: Number(i.rate),
        amount,
        taxDetails,
        totalTax: itemTax,
        totalAmount: amount + itemTax,
      };
    });

    const grandTotal = subtotal + totalTax - Number(discount);

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
      prisma.invoiceItem.createMany({ data: newItems }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { subtotal, totalTax, discount, grandTotal },
      }),
    ]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// DELETE
//////////////////////////////////////////////////////
exports.deleteInvoice = async (req, res) => {
  const id = req.params.id;

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.delete({ where: { id } }),
  ]);

  res.json({ success: true });
};

//////////////////////////////////////////////////////
// DOWNLOAD PDF
//////////////////////////////////////////////////////
exports.downloadInvoicePdf = async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, businessId: req.business.id },
  });

  if (!invoice?.pdfUrl) {
    return res.status(404).json({ success: false });
  }

  res.redirect(invoice.pdfUrl);
};
//////////////////////////////////////////////////////
// GET ALL
//////////////////////////////////////////////////////
exports.getInvoices = async (req, res) => {
  const data = await prisma.invoice.findMany({
    where: { businessId: req.business.id },
    include: { customer: true, items: true },
  });
  res.json({ success: true, data });
};

//////////////////////////////////////////////////////
// GET ONE
//////////////////////////////////////////////////////
exports.getInvoiceById = async (req, res) => {
  const data = await prisma.invoice.findFirst({
    where: { id: req.params.id, businessId: req.business.id },
    include: { customer: true, items: true },
  });

  if (!data) return res.status(404).json({ success: false });

  res.json({ success: true, data });
};

//////////////////////////////////////////////////////
// UPDATE
//////////////////////////////////////////////////////
exports.updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { items = [], discount = 0 } = req.body;

    let subtotal = 0;
    let totalTax = 0;

    const newItems = items.map((i) => {
      const amount = Number(i.hours) * Number(i.rate);
      subtotal += amount;

      const taxes = i.taxes || [];

      const taxDetails = taxes.map(t => ({
        name: t.name,
        rate: Number(t.rate),
        amount: (amount * Number(t.rate)) / 100,
      }));

      const itemTax = taxDetails.reduce((sum, t) => sum + t.amount, 0);
      totalTax += itemTax;

      return {
        invoiceId,
        description: i.description,
        hours: Number(i.hours),
        rate: Number(i.rate),
        amount,
        taxDetails,
        totalTax: itemTax,
        totalAmount: amount + itemTax,
      };
    });

    const grandTotal = subtotal + totalTax - Number(discount);

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
      prisma.invoiceItem.createMany({ data: newItems }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { subtotal, totalTax, discount, grandTotal },
      }),
    ]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// DELETE
//////////////////////////////////////////////////////
exports.deleteInvoice = async (req, res) => {
  const id = req.params.id;

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.delete({ where: { id } }),
  ]);

  res.json({ success: true });
};

//////////////////////////////////////////////////////
// DOWNLOAD PDF
//////////////////////////////////////////////////////
exports.downloadInvoicePdf = async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, businessId: req.business.id },
  });

  if (!invoice?.pdfUrl) {
    return res.status(404).json({ success: false });
  }

  res.redirect(invoice.pdfUrl);
};