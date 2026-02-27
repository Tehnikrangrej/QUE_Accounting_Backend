const puppeteer = require("puppeteer");
const template = require("../templates/paymentReceiptTemplate");

module.exports = async (payment, invoice, settings) => {

  const html = template(payment, invoice, settings);

  const browser = await puppeteer.launch({
    headless: "new",
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdfBuffer;
};