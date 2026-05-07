const { chromium } = require('playwright-extra');
const { isValidBid } = require('../../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(target, keywords) {
    const results = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    const browser = await chromium.launch({ headless: true });
    
    try {
        console.log(`\n--> [Custom-JAXPORT] Conectando a JAXPORT: ${target.url}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(5000);

        const items = await page.evaluate((countyName) => {
            const data = [];
            const rows = document.querySelectorAll('table tr, .solicitation-item');
            rows.forEach(row => {
                const titleEl = row.querySelector('a, td:nth-child(2)');
                if (titleEl) {
                    const title = titleEl.innerText.trim();
                    if (title.length < 5 || title.toLowerCase().includes('solicitation title')) return;
                    
                    const numEl = row.querySelector('td:nth-child(1)');
                    const dateEl = row.querySelector('td:nth-child(4), td:last-child');
                    const linkEl = row.querySelector('a');

                    data.push({
                        provincia: countyName,
                        organizacion: countyName,
                        titulo: title,
                        numero_licitacion: numEl ? numEl.innerText.trim() : 'N/A',
                        estado: 'OPEN',
                        enlace: linkEl ? linkEl.href : window.location.href,
                        fecha_cierre_original: dateEl ? dateEl.innerText.trim() : 'N/A',
                        fuente: 'JAXPORT Portal'
                    });
                }
            });
            return data;
        }, target.nombre);

        for (const kw of keywordList) {
            const mapped = items
                .filter(b => b.titulo.toLowerCase().includes(kw.toLowerCase()))
                .map(b => {
                    let closeNorm = 'N/A';
                    const raw = b.fecha_cierre_original;
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

            const valid = mapped.filter(p => isValidBid(p.titulo, p.enlace, '', kw));
            if (valid.length > 0) {
                results.push(...valid);
                console.log(`    ✅ JAXPORT [${kw}]: ${valid.length} encontradas`);
            }
        }
    } catch (error) {
        console.error(`    ❌ Error en JAXPORT:`, error.message);
    } finally {
        await browser.close();
    }
    return results;
}

module.exports = { scrape };
