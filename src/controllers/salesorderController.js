const prisma = require("../config/prisma");
const InventoryService = require("../services/inventoryService");

const VALID_STATUS = ["Draft", "Confirmed", "Completed", "Cancelled"];

//////////////////////////////////////////////////////
// GENERATE ORDER NUMBER
//////////////////////////////////////////////////////
const generateOrderNumber = async (businessId) => {
  const count = await prisma.salesOrder.count({ where: { businessId } });
  return `SO-${(count + 1).toString().padStart(3, "0")}`;
};

//////////////////////////////////////////////////////
// CREATE SALES ORDER
//////////////////////////////////////////////////////
exports.createSalesOrder = async (req, res) => {
  try {
    const {
      customerId,
      quotationId,
      dealId,
      assignedToId,
      items,
      discount = 0,
      orderDate,
      deliveryDate,
      notes,
    } = req.body;

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerId and items are required",
      });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: req.business.id },
    });

    if (!customer) {
      return res.status(400).json({ success: false, message: "Customer not found" });
    }

    const order = await prisma.$transaction(async (tx) => {
      let calculatedSubtotal = 0;
      let totalTaxAmount = 0;

      const mappedItems = [];
      for (const item of items) {
        const lineAmount = Number(item.quantity || 0) * Number(item.price || 0);
        const lineTax = (lineAmount * Number(item.taxPercent || 0)) / 100;
        
        calculatedSubtotal += lineAmount;
        totalTaxAmount += lineTax;

        // Requirement 5: Warehouse-wise stock validation & Reservation
        if (item.productId && item.warehouseId) {
          await InventoryService.reserveStock({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: Number(item.quantity),
            tx
          });
        }

        mappedItems.push({
          productId: item.productId,
          warehouseId: item.warehouseId,
          description: item.description || item.name,
          itemType: item.itemType || item.type || 'GOODS',
          hsnSacCode: item.hsnSacCode || item.hsn,
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
          taxPercent: Number(item.taxPercent || 0),
          total: lineAmount + lineTax,
        });
      }

      const finalGrandTotal = calculatedSubtotal + totalTaxAmount - Number(discount || 0);

      return tx.salesOrder.create({
        data: {
          businessId: req.business.id,
          orderNumber: await generateOrderNumber(req.business.id),
          customerId,
          quotationId,
          dealId,
          assignedToId,
          subtotal: calculatedSubtotal,
          tax: totalTaxAmount,
          discount: Number(discount || 0),
          totalAmount: finalGrandTotal,
          orderDate: new Date(orderDate),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          notes,
          items: { create: mappedItems },
        },
        include: { items: true },
      });
    });

    res.status(201).json({ success: true, order });

  } catch (error) {
    console.error("createSalesOrder error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL SALES ORDERS
//////////////////////////////////////////////////////
exports.getSalesOrders = async (req, res) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      where: {
        businessId: req.business.id,
      },
      include: {
        customer: true,
        quotation: true,
        deal: true,
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
// GET SINGLE SALES ORDER
//////////////////////////////////////////////////////
exports.getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.salesOrder.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
      include: {
        customer: true,
        quotation: true,
        deal: true,
        items: true,
        assignedTo: {
          include: { user: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
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
// UPDATE SALES ORDER
//////////////////////////////////////////////////////
exports.updateSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;

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
    // FORMAT DATE
    //////////////////////////////////////////////////////
    if (req.body.orderDate) {
      req.body.orderDate = new Date(req.body.orderDate);
    }

    //////////////////////////////////////////////////////
    // UPDATE
    //////////////////////////////////////////////////////
    const order = await prisma.salesOrder.update({
      where: { id },
      data: req.body,
      include: {
        items: true,
      },
    });

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error("updateSalesOrder error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE SALES ORDER
//////////////////////////////////////////////////////
exports.deleteSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.salesOrder.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    res.json({
      success: true,
      message: "Sales order deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};