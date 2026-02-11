// Simple test to isolate the issue
const express = require("express");
const { authMiddleware } = require("./src/middlewares/authMiddleware");

const app = express();
app.use(express.json());

// Test basic auth middleware
app.get("/test", authMiddleware, (req, res) => {
  res.json({ message: "Auth works", user: req.user });
});

app.listen(3002, () => {
  console.log("Test server running on port 3002");
});
