const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

module.exports = async (invoice, settings) => {

  const executablePath = await chromium.executablePath;

  if (!executablePath) {
    throw new Error("Chromium not found in environment");
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: executablePath,
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