const prisma = require("../config/prisma");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");

//////////////////////////////////////////////////////
// CREATE INVOICE
//////////////////////////////////////////////////////

exports.createInvoice = async (req, res) => {
  try {
    const { customerId, issuedDate, dueDate, items } = req.body;

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(
        tx,
        req.business.id
      );

      let totalAmount = 0;

      items.forEach((item) => {
        totalAmount += Number(item.price) * item.quantity;
      });

      return await tx.invoice.create({
        data: {
          businessId: req.business.id,
          customerId,
          invoiceNumber,
          issuedDate,
          dueDate,
          totalAmount,
          items: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: { items: true },
      });
    });

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//////////////////////////////////////////////////////
// GET INVOICES
//////////////////////////////////////////////////////

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { businessId: req.business.id },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//////////////////////////////////////////////////////
// UPDATE INVOICE STATUS
//////////////////////////////////////////////////////

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const invoice = await prisma.invoice.update({
      where: { 
        id,
        businessId: req.business.id 
      },
      data: { status },
      include: { customer: true, items: true },
    });

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
