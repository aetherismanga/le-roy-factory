# Offline CRM checks

Run the unit suite with `npm run test:crm` and the browser journeys with:

```sh
npm install
npx playwright install chromium
npm run test:crm:browser -- /tmp/lrf-crm-evidence
```

If Chromium is already installed, set `CHROMIUM_EXECUTABLE=/absolute/path/to/chromium` instead of installing the managed browser. The harness writes a JSON report and desktop/mobile PNG screenshots to the supplied evidence directory.

The browser harness opens repository HTML through an intercepted reserved `.test` origin. Every request is served locally or fulfilled with a fixture. Firebase authentication, Firestore transactions, Leaflet geometry and all customer records are fictional. External images use neutral placeholders, and external fonts are blocked. No customer data, Firebase service, email delivery service or production server is contacted.

The checks cover exact customer identity and LRF code preservation, one write under repeated submission, error recovery, creation, search, filters, reopening, map links, mobile layout, keyboard interaction and restored-session gating. The idle-render comparison reads the original UI from commit `b415028998f0136be9c411206ae65105779dd29f` when available; shallow checkouts still verify that the updated idle form produces no repeated mutations.

These checks do not validate live Firestore rules, actual authentication credentials, real map tiles, geocoding providers, mail delivery, Safari or a hosted preview. Those boundaries require separate verification in an appropriate environment.
