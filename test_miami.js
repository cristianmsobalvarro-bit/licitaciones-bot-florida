const miamidadeScraper = require('./scrapers/custom/miamidade');
const targetsDB = require('./florida_targets_db.json');

async function debugMiami() {
    console.log("🛠️ Lanzando Test Aislado: Miami-Dade County...");
    const mdTarget = targetsDB.find(t => t.id === 'fl_county_miamidade');
    
    if (mdTarget) {
        const results = await miamidadeScraper.scrape(mdTarget, "");
        console.log("\n📥 RESULTADOS EN CRUDO DE MIAMI-DADE:");
        console.log(JSON.stringify(results, null, 2));
    }
}

debugMiami();
