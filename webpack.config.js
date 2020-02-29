/* eslint-disable import/newline-after-import */
/* eslint-disable global-require */

const _ = require('lodash');
const cssNano = require('cssnano');
const path = require('path');
const webpack = require('webpack');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const { LicenseWebpackPlugin } = require('license-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
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
                },
                {
                    oneOf: [
                        {
                            test: /\.(ts|tsx)$/,
                            loader: 'ts-loader',
                            exclude: [path.resolve(__dirname, 'node_modules')],
                        },
                        // {
                        //     test: /\.(js|mjs)$/,
                        //     loader: 'babel-loader',
                        //     options: { presets: ['@babel/env'] },
                        // },
                        {
                            test: /\.css$/,
                            use: [ MiniCssExtractPlugin.loader, 'css-loader' ],
                        },
                        {
                            test: /\.(json|jsonc)$/,
                            loader: path.resolve(__dirname, 'jsonc-loader.js'),
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
                        output: { ecma: 5, comments: false },
                    },
                }),
                new OptimizeCSSAssetsPlugin({
                    cssProcessor: cssNano,
                    cssProcessorPluginOptions: {
                        preset: [ 'default', { discardComments: { removeAll: true } } ],
                    },
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
            new CopyWebpackPlugin([
                { from: './LICENSE.txt' },
                {
                    from: './static/**/*',
                    transformPath(targetPath) { return path.relative('./static', targetPath); },
                    transform(content, filePath) {
                        if (isProduction) {
                            // Minify css
                            if (path.extname(filePath) === '.css') {
                                return cssNano.process(content).then(v => v.css);
                            }
                        }
                        return content;
                    },
                },
            ]),
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[id].css',
            }),
        ],
    };

    /** @type {import('webpack').Configuration} */
    const devConfigPatch = {
        mode: 'development',
        entry: [
            'webpack-dev-server/client?http://localhost:3000',
            'webpack/hot/only-dev-server',
            ...prodConfig.entry,
        ],
        output: { publicPath: '/' },
        optimization: { minimize: false },
        plugins: [
            ...prodConfig.plugins,
            new webpack.HotModuleReplacementPlugin(),
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

    const config = isProduction ? prodConfig : _.merge(prodConfig, devConfigPatch);
    return config;
}

module.exports = getWebpackConfig;
