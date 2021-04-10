/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs');
const path = require('path');

const JsoncParser = require('jsonc-parser');
const Babel = require('@babel/standalone');
const babelReactPreset = require('@babel/preset-react');
const babelDynamicImportPlugin = require('babel-plugin-dynamic-import-node');

const DIST_DIR = path.resolve('./dist');
const PREBUILD_DIR = path.join(DIST_DIR, 'pre-build');

/**
 * @param {{
 *     outputDir: string;
 *     prebuildDir: string;
 *     removePrebuildDir?: boolean;
 * }} options
 */
async function buildProjectJson(options) {
    const outputDir = options?.outputDir || DIST_DIR;
    const prebuildDir = options?.prebuildDir || PREBUILD_DIR;
    const removePrebuildDir = !options || !options.prebuildDir || options.removePrebuildDir || false;

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    if (!fs.existsSync(prebuildDir)) fs.mkdirSync(prebuildDir);

    // Transform project.json.jsx
    fs.writeFileSync(
        path.join(prebuildDir, 'project.json.js'),
        Babel.transform(
            fs.readFileSync('./project.json/project.json.jsx').toString(),
            { presets: [babelReactPreset], plugins: [babelDynamicImportPlugin] },
        ).code,
    );

    // Parse project.properties.json
    fs.writeFileSync(
        path.join(prebuildDir, 'project.properties.json'),
        JsoncParser.stripComments(fs.readFileSync('./project.json/project.properties.json').toString()),
    );

    const projectJsonPath = path.join(outputDir, 'project.json');
    const projectJson = (await import(path.resolve(prebuildDir, 'project.json.js'))).default();
    if (fs.existsSync(projectJsonPath)) {
        fs.unlinkSync(projectJsonPath);
    }
    fs.writeFileSync(
        projectJsonPath,
        JSON.stringify(projectJson, null, 4),
    );

    if (removePrebuildDir) {
        fs.rmdirSync(prebuildDir, { recursive: true });
    }
}

module.exports = buildProjectJson;
