const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const invoiceTemplate = require("../templates/invoiceTemplate");

module.exports = async (invoice, settings) => {
  let browser;
  try {
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH
      || (process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : await chromium.executablePath());

    console.log("🔍 Using Chrome at:", execPath);

    browser = await puppeteer.launch({
      headless: chromium.headless,
      executablePath: execPath,
      args: chromium.args,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const html = invoiceTemplate(invoice, settings);
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