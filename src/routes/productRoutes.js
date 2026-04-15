const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/productController");

router.post(
  "/",
  auth,
  business,
  checkPermission("product", "create"),
  Controller.createProduct
);

router.get(
  "/",
  auth,
  business,
  Controller.getProducts
);

router.put(
  "/:id",
  auth,
  business,
  Controller.updateProduct
);

router.delete(
  "/:id",
  auth,
  business,
  checkPermission("product", "delete"),
  Controller.deleteProduct
);

module.exports = router;