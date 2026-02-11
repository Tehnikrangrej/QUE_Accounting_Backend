const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware").default || require("../middlewares/authMiddleware");
const businessController = require("../controllers/businessController");

router.post("/", authMiddleware, businessController.createBusiness);
router.post("/switch/:businessId", authMiddleware, businessController.switchBusiness);
module.exports = router;
