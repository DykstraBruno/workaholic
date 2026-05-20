'use strict';

// Rewrites manifest.json in place into its Firefox shape so `web-ext lint`
// validates the same manifest pack.ps1 produces for the Firefox build.
//
// The committed manifest.json targets Chrome MV3 (background.service_worker
// only); Chrome rejects a background.scripts key. Firefox needs the scripts
// array as an event-page fallback. pack.ps1 applies this swap at build time
// for the Firefox artifact — this script does the same for CI linting.

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.background = {
  scripts: [
    'libs/browser-polyfill.js',
    'shared/storage.js',
    'shared/normalizer.js',
    'shared/filter.js',
    'background/service-worker.js',
  ],
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('manifest.json rewritten to Firefox shape for linting.');
