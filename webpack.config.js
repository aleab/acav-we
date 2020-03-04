/* eslint-disable import/newline-after-import */
/* eslint-disable global-require */

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const cssnano = require('cssnano');
const purgecss = require('@fullhuman/postcss-purgecss');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const { LicenseWebpackPlugin } = require('license-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const SRC_PATH = path.resolve(__dirname, 'src');
const DIST_PATH = path.resolve(__dirname, 'dist');

// ========
//  CONFIG
// ========
/**
 * @type {(env: any, argv: import('webpack').CliConfigOptions) => import('webpack').Configuration}
 */
function getWebpackConfig(env, argv) {
    const isProduction = argv.mode !== 'development';
    const hot = argv.hot;

    /** @type {import('webpack').Configuration} */
    const prodConfig = {
        mode: 'production',
        entry: ['./src/index.tsx'],
        output: {
            path: DIST_PATH,
            filename: 'main.js',
        },
        resolve: {
            extensions: [ '.css', '.ts', '.tsx', '.js', '.jsx' ],
        },
        module: {
            rules: [
                {
                    test: /\.(js|mjs|jsx|ts|tsx)$/,
                    enforce: 'pre',
                    loader: 'eslint-loader',
                    include: SRC_PATH,
                    exclude: [path.resolve(__dirname, 'node_modules')],
                    options: {
                        configFile: './.eslintrc',
                    },
                },
                {
                    oneOf: [
                        {
                            test: /\.(ts|tsx)$/,
                            loader: 'ts-loader',
                            exclude: [path.resolve(__dirname, 'node_modules')],
                        },
                        {
                            test: /\.css$/,
                            use: [
                                MiniCssExtractPlugin.loader,
                                { loader: 'css-loader', options: { importLoaders: true } },
                                {
                                    loader: 'postcss-loader',
                                    options: {
                                        plugins: [
                                            cssnano({ preset: 'default' }),
                                            purgecss({
                                                content: [ './static/**/*.html', './src/**/*.tsx' ],
                                            }),
                                        ],
                                    },
                                },
                            ],
                        },
                        {
                            test: /\.(json|jsonc)$/,
                            loader: path.resolve(__dirname, 'build-scripts', 'jsonc-loader.js'),
                        },
                        {
                            loader: 'file-loader',
                            exclude: [ /\.(js|mjs|jsx|ts|tsx)$/, /\.json$/, /\.html$/ ],
                            options: {
                                name: '[name].[ext]',
                            },
                        },
                    ],
                },
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        parse: { ecma: 8 },
                        compress: { ecma: 5 },
                        output: { ecma: 5, comments: /^\**!|@preserve/i },
                    },
                    extractComments: false,
                }),
            ],
        },
        plugins: [
            new webpack.ProgressPlugin(),
            new LicenseWebpackPlugin({
                outputFilename: 'LICENSES.3RD-PARTY.txt',
                perChunkOutput: false,
                renderLicenses: modules => {
                    let text = '';
                    const M = _.sortBy(modules, m => m.name);
                    for (let i = 0; i < M.length; ++i) {
                        text += '/**\n' +
                                ` * ${M[i].name}\n` +
                                ' *\n' +
                                ` * ${M[i].licenseId}\n` +
                                M[i].licenseText.split(/\r?\n/).map(s => ` * ${s}`).join('\n') + '\n' +
                                ' */\n' +
                                '\n';
                    }
                    return text;
                },
            }),
            new webpack.BannerPlugin({
                raw: true,
                banner: '/*!\n' +
                        ' * This Source Code Form is subject to the terms of the Mozilla Public\n' +
                        ' * License, v. 2.0. If a copy of the MPL was not distributed with this\n' +
                        ' * file, You can obtain one at http://mozilla.org/MPL/2.0/.\n' +
                        ' */\n',
            }),
            new CopyWebpackPlugin([
                { from: './LICENSE.txt' },
                {
                    from: './static/**/*',
                    transformPath(targetPath) { return path.relative('./static', targetPath); },
                    transform(content, filePath) {
                        if (isProduction) {
                            // Minify css
                            if (path.extname(filePath) === '.css') {
                                return cssnano.process(content).then(v => v.css);
                            }
                        }
                        return content;
                    },
                },
            ]),

            // This plugin extracts CSS into separate files.
            // It creates a CSS file per JS file which imports CSS.
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[id].css',
            }),
        ],
        performance: {
            hints: false,
            assetFilter: assetFilename => {
                return !(/^preview\.gif$/.test(assetFilename));
            },
        },
    };

    /** @type {import('webpack').Configuration} */
    const devConfigPatch = {
        mode: 'development',
        entry: [...prodConfig.entry],
        output: { publicPath: '/' },
        optimization: { minimize: false },
        plugins: [
            ...prodConfig.plugins,
            new webpack.NamedModulesPlugin(),
        ],
        devServer: {
            port: 3000,
            hot: true,
            open: true,
            contentBase: SRC_PATH,
            publicPath: '/',
        },
        devtool: 'inline-source-map',
    };
    if (hot) {
        devConfigPatch.entry = [
            'webpack-dev-server/client?http://localhost:3000',
            'webpack/hot/only-dev-server',
            ...devConfigPatch.entry,
        ];
        devConfigPatch.plugins.push(new webpack.HotModuleReplacementPlugin());
    }

    const config = isProduction ? prodConfig : _.merge(prodConfig, devConfigPatch);
    return config;
}

module.exports = getWebpackConfig;
