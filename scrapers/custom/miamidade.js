const { chromium } = require('playwright-extra');
const { isValidBid } = require('../../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(target, keywords) {
    const results = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    console.log(`\n🐊 Iniciando Scraper CUSTOM: ${target.nombre}`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log(`--> [Custom-MiamiDade] Infiltrando Servidor Oracle PeopleSoft: ${target.url}`);
        // Endpoint real de PeopleSoft
        const peopleSoftUrl = "https://supplier.miamidade.gov/psp/EXTSUPP/SUPPLIER/ERP/c/SCP_PUBLIC_MENU_FL.SCP_PUB_BID_CMP_FL.GBL";
        await page.goto(peopleSoftUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        await page.waitForSelector('.ps_grid-row', { timeout: 15000 });
        await page.waitForTimeout(2000);

        const items = await page.evaluate((countyName) => {
            const data = [];
            const rows = document.querySelectorAll('.ps_grid-row');
            
            rows.forEach(row => {
                const titleEl = row.querySelector('span[id^="SCP_PUB_AUC_VW_AUC_NAME"]');
                const deptEl = row.querySelector('span[id^="BUS_UNIT_AUC_VW_DESCR"]');
                const idEl = row.querySelector('span[id^="SCP_PUB_AUC_VW_AUC_ID"]');
                const fechaEl = row.querySelector('span[id^="SCP_COSP_WK_FL_SCP_END_DATE_CHAR"]');

                if (titleEl && idEl) {
                    const aucId = idEl.innerText.trim();
                    const directLink = `https://supplier.miamidade.gov/psp/EXTSUPP/SUPPLIER/ERP/c/SCP_PUBLIC_MENU_FL.SCP_PUB_BID_CMP_FL.GBL?AUC_ID=${aucId}`;
                    data.push({
                        provincia: countyName,
                        organizacion: deptEl ? deptEl.innerText.trim() : 'Miami-Dade County',
                        titulo: titleEl.innerText.trim(),
                        numero_licitacion: aucId,
                        estado: 'OPEN',
                        enlace: directLink,
                        fecha_cierre_original: fechaEl ? fechaEl.innerText.trim() : 'N/A',
                        fuente: 'Miami-Dade PeopleSoft'
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
                    // PeopleSoft suele usar MM/DD/YYYY
                    if (raw && raw.includes('/')) {
                        const parts = raw.split('/');
                        if (parts.length === 3) {
                            closeNorm = `${parts[2].trim()}-${parts[0].trim().padStart(2, '0')}-${parts[1].trim().padStart(2, '0')}`;
                        }
                    }
                    return {
                        ...b,
                        fecha_cierre_normalizada: closeNorm,
                        keyword_matched: kw,
                        fecha_extraccion: new Date().toISOString()
                    };
                });

            const valid = mapped.filter(p => isValidBid(p.titulo, p.enlace, '', kw));
            if (valid.length > 0) {
                results.push(...valid);
                console.log(`    ✅ Miami-Dade [${kw}]: ${valid.length} encontradas`);
            }
        }
    } catch (error) {
        console.error(`    ❌ Error en Miami-Dade:`, error.message);
    } finally {
        await page.close();
        await context.close();
        await browser.close();
    }
    return results;
}

module.exports = { scrape };
