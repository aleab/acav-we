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
const RequireVarsDotenvPlugin = require('./build-scripts/require-vars-dotenv-webpack');

const packageJson = require('./package.json');

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

    // Plugins
    const progressPlugin = new webpack.ProgressPlugin();
    const dotenvPlugin = new RequireVarsDotenvPlugin(['BACKEND_API_BASEURL']);
    const licensePlugin = new LicenseWebpackPlugin({
        outputFilename: 'LICENSES.3RD-PARTY.txt',
        perChunkOutput: false,
        preferredLicenseTypes: ['MIT'],
        unacceptableLicenseTest: licenseType => /(CC-BY(-NC)?-(SA|ND))|(CECILL)|(EPL)|(EUPL)|(GPL)|(MS-RL)|(OSL)|(UNLICENSED)/i.test(licenseType),
        excludedPackageTest: packageName => {
            // Do not include license texts of transitive dependencies
            if (!packageJson.dependencies) return false;
            return packageJson.dependencies[packageName] === undefined;
        },
        renderLicenses: modules => {
            let text = '';
            const M = _.sortBy(modules, m => m.name);
            for (let i = 0; i < M.length; ++i) {
                text += '/**\n' +
                        ` * ${M[i].name}\n` +
                        ' *\n' +
                        ` * ${M[i].licenseId}\n` +
                        (M[i].licenseText !== null ? M[i].licenseText.split(/\r?\n/).map(s => ` * ${s}`).join('\n') : ' * null') + '\n' +
                        ' */\n' +
                        '\n';
            }
            return text;
        },
        licenseTextOverrides: {
            '@xstate/react': '<missing license text>',
            xstate: '<missing license text>',
        },
    });
    const copyPlugin = new CopyWebpackPlugin([
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
    ]);
    const miniCssExtractPlugin = new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].css',
    });

    const terserPlugin = new TerserPlugin({
        terserOptions: {
            parse: { ecma: 8 },
            compress: { ecma: 5 },
            output: {
                ecma: 5,
                comments: false,
                // comments: /^\**!|@preserve/i,
            },
        },
        extractComments: false,
    });
    const bannerPlugin = new webpack.BannerPlugin({
        raw: true,
        banner: '/*!\n' +
                ' * This Source Code Form is subject to the terms of the Mozilla Public\n' +
                ' * License, v. 2.0. If a copy of the MPL was not distributed with this\n' +
                ' * file, You can obtain one at http://mozilla.org/MPL/2.0/.\n' +
                ' */\n',
    });

    // ===============
    //  COMMON CONFIG
    // ===============
    /** @type {import('webpack').Configuration} */
    const config = {
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
                                { loader: 'css-loader', options: { importLoaders: 1 } },
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
            minimizer: [ terserPlugin, bannerPlugin ],
        },
        plugins: [
            progressPlugin,         // Report compilation progress
            dotenvPlugin,           // Dotenv plugin + Fail build if required variables are not defined
            licensePlugin,          // Output third party licenses to a file
            copyPlugin,             // Copy static files to build directory
            miniCssExtractPlugin,   // Extract CSS into separate files; one .css file per .js
        ],
        performance: {
            hints: false,
            assetFilter: assetFilename => {
                return !(/^preview\.gif$/.test(assetFilename));
            },
        },
    };

    // ============
    //  PRODUCTION
    // ============
    /** @type {import('webpack').Configuration} */
    const prodConfig = _.merge({}, config, {
        mode: 'production',
        optimization: {
            minimize: true,
            minimizer: [ terserPlugin, bannerPlugin ],
        },
    });

    // =============
    //  DEVELOPMENT
    // =============
    /** @type {import('webpack').Configuration} */
    const devConfig = _.merge({}, config, {
        mode: 'development',
        output: { publicPath: '/' },
        optimization: { minimize: false },
        plugins: [ ...config.plugins, bannerPlugin ],
        devServer: {
            port: 3000,
            hot: true,
            open: true,
            contentBase: SRC_PATH,
            publicPath: '/',
        },
        devtool: 'inline-source-map',
    });

    if (hot) {
        devConfig.entry = [
            'webpack-dev-server/client?http://localhost:3000',
            'webpack/hot/only-dev-server',
            ...devConfig.entry,
        ];
        devConfig.plugins = [
            ...devConfig.plugins,
            new webpack.HotModuleReplacementPlugin(),
        ];
    }

    return isProduction ? prodConfig : devConfig;
}

module.exports = getWebpackConfig;
