const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(targets, keywords) {
    const allResults = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    console.log(`\n🌐 Iniciando Scraper de BIDNET DIRECT (${targets.length} objetivos)`);
    const browser = await chromium.launch({ headless: true });
      for (const target of targets) {
        if (!target.url || target.url === "pending_url") continue;

        // --- ANTI-BOT STEALTH: Delay aleatorio ---
        const delay = Math.floor(Math.random() * 5000) + 3000;
        console.log(`[BidNet] Esperando ${delay}ms para simular comportamiento humano...`);
        await new Promise(r => setTimeout(r, delay));

        // Extraer el slug de la agencia de la URL (ej: cityofmiami)
        let agencySlug = target.url.split('/').pop();
        if (target.url.includes('bidnetdirect.com')) {
            agencySlug = target.url.split('/').pop();
        } else {
            agencySlug = target.nombre.toLowerCase().replace(/ /g, '').replace('cityof', '');
        }

        console.log(`\n--> [BidNet] Entrando a: ${target.nombre}`);

        for (const keyword of keywordList) {
            const context = await browser.newContext();
            const page = await context.newPage();
            
            try {
                const searchUrl = `https://www.bidnetdirect.com/florida/${agencySlug}/solicitations/open-bids?keywords=${encodeURIComponent(keyword)}`;
                console.log(`    🔍 Buscando '${keyword}' en: ${searchUrl}`);
                
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 50000 });
                await page.waitForTimeout(5000); 

                // --- EVIDENCIA VISUAL: Captura de pantalla ---
                const safeName = target.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const screenshotPath = `screenshots/bidnet_${safeName}_${keyword}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`    📸 Evidencia capturada: ${screenshotPath}`);

                // Verificar bloqueo
                const isBlocked = await page.evaluate(() => {
                    return document.body.innerText.includes("Verify you are human") || 
                           document.body.innerText.includes("Access Denied") ||
                           document.body.innerText.includes("restricted access");
                });

                if (isBlocked) {
                    console.log(`    ⚠️ [${target.nombre}] BLOQUEO DETECTADO en BidNet.`);
                    continue;
                }

                // Verificar si hay resultados
                const noResults = await page.evaluate(() => {
                    return document.body.innerText.includes("We can’t find any current bids");
                });

                if (noResults) {
                    console.log(`    ℹ️ BidNet [${target.nombre}]: 0 resultados para '${keyword}'.`);
                } else {
                    const projects = await page.evaluate(({ countyName, kw }) => {
                        const results = [];
                        const rows = document.querySelectorAll('tr.solicitation-row, .solicitation-list article, table tbody tr');
                        
                        rows.forEach(row => {
                            const titleEl = row.querySelector('.solicitation-title, h4 a, td:nth-child(2) a, a');
                            const statusEl = row.querySelector('.status, td.status, td:nth-child(3)');
                            const dateEl = row.querySelector('[class*="date"], td:nth-child(4), td:last-child');
                            
                            if (titleEl) {
                                const title = titleEl.innerText.trim();
                                const link = titleEl.tagName === 'A' ? titleEl.href : (row.querySelector('a')?.href || '');
                                const status = statusEl ? statusEl.innerText.trim().toUpperCase() : 'OPEN';
                                const fecha = dateEl ? dateEl.innerText.trim() : 'N/A';
                                
                                if (title.length > 5) {
                                    const closeRaw = fecha || 'N/A';
                                    let closeNorm = 'N/A';
                                    // BidNet suele devolver "MM/DD/YYYY"
                                    if (closeRaw !== 'N/A' && closeRaw.includes('/')) {
                                        const p = closeRaw.split('/');
                                        if (p.length === 3) {
                                            closeNorm = `${p[2].trim()}-${p[0].trim().padStart(2, '0')}-${p[1].trim().padStart(2, '0')}`;
                                        }
                                    }

                                    results.push({
                                        provincia: countyName,
                                        organizacion: countyName,
                                        titulo: title,
                                        numero_licitacion: 'N/A',
                                        estado: status,
                                        enlace: link,
                                        fecha_cierre_original: closeRaw,
                                        fecha_cierre_normalizada: closeNorm,
                                        fuente: 'BidNet',
                                        keyword_matched: kw,
                                        fecha_extraccion: new Date().toISOString()
                                    });
                                }
                            }
                        });
                        return results;
                    }, { countyName: target.nombre, kw: keyword });

                    const validProjects = projects.filter(p => isValidBid(p.titulo, p.enlace, '', keyword));
                    if (validProjects.length > 0) {
                        console.log(`    ✅ BidNet [${target.nombre}]: ${validProjects.length} encontradas para '${keyword}'`);
                        allResults.push(...validProjects);
                    } else {
                        console.log(`    ℹ️ BidNet [${target.nombre}]: 0 relevantes para '${keyword}'.`);
                    }
                }

            } catch (error) {
                console.error(`    ❌ Error BidNet en ${target.nombre} ('${keyword}'):`, error.message);
            } finally {
                await page.close();
                await context.close();
            }
        }
    }

    await browser.close();
    return allResults;
}

module.exports = { scrape };
