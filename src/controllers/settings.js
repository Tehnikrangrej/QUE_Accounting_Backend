const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET BUSINESS SETTINGS
//////////////////////////////////////////////////////
exports.getSettings = async (req, res) => {
  try {
    const businessId = req.business.id;

    const settings = await prisma.settings.findUnique({
      where: { businessId },
    });

    return successResponse(
      res,
      settings,
      "Settings fetched successfully"
    );

  } catch (error) {
    console.error("getSettings error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// CREATE OR UPDATE SETTINGS
//////////////////////////////////////////////////////
exports.saveSettings = async (req, res) => {
  try {

    const businessId = req.business.id;
    const data = { ...req.body };

    //////////////////////////////////////////////////////
    // 🔥 CURRENCY VALIDATION (NEW)
    //////////////////////////////////////////////////////
    const allowedCurrencies = ["INR", "USD", "AED", "EUR"];

    if (data.currency && !allowedCurrencies.includes(data.currency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid currency"
      });
    }

    const currencyMap = {
      INR: "₹",
      USD: "$",
      AED: "د.إ",
      EUR: "€"
    };

    // Auto assign symbol if not provided
    if (data.currency && !data.currencySymbol) {
      data.currencySymbol = currencyMap[data.currency] || "₹";
    }

    // Default values if nothing sent
    if (!data.currency) {
      data.currency = "INR";
    }

    if (!data.currencySymbol) {
      data.currencySymbol = currencyMap[data.currency] || "₹";
    }

    //////////////////////////////////////////////////////
    // LOGO UPLOAD
    //////////////////////////////////////////////////////
    if (req.files?.companyLogo) {
      data.companyLogo = req.files.companyLogo[0].path;
    }

    //////////////////////////////////////////////////////
    // SIGNATURE UPLOAD
    //////////////////////////////////////////////////////
    if (req.files?.signature) {
      data.signatureUrl = req.files.signature[0].path;
    }

    //////////////////////////////////////////////////////
// HANDLE LEAVE TYPES
//////////////////////////////////////////////////////

    let leaveTypes = data.leaveTypes || [];

    if (typeof leaveTypes === "string") {
      leaveTypes = JSON.parse(leaveTypes);
    }

    // remove existing LWP
    leaveTypes = leaveTypes.filter(l => l.code !== "LWP");

    // add protected LWP
    leaveTypes.push({
      code: "LWP",
      name: "Unpaid Leave",
      yearlyLimit: null,
      system: true
    });

    data.leaveTypes = leaveTypes;

    // Ensure LWP exists
    const lwpExists = leaveTypes.some(l => l.code === "LWP");

    if (!lwpExists) {
      leaveTypes.push({
        code: "LWP",
        name: "Unpaid Leave",
        yearlyLimit: null,
        system: true
      });
    }

    // Prevent deletion
    leaveTypes = leaveTypes.map(l => {
      if (l.code === "LWP") {
        return {
          code: "LWP",
          name: "Unpaid Leave",
          yearlyLimit: null,
          system: true
        };
      }
      return l;
    });

    data.leaveTypes = leaveTypes;

    //////////////////////////////////////////////////////
    // CHECK EXISTING SETTINGS
    //////////////////////////////////////////////////////
    const existingSettings = await prisma.settings.findUnique({
      where: { businessId },
    });

    let settings;

    //////////////////////////////////////////////////////
    // CREATE SETTINGS
    //////////////////////////////////////////////////////
    if (!existingSettings) {

      settings = await prisma.settings.create({
        data: {
          businessId,
          ...data,
        },
      });

      return successResponse(
        res,
        settings,
        "Settings created successfully"
      );
    }

    //////////////////////////////////////////////////////
    // UPDATE SETTINGS
    //////////////////////////////////////////////////////
    settings = await prisma.settings.update({
      where: { businessId },
      data,
    });

    return successResponse(
      res,
      settings,
      "Settings updated successfully"
    );

  } catch (error) {
    console.error("saveSettings error:", error);
    return errorResponse(res, error.message, 500);
  }
};