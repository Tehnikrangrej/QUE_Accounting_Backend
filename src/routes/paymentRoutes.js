const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const controller = require ("../controllers/paymentController");


//////////////////////////////////////////////////
// CREATE PAYMENT
//////////////////////////////////////////////////
router.post(
  "/:invoiceId",
  auth,
  business,
  checkPermission("payment", "create"),
  controller.createPayment
);

router.get(
  "/",
  auth,
  business,
  checkPermission("payment", "read"),
  controller.getPayments
);
//////////////////////////////////////////////////
// READ PAYMENTS
//////////////////////////////////////////////////
router.get(
  "/:invoiceId",
  auth,
  business,
  checkPermission("payment", "read"),
  controller.getInvoicePayments
);

router.get(
  "/:paymentId/download",
  auth,
  business,
  checkPermission("payment", "read"),
  controller.downloadPaymentPdf
);

module.exports = router;