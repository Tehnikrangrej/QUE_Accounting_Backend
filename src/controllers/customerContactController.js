const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE CONTACT
//////////////////////////////////////////////////////
exports.createContact = async (req, res) => {
  try {
    const {
      customerId,
      fullName,
      email,
      phone,
      position,
      isActive = true
    } = req.body;

    //////////////////////////////////////////////////////
    // REQUIRED FIELD
    //////////////////////////////////////////////////////
    if (!customerId || !fullName) {
      return res.status(400).json({
        success: false,
        message: "customerId and fullName are required",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE CUSTOMER (VERY IMPORTANT)
    //////////////////////////////////////////////////////
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId: req.business.id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    //////////////////////////////////////////////////////
    // CREATE CONTACT
    //////////////////////////////////////////////////////
    const contact = await prisma.customerContact.create({
      data: {
        businessId: req.business.id, // ✅ SAME AS YOUR CUSTOMER MODULE
        customerId,
        fullName,
        email,
        phone,
        position,
        isActive,
      },
    });

    res.status(201).json({
      success: true,
      contact,
    });

  } catch (error) {
    console.error("createContact error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET CONTACTS
//////////////////////////////////////////////////////
exports.getContacts = async (req, res) => {
  try {
    const { customerId } = req.query;

    const contacts = await prisma.customerContact.findMany({
      where: {
        businessId: req.business.id,
        ...(customerId && { customerId }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      contacts,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE CONTACT
//////////////////////////////////////////////////////
exports.updateContact = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.customerContact.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: req.body,
    });

    if (updated.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      message: "Contact updated",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE CONTACT
//////////////////////////////////////////////////////
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.customerContact.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      message: "Contact deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};