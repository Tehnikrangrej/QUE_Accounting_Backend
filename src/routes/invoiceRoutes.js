const express = require("express");
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  generateInvoicePdf,
  downloadInvoicePdf,
  bulkUpdateInvoices,
  convertSalesOrder,
  changeStatus,
} = require("../controllers/invoiceController");
const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

const router = express.Router();

// Apply authentication middleware
router.use(authMiddleware);

// Get invoices
router.get("/", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "read"), getInvoices);

// Get invoice by ID
router.get("/:id", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "read"), getInvoiceById);

// Generate PDF
router.post("/:id/generate-pdf", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "update"), generateInvoicePdf);

// Download PDF
router.get("/:id/download-pdf", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "read"), downloadInvoicePdf);

// Bulk Update
router.post("/bulk-update", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "update"), bulkUpdateInvoices);

// Create Invoice
router.post("/", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "create"), createInvoice);

// Convert Sales Order to Invoice
router.post("/convert/:salesOrderId", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "create"), convertSalesOrder);

// Update Invoice status
router.post("/:id/status", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "update"), changeStatus);

// Update Invoice fields
router.patch("/:id", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "update"), updateInvoice);

// Delete Invoice
router.delete("/:id", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "delete"), deleteInvoice);

module.exports = router;
