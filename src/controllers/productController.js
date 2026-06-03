const prisma = require("../config/prisma");
const { fixProduct } = require("../utils/dataFixer");
const ProductWorkflow = require("../services/productWorkflow");

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
      type,
      taxCode,
      unit = "pcs",
      taxPercent = 0,
      initialQty = 0,
      warehouseId
    } = req.body;

    if (!name || !sku || !price || !type) {
      return res.status(400).json({
        success: false,
        message: "name, sku, price and type are required",
      });
    }

    const product = await ProductWorkflow.createProduct({
      businessId: req.business.id,
      name,
      description,
      sku,
      price: Number(price),
      costPrice: Number(costPrice || 0),
      type,
      hsnCode: taxCode,
      taxPercent: Number(taxPercent),
      unit,
      initialQty: Number(initialQty),
      warehouseId,
      performedBy: req.user.userId
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
// SEARCH PRODUCTS (For Dropdown)
//////////////////////////////////////////////////////
exports.searchProducts = async (req, res) => {
  try {
    const { q, warehouseId } = req.query;

    const products = await prisma.product.findMany({
      where: {
        businessId: req.business.id,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        stock: {
          where: warehouseId ? { warehouseId } : undefined
        }
      },
      take: 20
    });

    const formatted = products.map(p => {
      const totalStock = p.stock.reduce((sum, s) => sum + (s.quantity - s.reservedQty), 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        unit: p.unit,
        taxCode: p.taxCode,
        taxPercent: p.taxPercent,
        availableStock: totalStock,
        stockDetails: p.stock
      };
    });

    res.json({ success: true, products: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL PRODUCTS
//////////////////////////////////////////////////////
exports.getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.business.id },
      include: {
        categories: true,
        brands: true,
        units: true,
        stock: true
      }
    });

    const formattedProducts = products.map(p => fixProduct(p));

    res.json({
      success: true,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("getProducts error:", error);
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
      include: {
        categories: true,
        brands: true,
        units: true,
        stock: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product: fixProduct(product),
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
    const allowedFields = [
      "name", "description", "sku", "price", "costPrice", "taxPercent", 
      "unit", "isActive", "taxCode", "type", "attachments", "barcode", 
      "brandId", "categoryId", "image", "isBatchTracking", "isSerialTracking", 
      "minimumStock", "openingStock", "reorderLevel", "unitId"
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Map frontend names to backend names if they were missed
    if (req.body.sellingPrice !== undefined) updateData.price = req.body.sellingPrice;
    if (req.body.taxRate !== undefined) updateData.taxPercent = req.body.taxRate;
    if (req.body.hsnCode !== undefined) updateData.taxCode = req.body.hsnCode;

    const updated = await prisma.product.updateMany({
      where: {
        id,
        businessId: req.business.id,
      },
      data: updateData,
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

//////////////////////////////////////////////////////
// CATEGORIES
//////////////////////////////////////////////////////
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      where: { businessId: req.business.id }
    });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await prisma.categories.create({
      data: { ...req.body, businessId: req.business.id }
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const updated = await prisma.categories.updateMany({
      where: { id: req.params.id, businessId: req.business.id },
      data: req.body
    });
    if (updated.count === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await prisma.categories.deleteMany({
      where: { id: req.params.id, businessId: req.business.id }
    });
    if (deleted.count === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// BRANDS
//////////////////////////////////////////////////////
exports.getBrands = async (req, res) => {
  try {
    const brands = await prisma.brands.findMany({
      where: { businessId: req.business.id }
    });
    res.json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const brand = await prisma.brands.create({
      data: { ...req.body, businessId: req.business.id }
    });
    res.status(201).json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const updated = await prisma.brands.updateMany({
      where: { id: req.params.id, businessId: req.business.id },
      data: req.body
    });
    if (updated.count === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const deleted = await prisma.brands.deleteMany({
      where: { id: req.params.id, businessId: req.business.id }
    });
    if (deleted.count === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// UNITS
//////////////////////////////////////////////////////
exports.getUnits = async (req, res) => {
  try {
    const units = await prisma.units.findMany({
      where: { businessId: req.business.id }
    });
    res.json({ success: true, units });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUnit = async (req, res) => {
  try {
    const unit = await prisma.units.create({
      data: { ...req.body, businessId: req.business.id }
    });
    res.status(201).json({ success: true, unit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const updated = await prisma.units.updateMany({
      where: { id: req.params.id, businessId: req.business.id },
      data: req.body
    });
    if (updated.count === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    const deleted = await prisma.units.deleteMany({
      where: { id: req.params.id, businessId: req.business.id }
    });
    if (deleted.count === 0) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};