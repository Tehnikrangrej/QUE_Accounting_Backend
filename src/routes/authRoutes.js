const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware").default || require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");

// Public routes (no authentication required)
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);

// Protected routes (authentication required)
router.use(authMiddleware);
router.post("/logout", authController.logout);
router.get("/me", authController.getCurrentUser);

module.exports = router;
