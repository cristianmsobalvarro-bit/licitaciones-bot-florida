const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(targets, keywords) {
    const allResults = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    console.log(`\n📚 Iniciando Scraper de VENDORLINK (${targets.length} objetivos)`);
    const browser = await chromium.launch({ headless: true });
    
    for (const target of targets) {
        if (!target.url || target.url === "pending_url") continue;

        const delay = Math.floor(Math.random() * 3000) + 1000;
        console.log(`[VendorLink] Esperando ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));

        console.log(`\n--> [VendorLink] Entrando a: ${target.nombre}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(6000); 

            // Extraer tabla de resultados
            const projects = await page.evaluate(({ countyName }) => {
                const results = [];
                // Selectores comunes en VendorLink (ASP.NET GridView)
                const rows = document.querySelectorAll('table[id*="grvSolicitations"] tr, table.Grid tr, tr.rgRow, tr.rgAltRow, .solicitation-row');
                
                rows.forEach(row => {
                    const tds = row.querySelectorAll('td');
                    if (tds.length < 3) return;
                    
                    const titleEl = row.querySelector('td:nth-child(3), td.title');
                    const linkEl = row.querySelector('a');
                    const dateEl = row.querySelector('td:last-child, .date-cell');
                    const numEl = row.querySelector('td:nth-child(2)');

                    if (titleEl) {
                        const title = titleEl.innerText.trim();
                        const link = linkEl ? linkEl.href : '';
                        const date = dateEl ? dateEl.innerText.trim() : 'N/A';
                        const num = numEl ? numEl.innerText.trim() : 'N/A';
                        
                        if (title.length > 5 && !title.toLowerCase().includes('solicitation title')) {
                            results.push({
                                provincia: countyName,
                                organizacion: countyName,
                                titulo: title,
                                numero_licitacion: num,
                                estado: 'OPEN',
                                fecha_cierre_original: date,
                                fuente: 'VendorLink',
                                enlace: link || window.location.href
                            });
                        }
                    }
                });
                return results;
            }, { countyName: target.nombre });

            // Filtrado por keywords y normalización
            for (const keyword of keywordList) {
                const filtered = projects
                    .filter(p => p.titulo.toLowerCase().includes(keyword.toLowerCase()))
                    .map(p => {
                        let closeNorm = 'N/A';
                        const raw = p.fecha_cierre_original;
                        if (raw.includes('/')) {
                            const datePart = raw.split(' ')[0];
                            const parts = datePart.split('/');
                            if (parts.length === 3) {
                                closeNorm = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                            }
                        }
                        return {
                            ...p,
                            fecha_cierre_normalizada: closeNorm,
                            keyword_matched: keyword,
                            fecha_extraccion: new Date().toISOString()
                        };
                    });

                const valid = filtered.filter(p => isValidBid(p.titulo, p.enlace, '', keyword));
                if (valid.length > 0) {
                    allResults.push(...valid);
                    console.log(`    ✅ VendorLink [${target.nombre}]: ${valid.length} encontradas`);
                }
            }

        } catch (error) {
            console.error(`    ❌ Error VendorLink en ${target.nombre}:`, error.message);
        } finally {
            await page.close();
            await context.close();
        }
    }

    await browser.close();
    return allResults;
}

module.exports = { scrape };
