const fs = require('node:fs');
const path = require('node:path');

const markerPath = process.argv[2];

if (!markerPath) {
  throw new Error('Missing marker path argument.');
}

const resolved = path.resolve(markerPath);
fs.mkdirSync(path.dirname(resolved), { recursive: true });
fs.writeFileSync(resolved, `${new Date().toISOString()}\n`, 'utf8');
console.log(`Wrote build marker: ${resolved}`);
