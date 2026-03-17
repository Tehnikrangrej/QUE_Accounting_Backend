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
    waitUntil: "domcontentloaded", // ⚡ fast
  });

  //////////////////////////////////////////////////////
  // 🔥 WAIT FOR IMAGES TO LOAD (IMPORTANT FIX)
  //////////////////////////////////////////////////////
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map(img => {
        if (img.complete) return;
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  });

  //////////////////////////////////////////////////////
  // OPTIONAL SMALL DELAY (STABILITY)
  //////////////////////////////////////////////////////
  await new Promise(res => setTimeout(res, 300));

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await page.close();

  return pdfBuffer;
};