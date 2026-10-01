// Which reference pages exist (a .njk file in src/standards, src/udts, src/crosswalks). The sidebar, the home and the
// search link only to these; a name in the navigation data with no page yet is shown, not linked — no dead links.
const fs = require('fs');
const path = require('path');

const list = (dir) => {
  try {
    return fs.readdirSync(path.join(__dirname, '..', dir)).filter((f) => f.endsWith('.njk')).map((f) => f.replace(/\.njk$/, ''));
  } catch {
    return [];
  }
};

const standards = list('standards'), udts = list('udts'), crosswalks = list('crosswalks');
module.exports = {
  standards,
  udts,
  crosswalks,
  all: [...standards.map((s) => 'standards/' + s), ...udts.map((u) => 'udts/' + u), ...crosswalks.map((c) => 'crosswalks/' + c)],
};
