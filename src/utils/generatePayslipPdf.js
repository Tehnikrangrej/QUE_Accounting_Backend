const puppeteer = require("puppeteer");
const payslipTemplate = require("../templates/payslipTemplate");

module.exports = async (payslip, settings) => {

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  const html = payslipTemplate(payslip, settings);

  //////////////////////////////////////////////////////
  // IMPORTANT: wait for images to load
  //////////////////////////////////////////////////////
  await page.setContent(html, {
    waitUntil: "networkidle0"
  });

  //////////////////////////////////////////////////////
  // wait for logo image
  //////////////////////////////////////////////////////
  if (settings?.companyLogo) {
    try {
      await page.waitForSelector("img");
    } catch (e) {}
  }

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  return pdfBuffer;
};