const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET ALL CREDIT NOTES
//////////////////////////////////////////////////////
exports.getAllCreditNotes = async (req, res) => {
  try {
    const businessId = req.business.id;

    const credits = await prisma.creditNote.findMany({
      where: { businessId },
      include: {
        customer: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const formatted = credits.map((credit) => ({
      id: credit.id,
      creditNumber: credit.creditNumber,
      amount: credit.amount,
      remainingAmount: credit.remainingAmount,
      status: credit.status,
        pdfUrl: credit.pdfUrl || null,
      createdAt: credit.createdAt,
      customer: credit.customer,
      invoice: credit.invoice,
    
      downloadUrl: credit.pdfUrl
        ? `${baseUrl}/api/credit-notes/${credit.id}/download`
        : null,
    }));

    return successResponse(res, formatted);

  } catch (error) {
    console.error("Get All Credit Notes Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// GET SINGLE CREDIT NOTE
//////////////////////////////////////////////////////
exports.getCreditNote = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const credit = await prisma.creditNote.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        invoice: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!credit) {
      return errorResponse(res, "Credit note not found", 404);
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    return successResponse(res, {
      ...credit,
      downloadUrl: credit.pdfUrl
        ? `${baseUrl}/api/credit-notes/${credit.id}/download`
        : null,
    });

  } catch (error) {
    console.error("Get Credit Note Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// DOWNLOAD CREDIT NOTE PDF
//////////////////////////////////////////////////////
exports.downloadCreditNotePdf = async (req, res) => {
  try {
    const businessId = req.business.id;
    const { id } = req.params;

    const credit = await prisma.creditNote.findFirst({
      where: { id, businessId },
      select: {
        pdfUrl: true,
        creditNumber: true,
      },
    });

    if (!credit || !credit.pdfUrl) {
      return errorResponse(res, "PDF not found", 404);
    }

    ////////////////////////////////////////////////////
    // Cloudinary Force Download
    ////////////////////////////////////////////////////
    const downloadUrl = credit.pdfUrl.replace(
      "/upload/",
      "/upload/fl_attachment/"
    );

    return res.redirect(downloadUrl);

  } catch (error) {
    console.error("Download Credit Note Error:", error);
    return errorResponse(res, "Download failed", 500);
  }
};