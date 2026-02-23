const express = require("express");
const router = express.Router();

const checkUserController = require(
  "../controllers/checkByEmail"
);

const authMiddleware = require("../middlewares/authMiddleware");

//////////////////////////////////////////////////////
// CHECK USER EMAIL
//////////////////////////////////////////////////////

router.post(
  "/",
  checkUserController.checkUserByEmail
);

module.exports = router;