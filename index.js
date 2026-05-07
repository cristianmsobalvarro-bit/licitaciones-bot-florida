const fs = require('fs');
const path = require('path');
const { expandKeywords } = require('./utils/keyword_utils');
const { isValidBid } = require('./utils/filter_utils');

// ============================================================
// CONTROLADOR MAESTRO - Bot de Licitaciones de Florida
// Automatización Final: Filtro Adaptativo + Expansión de Keywords
// ============================================================
const targetsDB = require('./florida_targets_db.json');

// --- Scrapers SaaS ---
const floridastateScraper  = require('./scrapers/floridastate');
const opengovScraper       = require('./scrapers/opengov');
const bonfireScraper       = require('./scrapers/bonfire');
const demandstarScraper    = require('./scrapers/demandstar');
const bidnetScraper        = require('./scrapers/bidnet');
const vendorlinkScraper    = require('./scrapers/vendorlink');
const ionwaveScraper       = require('./scrapers/ionwave');
const planetbidsScraper    = require('./scrapers/planetbids');

// --- Scrapers Custom ---
const miamidadeScraper     = require('./scrapers/custom/miamidade');
const tampaScraper         = require('./scrapers/custom/tampa');
const jacksonvilleScraper  = require('./scrapers/custom/jacksonville');
const orlandoScraper       = require('./scrapers/custom/orlando');
const palmbeachScraper     = require('./scrapers/custom/palmbeach');
const fortlauderdaleScraper= require('./scrapers/custom/fortlauderdale');
const westpalmbeachScraper = require('./scrapers/custom/westpalmbeach');
const gainesvilleScraper   = require('./scrapers/custom/gainesville');
const bocaratonScraper     = require('./scrapers/custom/bocaraton');
const hialeahScraper       = require('./scrapers/custom/hialeah');
const charlotteScraper     = require('./scrapers/custom/charlotte');
const collierScraper       = require('./scrapers/custom/collier');
const polkScraper          = require('./scrapers/custom/polk');
const jaxportScraper       = require('./scrapers/custom/jaxport');
const portevergladesScaper = require('./scrapers/custom/porteverglades');
const browardhealthScraper = require('./scrapers/custom/browardhealth');
const coconutcreekScraper  = require('./scrapers/custom/coconutcreek');

async function main() {
    // 1. Manejo de Keywords (con expansión inteligente)
    const baseKeyword = process.argv[2] || 'cleaning';
    const KEYWORDS = await expandKeywords(baseKeyword);
    
    // 2. Gestión de Carpetas
    const historyDir = path.join(__dirname, 'json files s');
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

    const outputPath = path.join(__dirname, 'licitaciones_activas.json');
    let allBids = [];

    const saveIncremental = (label) => {
        fs.writeFileSync(outputPath, JSON.stringify(allBids, null, 2), 'utf8');
        console.log(`    💾 Guardado incremental [${label}]: ${allBids.length} totales.\n`);
    };

    console.log(`\n🚀 ============================================================`);
    console.log(`🚀 BOT MAESTRO AUTOMATIZADO - Iniciando escaneo`);
    console.log(`🔍 Tema base: '${baseKeyword}'`);
    console.log(`✨ Keywords activas: [${KEYWORDS.join(', ')}]`);
    console.log(`🚀 ============================================================\n`);

    try {
        // [1] MFMP State
        const mfmpBids = await floridastateScraper.scrape(targetsDB.floridastate, KEYWORDS);
        allBids.push(...mfmpBids);
        saveIncremental('MFMP');

        // [2] OpenGov
        const opengovBids = await opengovScraper.scrape(targetsDB.opengov, KEYWORDS);
        allBids.push(...opengovBids);
        saveIncremental('OpenGov');

        // [3] Bonfire
        const bonfireBids = await bonfireScraper.scrape(targetsDB.bonfire, KEYWORDS);
        allBids.push(...bonfireBids);
        saveIncremental('Bonfire');

        // [4] DemandStar
        const dsBids = await demandstarScraper.scrape(targetsDB.demandstar, KEYWORDS);
        allBids.push(...dsBids);
        saveIncremental('DemandStar');

        // [5] BidNet
        const bnBids = await bidnetScraper.scrape(targetsDB.bidnet, KEYWORDS);
        allBids.push(...bnBids);
        saveIncremental('BidNet');

        // [6] VendorLink
        const vlBids = await vendorlinkScraper.scrape(targetsDB.vendorlink, KEYWORDS);
        allBids.push(...vlBids);
        saveIncremental('VendorLink');

        // [7] IonWave
        const iwBids = await ionwaveScraper.scrape(targetsDB.ionwave, KEYWORDS);
        allBids.push(...iwBids);
        saveIncremental('IonWave');

        // [8] PlanetBids
        const pbBids = await planetbidsScraper.scrape(targetsDB.planetbids, KEYWORDS);
        allBids.push(...pbBids);
        saveIncremental('PlanetBids');

        // [9-11] Custom Portals (Batch)
        console.log(`📍 Infiltrando Portales Custom (17 objetivos)...`);
        
        const customTargets = targetsDB.custom;
        const scrapers = {
            'Miami-Dade': miamidadeScraper, 'Tampa': tampaScraper, 'Jacksonville': jacksonvilleScraper,
            'Orlando': orlandoScraper, 'Palm Beach': palmbeachScraper, 'Fort Lauderdale': fortlauderdaleScraper,
            'West Palm Beach': westpalmbeachScraper, 'Gainesville': gainesvilleScraper, 'Boca Raton': bocaratonScraper,
            'Hialeah': hialeahScraper, 'Charlotte': charlotteScraper, 'Collier': collierScraper,
            'Polk County': polkScraper, 'JAXPORT': jaxportScraper, 'Port Everglades': portevergladesScaper,
            'Broward Health': browardhealthScraper, 'Coconut Creek': coconutcreekScraper
        };

        for (const target of customTargets) {
            const scraper = scrapers[target.nombre];
            if (scraper) {
                const bids = await scraper.scrape(target, KEYWORDS);
                allBids.push(...bids);
            }
        }
        saveIncremental('Portales Custom');

        // 3. Resultado Final y Historial
        const finalResults = allBids;
        console.log(`\n✅ ESCANEO FINALIZADO - ${finalResults.length} licitaciones totales.`);
        
        // Guardar en Historial (json files s)
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const histFilename = `bids_${baseKeyword.replace(/[^a-z0-9]/gi, '_')}_${ts}.json`;
        const histPath = path.join(historyDir, histFilename);
        
        fs.writeFileSync(histPath, JSON.stringify(finalResults, null, 2), 'utf8');
        console.log(`📂 Historial guardado: ${histPath}`);

    } catch (error) {
        console.error('❌ Error Crítico en el Bot Maestro:', error.message);
    }
}

main();
