const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE PRODUCT
//////////////////////////////////////////////////////
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      sku,
      price,
      costPrice,

      type,      // 🔥 NEW (GOODS / SERVICE)
      taxCode,   // 🔥 NEW (HSN / SAC)

      unit = "pcs",
    } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATION
    //////////////////////////////////////////////////////
    if (!name || !sku || !price || !type) {
      return res.status(400).json({
        success: false,
        message: "name, sku, price and type are required",
      });
    }

    if (!["GOODS", "SERVICE"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type (GOODS / SERVICE)",
      });
    }

    //////////////////////////////////////////////////////
    // CREATE
    //////////////////////////////////////////////////////
    const product = await prisma.product.create({
      data: {
        businessId: req.business.id,
        name,
        description,
        sku,
        price: Number(price),
        costPrice: Number(costPrice || 0),

        type,        // 🔥 SAVE
        taxCode,     // 🔥 SAVE

        unit,
      },
    });

    res.status(201).json({
      success: true,
      product,
    });

  } catch (error) {
    console.error("createProduct error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET ALL PRODUCTS
//////////////////////////////////////////////////////
exports.getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.business.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      products,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET SINGLE PRODUCT
//////////////////////////////////////////////////////
exports.getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        businessId: req.business.id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// UPDATE PRODUCT
//////////////////////////////////////////////////////
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, ...rest } = req.body;

    //////////////////////////////////////////////////////
    // VALIDATE TYPE
    //////////////////////////////////////////////////////
    if (type && !["GOODS", "SERVICE"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type",
      });
    }

    //////////////////////////////////////////////////////
    // UPDATE
    //////////////////////////////////////////////////////
    const updated = await prisma.product.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: {
        ...rest,
        ...(type && { type }),
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product updated",
    });

  } catch (error) {
    console.error("updateProduct error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// DELETE PRODUCT
//////////////////////////////////////////////////////
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.product.deleteMany({
      where: {
        id,
        businessId: req.business.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted",
    });

  } catch (error) {
    console.error("deleteProduct error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};