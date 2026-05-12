const prisma = require("../config/prisma");

const VALID_STATUS = ["Draft", "Ordered", "Received", "Cancelled"];

//////////////////////////////////////////////////////
// GENERATE PO NUMBER
//////////////////////////////////////////////////////
const generatePONumber = async () => {
  const count = await prisma.purchaseOrder.count();
  return `PO-${(count + 1).toString().padStart(3, "0")}`;
};

//////////////////////////////////////////////////////
// CREATE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.createPurchaseOrder = async (req, res) => {
  try {
    const {
      vendorId,
      assignedToId,
      items,
      tax = 0,
      discount = 0,
      orderDate,
      expectedDeliveryDate,
      notes,
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////////
    if (!vendorId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "vendorId and items are required",
      });
    }

    //////////////////////////////////////////////////////
    // VALIDATE VENDOR
    //////////////////////////////////////////////////////
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        businessId: req.business.id,
      },
    });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found",
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
    // CALCULATE TOTAL
    //////////////////////////////////////////////////////
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    const totalAmount = subtotal + tax - discount;

    //////////////////////////////////////////////////////
    // CREATE
    //////////////////////////////////////////////////////
    const order = await prisma.purchaseOrder.create({
      data: {
        businessId: req.business.id,
        poNumber: await generatePONumber(),

        vendorId,
        assignedToId,

        subtotal,
        tax,
        discount,
        totalAmount,

        orderDate: new Date(orderDate),
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null,

        notes,

        items: {
          create: items.map((item) => ({
            name: item.name,
            type: item.type || null,
            hsn: item.hsn || null,
            quantity: item.quantity,
            price: item.price,
            taxPercent: Number(item.taxPercent || 0),
            total: item.quantity * item.price,
          })),
        },
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      order,
    });

  } catch (error) {
    console.error("createPurchaseOrder error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL PURCHASE ORDERS
//////////////////////////////////////////////////////
exports.getPurchaseOrders = async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        businessId: req.business.id,
      },
      include: {
        vendor: true,
        items: true,
        assignedTo: {
          include: { user: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
      include: {
        vendor: true,
        items: true,
        assignedTo: {
          include: { user: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.body.status && !VALID_STATUS.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    if (req.body.orderDate) {
      req.body.orderDate = new Date(req.body.orderDate);
    }

    if (req.body.expectedDeliveryDate) {
      req.body.expectedDeliveryDate = new Date(req.body.expectedDeliveryDate);
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: req.body,
      include: {
        vendor: true,
        items: true,
      },
    });

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error("updatePurchaseOrder error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE PURCHASE ORDER
//////////////////////////////////////////////////////
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.purchaseOrder.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};