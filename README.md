# Florida Bidding Bot (Agente de Licitaciones)

## Overview
This project is an autonomous, highly efficient, and modular scraping system built with Playwright and Cheerio. Its primary objective is to extract active bids and tenders from all 67 counties in Florida, their cities, and special districts, completely bypassing the need for expensive proxy services like ZenRows. 

Originally designed to find "roofing" and "cleaning" contracts, the system is now **industry-agnostic**, allowing users to search for any keyword. The system intelligently expands search terms and autonomously filters results to provide high-quality, actionable data.

## System Architecture

The architecture is built on a Master-Worker model, where a central controller dispatches tasks to highly specialized scrapers designed for specific procurement platforms.

### 1. Master Controller (`index.js`)
The orchestrator of the system. It handles:
- Initialization of the headless browsers.
- Multi-keyword search management.
- Routing requests to the appropriate sub-scrapers based on a mapping database (`florida_targets_db.json`).
- Incremental saving and deduplication of results (by title and link) to avoid data loss during long runs.
- Amalgamating all captured bids into a single, structured output (`licitaciones_activas.json`).

### 2. Scraper Engines (`/scrapers`)
The system covers over 60 targets using two types of engines:
- **SaaS Engines (8 modules):** Reusable scripts for entities utilizing third-party procurement software like Bonfire, DemandStar, OpenGov, BidNet, VendorLink, IonWave, and PlanetBids.
- **Custom Engines (17 modules):** Tailor-made scripts for large cities and counties with proprietary or legacy VSS systems (e.g., Miami-Dade, Tampa, Jacksonville, Orlando, Palm Beach, Fort Lauderdale).

### 3. Adaptive Relevance Filter (`utils/filter_utils.js`)
Known as the **Procurement Guard**, this module ensures the bot only captures legitimate bids. 
- It evaluates the scraped titles against the user's active search keywords.
- It discards noise and false positives.
- It verifies structural indicators of a bid (like "ITB", "RFP", "Bid").

### 4. Smart Keyword Expansion (`utils/keyword_utils.js`)
The bot utilizes the **Datamuse API** to dynamically generate professional synonyms for the user's search terms. For example, a search for "elevator" automatically expands to include "lift", "escalator", and "hoist", guaranteeing maximum market coverage without manual input.

### 5. Advanced Anti-Bot Evasion & Stealth
To maintain 100% free operation and bypass enterprise protections (like Cloudflare):
- Uses `playwright-extra` with `puppeteer-extra-plugin-stealth`.
- Simulates human behavior with delays and dynamic interaction.
- **Network API Interception:** For modern SPA applications (like the MyFloridaMarketPlace portal), the bot bypasses the Virtual DOM and intercepts the underlying JSON backend responses, ensuring 100% data extraction regardless of UI pagination limits.

## Output and Data Management
- **Main Output:** `licitaciones_activas.json` contains the latest fresh batch of active bids.
- **Historical Audit:** Every execution creates a timestamped snapshot in the `json files s/` directory (e.g., `bids_<keyword>_<timestamp>.json`) to maintain a persistent memory log of past discoveries.
- **Visual Evidence:** The bot captures screenshots of its process, stored in `screenshots/`, aiding in debugging and verifying correct portal rendering.

## Status
**Production Ready.** The system is capable of industrial-scale scraping, running silently, and self-adapting to new search queries out-of-the-box.

## Known Deficiencies & Future Improvements
While the system is robust, there is a key area requiring further development:
- **Precision Filtering for Recent & Exact-Match Bids:** The system currently needs improvements in its ability to detect and isolate *only* recently posted bids. Furthermore, when querying for specific trades (like "roofing"), it requires a more granular classification mechanism to ensure the captured bids exactly match the specific class or subtype of roofing requested by the user, rather than general or loosely related construction contracts.
- **Data Overload & Manual Filtering:** Because the system pulls absolutely every bid it finds that matches the keywords, the output often includes a massive amount of expired, closed, or unqualified bids. Currently, this requires extensive manual filtering work post-scraping to isolate the real, viable, and active bids.
