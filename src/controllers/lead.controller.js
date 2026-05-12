const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE LEAD (FINAL SAFE VERSION)
//////////////////////////////////////////////////////
exports.createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      website,
      position,
      city,
      state,
      country,
      zipCode,
      status,
      source,
      assignedTo, // 👈 from frontend
      tags,
      leadValue,
      description,
      isPublic,
      contactedToday,
      defaultLanguage,
    } = req.body;

    //////////////////////////////////////////////////////
    // REQUIRED FIELD
    //////////////////////////////////////////////////////
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    //////////////////////////////////////////////////////
    // FIX ASSIGNED USER
    //////////////////////////////////////////////////////
    let assignedToId = null;

    if (assignedTo) {
      const member = await prisma.businessUser.findFirst({
        where: {
          id: assignedTo, // 👈 expecting ID
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

      assignedToId = assignedTo;
    }

    //////////////////////////////////////////////////////
    // FIX TAGS (string → array)
    //////////////////////////////////////////////////////
    let formattedTags = [];

    if (typeof tags === "string") {
      formattedTags = tags.split(",").map((t) => t.trim());
    } else if (Array.isArray(tags)) {
      formattedTags = tags;
    }

    //////////////////////////////////////////////////////
    // CREATE LEAD
    //////////////////////////////////////////////////////
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        company,
        website,
        position,
        city,
        state,
        country,
        zipCode,

        status,
        source,

        assignedToId, // ✅ FIXED

        tags: formattedTags,
        leadValue: Number(leadValue) || 0,
        description,

        isPublic: Boolean(isPublic),
        contactedToday: Boolean(contactedToday),
        defaultLanguage,

        businessId: req.business.id,
      },
      include: {
        assignedTo: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });

  } catch (error) {
    console.error("createLead error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL LEADS
//////////////////////////////////////////////////////
exports.getAllLeads = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        businessId: req.business.id // ✅ FIX
      },
      orderBy: { createdAt: 'desc' },
      include: { stage: true,
         assignedTo: {
    include: {
      user: true,
    },
  },
       }
    });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET LEAD DETAILS
//////////////////////////////////////////////////////
exports.getLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        businessId: req.business.id // ✅ FIX
      },
      include: {
        stage: true,
        activities: true,
        notes: true,
        tasks: true,
        reminders: true,
        assignedTo: {
  include: {
    user: true,
  },
},
      }
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    res.json({
      success: true,
      data: lead
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE LEAD
//////////////////////////////////////////////////////
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.lead.updateMany({
      where: {
        id,
        businessId: req.business.id // ✅ FIX
      },
      data: req.body,
    });

    if (updated.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    res.json({
      success: true,
      message: "Lead updated successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// DELETE LEAD
//////////////////////////////////////////////////////
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.lead.deleteMany({
      where: {
        id,
        businessId: req.business.id // ✅ FIX
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    res.json({
      success: true,
      message: "Lead deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// CONVERT TO CUSTOMER
//////////////////////////////////////////////////////
exports.convertToCustomer = async (req, res) => {
  try {
    const leadId = req.params.id;
    const data = req.body;

    const result = await prisma.$transaction(async (tx) => {

      const lead = await tx.lead.findFirst({
        where: {
          id: leadId,
          businessId: req.business.id
        }
      });

      if (!lead) throw new Error("Lead not found");

      const existing = await tx.customer.findUnique({
        where: { leadId }
      });

      if (existing) throw new Error("Already converted");

      // ✅ CREATE CUSTOMER FROM FORM DATA
      const customer = await tx.customer.create({
        data: {
          businessId: req.business.id,

          company: data.company,
          vatNumber: data.vatNumber,
          phone: data.phone,
          website: data.website,
          group: data.group,
          currency: data.currency || "SYSTEM",
          defaultLanguage: data.defaultLanguage || "SYSTEM",

          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,

          billingStreet: data.billingStreet,
          billingCity: data.billingCity,
          billingState: data.billingState,
          billingZipCode: data.billingZipCode,
          billingCountry: data.billingCountry,

          shippingStreet: data.shippingStreet,
          shippingCity: data.shippingCity,
          shippingState: data.shippingState,
          shippingZipCode: data.shippingZipCode,
          shippingCountry: data.shippingCountry,

          leadId: lead.id
        }
      });

      // ✅ UPDATE LEAD
      await tx.lead.update({
        where: { id: leadId },
        data: { status: "CONVERTED" }
      });

      return customer;
    });

    res.json({
      success: true,
      message: "Converted successfully",
      data: result
    });

  } catch (error) {
    console.error("convert error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
//////////////////////////////////////////////////////
// MOVE PIPELINE
//////////////////////////////////////////////////////
exports.moveStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stageId } = req.body;

    const lead = await prisma.lead.update({
      where: { id },
      data: { stageId }
    });

    res.json({ success: true, data: lead });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//////////////////////////////////////////////////////
// ACTIVITY
//////////////////////////////////////////////////////
exports.addActivity = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  const data = await prisma.leadActivity.create({
    data: { leadId: id, message }
  });

  res.json({ success: true, data });
};

exports.getActivities = async (req, res) => {
  const { id } = req.params;

  const data = await prisma.leadActivity.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data });
};

//////////////////////////////////////////////////////
// NOTE / TASK / REMINDER
//////////////////////////////////////////////////////
exports.addNote = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const data = await prisma.leadNote.create({
    data: { leadId: id, note }
  });

  res.json({ success: true, data });
};

exports.addTask = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const data = await prisma.leadTask.create({
    data: { leadId: id, title, status: "PENDING" }
  });

  res.json({ success: true, data });
};

exports.addReminder = async (req, res) => {
  const { id } = req.params;
  const { title, date } = req.body;

  const data = await prisma.leadReminder.create({
    data: { leadId: id, title, date: new Date(date) }
  });

  res.json({ success: true, data });
};