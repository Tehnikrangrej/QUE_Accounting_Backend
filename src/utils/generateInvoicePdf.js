const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const invoiceTemplate = require("../templates/invoiceTemplate");

module.exports = async (invoice, settings) => {

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  const html = invoiceTemplate(invoice, settings);

  await page.setContent(html, {
    waitUntil: "networkidle0"
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  return pdfBuffer;
};