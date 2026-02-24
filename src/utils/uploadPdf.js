const cloudinary = require("../config/cloudinary");

const uploadPdf = (buffer, creditNumber) => {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "credit-note-pdfs",
        public_id: creditNumber,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
};

module.exports = uploadPdf;