const cloudinary = require("../config/cloudinary");

module.exports = async (pdfBuffer, invoiceNumber) => {
    if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("PDF buffer is empty or null — cannot upload");
  }
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // 🔥 REQUIRED FOR PDF
        folder: "invoice-pdfs",
        public_id: invoiceNumber,
        format: "pdf",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve(result.secure_url);
      }
    );

    stream.end(pdfBuffer);
  });
};
