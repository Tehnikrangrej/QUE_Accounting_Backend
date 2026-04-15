const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/taskController");

router.post("/", auth, business, checkPermission("task", "create"), Controller.createTask);
router.get("/", auth, business, Controller.getTasks);

module.exports = router;