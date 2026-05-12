const prisma = require("../config/prisma");

const VALID_TYPES = ["Call", "Meeting"];
const VALID_STATUS = ["Scheduled", "Completed", "Cancelled"];

//////////////////////////////////////////////////////
// CREATE ACTIVITY
//////////////////////////////////////////////////////
exports.createActivity = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      leadId,
      dealId,
      customerId,
      assignedToId,
      activityDate,
      duration,
      status = "Scheduled",
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////////
    if (!type || !title || !activityDate) {
      return res.status(400).json({
        success: false,
        message: "type, title and activityDate are required",
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity type",
      });
    }

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE ASSIGNED USER
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
    // CREATE
    //////////////////////////////////////////////////////
    const activity = await prisma.activity.create({
      data: {
        businessId: req.business.id,

        type,
        title,
        description,

        leadId,
        dealId,
        customerId,

        assignedToId,

        activityDate: new Date(activityDate),
        duration,
        status,
      },
    });

    res.status(201).json({
      success: true,
      activity,
    });

  } catch (error) {
    console.error("createActivity error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL ACTIVITIES
//////////////////////////////////////////////////////
exports.getActivities = async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        businessId: req.business.id,
      },
      include: {
        lead: true,
        deal: true,
        customer: true,
        assignedTo: {
          include: { user: true },
        },
      },
      orderBy: {
        activityDate: "desc",
      },
    });

    res.json({
      success: true,
      activities,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE ACTIVITY
//////////////////////////////////////////////////////
exports.getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await prisma.activity.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
      include: {
        lead: true,
        deal: true,
        customer: true,
        assignedTo: {
          include: { user: true },
        },
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    res.json({
      success: true,
      activity,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE ACTIVITY
//////////////////////////////////////////////////////
exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;

    //////////////////////////////////////////////////////
    // VALIDATE TYPE
    //////////////////////////////////////////////////////
    if (req.body.type && !VALID_TYPES.includes(req.body.type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE STATUS
    //////////////////////////////////////////////////////
    if (req.body.status && !VALID_STATUS.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
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
    if (req.body.activityDate) {
      req.body.activityDate = new Date(req.body.activityDate);
    }

    //////////////////////////////////////////////////////
    // UPDATE
    //////////////////////////////////////////////////////
    const activity = await prisma.activity.update({
      where: { id },
      data: req.body,
      include: {
        lead: true,
        deal: true,
        customer: true,
        assignedTo: {
          include: { user: true },
        },
      },
    });

    res.json({
      success: true,
      activity,
    });

  } catch (error) {
    console.error("updateActivity error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE ACTIVITY
//////////////////////////////////////////////////////
exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.activity.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    res.json({
      success: true,
      message: "Activity deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};