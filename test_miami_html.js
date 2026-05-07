const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

async function captureDOM() {
    console.log("Tomando radiografía de Miami-Dade...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto("https://supplier.miamidade.gov/psp/EXTSUPP/SUPPLIER/ERP/c/SCP_PUBLIC_MENU_FL.SCP_PUB_BID_CMP_FL.GBL", { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000); 

    const content = await page.content();
    fs.writeFileSync('debug_miamide.html', content);
    console.log("HTML capturado y guardado con éxito.");

    await browser.close();
}

captureDOM();
