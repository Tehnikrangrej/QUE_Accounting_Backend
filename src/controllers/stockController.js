const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE / UPDATE STOCK
//////////////////////////////////////////////////////
exports.createStock = async (req, res) => {
  try {
    const { productId, warehouseId, quantity } = req.body;

    const stock = await prisma.stock.create({
      data: {
        productId,
        warehouseId,
        quantity: Number(quantity),
      },
    });

    res.status(201).json({ success: true, stock });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET ALL STOCK
//////////////////////////////////////////////////////
exports.getStock = async (req, res) => {
  const stock = await prisma.stock.findMany({
    include: { product: true, warehouse: true },
  });

  res.json({ success: true, stock });
};

//////////////////////////////////////////////////////
// UPDATE STOCK
//////////////////////////////////////////////////////
exports.updateStock = async (req, res) => {
  const updated = await prisma.stock.updateMany({
    where: { id: req.params.id },
    data: req.body,
  });

  if (updated.count === 0) {
    return res.status(404).json({
      success: false,
      message: "Stock not found",
    });
  }

  res.json({ success: true, message: "Updated" });
};

//////////////////////////////////////////////////////
// DELETE STOCK
//////////////////////////////////////////////////////
exports.deleteStock = async (req, res) => {
  const deleted = await prisma.stock.deleteMany({
    where: { id: req.params.id },
  });

  if (deleted.count === 0) {
    return res.status(404).json({
      success: false,
      message: "Stock not found",
    });
  }

  res.json({ success: true, message: "Deleted" });
};