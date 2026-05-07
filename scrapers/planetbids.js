const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(targets, keywords) {
    const allResults = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    console.log(`\n🪐 Iniciando Scraper PLANETBIDS (${targets.length} objetivos)`);
    
    const browser = await chromium.launch({ headless: true });

    for (const target of targets) {
        if (!target.url) continue;

        const delay = Math.floor(Math.random() * 3000) + 1000;
        console.log(`[PlanetBids] Esperando ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));

        console.log(`\n--> [PlanetBids] Entrando a: ${target.nombre}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(7000); // Dar tiempo a que el SPA cargue y se muestren las licitaciones públicas

            const items = await page.evaluate(({ countyName }) => {
                const data = [];
                // PlanetBids usa diversos selectores según el portal
                const rows = document.querySelectorAll('.bid-row, .solicitation-row, table tr, [class*="bid"]');
                
                rows.forEach(row => {
                    const titleEl = row.querySelector('.project-name, a.title, h4, a');
                    if (titleEl) {
                        const title = titleEl.innerText.trim();
                        if (title.length < 5 || title.toLowerCase().includes('solicitation title')) return;
                        
                        const linkEl = row.querySelector('a');
                        const link = linkEl ? linkEl.href : '';
                        const dateEl = row.querySelector('[class*="date"], td:last-child');
                        const date = dateEl ? dateEl.innerText.trim() : 'N/A';
                        const numEl = row.querySelector('[class*="number"], td:first-child');
                        const num = numEl ? numEl.innerText.trim() : 'N/A';

                        data.push({
                            provincia: countyName,
                            organizacion: countyName,
                            titulo: title,
                            numero_licitacion: num,
                            estado: 'OPEN',
                            fecha_cierre_original: date,
                            fuente: 'PlanetBids',
                            enlace: link || window.location.href
                        });
                    }
                });
                return data;
            }, { countyName: target.nombre });

            // Filtrado por keywords y normalización
            for (const keyword of keywordList) {
                const filtered = items
                    .filter(p => p.titulo.toLowerCase().includes(keyword.toLowerCase()))
                    .map(p => {
                        let closeNorm = 'N/A';
                        const raw = p.fecha_cierre_original;
                        // PlanetBids suele usar MM/DD/YYYY HH:MM AM/PM
                        if (raw.includes('/')) {
                            const datePart = raw.split(' ')[0];
                            const parts = datePart.split('/');
                            if (parts.length === 3) {
                                closeNorm = `${parts[2].trim()}-${parts[0].trim().padStart(2, '0')}-${parts[1].trim().padStart(2, '0')}`;
                            }
                        }
                        return {
                            ...p,
                            keyword_matched: keyword,
                            fecha_cierre_normalizada: closeNorm,
                            fecha_extraccion: new Date().toISOString()
                        };
                    });

                const valid = filtered.filter(p => isValidBid(p.titulo, p.enlace, '', keyword));
                if (valid.length > 0) {
                    allResults.push(...valid);
                    console.log(`    ✅ PlanetBids [${target.nombre}]: ${valid.length} encontradas`);
                }
            }

        } catch (error) {
            console.error(`    ❌ Error PlanetBids en ${target.nombre}:`, error.message);
        } finally {
            await page.close();
            await context.close();
        }
    }

    await browser.close();
    return allResults;
}

module.exports = { scrape };
