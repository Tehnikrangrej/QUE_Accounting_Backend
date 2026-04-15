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
      taxPercent = 0,
      unit = "pcs",
    } = req.body;

    if (!name || !sku || !price) {
      return res.status(400).json({
        success: false,
        message: "name, sku and price are required",
      });
    }

    const product = await prisma.product.create({
      data: {
        businessId: req.business.id,
        name,
        description,
        sku,
        price: Number(price),
        costPrice: Number(costPrice || 0),
        taxPercent: Number(taxPercent),
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
// UPDATE PRODUCT
//////////////////////////////////////////////////////
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.product.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: req.body,
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};