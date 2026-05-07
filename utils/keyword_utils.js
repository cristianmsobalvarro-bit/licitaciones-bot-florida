/**
 * Utilidades de Palabras Clave - Licitaciones de Florida
 * Usa la API gratuita de Datamuse para expandir términos de búsqueda.
 */

async function expandKeywords(baseKeyword) {
    if (!baseKeyword || baseKeyword.length < 3) return [baseKeyword];
    
    console.log(`🔍 Expandiendo término: '${baseKeyword}'...`);
    
    try {
        // ML = Means Like (sinónimos y términos relacionados)
        const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(baseKeyword)}&max=8`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error consultando Datamuse API');
        
        const data = await response.json();
        
        // Extraer solo las palabras y filtrar ruido (palabras muy cortas o frases raras)
        const expanded = data
            .map(item => item.word.toLowerCase())
            .filter(word => 
                word !== baseKeyword.toLowerCase() && 
                word.length > 3 && 
                !word.includes('-')
            );
            
        // El resultado final es la palabra original + las expandidas
        const finalKeywords = [baseKeyword.toLowerCase(), ...expanded];
        
        // Eliminar duplicados
        const unique = [...new Set(finalKeywords)];
        
        console.log(`✨ Términos generados: [${unique.join(', ')}]`);
        return unique;
        
    } catch (error) {
        console.warn(`⚠️ No se pudo expandir las palabras clave: ${error.message}. Usando solo la original.`);
        return [baseKeyword];
    }
}

module.exports = { expandKeywords };
