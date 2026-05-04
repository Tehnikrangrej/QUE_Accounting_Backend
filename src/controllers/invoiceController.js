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
      currency,
      poNumber,
      poDate,
      adminNote,
      terms,
      discount = 0,
      items = [],
      designTemplate = "modern",
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

    // ✅ CURRENCY LOGIC: Body > Settings > Default AED
    const finalCurrency = currency || settings?.currency || "AED";

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
      accountName: "Your Account Name",
      iban: "Your IBAN",
      swiftCode: "Your SWIFT",
      signatureUrl: null
    };

    const invoice = await prisma.$transaction(async (tx) => {

      const invoiceNumber = await generateInvoiceNumber(req.business.id);

      let subtotal = 0;
      let totalTax = 0;

      const invoiceItems = finalItems.map((i) => {
        const amount = Number(i.hours) * Number(i.rate);
        subtotal += amount;

        const taxes = i.taxes || i.taxDetails || [];

        const taxDetails = taxes.map(t => ({
          name: t.name,
          rate: Number(t.rate),
          amount: (amount * Number(t.rate)) / 100,
        }));

        const itemTax = taxDetails.reduce((sum, t) => sum + t.amount, 0);
        totalTax += itemTax;

        return {
          description: i.description,
          hsnSacCode: i.hsnSacCode || i.sacCode || i.taxCode || null,
          itemType: i.type || i.itemType || 'GOODS',
          hours: Number(i.hours),
          rate: Number(i.rate),
          amount,
          taxDetails,
          totalTax: itemTax,
          totalAmount: amount + itemTax,
        };
      });

      console.log("Mapped invoice items for saving:", JSON.stringify(invoiceItems, null, 2));

      const grandTotal = subtotal + totalTax - Number(discount);

      return tx.invoice.create({
        data: {
          businessId: req.business.id,
          customerId: finalCustomerId,
          salesOrderId,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          currency: finalCurrency,
          poNumber,
          poDate: poDate ? new Date(poDate) : null,
          adminNote: finalAdminNote,
          terms: finalTerms,
          designTemplate,
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
      const pdfBuffer = await generateInvoicePdf(invoice, pdfSettings);
      
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(
          pdfBuffer,
          invoice.invoiceNumber
        );

        finalInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
          include: { customer: true, items: true },
        });
      }
    } catch (pdfError) {
      console.error("PDF generation failed:", pdfError);
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
  try {
    const data = await prisma.invoice.findMany({
      where: { businessId: req.business.id },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET ONE
//////////////////////////////////////////////////////
exports.getInvoiceById = async (req, res) => {
  try {
    const data = await prisma.invoice.findFirst({
      where: { id: req.params.id, businessId: req.business.id },
      include: { customer: true, items: true },
    });

    if (!data) return res.status(404).json({ success: false, message: "Invoice not found" });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE
//////////////////////////////////////////////////////
exports.updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { 
      items = [], 
      discount = 0,
      invoiceDate,
      dueDate,
      poNumber,
      poDate,
      adminNote,
      terms,
      currency,
      designTemplate
    } = req.body;

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

      // Determine if item is service or goods
      const isService = i.description && (
        i.description.toLowerCase().includes('service') ||
        i.description.toLowerCase().includes('consulting') ||
        i.description.toLowerCase().includes('development') ||
        i.type === 'SERVICE'
      );

      return {
        invoiceId,
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

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoiceItem.createMany({ data: newItems });
      
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal,
          totalTax,
          discount,
          grandTotal,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          poNumber,
          poDate: poDate ? new Date(poDate) : undefined,
          adminNote,
          terms,
          currency,
          designTemplate,
        },
        include: { customer: true, items: true },
      });
    });

    // REGENERATE PDF
    try {
      const settings = await prisma.settings.findUnique({
        where: { businessId: req.business.id },
      });

      const pdfSettings = settings || {
        companyName: "Your Company",
        signatureUrl: null
      };

      const pdfBuffer = await generateInvoicePdf(updatedInvoice, pdfSettings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, updatedInvoice.invoiceNumber);
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { pdfUrl },
        });
      }
    } catch (pdfErr) {
      console.error("PDF Regeneration failed during update:", pdfErr);
    }

    res.json({ success: true, data: updatedInvoice });

  } catch (err) {
    console.error("updateInvoice error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// DELETE
//////////////////////////////////////////////////////
exports.deleteInvoice = async (req, res) => {
  try {
    const id = req.params.id;

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.delete({ where: { id } }),
    ]);

    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GENERATE PDF (MANUAL)
//////////////////////////////////////////////////////
exports.generateInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: req.business.id },
      include: { customer: true, items: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    const pdfSettings = settings || {
      companyName: "Your Company",
      companyLogo: null,
      companyAddress: "Your Address",
      companyPhone: "Your Phone",
      companyEmail: "your@email.com",
      website: "yourwebsite.com",
      taxNumber: "Your Tax Number",
      bankName: "Your Bank",
      accountName: "Your Account Name",
      iban: "Your IBAN",
      swiftCode: "Your SWIFT",
      signatureUrl: null
    };

    const pdfBuffer = await generateInvoicePdf(invoice, pdfSettings);
    
    if (!pdfBuffer) {
       return res.status(500).json({ success: false, message: "Failed to generate PDF buffer" });
    }

    const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl },
      include: { customer: true, items: true },
    });

    res.json({ success: true, data: { pdfUrl: updatedInvoice.pdfUrl } });
  } catch (err) {
    console.error("generateInvoicePdf error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// BULK UPDATE (SYNC OLD RECORDS)
//////////////////////////////////////////////////////
exports.bulkUpdateInvoices = async (req, res) => {
  console.log("=== BULK UPDATE INVOICES CALLED ===");
  try {
    const businessId = req.business.id;
    
    // Fetch settings for this business
    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    const pdfSettings = settings || {
      companyName: "Your Company",
      signatureUrl: null
    };

    // Fetch all invoices for this business
    const invoices = await prisma.invoice.findMany({
      where: { businessId },
      include: { customer: true, items: true },
    });

    console.log(`Syncing ${invoices.length} invoices for business ${businessId}...`);

    let updatedCount = 0;
    for (const inv of invoices) {
      // 1. Fix missing currency
      const finalCurrency = inv.currency || settings?.currency || "AED";
      
      // 2. Regenerate PDF with new template (includes signature/bank details)
      try {
        // Ensure the invoice object has the latest currency for the template
        inv.currency = finalCurrency;
        
        const pdfBuffer = await generateInvoicePdf(inv, pdfSettings);
        if (pdfBuffer) {
          const pdfUrl = await uploadInvoicePdf(pdfBuffer, inv.invoiceNumber);
          
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { 
              currency: finalCurrency,
              pdfUrl 
            },
          });
          updatedCount++;
        }
      } catch (pdfErr) {
        console.error(`Failed to sync PDF for invoice ${inv.invoiceNumber}:`, pdfErr);
      }
    }

    res.json({ 
      success: true, 
      message: `Successfully synced ${updatedCount} out of ${invoices.length} invoices.` 
    });
  } catch (err) {
    console.error("bulkUpdateInvoices error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// DOWNLOAD PDF
//////////////////////////////////////////////////////
exports.downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, businessId: req.business.id },
    });

    if (!invoice?.pdfUrl) {
      return res.status(404).json({ success: false, message: "PDF not found" });
    }

    res.redirect(invoice.pdfUrl);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};