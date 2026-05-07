const fs = require('fs');
const targetsDB = require('./florida_targets_db.json');

async function testCustom() {
    const keyword = ''; // Para ver TODO para debugging
    console.log(`🧹 TEST RÁPIDO CUSTOMS: "${keyword}"\n`);
    let allBids = [];

    // MIAMI-DADE
    const miamiDadeTarget = targetsDB.find(t => t.id === 'fl_county_miamidade');
    if (miamiDadeTarget) {
        const miamidadeScraper = require('./scrapers/custom/miamidade');
        const mdBids = await miamidadeScraper.scrape(miamiDadeTarget, keyword);
        allBids = allBids.concat(mdBids);
    }

    // TAMPA
    const tampaTarget = targetsDB.find(t => t.id === 'fl_city_tampa');
    if (tampaTarget) {
        const tampaScraper = require('./scrapers/custom/tampa');
        const tbBids = await tampaScraper.scrape(tampaTarget, keyword);
        allBids = allBids.concat(tbBids);
    }

    // JACKSONVILLE
    const jaxTarget = targetsDB.find(t => t.id === 'fl_city_jacksonville');
    if (jaxTarget) {
        const jaxScraper = require('./scrapers/custom/jacksonville');
        const jsBids = await jaxScraper.scrape(jaxTarget, keyword);
        allBids = allBids.concat(jsBids);
    }

    console.log(`\n✅ TEST COMPLETADO: ${allBids.length} licitaciones encontradas en Customs.`);
    console.log(JSON.stringify(allBids, null, 2));
}

testCustom();
