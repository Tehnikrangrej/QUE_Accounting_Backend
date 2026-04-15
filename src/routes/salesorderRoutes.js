const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/salesorderController");

router.post(
  "/",
  auth,
  business,
  checkPermission("sales_order", "create"),
  Controller.createSalesOrder
);

router.get(
  "/",
  auth,
  business,
  Controller.getSalesOrders
);

router.get(
  "/:id",
  auth,
  business,
  Controller.getSalesOrderById
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("sales_order", "update"),
  Controller.updateSalesOrder
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("sales_order", "delete"),
  Controller.deleteSalesOrder
);

module.exports = router;