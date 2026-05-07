const opengov = require('./scrapers/opengov');
const targetsDB = require('./florida_targets_db.json');

async function verify() {
    // Solo Orange County para rapidez
    const target = targetsDB.find(t => t.id === 'fl_county_orange');
    console.log(`Verifying OpenGov extraction for: ${target.nombre}`);
    
    // Usar un término genérico que vimos en el portal: "sign" o "bridge"
    const keywords = ['sign'];
    
    try {
        const results = await opengov.scrape([target], keywords);
        console.log('\n--- VERIFICATION RESULTS ---');
        console.log(`Total found: ${results.length}`);
        results.forEach(r => {
            console.log(`- [${r.organizacion}] ${r.titulo} | Link: ${r.enlace}`);
        });
        if (results.length > 0) {
            console.log('\n✅ VERIFICATION SUCCESSFUL: Scraper is capturing data.');
        } else {
            console.log('\n⚠️ VERIFICATION INCONCLUSIVE: No data captured for keyword "sign".');
        }
    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
