const puppeteer = require("puppeteer-core");
const { executablePath } = require("puppeteer");
const template = require("../templates/paymentReceiptTemplate");

const getChromePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : executablePath());

module.exports = async (payment, invoice, settings) => {
  let browser;
  try {
    console.log("🔍 Using Chrome at:", getChromePath());
    browser = await puppeteer.launch({
      headless: true,
      executablePath: getChromePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const page = await browser.newPage();
    const html = template(payment, invoice, settings);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1000));
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    console.log("✅ PDF size:", pdfBuffer?.length, "bytes");
    return pdfBuffer;
  } catch (err) {
    console.error("❌ PDF error:", err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};