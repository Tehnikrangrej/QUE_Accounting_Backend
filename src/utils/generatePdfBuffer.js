const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

module.exports=async(html)=>{

  const browser=await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });


  const page=await browser.newPage();

  await page.setContent(html,{waitUntil:"networkidle0"});

  const buffer=await page.pdf({
    format:"A4",
    printBackground:true
  });

  await browser.close();

  return buffer;
};