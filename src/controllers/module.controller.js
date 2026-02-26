const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET ALL MODULES
//////////////////////////////////////////////////////
exports.getAllModules = async (req, res) => {
  try {
    //////////////////////////////////////////////////
    // FETCH MODULES
    //////////////////////////////////////////////////
    const modules = await prisma.module.findMany({
      include: {
        permissions: {
          select: {
            action: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    //////////////////////////////////////////////////
    // FORMAT RESPONSE
    //////////////////////////////////////////////////
    const formattedModules = modules.map((module) => ({
      id: module.id,
      name: module.name,
      actions: module.permissions.map((p) => p.action),
    }));

    //////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////
    return successResponse(
      res,
      formattedModules,
      "Modules fetched successfully"
    );
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