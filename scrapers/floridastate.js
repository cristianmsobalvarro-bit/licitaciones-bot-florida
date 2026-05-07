const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');

async function scrape(target, keywords) {
    const allResults = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    const browser = await chromium.launch({ headless: true });
    
    try {
        const context = await browser.newContext();
        
        for (const kw of keywordList) {
            console.log(`\n--> [Florida State] Buscando '${kw}' con intercepción de API...`);
            const page = await context.newPage();
            const url = 'https://vendor.myfloridamarketplace.com/search/bids';
            let apiBids = [];

            // Interceptar la respuesta de la API de MFMP
            page.on('response', async response => {
                const requestUrl = response.url();
                if (requestUrl.includes('/mfmp/pub/search/bids') && !requestUrl.includes('/count')) {
                    try {
                        const json = await response.json();
                        if (Array.isArray(json)) {
                            console.log(`    📥 API capturada: ${json.length} licitaciones encontradas en esta página.`);
                            apiBids.push(...json);
                        }
                    } catch (e) { }
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(2000);
            
            await page.fill('input[formcontrolname="title"]', kw);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(6000); 

            // Paginación mínima
            const nextButton = await page.$('button[aria-label="Next page"]:not([disabled])');
            if (nextButton) {
                await nextButton.click();
                await page.waitForTimeout(4000);
            }

            const mapped = apiBids.map(item => {
                const id = item.advertisementId || '';
                const closeRaw = item.closeDate || 'N/A';
                const closeNorm = closeRaw !== 'N/A' ? closeRaw.split('T')[0] : 'N/A';
                return {
                    provincia: 'Florida State / Multiple',
                    organizacion: item.organization ? item.organization.name : 'N/A',
                    titulo: item.title,
                    numero_licitacion: item.agencyAdNumber || item.uniqueName || 'N/A',
                    estado: item.status || 'OPEN',
                    fecha_cierre_original: closeRaw,
                    fecha_cierre_normalizada: closeNorm,
                    fuente: 'MFMP',
                    enlace: id ? `https://vendor.myfloridamarketplace.com/search/bids/detail/${id}` : '',
                    fecha_extraccion: new Date().toISOString(),
                    keyword_matched: kw
                };
            });

            // FILTRADO ADAPTATIVO: Pasando kw al filtro
            const valid = mapped.filter(p => isValidBid(p.titulo, p.enlace, '', kw));
            if (valid.length > 0) {
                allResults.push(...valid);
                console.log(`    ✅ [MFMP][${kw}] ${valid.length} capturadas.`);
            }
            await page.close();
        }

    } catch (e) {
        console.error("❌ Error en Florida State (API Intercept):", e.message);
    } finally {
        await browser.close();
    }
    return allResults;
}

module.exports = { scrape };
