const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

async function captureDOMs() {
    console.log("Tomando radiografía de Tampa y Jacksonville...");
    const browser = await chromium.launch({ headless: true });
    
    // 1. TAMPA
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    try {
        await page1.goto("https://www.tampa.gov/construction-bids", { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page1.waitForTimeout(5000); 
        const content1 = await page1.content();
        fs.writeFileSync('debug_tampa.html', content1);
        console.log("✅ Tampa HTML capturado.");
    } catch(e) { console.error("Error Tampa:", e.message); }
    await context1.close();

    // 2. JACKSONVILLE
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    try {
        await page2.goto("https://rfp.coj.net/rfp/solicitation/SolicitationAwards.asp", { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page2.waitForTimeout(5000); 
        const content2 = await page2.content();
        fs.writeFileSync('debug_jax.html', content2);
        console.log("✅ Jacksonville HTML capturado.");
    } catch(e) { console.error("Error JAX:", e.message); }
    await context2.close();

    await browser.close();
    console.log("Proceso terminado.");
}

captureDOMs();
