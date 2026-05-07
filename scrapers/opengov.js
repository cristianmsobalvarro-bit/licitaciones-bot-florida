const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(targets, keywords) {
    const allResults = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    const browser = await chromium.launch({ headless: true });
    
    for (const target of targets) {
        if (!target.url || target.url === 'pending_url') {
            console.log(`[OpenGov] Saltando ${target.nombre} (URL pendiente)`);
            continue;
        }

        // --- ANTI-BOT STEALTH: Delay aleatorio ---
        const delay = Math.floor(Math.random() * 5000) + 3000;
        console.log(`[OpenGov] Esperando ${delay}ms para simular comportamiento humano...`);
        await new Promise(r => setTimeout(r, delay));

        const context = await browser.newContext();
        await context.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();
        
        console.log(`\n--> [OpenGov] Entrando a: ${target.nombre}`);
        
        try {
            const targetIdMatch = target.url.match(/\/portal\/([^/?#]+)/);
            if (!targetIdMatch) {
                console.error(`    ❌ No se pudo extraer el ID de la URL: ${target.url}`);
                continue;
            }
            const targetId = targetIdMatch[1];
            
            for (const keyword of keywordList) {
                let apiResponse = null;
                console.log(`    🔍 Buscando '${keyword}'...`);

                // Capturar JSON de la API
                page.on('response', async response => {
                    const url = response.url();
                    if (url.includes('/project/public') || url.includes('/search/projects')) {
                        try {
                            const json = await response.json();
                            if (json && json.rows) {
                                apiResponse = json;
                            }
                        } catch (e) {}
                    }
                });

                const encodedKeyword = encodeURIComponent(keyword);
                const searchUrl = `https://procurement.opengov.com/portal/embed/${targetId}/project-list?title=${encodedKeyword}&status=open`;
                
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 50000 });
                await page.waitForTimeout(5000); // Esperar a que la SPA se estabilice

                // --- EVIDENCIA VISUAL: Captura de pantalla ---
                const safeName = target.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const screenshotPath = `screenshots/opengov_${safeName}_${keyword}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`    📸 Evidencia capturada: ${screenshotPath}`);

                // Verificar si hay Cloudflare o Error
                const isBlocked = await page.evaluate(() => {
                    return document.body.innerText.includes("Verify you are human") || 
                           document.body.innerText.includes("Access Denied") ||
                           document.body.innerText.includes("Just a moment");
                });

                if (isBlocked) {
                    console.log(`    ⚠️ [${target.nombre}] BLOQUEO DETECTADO (Cloudflare/WAF).`);
                }

                // El subagent confirmó que a veces hay que dar clic en Search para disparar el evento
                try {
                    const searchBtn = await page.$('button.btn-primary, button:has-text("Search")');
                    if (searchBtn) {
                        await searchBtn.click();
                        await page.waitForTimeout(3000);
                    }
                } catch (e) {}
                
                // Esperar a que la API responda
                for (let i = 0; i < 8; i++) {
                    if (apiResponse) break;
                    await page.waitForTimeout(1000);
                }

                if (apiResponse && apiResponse.rows) {
                    const projects = apiResponse.rows.map(row => {
                        const closeRaw = row.proposalDeadline || 'N/A';
                        const closeNorm = closeRaw !== 'N/A' ? closeRaw.split('T')[0] : 'N/A';
                        return {
                            provincia: target.nombre,
                            organizacion: target.nombre,
                            titulo: row.title,
                            numero_licitacion: row.projectNumber || 'N/A',
                            estado: row.status ? row.status.toUpperCase() : 'OPEN',
                            fecha_cierre_original: closeRaw,
                            fecha_cierre_normalizada: closeNorm,
                            fuente: 'OpenGov',
                            enlace: `https://procurement.opengov.com/portal/${targetId}/projects/${row.id}`,
                            plataforma_origen: 'OpenGov',
                            keyword_matched: keyword,
                            fecha_extraccion: new Date().toISOString()
                        };
                    });

                    const validProjects = projects.filter(p => isValidBid(p.titulo, p.enlace, '', keyword));
                    allResults.push(...validProjects);
                    
                    if (validProjects.length > 0) {
                        console.log(`    ✅ [${target.nombre}] keyword="${keyword}": ${validProjects.length} encontradas`);
                    } else {
                        console.log(`    ℹ️ [${target.nombre}] keyword="${keyword}": 0 resultados.`);
                    }
                } else {
                    if (!isBlocked) {
                        console.log(`    ℹ️ [${target.nombre}] keyword="${keyword}": No se capturó respuesta API (Probablemente 0 resultados).`);
                    }
                }
            }

        } catch (error) {
            console.error(`    ❌ Error en ${target.nombre}:`, error.message);
        } finally {
            await page.close();
            await context.close();
        }
    }

    await browser.close();
    return allResults;
}

module.exports = { scrape };
