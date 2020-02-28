/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs');
const path = require('path');

const JsoncParser = require('jsonc-parser');
const Babel = require('@babel/standalone');
const babelReactPreset = require('@babel/preset-react');
const babelDynamicImportPlugin = require('babel-plugin-dynamic-import-node');

async function buildProjectJson() {
    if (!fs.existsSync('./dist/pre-build')) {
        fs.mkdirSync('./dist/pre-build');
    }

    // Transform project.json.jsx
    fs.writeFileSync(
        './dist/pre-build/project.json.js',
        Babel.transform(
            fs.readFileSync('./project.json/project.json.jsx').toString(),
            { presets: [babelReactPreset], plugins: [babelDynamicImportPlugin] },
        ).code,
    );

    // Parse project.properties.json
    fs.writeFileSync(
        './dist/pre-build/project.properties.json',
        JsoncParser.stripComments(fs.readFileSync('./project.json/project.properties.json').toString()),
    );

    const projectJson = (await import(path.resolve('./dist/pre-build/project.json.js'))).default();
    if (fs.existsSync('./dist/project.json')) {
        fs.unlinkSync('./dist/project.json');
    }
    fs.writeFileSync(
        './dist/project.json',
        JSON.stringify(projectJson, null, 4),
    );

    fs.rmdirSync('./dist/pre-build', { recursive: true });
}

module.exports = buildProjectJson;
