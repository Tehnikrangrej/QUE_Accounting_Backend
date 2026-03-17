const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE VENDOR
//////////////////////////////////////////////////////
exports.createVendor = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { name, email, phone } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Vendor name is required"
      });
    }

    const vendor = await prisma.vendor.create({
      data: { businessId, name, email, phone }
    });

    res.json({ success: true, data: vendor });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL VENDORS
//////////////////////////////////////////////////////
exports.getVendors = async (req, res) => {
  const businessId = req.business.id;

  const vendors = await prisma.vendor.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" }
  });

  res.json({ success: true, data: vendors });
};

//////////////////////////////////////////////////////
// GET SINGLE VENDOR
//////////////////////////////////////////////////////
exports.getVendor = async (req, res) => {
  const businessId = req.business.id;
  const { id } = req.params;

  const vendor = await prisma.vendor.findFirst({
    where: { id, businessId },
    include: { expenses: true }
  });

  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: "Vendor not found"
    });
  }

  res.json({ success: true, data: vendor });
};

//////////////////////////////////////////////////////
// UPDATE VENDOR
//////////////////////////////////////////////////////
exports.updateVendor = async (req, res) => {
  const businessId = req.business.id;
  const { id } = req.params;

  const existing = await prisma.vendor.findFirst({
    where: { id, businessId }
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Vendor not found"
    });
  }

  const updated = await prisma.vendor.update({
    where: { id },
    data: req.body
  });

  res.json({ success: true, data: updated });
};

//////////////////////////////////////////////////////
// DELETE VENDOR
//////////////////////////////////////////////////////
exports.deleteVendor = async (req, res) => {
  const businessId = req.business.id;
  const { id } = req.params;

  const existing = await prisma.vendor.findFirst({
    where: { id, businessId }
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Vendor not found"
    });
  }

  await prisma.vendor.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: "Vendor deleted"
  });
};