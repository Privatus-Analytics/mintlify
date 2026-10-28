const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'privatus-analytics.js'), 'utf8');

// The script with some settings changed, the way a user edits the file.
function configured(changes) {
  let out = SOURCE;
  for (const [from, to] of changes) {
    if (!out.includes(from)) throw new Error('setting not found in privatus-analytics.js: ' + from);
    out = out.replace(from, to);
  }
  return out;
}

module.exports = { SOURCE, configured };
