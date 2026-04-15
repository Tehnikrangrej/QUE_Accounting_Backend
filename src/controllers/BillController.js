const prisma = require("../config/prisma");


//////////////////////////////////////////////////////
// GENERATE BILL NUMBER
//////////////////////////////////////////////////////
const generateBillNumber = async (businessId) => {
  const count = await prisma.bill.count({
    where: { businessId },
  });

  return `BILL-${(count + 1).toString().padStart(3, "0")}`;
};

//////////////////////////////////////////////////////
// CREATE BILL
//////////////////////////////////////////////////////
exports.createBill = async (req, res) => {
  try {
    const {
      vendorId,
      purchaseOrderId,
      items = [],
      tax = 0,
      discount = 0,
      billDate,
      dueDate,
      notes,
    } = req.body;

    //////////////////////////////////////////////////////
    // ✅ FIXED VALIDATION
    //////////////////////////////////////////////////////
    if (!billDate) {
      return res.status(400).json({
        success: false,
        message: "billDate is required",
      });
    }

    if (!vendorId && !purchaseOrderId) {
      return res.status(400).json({
        success: false,
        message: "Either vendorId or purchaseOrderId is required",
      });
    }

    let finalItems = items;
    let finalVendorId = vendorId;

    //////////////////////////////////////////////////////
    // AUTO FROM PURCHASE ORDER
    //////////////////////////////////////////////////////
    if (purchaseOrderId) {
      const po = await prisma.purchaseOrder.findFirst({
        where: {
          id: purchaseOrderId,
          businessId: req.business.id,
        },
        include: { items: true },
      });

      if (!po) {
        return res.status(400).json({
          success: false,
          message: "Purchase Order not found",
        });
      }

      finalVendorId = po.vendorId;

      finalItems = po.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      }));
    }

    //////////////////////////////////////////////////////
    // VALIDATE VENDOR (IMPORTANT)
    //////////////////////////////////////////////////////
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: finalVendorId,
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
    // CALCULATE
    //////////////////////////////////////////////////////
    const subtotal = finalItems.reduce(
      (sum, i) => sum + i.quantity * i.price,
      0
    );

    const totalAmount = subtotal + tax - discount;

    //////////////////////////////////////////////////////
    // CREATE
    //////////////////////////////////////////////////////
    const bill = await prisma.bill.create({
      data: {
        businessId: req.business.id,
        billNumber: await generateBillNumber(req.business.id),

        vendorId: finalVendorId,
        purchaseOrderId,

        subtotal,
        tax,
        discount,
        totalAmount,

        billDate: new Date(billDate),
        dueDate: dueDate ? new Date(dueDate) : null,

        notes,

        items: {
          create: finalItems.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            total: i.quantity * i.price,
          })),
        },
      },
      include: {
        vendor: true,
        items: true,
        purchaseOrder: true,
      },
    });

    res.status(201).json({
      success: true,
      bill,
    });

  } catch (error) {
    console.error("createBill error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};