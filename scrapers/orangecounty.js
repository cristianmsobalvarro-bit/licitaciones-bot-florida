const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape() {
    console.log("--> Iniciando navegador Playwright Extra (Modo Stealth)...");
    
    // NOTA: Para evadir un poco mejor Cloudflare, usamos args de navegador real
    const browser = await chromium.launch({ 
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
        ]
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    // Portal oficial de Orange County
    const url = 'https://procurement.opengov.com/portal/orangecountyfl';
    console.log(`--> Conectando a Orange County OpenGov: ${url}`);
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log("--> Portal inicializado. Analizando capa de seguridad y contenido...");
        
        await page.waitForTimeout(10000); 
        
        // Scroll hacia abajo para forzar la carga de elementos
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(5000); 

        // Captura nueva para verificar si evadimos Cloudflare
        await page.screenshot({ path: 'debug_orangecounty_stealth.png', fullPage: true });

        const projects = await page.evaluate(() => {
            const results = [];
            const cards = document.querySelectorAll('a[href*="/portal/orangecountyfl/projects/"]');
            
            cards.forEach(card => {
                let title = card.innerText.trim();
                if(title.includes('\n')) {
                    const lines = title.split('\n');
                    title = lines.reduce((a, b) => a.length > b.length ? a : b); 
                }

                const link = card.href;
                
                if (title && title.length > 5 && !results.some(r => r.link === link)) {
                    results.push({
                        county: 'Orange County (FL)',
                        portal_type: 'OpenGov',
                        title: title,
                        status: 'Extracción Exitosa',
                        link: link,
                        date_scraped: new Date().toISOString()
                    });
                }
            });
            return results;
        });

        await browser.close();
        return projects;

    } catch (e) {
        console.error("❌ Error en Orange:", e.message);
        await browser.close();
        return [];
    }
}

module.exports = { scrape };
