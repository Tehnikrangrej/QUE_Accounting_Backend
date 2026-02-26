require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const permissionRoutes = require("./routes/permission.routes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const settingsRoutes = require("./routes/settings");
const checkByEmailRoutes = require("./routes/checkbyemail");
const paymentRoutes = require("./routes/paymentRoutes");
const creditNoteRoutes = require("./routes/creditNoteRoutes");
const moduleRoutes = require("./routes/module.routes");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/user-management",userManagementRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/check-email", checkByEmailRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/credit-notes", creditNoteRoutes);
app.use("/api/modules", moduleRoutes);
app.get("/", (req, res) => {
  res.send("QUE Accounting Backend Running...");
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;
