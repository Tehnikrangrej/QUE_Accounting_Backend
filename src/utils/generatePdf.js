const puppeteer = require("puppeteer-core");
const { executablePath } = require("puppeteer");

const getChromePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : executablePath());

module.exports = async (html) => {
  let browser;
  try {
    console.log("🔍 Using Chrome at:", getChromePath());
    browser = await puppeteer.launch({
      headless: true,
      executablePath: getChromePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
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