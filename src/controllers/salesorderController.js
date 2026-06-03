const prisma = require("../config/prisma");
const InventoryService = require("../services/inventoryService");
const TaxEngine = require("../services/taxEngine");

const VALID_STATUS = ["DRAFT", "Draft", "CONFIRMED", "Confirmed", "PROCESSING", "Processing", "FULFILLED", "Completed", "CANCELLED", "Cancelled", "APPROVED", "Approved", "PARTIALLY_FULFILLED"];

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
      shippingCharges = 0,
      orderDate,
      deliveryDate,
      notes,
      termsConditions,
      currency,
      customerReference,
      shippingMethod,
      paymentTerms,
      deliveryInstructions,
      placeOfSupply,
      // Tax fields
      cgst,
      sgst,
      igst,
      tds,
      ewayBillNo,
      reverseCharge = false,
      transportDetails,
      vatPercentage,
      vatAmount,
      vatType = "exclusive",
      emirate
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

    const settings = await prisma.settings.findUnique({
      where: { businessId: req.business.id },
    });

    const order = await prisma.$transaction(async (tx) => {
      let calculatedSubtotal = 0;
      let totalTaxAmount = 0;

      const mappedItems = [];
      for (const item of items) {
        const lineAmount = Number(item.quantity || 0) * Number(item.price || 0);
        
        // Tax logic (Centralized TaxEngine)
        const taxResult = TaxEngine.calculateTax({
          companyCountry: settings?.country || 'UAE',
          companyState: settings?.state || '',
          customerCountry: customer.country || 'UAE',
          customerState: customer.state || '',
          taxPercent: Number(item.taxPercent || 0),
          lineSubtotal: lineAmount,
          vatType: vatType || 'exclusive',
          manualTax: {
            cgstRate: item.cgstPercent,
            sgstRate: item.sgstPercent,
            igstRate: item.igstPercent
          }
        });

        const effectiveSubtotal = taxResult.effectiveSubtotal !== undefined ? taxResult.effectiveSubtotal : lineAmount;
        calculatedSubtotal += effectiveSubtotal;
        totalTaxAmount += taxResult.totalTaxAmount;

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
          unit: item.unit || 'pcs',
          total: effectiveSubtotal + taxResult.totalTaxAmount,
          taxDetails: taxResult.breakdown,
          updatedAt: new Date()
        });
      }

      const finalGrandTotal = calculatedSubtotal + totalTaxAmount + Number(shippingCharges || 0) - Number(discount || 0) - Number(tds || 0);

      return tx.salesOrder.create({
        data: {
          businessId: req.business.id,
          orderNumber: await generateOrderNumber(req.business.id),
          customerId,
          quotationId: quotationId || null,
          dealId: dealId || null,
          assignedToId: assignedToId || null,
          subtotal: calculatedSubtotal,
          tax: totalTaxAmount,
          discount: Number(discount || 0),
          shippingCharges: Number(shippingCharges || 0),
          totalAmount: finalGrandTotal,
          orderDate: new Date(orderDate),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          notes,
          termsConditions,
          currency: currency || customer.currency || settings?.currency || "AED",
          customerReference,
          shippingMethod,
          paymentTerms,
          deliveryInstructions,
          placeOfSupply,
          // India fields
          cgst: Number(cgst || 0),
          sgst: Number(sgst || 0),
          igst: Number(igst || 0),
          tds: Number(tds || 0),
          ewayBillNo,
          reverseCharge: !!reverseCharge,
          transportDetails,
          // UAE fields
          vatPercentage: Number(vatPercentage || 0),
          vatAmount: Number(vatAmount || 0),
          vatType,
          emirate,
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
    const {
      customerId,
      items,
      discount = 0,
      shippingCharges = 0,
      orderDate,
      deliveryDate,
      status,
      // Tax fields
      cgst,
      sgst,
      igst,
      tds,
      ewayBillNo,
      reverseCharge,
      transportDetails,
      vatPercentage,
      vatAmount,
      vatType = "exclusive",
      emirate,
      ...otherData
    } = req.body;

    // 1. Check if order exists
    const existingOrder = await prisma.salesOrder.findFirst({
      where: { id, businessId: req.business.id },
      include: { items: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Sales order not found" });
    }

    // 2. Normalize status
    let normalizedStatus = status;
    if (status) {
      const statusMap = {
        'Draft': 'DRAFT',
        'Confirmed': 'CONFIRMED',
        'Approved': 'APPROVED',
        'Partially Fulfilled': 'PARTIALLY_FULFILLED',
        'Fulfilled': 'FULFILLED',
        'Cancelled': 'CANCELLED'
      };
      normalizedStatus = statusMap[status] || status.toUpperCase();
    }

    // 3. Recalculate if items are provided
    const result = await prisma.$transaction(async (tx) => {
      let finalUpdateData = {
        ...otherData,
        discount: Number(discount),
        shippingCharges: Number(shippingCharges),
        status: normalizedStatus,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        cgst: Number(cgst),
        sgst: Number(sgst),
        igst: Number(igst),
        tds: Number(tds),
        ewayBillNo,
        reverseCharge: !!reverseCharge,
        transportDetails,
        vatPercentage: Number(vatPercentage),
        vatAmount: Number(vatAmount),
        vatType,
        emirate
      };

      if (items && items.length > 0) {
        // Fetch customer and settings for calculations
        const customer = await tx.customer.findFirst({
          where: { id: customerId || existingOrder.customerId, businessId: req.business.id },
        });
        const settings = await tx.settings.findUnique({
          where: { businessId: req.business.id },
        });

        let calculatedSubtotal = 0;
        let totalTaxAmount = 0;
        const mappedItems = [];

        // Delete existing items
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

        for (const item of items) {
          const lineAmount = Number(item.quantity || 0) * Number(item.price || 0);
          
          const taxResult = TaxEngine.calculateTax({
            companyCountry: settings?.country || 'UAE',
            companyState: settings?.state || '',
            customerCountry: customer.country || 'UAE',
            customerState: customer.state || '',
            taxPercent: Number(item.taxPercent || 0),
            lineSubtotal: lineAmount,
            vatType: vatType || 'exclusive',
            manualTax: {
              cgstRate: item.cgstPercent,
              sgstRate: item.sgstPercent,
              igstRate: item.igstPercent
            }
          });

          const effectiveSubtotal = taxResult.effectiveSubtotal !== undefined ? taxResult.effectiveSubtotal : lineAmount;
          calculatedSubtotal += effectiveSubtotal;
          totalTaxAmount += taxResult.totalTaxAmount;

          mappedItems.push({
            productId: item.productId,
            warehouseId: item.warehouseId,
            description: item.description || item.name,
            itemType: item.itemType || 'GOODS',
            hsnSacCode: item.hsnSacCode,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            taxPercent: Number(item.taxPercent || 0),
            unit: item.unit || 'pcs',
            total: effectiveSubtotal + taxResult.totalTaxAmount,
            taxDetails: taxResult.breakdown,
          });
        }

        const finalGrandTotal = calculatedSubtotal + totalTaxAmount + Number(shippingCharges) - Number(discount) - Number(tds || 0);
        
        finalUpdateData.subtotal = calculatedSubtotal;
        finalUpdateData.tax = totalTaxAmount;
        finalUpdateData.totalAmount = finalGrandTotal;
        finalUpdateData.items = { create: mappedItems };
      }

      return await tx.salesOrder.update({
        where: { id },
        data: finalUpdateData,
        include: { items: true }
      });
    });

    res.json({ success: true, order: result });

  } catch (error) {
    console.error("updateSalesOrder error:", error);
    res.status(500).json({ success: false, message: error.message });
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