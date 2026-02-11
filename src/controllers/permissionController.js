const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

const getAllPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
        orderBy: [
            { module: 'asc' },
            { action: 'asc' }
        ]
    });
    return successResponse(res, "Permissions fetched successfully", permissions);
  } catch (error) {
    console.error("Get All Permissions Error:", error);
    return errorResponse(res, "Internal server error");
  }
};

module.exports = {
  getAllPermissions,
};
