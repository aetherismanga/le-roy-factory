# Elios sample recap options — 13 November 2026

## User-requested commercial rules

Energy surcharge is 0.70 EUR HT per ordered square metre of box tiles, summed after complete-carton rounding. It does not apply to free loose samples or merchandising, and the 50% exhibition discount does not reduce it.

Optional installation is a separate LRF service: 160 EUR HT up to and including 8 square metres, then 16 EUR HT per square metre above 8. The selected basis is the ordered box-tile area, including complete cartons and losses; the interface states that basis explicitly. The threshold is implemented literally, not converted into a minimum charge above 8 square metres. Settlement is to be agreed with LE ROY FACTORY, excluding materials and on surfaces ready for tiling.

Eligible loose-sample references permit one or two labelled pieces. Supplier approval remains required. Collection, format, colour and finish facets select existing exact references without inventing combinations or prices.

The printed recap and client-composed email use the same server-calculated line items, energy surcharge and optional installation. The browser cannot provide its own prices. Toggling installation changes the request fingerprint and invalidates an already prepared draft. Saved selections remain isolated by account/client.

## Verification

Read-only validation run 43474121031 completed successfully: 62 unit and regression tests, desktop Chromium and iPhone WebKit flows, printing, installation toggling, refresh persistence, eligibility and quantity constraints. All account and quote browser tests use synthetic data; no supplier email or real client request is sent.

Tested application blobs are recorded in the read-only live verification workflow. The final newline is omitted from two uploaded JavaScript files; all other bytes match the successful test artifact. Existing Firebase production environment gates are retained. The endpoint's v8 protocol header remains compatible; the additive pricingVersion and X-LRF-Elios-Options-Version identify these rules.

No CRM data, supplier catalogue, texture, purchase-price grid, or authentication policy is changed by this update.
