const prisma = require("../config/prisma");
const generateInvoicePdfHelper = require("../utils/generateInvoicePdf");
const uploadInvoicePdf = require("../utils/uploadInvoicePdf");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const InventoryService = require("../services/inventoryService");
const TaxEngine = require("../services/taxEngine");
const InvoiceWorkflow = require("../services/invoiceWorkflow");

//////////////////////////////////////////////////////
// CREATE INVOICE
//////////////////////////////////////////////////////
exports.createInvoice = async (req, res) => {
  console.log("=== CREATE INVOICE CALLED ===");
  try {
    const {
      customerId,
      salesOrderId,
      invoiceDate,
      dueDate,
      currency,
      poNumber,
      poDate,
      soNumber,
      soDate,
      adminNote,
      terms,
      discount = 0,
      shippingCharges = 0,
      items = [],
      designTemplate = "modern",
      // New Tax fields
      cgst,
      sgst,
      igst,
      tds,
      ewayBillNo,
      reverseCharge = false,
      transportDetails,
      vatPercentage,
      vatAmount,
      vatType = "exclusive",
      emirate
    } = req.body;

    if (!invoiceDate) {
      return res.status(400).json({ success: false, message: "invoiceDate is required" });
    }

    // 1. If salesOrderId is provided, use workflow for strict ERP consistency
    if (salesOrderId) {
      try {
        const invoiceNumber = await generateInvoiceNumber(req.business.id);
        const invoice = await InvoiceWorkflow.createInvoiceFromSalesOrder({
          businessId: req.business.id,
          salesOrderId,
          invoiceNumber,
          performedBy: req.user.userId,
          // Pass new fields if workflow supports them (will check workflow later)
          extraData: {
            cgst, sgst, igst, tds, ewayBillNo, reverseCharge, transportDetails,
            vatPercentage, vatAmount, vatType, emirate, shippingCharges
          }
        });
        
        return res.status(201).json({ success: true, data: invoice });
      } catch (workflowErr) {
        return res.status(400).json({ success: false, message: workflowErr.message });
      }
    }

    // 2. Direct Invoice Logic
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id },
    });

    if (!customer) {
      return res.status(400).json({ success: false, message: "Customer not found" });
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(req.business.id);
      let subtotal = 0;
      let totalTax = 0;

      const invoiceItems = [];
      for (const item of items) {
        const lineAmount = Number(item.quantity || item.hours || 0) * Number(item.rate || 0);
        
        // Tax logic (Auto-fetch from TaxEngine)
        const taxResult = TaxEngine.calculateTax({
          companyCountry: settings?.country || 'UAE',
          companyState: settings?.state || '',
          customerCountry: customer.country || 'UAE',
          customerState: customer.state || '',
          taxPercent: Number(item.taxPercent || 0),
          lineSubtotal: lineAmount,
          vatType: vatType || 'exclusive',
          manualTax: {
            cgstRate: item.cgstPercent,
            sgstRate: item.sgstPercent,
            igstRate: item.igstPercent
          }
        });

        const effectiveSubtotal = taxResult.effectiveSubtotal !== undefined ? taxResult.effectiveSubtotal : lineAmount;
        subtotal += effectiveSubtotal;
        totalTax += taxResult.totalTaxAmount;

        invoiceItems.push({
          productId: item.productId,
          warehouseId: item.warehouseId || null,
          description: item.description,
          hsnSacCode: item.hsnSacCode || item.taxCode || null,
          itemType: item.itemType || 'GOODS',
          unit: item.unit || null,
          hours: Number(item.hours || item.quantity),
          quantity: Number(item.quantity || item.hours),
          rate: Number(item.rate),
          amount: effectiveSubtotal,
          taxDetails: taxResult.breakdown,
          taxPercent: Number(item.taxPercent || 0),
          totalTax: taxResult.totalTaxAmount,
          totalAmount: effectiveSubtotal + taxResult.totalTaxAmount,
          discount: Number(item.discount || 0)
        });

        // Automatic Stock Decrease for direct invoices
        if (item.productId && item.warehouseId) {
          await InventoryService.decreaseStock({
            businessId: req.business.id,
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: Number(item.quantity || item.hours),
            type: "SALE_OUT",
            reference: { referenceNo: invoiceNumber },
            performedBy: req.user.userId,
            tx
          });
        }
      }

      // Final Grand Total calculation
      // Grand Total = Subtotal + Total Tax + Shipping - Discount - TDS
      const grandTotal = subtotal + totalTax + Number(shippingCharges) - Number(discount) - Number(tds || 0);

      return tx.invoice.create({
        data: {
          businessId: req.business.id,
          customerId,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          currency: currency || settings?.currency || "AED",
          poNumber,
          poDate: poDate ? new Date(poDate) : null,
          soNumber,
          soDate: soDate ? new Date(soDate) : null,
          adminNote: adminNote || settings?.defaultFooterNote || "Thank you",
          terms: terms || settings?.defaultTerms || "Payment due in 30 days",
          designTemplate,
          subtotal,
          totalTax,
          discount,
          shippingCharges: Number(shippingCharges),
          grandTotal,
          // India fields
          cgst: Number(cgst || 0),
          sgst: Number(sgst || 0),
          igst: Number(igst || 0),
          tds: Number(tds || 0),
          ewayBillNo,
          reverseCharge: !!reverseCharge,
          transportDetails,
          // UAE fields
          vatPercentage: Number(vatPercentage || 0),
          vatAmount: Number(vatAmount || 0),
          vatType,
          emirate,
          items: { create: invoiceItems },
        },
        include: { 
          customer: true, 
          items: {
            include: { warehouse: true }
          }
        },
      });
    }, {
      maxWait: 5000,
      timeout: 20000
    });

    // PDF generation (async)
    try {
      const pdfBuffer = await generateInvoicePdfHelper(invoice, settings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
        });
      }
    } catch (pdfErr) {
      console.error("PDF generation error:", pdfErr);
    }

    res.status(201).json({ success: true, data: invoice });

  } catch (err) {
    console.error("createInvoice error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// CONVERT FROM SALES ORDER
//////////////////////////////////////////////////////
exports.createInvoiceFromSalesOrder = async (req, res) => {
  try {
    const { salesOrderId } = req.params;
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;

    const invoiceNumber = await generateInvoiceNumber(businessId);
    
    const invoice = await InvoiceWorkflow.createInvoiceFromSalesOrder({
      businessId,
      salesOrderId,
      invoiceNumber,
      performedBy: userId
    });

    res.status(201).json({ 
      success: true, 
      message: "Invoice generated from Sales Order successfully.",
      data: invoice 
    });
  } catch (error) {
    console.error("createInvoiceFromSalesOrder error:", error);
    res.status(400).json({ success: false, message: error.message });
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
      soNumber,
      soDate,
      adminNote,
      terms,
      currency,
      designTemplate,
      shippingCharges = 0,
      status,
      // India fields
      cgst,
      sgst,
      igst,
      tds,
      ewayBillNo,
      reverseCharge,
      transportDetails,
      // UAE fields
      vatPercentage,
      vatAmount,
      vatType,
      emirate
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
        taxPercent: Number(i.taxPercent || 0),
        totalTax: itemTax,
        totalAmount: amount + itemTax,
      };
    });

    const grandTotal = subtotal + totalTax + Number(shippingCharges) - Number(discount) - Number(tds || 0);

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
          soNumber,
          soDate: soDate ? new Date(soDate) : undefined,
          adminNote,
          terms,
          currency,
          designTemplate,
          status,
          shippingCharges: Number(shippingCharges),
          cgst: cgst !== undefined ? Number(cgst) : undefined,
          sgst: sgst !== undefined ? Number(sgst) : undefined,
          igst: igst !== undefined ? Number(igst) : undefined,
          tds: tds !== undefined ? Number(tds) : undefined,
          ewayBillNo,
          reverseCharge: reverseCharge !== undefined ? !!reverseCharge : undefined,
          transportDetails,
          vatPercentage: vatPercentage !== undefined ? Number(vatPercentage) : undefined,
          vatAmount: vatAmount !== undefined ? Number(vatAmount) : undefined,
          vatType,
          emirate,
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

      const pdfBuffer = await generateInvoicePdfHelper(updatedInvoice, pdfSettings);
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
exports.previewInvoice = async (req, res) => {
  try {
    const { designTemplate, customerId, items, ...rest } = req.body;
    
    // Fetch customer and settings for real data
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id },
    });

    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    // Mock an invoice object for the template
    const mockInvoice = {
      ...rest,
      designTemplate: designTemplate || "modern",
      customer: customer || { company: "Customer Name", name: "Customer Name" },
      items: (items || []).map(it => ({
        ...it,
        totalAmount: Number(it.quantity || 0) * Number(it.rate || 0),
        taxDetails: [] // Simplified for preview
      }))
    };

    const html = require("../templates/invoiceTemplate")(mockInvoice, settings || {});
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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

    const pdfBuffer = await generateInvoicePdfHelper(invoice, pdfSettings);
    
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
        
        const pdfBuffer = await generateInvoicePdfHelper(inv, pdfSettings);
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