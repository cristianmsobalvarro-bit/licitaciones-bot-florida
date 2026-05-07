const opengov = require('./scrapers/opengov');
const targetsDB = require('./florida_targets_db.json');

async function test() {
    const opengovTargets = targetsDB.filter(t => t.plataforma === 'opengov');
    console.log(`Testing OpenGov with ${opengovTargets.length} targets: ${opengovTargets.map(t => t.nombre).join(', ')}`);
    
    // Probar con "cleaning" y "roof" (términos amplios para maximizar hits en el test)
    const keywords = ['roof', 'cleaning'];
    console.log(`Keywords: ${keywords.join(', ')}`);
    
    try {
        const results = await opengov.scrape(opengovTargets, keywords);
        console.log('\n--- TEST RESULTS ---');
        console.log(`Total found: ${results.length}`);
        results.forEach(r => {
            console.log(`- [${r.organizacion}] ${r.titulo} | Estado: ${r.estado} | Link: ${r.enlace}`);
        });
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
