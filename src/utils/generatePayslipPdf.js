const puppeteer = require("puppeteer");
const payslipTemplate = require("../templates/payslipTemplate");

module.exports = async (payslip, settings) => {

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  //////////////////////////////////////////////////////
  // GENERATE HTML
  //////////////////////////////////////////////////////
  const html = payslipTemplate(payslip, settings || {});

  //////////////////////////////////////////////////////
  // LOAD HTML
  //////////////////////////////////////////////////////
  await page.setContent(html, {
    waitUntil: "domcontentloaded"
  });

  //////////////////////////////////////////////////////
  // GENERATE PDF
  //////////////////////////////////////////////////////
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  return pdfBuffer;
};