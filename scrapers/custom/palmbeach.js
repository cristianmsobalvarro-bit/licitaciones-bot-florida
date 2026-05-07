const { chromium } = require('playwright-extra');
const { isValidBid } = require('../../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(target, keywords) {
    const results = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    const browser = await chromium.launch({ headless: true });
    
    try {
        console.log(`\n--> [Custom-PalmBeach] Conectando al portal VSS: ${target.url}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(6000);

        for (const kw of keywordList) {
            try {
                const searchInput = await page.$('input[name*="KEYWORD"], input[name*="keyword"]');
                if (searchInput) {
                    await searchInput.fill(kw);
                    await page.keyboard.press('Enter');
                    await page.waitForTimeout(4000);
                }

                const items = await page.evaluate(({ countyName }) => {
                    const data = [];
                    const rows = document.querySelectorAll('table tr');
                    rows.forEach(row => {
                        const tds = row.querySelectorAll('td');
                        if (tds.length < 3) return;
                        const title = tds[1] ? tds[1].innerText.trim() : '';
                        const bidNum = tds[0] ? tds[0].innerText.trim() : '';
                        const aTag = row.querySelector('a');
                        const date = tds[3] ? tds[3].innerText.trim() : 'N/A';

                        if (title.length > 5 && !title.toLowerCase().includes('solicitation title')) {
                            data.push({
                                provincia: countyName,
                                organizacion: 'Palm Beach County',
                                titulo: title,
                                numero_licitacion: bidNum || 'N/A',
                                estado: 'OPEN',
                                fecha_cierre_original: date,
                                fuente: 'Palm Beach VSS',
                                enlace: aTag ? aTag.href : window.location.href
                            });
                        }
                    });
                    return data;
                }, { countyName: target.nombre });

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
                    console.log(`    ✅ Palm Beach [${kw}]: ${valid.length} encontradas`);
                }

                if (keywordList.indexOf(kw) < keywordList.length - 1) {
                    await page.goBack();
                    await page.waitForTimeout(2000);
                }
            } catch (innerErr) {
                console.error(`    ❌ Error en keyword "${kw}" en Palm Beach:`, innerErr.message);
            }
        }
    } catch (error) {
        console.error(`    ❌ Error en Palm Beach:`, error.message);
    } finally {
        await browser.close();
    }
    return results;
}

module.exports = { scrape };
