const prisma = require("../config/prisma");

const VALID_STATUS = ["Draft", "Sent", "Accepted", "Rejected"];

//////////////////////////////////////////////////////
// GENERATE QUOTE NUMBER
//////////////////////////////////////////////////////
const generateQuoteNumber = async () => {
  const count = await prisma.quotation.count();
  return `QT-${(count + 1).toString().padStart(3, "0")}`;
};

//////////////////////////////////////////////////////
// CREATE QUOTATION
//////////////////////////////////////////////////////
exports.createQuotation = async (req, res) => {
  try {
    const {
      title,
      customerId,
      dealId,
      assignedToId,
      items,
      tax = 0,
      discount = 0,
      issueDate,
      expiryDate,
      notes,
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////////
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerId and items are required",
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
    let calculatedSubtotal = 0
    let totalTaxAmount = 0

    const mappedItems = items.map((item) => {
      const lineAmount = Number(item.quantity || 0) * Number(item.price || 0)
      const lineTax = (lineAmount * Number(item.taxPercent || 0)) / 100
      
      calculatedSubtotal += lineAmount
      totalTaxAmount += lineTax

      return {
        name: item.name,
        type: item.type || 'GOODS',
        hsn: item.hsn,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        taxPercent: Number(item.taxPercent || 0),
        total: lineAmount + lineTax,
      }
    })

    const finalGrandTotal = calculatedSubtotal + totalTaxAmount - Number(discount || 0)

    //////////////////////////////////////////////////////
    // CREATE
    //////////////////////////////////////////////////////
    const quotation = await prisma.quotation.create({
      data: {
        businessId: req.business.id,
        quoteNumber: await generateQuoteNumber(),

        title,
        customerId,
        dealId,
        assignedToId,

        subtotal: calculatedSubtotal,
        tax: totalTaxAmount,
        discount: Number(discount || 0),
        totalAmount: finalGrandTotal,

        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,

        notes,

        items: {
          create: mappedItems,
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      quotation,
    });

  } catch (error) {
    console.error("createQuotation error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL QUOTATIONS
//////////////////////////////////////////////////////
exports.getQuotations = async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      where: {
        businessId: req.business.id,
      },
      include: {
        customer: true,
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
      quotations,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE QUOTATION
//////////////////////////////////////////////////////
exports.getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findFirst({
      where: {
        id,
        businessId: req.business.id,
      },
      include: {
        customer: true,
        deal: true,
        items: true,
        assignedTo: {
          include: { user: true },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.json({
      success: true,
      quotation,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE QUOTATION
//////////////////////////////////////////////////////
exports.updateQuotation = async (req, res) => {
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
    // UPDATE
    //////////////////////////////////////////////////////
    const quotation = await prisma.quotation.update({
      where: { id },
      data: req.body,
      include: {
        items: true,
      },
    });

    res.json({
      success: true,
      quotation,
    });

  } catch (error) {
    console.error("updateQuotation error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE QUOTATION
//////////////////////////////////////////////////////
exports.deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.quotation.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.json({
      success: true,
      message: "Quotation deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};