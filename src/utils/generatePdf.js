const puppeteer = require("puppeteer");

const generatePdfBuffer = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  const pdf = await page.pdf({
    format: "A4",
  });

  await browser.close();

  return pdf;
};

module.exports = generatePdfBuffer;