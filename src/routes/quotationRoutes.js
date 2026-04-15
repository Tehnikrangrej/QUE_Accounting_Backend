const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/quotationController");

router.post(
  "/",
  auth,
  business,
  checkPermission("quotation", "create"),
  Controller.createQuotation
);

router.get(
  "/",
  auth,
  business,
  Controller.getQuotations
);

router.get(
  "/:id",
  auth,
  business,
  Controller.getQuotationById
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("quotation", "update"),
  Controller.updateQuotation
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("quotation", "delete"),
  Controller.deleteQuotation
);

module.exports = router;