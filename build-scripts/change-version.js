const fs = require('fs');
const os = require('os');
const path = require('path');

const packageJson = require('../package.json');
const packageLockJson = require('../package-lock.json');

packageJson.version = process.argv[2];
packageLockJson.version = process.argv[2];

const dotenvPath = path.join(path.resolve(__dirname, '..'), '.env');
const packageJsonPath = path.join(path.resolve(__dirname, '..'), 'package.json');
const packageJsonLockPath = path.join(path.resolve(__dirname, '..'), 'package-lock.json');

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4).replace(/\r\n|\r|\n/mg, os.EOL).concat(os.EOL), { encoding: 'utf8' });
fs.writeFileSync(packageJsonLockPath, JSON.stringify(packageLockJson, null, 4).replace(/\r\n|\r|\n/mg, os.EOL).concat(os.EOL), { encoding: 'utf8' });

if (fs.existsSync(dotenvPath)) {
    const content = fs.readFileSync(dotenvPath, { encoding: 'utf8' }).toString().replace(/^APP_VERSION=.*$/, `APP_VERSION=${process.argv[2]}`);
    fs.writeFileSync(dotenvPath, content, { encoding: 'utf8' });
}
