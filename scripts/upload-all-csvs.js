/**
 * Uploads all 16 category CSV files to the backend bulk-import endpoint.
 * Run: node D:/Affiliate/scripts/upload-all-csvs.js
 */

const axios  = require('D:/Affiliate/backend/node_modules/axios');
const fs     = require('fs');
const path   = require('path');
const FormData = require('D:/Affiliate/backend/node_modules/form-data');

const API_URL = 'http://localhost:4000/automation/bulk-import';
const API_KEY = 'adfirst-auto-2024-secure';
const CSV_DIR = 'D:/Affiliate/data/csv';

const SLUGS = [
  'electronics', 'headphones', 'monitors', 'smartphones', 'laptops',
  'smart-tvs', 'cameras', 'gaming', 'kitchen-appliances', 'home-audio',
  'smartwatches', 'grooming', 'power-banks', 'fitness', 'baby-kids',
  'computer-peripherals'
];

(async () => {
  let totalUpserted = 0, totalFailed = 0;

  for (const slug of SLUGS) {
    const file = path.join(CSV_DIR, `${slug}.csv`);
    if (!fs.existsSync(file)) {
      console.log(`⚠  ${slug}.csv not found — skipping`);
      continue;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(file), { filename: `${slug}.csv`, contentType: 'text/csv' });

    try {
      const { data } = await axios.default.post(API_URL, form, {
        headers: { ...form.getHeaders(), 'x-automation-api-key': API_KEY },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      totalUpserted += data.upserted ?? data.created ?? 0;
      totalFailed   += data.failed ?? 0;
      const ok = (data.failed ?? 0) === 0 ? '✓' : '⚠';
      console.log(`${ok} ${slug}: ${data.upserted ?? data.created} upserted, ${data.failed} failed`);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message;
      console.log(`✗ ${slug}: ${msg}`);
      totalFailed++;
    }
  }

  console.log(`\n════ DONE ════`);
  console.log(`Total upserted: ${totalUpserted}`);
  console.log(`Total failed:   ${totalFailed}`);
})();
