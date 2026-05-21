const invoiceService = require("../services/sales/invoice.service");
const { createInvoiceSchema, updateInvoiceSchema } = require("../validations/sales.validation");
const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/prisma");
const generateInvoicePdf = require("../utils/generateInvoicePdf");
const uploadInvoicePdf = require("../utils/uploadInvoicePdf");

exports.createInvoice = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;

    // Validate payload using Zod
    const validatedData = createInvoiceSchema.parse(req.body);

    // Call service to perform transaction and stock adjustments
    let invoice = await invoiceService.createInvoice(businessId, userId, userEmail, validatedData);

    // Generate PDF asynchronously/synchronously and update PDF URL
    try {
      const settings = await prisma.settings.findUnique({
        where: { businessId },
      });

      const pdfSettings = settings || {
        companyName: "Your Company",
        signatureUrl: null
      };

      const pdfBuffer = await generateInvoicePdf(invoice, pdfSettings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
          include: { customer: true, items: true }
        });
      }
    } catch (pdfError) {
      console.error("PDF generation failed on creation:", pdfError);
    }

    return successResponse(res, invoice, "Invoice created successfully", 201);
  } catch (error) {
    console.error("createInvoice controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

exports.convertSalesOrder = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { salesOrderId } = req.params;

    let invoice = await invoiceService.convertSalesOrderToInvoice(businessId, userId, userEmail, salesOrderId);

    // Generate PDF
    try {
      const settings = await prisma.settings.findUnique({
        where: { businessId },
      });

      const pdfSettings = settings || {
        companyName: "Your Company",
        signatureUrl: null
      };

      const pdfBuffer = await generateInvoicePdf(invoice, pdfSettings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
          include: { customer: true, items: true }
        });
      }
    } catch (pdfError) {
      console.error("PDF generation failed on sales order conversion:", pdfError);
    }

    return successResponse(res, invoice, "Sales Order billed to Invoice successfully", 201);
  } catch (error) {
    console.error("convertSalesOrder controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { customerId, status } = req.query;

    const data = await prisma.invoice.findMany({
      where: {
        businessId,
        isDeleted: false,
        customerId: customerId || undefined,
        status: status || undefined
      },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, data, "Invoices fetched successfully");
  } catch (err) {
    console.error("getInvoices controller error:", err);
    return errorResponse(res, err.message, 500);
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const invoice = await invoiceService.getInvoiceById(businessId, id);

    return successResponse(res, invoice, "Invoice retrieved successfully");
  } catch (err) {
    console.error("getInvoiceById controller error:", err);
    return errorResponse(res, err.message, 404);
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    // Validate payload using Zod
    const validatedData = updateInvoiceSchema.parse(req.body);

    let invoice = await invoiceService.updateInvoice(businessId, userId, userEmail, id, validatedData);

    // Regenerate PDF
    try {
      const settings = await prisma.settings.findUnique({
        where: { businessId },
      });

      const pdfSettings = settings || {
        companyName: "Your Company",
        signatureUrl: null
      };

      const pdfBuffer = await generateInvoicePdf(invoice, pdfSettings);
      if (pdfBuffer) {
        const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
          include: { customer: true, items: true }
        });
      }
    } catch (pdfError) {
      console.error("PDF regeneration failed on update:", pdfError);
    }

    return successResponse(res, invoice, "Invoice updated successfully");
  } catch (error) {
    console.error("updateInvoice controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    await invoiceService.deleteInvoice(businessId, userId, userEmail, id);

    return successResponse(res, null, "Invoice deleted and stock restored successfully");
  } catch (err) {
    console.error("deleteInvoice controller error:", err);
    return errorResponse(res, err.message, 400);
  }
};

exports.generateInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId, isDeleted: false },
      include: { customer: true, items: true }
    });

    if (!invoice) {
      return errorResponse(res, "Invoice not found", 404);
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId }
    });

    const pdfSettings = settings || {
      companyName: "Your Company",
      signatureUrl: null
    };

    const pdfBuffer = await generateInvoicePdf(invoice, pdfSettings);
    if (!pdfBuffer) {
      return errorResponse(res, "Failed to generate PDF buffer", 500);
    }

    const pdfUrl = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber);

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl },
      include: { customer: true, items: true }
    });

    return successResponse(res, { pdfUrl: updatedInvoice.pdfUrl }, "PDF generated successfully");
  } catch (err) {
    console.error("generateInvoicePdf controller error:", err);
    return errorResponse(res, err.message, 500);
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return errorResponse(res, "Status is required", 400);
    }

    const invoice = await invoiceService.changeStatus(businessId, userId, userEmail, id, status);

    return successResponse(res, invoice, "Invoice status updated successfully");
  } catch (error) {
    console.error("changeStatus controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.downloadInvoicePdf = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId }
    });

    if (!invoice?.pdfUrl) {
      return res.status(404).json({ success: false, message: "PDF not found" });
    }

    return res.redirect(invoice.pdfUrl);
  } catch (err) {
    console.error("downloadInvoicePdf controller error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkUpdateInvoices = async (req, res) => {
  try {
    const businessId = req.business.id;

    const settings = await prisma.settings.findUnique({
      where: { businessId }
    });

    const pdfSettings = settings || {
      companyName: "Your Company",
      signatureUrl: null
    };

    const invoices = await prisma.invoice.findMany({
      where: { businessId, isDeleted: false },
      include: { customer: true, items: true }
    });

    let updatedCount = 0;
    for (const inv of invoices) {
      try {
        const pdfBuffer = await generateInvoicePdf(inv, pdfSettings);
        if (pdfBuffer) {
          const pdfUrl = await uploadInvoicePdf(pdfBuffer, inv.invoiceNumber);
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { pdfUrl }
          });
          updatedCount++;
        }
      } catch (pdfErr) {
        console.error(`Failed to sync PDF for invoice ${inv.invoiceNumber}:`, pdfErr);
      }
    }

    return successResponse(res, { updatedCount, totalCount: invoices.length }, "Invoices bulk updated successfully");
  } catch (err) {
    console.error("bulkUpdateInvoices controller error:", err);
    return errorResponse(res, err.message, 500);
  }
};