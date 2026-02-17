const puppeteer = require("puppeteer");
const invoiceTemplate = require("../templates/invoiceTemplate");

module.exports = async (invoice, settings) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const html = invoiceTemplate(invoice, settings);

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
