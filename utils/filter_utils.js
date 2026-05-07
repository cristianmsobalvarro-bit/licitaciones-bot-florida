/**
 * Validador de Relevancia - Licitaciones de Florida
 * Objetivo: Filtrar ruido (facturas, departamentos, servicios financieros) 
 * y asegurar que el resultado sea una oferta de contratación pública real.
 */

function isValidBid(title = '', url = '', context = '', activeKeyword = '') {
    const fullText = `${title} ${url} ${context}`.toLowerCase();
    
    // --- 1. NEGATIVOS: Si contiene esto, probablemente NO es una licitación ---
    const negativePatterns = [
        'pay-my-bill', 'payment', 'utility bill', 'water bill', 'sanitation bill',
        'pay my', 'customer service', 'contact us', 'department of', 'office of',
        'financial custody', 'banking services', 'third-party custodial', 'trustee',
        'investment', 'portfolio', 'fund management', 'clerk banking',
        'about-us', 'contact-us', 'departments-services', '/services/', '/departments/'
    ];

    if (negativePatterns.some(pattern => fullText.includes(pattern))) {
        return false;
    }

    // --- 2. POSITIVOS ADAPTATIVOS: Si contiene la palabra que buscamos, CONFIAMOS ---
    const lowerTitle = title.toLowerCase();
    const lowerKW = activeKeyword ? activeKeyword.toLowerCase() : '';
    const hasSearchKeyword = lowerKW && lowerTitle.includes(lowerKW);

    // Indicadores de contratación constantes
    const procurementIndicators = [
        'bid', 'solicitation', 'itb', 'rfp', 'rfq', 'project', 'opportunity',
        'contract', 'proposal', 'procurement', 'purchasing', 'vendor',
        'advertised', 'published', 'active', 'closing', 'opening', 'solicitud'
    ];

    const hasProcIndicator = procurementIndicators.some(idx => 
        lowerTitle.includes(idx) || url.toLowerCase().includes(idx)
    );

    // --- 3. LÓGICA DE FILTRADO ---
    // Si el título es solo una palabra o muy corto (menos de 12 caracteres)
    if (title.length < 12 || !title.includes(' ')) {
        // PERO si contiene la palabra que el usuario buscó específicamente, PASA
        if (hasSearchKeyword) {
            return true;
        }
        // De lo contrario, debe tener un indicador genérico (ITB, RFP, etc)
        if (!hasProcIndicator) {
            return false;
        }
    }

    return true;
}

module.exports = { isValidBid };
