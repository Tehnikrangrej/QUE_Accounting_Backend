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

module.exports = router;