const { chromium } = require('playwright-extra');
const { isValidBid } = require('../../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(target, keywords) {
    const results = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    const browser = await chromium.launch({ headless: true });
    
    try {
        const correctUrl = "https://www.polkfl.gov/business/procurement/";
        console.log(`\n--> [Custom-Polk] Reparación Quirúrgica: ${correctUrl}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(correctUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(5000);

        const items = await page.evaluate((countyName) => {
            const data = [];
            // Basado en investigación del subagente: tabla estándar
            const rows = document.querySelectorAll('table tr');
            rows.forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length < 3) return;
                
                // td1: Bid ID + Link, td2: Title, td3: Date
                const idLinkEl = tds[0].querySelector('a');
                const titleEl = tds[1];
                const dateEl = tds[2];

                if (titleEl && idLinkEl) {
                    const title = titleEl.innerText.trim();
                    if (title.length < 5 || title.toLowerCase().includes('solicitation title')) return;

                    data.push({
                        provincia: countyName,
                        organizacion: countyName,
                        titulo: title,
                        numero_licitacion: idLinkEl.innerText.trim(),
                        estado: 'OPEN',
                        enlace: idLinkEl.href,
                        fecha_cierre_original: dateEl ? dateEl.innerText.trim() : 'N/A',
                        fuente: 'Polk County Portal'
                    });
                }
            });
            return data;
        }, target.nombre);

        for (const kw of keywordList) {
            const filtered = items
                .filter(b => b.titulo.toLowerCase().includes(kw.toLowerCase()))
                .map(b => {
                    let closeNorm = 'N/A';
                    const raw = b.fecha_cierre_original;
                    // Polk suele usar MM/DD/YYYY
                    if (raw.includes('/')) {
                        const datePart = raw.split(' ')[0];
                        const parts = datePart.split('/');
                        if (parts.length === 3) {
                            closeNorm = `${parts[2].trim()}-${parts[0].trim().padStart(2, '0')}-${parts[1].trim().padStart(2, '0')}`;
                        }
                    }
                    return {
                        ...b,
                        keyword_matched: kw,
                        fecha_cierre_normalizada: closeNorm,
                        fecha_extraccion: new Date().toISOString()
                    };
                });

            const valid = filtered.filter(p => isValidBid(p.titulo, p.enlace, '', kw));
            if (valid.length > 0) {
                results.push(...valid);
                console.log(`    ✅ Polk [${kw}]: ${valid.length} encontradas`);
            }
        }
    } catch (error) {
        console.error(`    ❌ Error en Polk (Reparación):`, error.message);
    } finally {
        await browser.close();
    }
    return results;
}

module.exports = { scrape };
