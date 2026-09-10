// Smoke test: built lib/pricing-page.js against the LIVE official pricing page.
// Verifies network reachability + parser on real HTML (same code the endpoint runs).
import { fetchParsedPricingPage } from '../lib/pricing-page.js';

const page = await fetchParsedPricingPage();
console.log('fetchedAt:', new Date(page.fetchedAt).toISOString());
console.log('pageModels:', JSON.stringify(page.pageModels));
console.log('prices:', JSON.stringify(page.prices, null, 2));
console.log('peak:', JSON.stringify(page.peak));
console.log('warnings:', JSON.stringify(page.warnings));
const ok = page.pageModels.length > 0 && page.warnings.length === 0;
console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL');
process.exit(ok ? 0 : 1);
