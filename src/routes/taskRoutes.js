const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/taskController");

router.post("/", auth, business, checkPermission("task", "create"), Controller.createTask);
router.get("/:projectId", auth, business, Controller.getTasksByProject);
router.put("/:id", auth, business, checkPermission("task", "update"), Controller.updateTask);
router.delete("/:id", auth, business, checkPermission("task", "delete"), Controller.deleteTask);

module.exports = router;