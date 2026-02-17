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
    // OPTIONAL LOGO UPLOAD
    //////////////////////////////////////////////////////
    if (req.file) {
      data.companyLogo = req.file.path;
    }

    const settings = await prisma.settings.upsert({
      where: { businessId },

      create: {
        businessId,
        ...data,
      },

      update: {
        ...data,
      },
    });

    return successResponse(
      res,
      settings,
      "Settings saved successfully"
    );

  } catch (error) {
    console.error("saveSettings error:", error);
    return errorResponse(res, error.message, 500);
  }
};
