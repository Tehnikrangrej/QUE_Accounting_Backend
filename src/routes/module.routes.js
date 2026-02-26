const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const moduleController = require("../controllers/module.controller");

//////////////////////////////////////////////////////
// MODULE ROUTES
//////////////////////////////////////////////////////

router.get("/", authMiddleware, moduleController.getAllModules);

router.post("/", authMiddleware, moduleController.createModule);

module.exports = router;