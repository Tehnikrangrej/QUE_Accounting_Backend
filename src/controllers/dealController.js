const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// VALID STAGES
//////////////////////////////////////////////////////
const VALID_STAGES = [
  "New",
  "Contacted",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

//////////////////////////////////////////////////////
// CREATE DEAL
//////////////////////////////////////////////////////
exports.createDeal = async (req, res) => {
  try {
    const {
      name,
      amount,
      customerId,
      contactId,
      assignedToId, // ✅ NEW
      stage = "New",
      expectedCloseDate,
      probability,
      source,
      description,
    } = req.body;

    //////////////////////////////////////////////////////
    // REQUIRED FIELDS
    //////////////////////////////////////////////////////
    if (!name || !amount || !customerId) {
      return res.status(400).json({
        success: false,
        message: "name, amount and customerId are required",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE STAGE
    //////////////////////////////////////////////////////
    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
    }

    //////////////////////////////////////////////////////
    // ✅ VALIDATE ASSIGNED USER (IMPORTANT)
    //////////////////////////////////////////////////////
    if (assignedToId) {
      const member = await prisma.businessUser.findFirst({
        where: {
          id: assignedToId,
          businessId: req.business.id,
          isActive: true,
        },
      });

      if (!member) {
        return res.status(400).json({
          success: false,
          message: "Assigned user not part of this business",
        });
      }
    }

    //////////////////////////////////////////////////////
    // CREATE DEAL
    //////////////////////////////////////////////////////
    const deal = await prisma.deal.create({
      data: {
        businessId: req.business.id,

        name,
        amount: Number(amount),
        customerId,
        contactId,

        assignedToId, // ✅ SAVE

        stage,
        probability,
        source,
        description,

        expectedCloseDate: expectedCloseDate
          ? new Date(expectedCloseDate)
          : null,
      },
    });

    res.status(201).json({
      success: true,
      deal,
    });

  } catch (error) {
    console.error("createDeal error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//////////////////////////////////////////////////////
// GET ALL DEALS
//////////////////////////////////////////////////////
exports.getDeals = async (req, res) => {
  try {
    const deals = await prisma.deal.findMany({
      where: {
        businessId: req.business.id,
      },
      include: {
        customer: true,
        contact: true,
         assignedTo: {
    include: {
      user: true, // 👈 get actual user data
    },
  },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      deals,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE DEAL
//////////////////////////////////////////////////////
exports.getDealById = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await prisma.deal.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
      include: {
        customer: true,
        contact: true,
         assignedTo: {
    include: {
      user: true, // 👈 get actual user data
    },
  },
      },
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.json({
      success: true,
      deal,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE DEAL
//////////////////////////////////////////////////////
exports.updateDeal = async (req, res) => {
  try {
    const { id } = req.params;

    //////////////////////////////////////////////////////
    // VALIDATE STAGE
    //////////////////////////////////////////////////////
    if (req.body.stage && !VALID_STAGES.includes(req.body.stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE ASSIGNED USER
    //////////////////////////////////////////////////////
    if (req.body.assignedToId) {
      const member = await prisma.businessUser.findFirst({
        where: {
          id: req.body.assignedToId,
          businessId: req.business.id,
          isActive: true,
        },
      });

      if (!member) {
        return res.status(400).json({
          success: false,
          message: "Assigned user not part of this business",
        });
      }
    }

    //////////////////////////////////////////////////////
    // FORMAT DATE
    //////////////////////////////////////////////////////
    if (req.body.expectedCloseDate) {
      req.body.expectedCloseDate = new Date(req.body.expectedCloseDate);
    }

    //////////////////////////////////////////////////////
    // UPDATE + RETURN DATA
    //////////////////////////////////////////////////////
    const deal = await prisma.deal.update({
      where: { id },
      data: req.body,
      include: {
        customer: true,
        contact: true,
        assignedTo: {
          include: {
            user: true,
          },
        },
      },
    });

    //////////////////////////////////////////////////////
    // SECURITY CHECK (IMPORTANT)
    //////////////////////////////////////////////////////
    if (deal.businessId !== req.business.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    res.json({
      success: true,
      deal,
    });

  } catch (error) {
    console.error("updateDeal error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE DEAL
//////////////////////////////////////////////////////
exports.deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.deal.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    res.json({
      success: true,
      message: "Deal deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};