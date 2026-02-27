const puppeteer = require("puppeteer");

module.exports = async (html) => {

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  //////////////////////////////////////////////////////
  // RETURN BUFFER (NOT FILE)
  //////////////////////////////////////////////////////
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdfBuffer;
};