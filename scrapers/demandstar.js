const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(targets, keywords) {
    const allResults = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    console.log(`\n⭐ Iniciando Scraper de DEMANDSTAR (${targets.length} objetivos) con Intercepción de API`);
    const browser = await chromium.launch({ headless: true });
    
    for (const target of targets) {
        if (!target.url || target.url === "pending_url") continue;

        const delay = Math.floor(Math.random() * 3000) + 1000;
        console.log(`[DemandStar] Esperando ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));

        console.log(`\n--> [DemandStar] Entrando a: ${target.nombre}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            let apiBids = [];
            // Interceptar la respuesta de la API de DemandStar
            page.on('response', async response => {
                const url = response.url();
                if (url.includes('api.demandstar.com/contents/agency/search')) {
                    try {
                        const json = await response.json();
                        if (json && json.result) {
                            apiBids.push(...json.result);
                        }
                    } catch (e) {}
                }
            });

            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(7000); // Esperar a que el SPA cargue y llame a la API

            for (const keyword of keywordList) {
                const mapped = apiBids
                    .filter(bid => bid.bidName && bid.bidName.toLowerCase().includes(keyword.toLowerCase()))
                    .map(bid => {
                        const closeRaw = bid.dueDate || 'N/A';
                        let closeNorm = 'N/A';
                        if (closeRaw !== 'N/A' && closeRaw.includes('/')) {
                            const parts = closeRaw.split('/');
                            if (parts.length === 3) {
                                // Soporta formatos M/D/YYYY o MM/DD/YYYY
                                const mm = parts[0].trim().padStart(2, '0');
                                const dd = parts[1].trim().padStart(2, '0');
                                const yyyy = parts[2].trim();
                                closeNorm = `${yyyy}-${mm}-${dd}`;
                            }
                        }

                        return {
                            provincia: target.nombre,
                            organizacion: target.nombre,
                            titulo: bid.bidName,
                            numero_licitacion: bid.bidIdentifier || 'N/A',
                            estado: 'ACTIVE',
                            fecha_cierre_original: closeRaw,
                            fecha_cierre_normalizada: closeNorm,
                            fuente: 'DemandStar',
                            enlace: bid.bidId ? `https://www.demandstar.com/app/limited/bids/${bid.bidId}/details` : '',
                            keyword_matched: keyword,
                            fecha_extraccion: new Date().toISOString()
                        };
                    });

                const valid = mapped.filter(p => isValidBid(p.titulo, p.enlace, '', keyword));
                if (valid.length > 0) {
                    console.log(`    ✅ DemandStar [${target.nombre}]: ${valid.length} encontradas`);
                    allResults.push(...valid);
                }
            }

        } catch (error) {
            console.error(`    ❌ Error DemandStar en ${target.nombre}:`, error.message);
        } finally {
            await page.close();
            await context.close();
        }
    }

    await browser.close();
    return allResults;
}

module.exports = { scrape };
