const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/stockController");
const { bankChangeRequest } = require("../config/prisma");

router.post(
    "/",
    auth,
    business,
    checkPermission("stock", "create"),
    Controller.createStock
)

//////////////////////////////////////////////////
// GET STOCK
//////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  Controller.getStock
);

router.put(
  "/:id",
  auth,
  business,
  checkPermission("stock", "update"),
  Controller.updateStock
);

router.delete(
  "/:id",
  auth,
    business,
    checkPermission("stock", "delete"),
    Controller.deleteStock
);


module.exports = router;