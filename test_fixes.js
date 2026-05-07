const polk = require('./scrapers/custom/polk');
const westpalmbeach = require('./scrapers/custom/westpalmbeach');
const vendorlink = require('./scrapers/vendorlink');
const ionwave = require('./scrapers/ionwave');

async function test() {
    console.log("🧪 INICIANDO PRUEBA EXTENDIDA DE FIXES - 'construction', 'roofing', 'electrical'");
    
    const kws = ["construction", "roofing", "electrical"];

    // 1. Polk County
    console.log("\n📍 TEST: Polk County");
    const polkRes = await polk.scrape({ nombre: "Polk County", url: "https://www.polkfl.gov/business/procurement/" }, kws);
    console.log(`✅ Polk County Total: ${polkRes.length} encontradas.`);
    if (polkRes.length > 0) console.log("   Ejemplo:", JSON.stringify(polkRes[0], null, 2));

    // 2. West Palm Beach
    console.log("\n📍 TEST: West Palm Beach");
    const wpbRes = await westpalmbeach.scrape({ nombre: "West Palm Beach", url: "https://www.wpb.org/Departments/Procurement/Solicitations" }, kws);
    console.log(`✅ West Palm Beach Total: ${wpbRes.length} encontradas.`);
    if (wpbRes.length > 0) console.log("   Ejemplo:", JSON.stringify(wpbRes[0], null, 2));

    // 3. IonWave (Lee County)
    console.log("\n📍 TEST: IonWave (Lee County)");
    const iwRes = await ionwave.scrape({ nombre: "Lee County", url: "https://www.ionwave.net/CurrentSolicitations.aspx?ID=lee" }, kws);
    console.log(`✅ IonWave Total: ${iwRes.length} encontradas.`);
    if (iwRes.length > 0) console.log("   Ejemplo:", JSON.stringify(iwRes[0], null, 2));

    console.log("\n🧪 PRUEBA FINALIZADA");
}

test();
