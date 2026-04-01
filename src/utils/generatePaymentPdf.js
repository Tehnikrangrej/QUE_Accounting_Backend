const puppeteer = require("puppeteer");
const template = require("../templates/paymentReceiptTemplate");

module.exports = async (payment, invoice, settings) => {
  try {
    const html = template(payment, invoice, settings);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return pdfBuffer;
  } catch (err) {
    console.error("PUPPETEER ERROR:", err);
    throw err; // 🔥 DO NOT swallow error
  }
};