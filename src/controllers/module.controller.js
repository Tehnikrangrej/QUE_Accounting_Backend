const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET ALL MODULES
//////////////////////////////////////////////////////
exports.getAllModules = async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      include: {
        permissions: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return successResponse(res, modules, "Modules fetched successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to fetch modules");
  }
};

//////////////////////////////////////////////////////
// CREATE MODULE
//////////////////////////////////////////////////////
exports.createModule = async (req, res) => {
  try {
    const { name, actions } = req.body;

    if (!name || !actions?.length) {
      return errorResponse(res, "Name and actions required");
    }

    ////////////////////////////////////////////////
    // CREATE MODULE
    ////////////////////////////////////////////////
    const moduleRecord = await prisma.module.create({
      data: { name },
    });

    ////////////////////////////////////////////////
    // CREATE PERMISSIONS
    ////////////////////////////////////////////////
    await prisma.permission.createMany({
      data: actions.map((action) => ({
        moduleId: moduleRecord.id,
        action,
      })),
      skipDuplicates: true,
    });

    const result = await prisma.module.findUnique({
      where: { id: moduleRecord.id },
      include: { permissions: true },
    });

    return successResponse(res, result, "Module created successfully");
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to create module");
  }
};