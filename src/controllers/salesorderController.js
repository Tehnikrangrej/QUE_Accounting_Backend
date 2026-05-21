const salesOrderService = require("../services/sales/salesOrder.service");
const { createSalesOrderSchema, updateSalesOrderSchema } = require("../validations/sales.validation");
const { successResponse, errorResponse } = require("../utils/response");

exports.createSalesOrder = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;

    // Validate payload using Zod
    const validatedData = createSalesOrderSchema.parse(req.body);

    const order = await salesOrderService.createSalesOrder(businessId, userId, userEmail, validatedData);

    return successResponse(res, order, "Sales Order created successfully and stock reserved", 201);
  } catch (error) {
    console.error("createSalesOrder controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

exports.convertQuotation = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { quotationId } = req.params;

    const order = await salesOrderService.convertQuotationToSalesOrder(businessId, userId, userEmail, quotationId);

    return successResponse(res, order, "Quotation converted to Sales Order successfully", 201);
  } catch (error) {
    console.error("convertQuotation controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.getSalesOrders = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { customerId, status } = req.query;

    const prisma = require("../config/prisma");
    const orders = await prisma.salesOrder.findMany({
      where: {
        businessId,
        isDeleted: false,
        customerId: customerId || undefined,
        status: status || undefined
      },
      include: {
        customer: {
          select: { id: true, name: true, company: true }
        },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, orders, "Sales Orders fetched successfully");
  } catch (error) {
    console.error("getSalesOrders controller error:", error);
    return errorResponse(res, error.message, 500);
  }
};

exports.getSalesOrderById = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const order = await salesOrderService.getSalesOrderById(businessId, id);

    return successResponse(res, order, "Sales Order retrieved successfully");
  } catch (error) {
    console.error("getSalesOrderById controller error:", error);
    return errorResponse(res, error.message, 404);
  }
};

exports.updateSalesOrder = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    // Validate payload using Zod
    const validatedData = updateSalesOrderSchema.parse(req.body);

    const order = await salesOrderService.updateSalesOrder(businessId, userId, userEmail, id, validatedData);

    return successResponse(res, order, "Sales Order updated successfully");
  } catch (error) {
    console.error("updateSalesOrder controller error:", error);
    if (error.name === "ZodError") {
      return errorResponse(res, error.errors[0].message, 400, error.errors);
    }
    return errorResponse(res, error.message, 400);
  }
};

exports.deleteSalesOrder = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;

    await salesOrderService.deleteSalesOrder(businessId, userId, userEmail, id);

    return successResponse(res, null, "Sales Order deleted and stock reservation released successfully");
  } catch (error) {
    console.error("deleteSalesOrder controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const businessId = req.business.id;
    const userId = req.user.userId || req.user.id;
    const userEmail = req.user.email;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return errorResponse(res, "Status is required", 400);
    }

    const order = await salesOrderService.changeStatus(businessId, userId, userEmail, id, status);

    return successResponse(res, order, "Sales Order status updated successfully");
  } catch (error) {
    console.error("changeStatus controller error:", error);
    return errorResponse(res, error.message, 400);
  }
};