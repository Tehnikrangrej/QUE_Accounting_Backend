const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE CUSTOMER
//////////////////////////////////////////////////////
exports.createCustomer = async (req, res) => {
  try {
    const {
      company,
      vatNumber,
      phone,
      website,
      group,
      currency = "SYSTEM",
      defaultLanguage = "SYSTEM",

      address,
      city,
      state,
      zipCode,
      country,

      billingStreet,
      billingCity,
      billingState,
      billingZipCode,
      billingCountry,

      shippingStreet,
      shippingCity,
      shippingState,
      shippingZipCode,
      shippingCountry,
    } = req.body;

    //////////////////////////////////////////////////////
    // REQUIRED FIELD
    //////////////////////////////////////////////////////
    if (!company) {
      return res.status(400).json({
        success: false,
        message: "company is required",
      });
    }

    const customer = await prisma.customer.create({
      data: {
        businessId: req.business.id,

        company,
        vatNumber,
        phone,
        website,
        group,
        currency,
        defaultLanguage,

        address,
        city,
        state,
        zipCode,
        country,

        billingStreet,
        billingCity,
        billingState,
        billingZipCode,
        billingCountry,

        shippingStreet,
        shippingCity,
        shippingState,
        shippingZipCode,
        shippingCountry,
      },
    });

    res.status(201).json({
      success: true,
      customer,
    });

  } catch (error) {
    console.error("createCustomer error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL CUSTOMERS
//////////////////////////////////////////////////////
exports.getCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        businessId: req.business.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      customers,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE CUSTOMER
//////////////////////////////////////////////////////
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.customer.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: req.body,
    });

    if (updated.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer updated",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE CUSTOMER
//////////////////////////////////////////////////////
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.customer.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
