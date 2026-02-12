const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const businessController = require("../controllers/businessController");

router.post("/create", authMiddleware, businessController.createBusiness);
router.post("/switch", authMiddleware, businessController.switchBusiness);
module.exports = router;
