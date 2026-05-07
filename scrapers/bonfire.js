const { chromium } = require('playwright-extra');
const { isValidBid } = require('../utils/filter_utils');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function scrape(targets, keywords) {
    const allResults = [];
    const keywordList = Array.isArray(keywords) ? keywords : [keywords];
    console.log(`\n🔥 Iniciando Scraper de BONFIRE HUB (${targets.length} objetivos) con Intercepción de API`);
    const browser = await chromium.launch({ headless: true });
    
    for (const target of targets) {
        if (!target.url || target.url === 'pending_url') continue;

        const delay = Math.floor(Math.random() * 5000) + 3000;
        console.log(`[Bonfire] Esperando ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));

        console.log(`\n--> [Bonfire] Entrando a: ${target.nombre}`);
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            let apiProjects = [];
            // Interceptar la respuesta de la API de Bonfire
            page.on('response', async response => {
                const url = response.url();
                if (url.includes('PublicPortal/getOpenPublicOpportunitiesSectionData')) {
                    try {
                        const json = await response.json();
                        if (json && json.payload && json.payload.projects) {
                            const projects = Object.values(json.payload.projects);
                            apiProjects.push(...projects);
                            console.log(`    📥 API Bonfire capturada: ${projects.length} filas.`);
                        }
                    } catch (e) {}
                }
            });

            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(6000); // Esperar a que cargue la SPA

            // Extraer el subdominio de la URL del target para construir links
            const agencyUrl = new URL(target.url);
            const agencyHost = agencyUrl.origin;

            for (const keyword of keywordList) {
                console.log(`    🔍 Filtrando por '${keyword}' en datos capturados...`);
                
                // Mapeo y filtrado
                const mapped = apiProjects
                    .filter(proj => proj.ProjectName && proj.ProjectName.toLowerCase().includes(keyword.toLowerCase()))
                    .map(proj => {
                        const closeRaw = proj.CloseDate || 'N/A';
                        let closeNorm = 'N/A';
                        if (closeRaw !== 'N/A' && closeRaw.includes(' ')) {
                             closeNorm = closeRaw.split(' ')[0]; // Usualmente "YYYY-MM-DD HH:mm:ss"
                        }

                        return {
                            provincia: target.nombre,
                            organizacion: target.nombre,
                            titulo: proj.ProjectName,
                            numero_licitacion: proj.ReferenceNumber || proj.ProjectID || 'N/A',
                            estado: 'OPEN',
                            fecha_cierre_original: closeRaw,
                            fecha_cierre_normalizada: closeNorm,
                            fuente: 'Bonfire',
                            enlace: `${agencyHost}/opportunities/${proj.ProjectID}`,
                            keyword_matched: keyword,
                            fecha_extraccion: new Date().toISOString()
                        };
                    });

                const valid = mapped.filter(p => isValidBid(p.titulo, p.enlace, '', keyword));
                if (valid.length > 0) {
                    console.log(`    ✅ Bonfire [${target.nombre}]: ${valid.length} encontradas`);
                    allResults.push(...valid);
                }
            }

        } catch (error) {
            console.error(`    ❌ Error Bonfire en ${target.nombre}:`, error.message);
        } finally {
            await page.close();
            await context.close();
        }
    }

    await browser.close();
    return allResults;
}

module.exports = { scrape };
