const puppeteer = require("puppeteer");
const payslipTemplate = require("../templates/payslipTemplate");

module.exports = async (payslip, settings) => {

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox","--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  const html = payslipTemplate(payslip, settings);

  await page.setContent(html,{
    waitUntil:"networkidle0"
  });

  const pdfBuffer = await page.pdf({
    format:"A4",
    printBackground:true
  });

  await browser.close();

  return pdfBuffer;

};