const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE CUSTOMER
//////////////////////////////////////////////////////

exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        businessId: req.business.id,
      },
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL CUSTOMERS
//////////////////////////////////////////////////////

exports.getCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { businessId: req.business.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE CUSTOMER
//////////////////////////////////////////////////////

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: req.body,
    });

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//////////////////////////////////////////////////////
// DELETE CUSTOMER
//////////////////////////////////////////////////////

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.customer.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
