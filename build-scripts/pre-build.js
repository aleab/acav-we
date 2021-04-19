const fs = require('fs');
const path = require('path');

const buildProjectJson = require('../project.json/build');

const DIST_DIR = path.resolve('./dist');

(async () => {
    if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);
    await buildProjectJson({
        outputDir: DIST_DIR,
        prebuildDir: path.join(DIST_DIR, 'pre-build'),
        removePrebuildDir: true,
    }).catch(e => {
        console.error(e);
        process.exit(1);
    });
})();
