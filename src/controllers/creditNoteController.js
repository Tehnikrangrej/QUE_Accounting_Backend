const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET ALL CREDIT NOTES (OWNER ONLY)
//////////////////////////////////////////////////////
exports.getCreditNotes = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (business.ownerId !== userId) {
      return errorResponse(res, "Only owner can view all credits", 403);
    }

    const credits = await prisma.creditNote.findMany({
      where: { businessId },
      include: {
        customer: true,
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, credits);
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// GET SINGLE CREDIT NOTE
//////////////////////////////////////////////////////
exports.getCreditNote = async (req, res) => {
  try {
    const { id } = req.params;

    const credit = await prisma.creditNote.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: true,
      },
    });

    return successResponse(res, credit);
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// GET CREDIT NOTES BY CUSTOMER
//////////////////////////////////////////////////////
exports.getCustomerCredits = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const { customerId } = req.params;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    ////////////////////////////////////////////////////
    // OWNER → ALL CUSTOMER CREDITS
    ////////////////////////////////////////////////////
    if (business.ownerId === userId) {
      const credits = await prisma.creditNote.findMany({
        where: { businessId, customerId },
      });

      return successResponse(res, credits);
    }

    ////////////////////////////////////////////////////
    // PAYMENT CREATOR ONLY
    ////////////////////////////////////////////////////
    const credits = await prisma.creditNote.findMany({
      where: {
        businessId,
        customerId,
        invoice: {
          payments: {
            some: {
              createdBy: userId,
            },
          },
        },
      },
    });

    return successResponse(res, credits);
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Internal server error");
  }
};