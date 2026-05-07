const { chromium } = require('playwright-extra');
const { isValidBid } = require('../../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(target, keywords) {
    const results = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    const browser = await chromium.launch({ headless: true });
    
    try {
        const correctUrl = "https://www.wpb.org/Departments/Procurement/Solicitations";
        console.log(`\n--> [Custom-WestPalmBeach] Reparación Quirúrgica: ${correctUrl}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(correctUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(6000);

        const items = await page.evaluate((countyName) => {
            const data = [];
            // Basado en investigación del subagente: Cards/Links
            const cards = document.querySelectorAll('a[href^="/Bids/"], .ListItem');
            
            cards.forEach(card => {
                const titleEl = card.querySelector('h2, .Title, span[id*="Title"]');
                if (!titleEl) return;
                
                const title = titleEl.innerText.trim();
                if (title.length < 5 || title.toLowerCase().includes('solicitation title')) return;

                const link = card.href;
                const pTags = card.querySelectorAll('p');
                let ref = 'N/A';
                let rawDate = 'N/A';

                pTags.forEach(p => {
                    const text = p.innerText.trim();
                    if (text.includes('Reference number:')) {
                        ref = text.replace('Reference number:', '').trim();
                    }
                    if (text.startsWith('Closed') || text.startsWith('Open')) {
                        rawDate = text.trim();
                    }
                });

                data.push({
                    provincia: countyName,
                    organizacion: countyName,
                    titulo: title,
                    numero_licitacion: ref,
                    estado: 'OPEN',
                    enlace: link,
                    fecha_cierre_original: rawDate,
                    fuente: 'West Palm Beach Portal'
                });
            });
            return data;
        }, target.nombre);

        for (const kw of keywordList) {
            const filtered = items
                .filter(b => b.titulo.toLowerCase().includes(kw.toLowerCase()))
                .map(b => {
                    let closeNorm = 'N/A';
                    const raw = b.fecha_cierre_original;
                    // WPB suele usar "Closed MM/DD/YYYY @ HH:MM AM" o similar
                    const dateMatch = raw.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
                    if (dateMatch) {
                        const parts = dateMatch[0].split('/');
                        if (parts.length === 3) {
                            closeNorm = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
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
                console.log(`    ✅ West Palm Beach [${kw}]: ${valid.length} encontradas`);
            }
        }
    } catch (error) {
        console.error(`    ❌ Error en West Palm Beach (Reparación):`, error.message);
    } finally {
        await browser.close();
    }
    return results;
}

module.exports = { scrape };
