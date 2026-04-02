const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const invoiceTemplate = require("../templates/invoiceTemplate");

module.exports = async (invoice, settings) => {

  const executablePath = await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: executablePath || "/usr/bin/chromium",
    headless: true,
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