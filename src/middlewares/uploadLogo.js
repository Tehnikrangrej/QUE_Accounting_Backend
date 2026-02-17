const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "business-logos",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  }),
});

const uploadLogo = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = uploadLogo;
