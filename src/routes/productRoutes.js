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

router.get(
  "/search",
  auth,
  business,
  Controller.searchProducts
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

// Categories
router.get("/categories", auth, business, Controller.getCategories);
router.post("/categories", auth, business, Controller.createCategory);
router.put("/categories/:id", auth, business, Controller.updateCategory);
router.delete("/categories/:id", auth, business, Controller.deleteCategory);

// Brands
router.get("/brands", auth, business, Controller.getBrands);
router.post("/brands", auth, business, Controller.createBrand);
router.put("/brands/:id", auth, business, Controller.updateBrand);
router.delete("/brands/:id", auth, business, Controller.deleteBrand);

// Units
router.get("/units", auth, business, Controller.getUnits);
router.post("/units", auth, business, Controller.createUnit);
router.put("/units/:id", auth, business, Controller.updateUnit);
router.delete("/units/:id", auth, business, Controller.deleteUnit);

module.exports = router;