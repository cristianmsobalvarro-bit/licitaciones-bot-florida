const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(target, keywords) {
    const results = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    const browser = await chromium.launch({ headless: true });
    
    try {
        console.log(`\n🌊 [IonWave] Conectando a IonWave eProcurement: ${target.url}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(6000);

        const items = await page.evaluate((countyName) => {
            const data = [];
            const rows = document.querySelectorAll('.GridView tr, table.grid tr, table tr');
            
            rows.forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length < 2) return;
                
                const aTag = row.querySelector('a');
                const title = aTag ? aTag.innerText.trim() : (tds[1] ? tds[1].innerText.trim() : '');
                const bidNum = tds[0] ? tds[0].innerText.trim() : 'N/A';
                
                if (title.length < 5 || title.toLowerCase().includes('solicitation title')) return;
                
                const closeRaw = tds.length > 3 ? tds[tds.length - 1].innerText.trim() : 'N/A';
                
                data.push({
                    provincia: countyName,
                    organizacion: countyName,
                    titulo: title,
                    numero_licitacion: bidNum,
                    estado: 'OPEN',
                    fecha_cierre_original: closeRaw,
                    fuente: 'IonWave',
                    enlace: aTag ? aTag.href : window.location.href
                });
            });
            return data;
        }, target.nombre);

        for (const keyword of keywordList) {
            const mapped = items
                .filter(item => item.titulo.toLowerCase().includes(keyword.toLowerCase()))
                .map(item => {
                    let closeNorm = 'N/A';
                    const raw = item.fecha_cierre_original;
                    // IonWave suele usar MM/DD/YYYY HH:MM:SS AM/PM
                    if (raw.includes('/')) {
                        const datePart = raw.split(' ')[0];
                        const p = datePart.split('/');
                        if (p.length === 3) {
                            closeNorm = `${p[2].trim()}-${p[0].trim().padStart(2, '0')}-${p[1].trim().padStart(2, '0')}`;
                        }
                    }
                    return {
                        ...item,
                        fecha_cierre_normalizada: closeNorm,
                        keyword_matched: keyword,
                        fecha_extraccion: new Date().toISOString()
                    };
                });

            const valid = mapped.filter(p => isValidBid(p.titulo, p.enlace, '', keyword));
            if (valid.length > 0) {
                results.push(...valid);
                console.log(`    ✅ IonWave [${target.nombre}]: ${valid.length} encontradas`);
            }
        }
    } catch (error) {
        console.error(`    ❌ Error IonWave en ${target.nombre}:`, error.message);
    } finally {
        await browser.close();
    }

    return results;
}

module.exports = { scrape };
