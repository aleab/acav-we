/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs');
const path = require('path');

const JsoncParser = require('jsonc-parser');
const Babel = require('@babel/standalone');
const babelReactPreset = require('@babel/preset-react');
const babelDynamicImportPlugin = require('babel-plugin-dynamic-import-node');

const DIST_DIR = path.resolve('./dist');
const PREBUILD_DIR = path.join(DIST_DIR, 'pre-build');

async function buildProjectJson() {
    if (!fs.existsSync(PREBUILD_DIR)) {
        fs.mkdirSync(PREBUILD_DIR);
    }

    // Transform project.json.jsx
    fs.writeFileSync(
        path.join(PREBUILD_DIR, 'project.json.js'),
        Babel.transform(
            fs.readFileSync('./project.json/project.json.jsx').toString(),
            { presets: [babelReactPreset], plugins: [babelDynamicImportPlugin] },
        ).code,
    );

    // Parse project.properties.json
    fs.writeFileSync(
        path.join(PREBUILD_DIR, 'project.properties.json'),
        JsoncParser.stripComments(fs.readFileSync('./project.json/project.properties.json').toString()),
    );

    const projectJsonPath = path.join(DIST_DIR, 'project.json');
    const projectJson = (await import(path.resolve(PREBUILD_DIR, 'project.json.js'))).default();
    if (fs.existsSync(projectJsonPath)) {
        fs.unlinkSync(projectJsonPath);
    }
    fs.writeFileSync(
        projectJsonPath,
        JSON.stringify(projectJson, null, 4),
    );

    fs.rmdirSync(PREBUILD_DIR, { recursive: true });
}

module.exports = buildProjectJson;
