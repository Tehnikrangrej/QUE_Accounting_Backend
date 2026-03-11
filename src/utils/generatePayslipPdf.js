const puppeteer = require("puppeteer");
const template = require("../templates/payslipTemplate");

let browser;

const getBrowser = async () => {

  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }

  return browser;
};

module.exports = async (payslip, settings) => {

  const html = template(payslip, settings);

  const browserInstance = await getBrowser();

  const page = await browserInstance.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
    timeout: 300_000, // 5 minutes
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await page.close();

  return pdfBuffer;
};