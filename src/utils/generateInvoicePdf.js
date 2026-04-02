const puppeteer = require("puppeteer");
const invoiceTemplate = require("../templates/invoiceTemplate");

module.exports = async (invoice, settings) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const html = invoiceTemplate(invoice, settings);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    console.log("✅ PDF Buffer size:", pdfBuffer?.length, "bytes");
    return pdfBuffer;

  } catch (err) {
    console.error("❌ PDF generation error:", err.message);
    return null;

  } finally {
    if (browser) await browser.close();
  }
};
