/* eslint-disable global-require */

const _ = require('lodash');
const glob = require('glob');
const path = require('path');
const webpack = require('webpack');

const cssnano = require('cssnano');
const postcss = require('postcss');
const postcssImport = require('postcss-import');
const purgecss = require('@fullhuman/postcss-purgecss');

const ESLintPlugin = require('eslint-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
const LodashPlugin = require('lodash-webpack-plugin');
const ThreeMinifierPlugin = require('@yushijinhun/three-minifier-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const RequireVarsDotenvPlugin = require('./build-scripts/require-vars-dotenv-webpack');

const packageJson = require('./package.json');

const SRC_PATH = path.resolve(__dirname, 'src');
const DIST_PATH = path.resolve(__dirname, 'dist');

/** @param {string} string */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @returns {import('license-webpack-plugin/dist/LicenseIdentifiedModule').LicenseIdentifiedModule[]} */
function getAdditionalLicensedResources() {
    return [
        {
            name: 'MusicBrainz Logo (images/musicbrainz-logo.svg)',
            licenseId: 'CC-BY-SA-4.0',
            licenseText: 'Copyright (C) 2020 MetaBrainz Foundation and contributors\n\n' +
                         'The MusicBrainz Logo is licensed under the CC BY-SA 4.0 license <https://creativecommons.org/licenses/by-sa/4.0/>\n' +
                         'The MusicBrainz Logo is used in its unmodified form <https://github.com/metabrainz/metabrainz-logos/blob/master/logos/MusicBrainz/SVG/MusicBrainz_logo_mini.svg>\n',
        },
    ];
}

// ========
//  CONFIG
// ========
/**
 * @type {(env: any, argv: import('webpack').CliConfigOptions) => import('webpack').Configuration}
 */
function getWebpackConfig(env, argv) {
    const mode = argv.nodeEnv || argv.mode || 'production';
    const isProduction = mode !== 'development';

    const hot = !!argv.hot;
    const buildTests = !isProduction || !!env['BUILD_TESTS']; // `npm run build -- --env BUILD_TESTS` to include tests in production for ultimate test
    const noLint = !!env['NO_LINT'];

    // Plugins
    const eslintPlugin = new ESLintPlugin({
        files: ['src/**/*'],
        extensions: [ '.js', '.mjs', '.jsx', '.ts', '.tsx' ],
        exclude: ['node_modules'],
        lintDirtyModulesOnly: true,
    });
    const bundleAnalyzerPlugin = new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: '../bundle-report.html',
        defaultSizes: 'parsed',
        openAnalyzer: false,
        generateStatsFile: true,
        statsFilename: '../bundle-stats.json', // http://webpack.github.io/analyse/#modules
    });
    const progressPlugin = new webpack.ProgressPlugin({ profile: true });
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
            modules.push(...getAdditionalLicensedResources());

            let text = '';
            const M = _.sortBy(modules, m => m.name.toLowerCase());
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
            'musicbrainz-api': '<missing license text>',
        },
    });
    const lodashPlugin = new LodashPlugin({ cloning: true, exotics: true });
    const threeJsMinifierPlugin = new ThreeMinifierPlugin();
    const copyPlugin = new CopyWebpackPlugin({
        patterns: [
            ...glob.sync('./LICENSE*.txt').map(file => ({
                from: file,
                to: DIST_PATH,
                toType: 'dir',
            })),
            {
                context: path.resolve(__dirname, 'static'),
                from: '**/*',
                to: DIST_PATH,
                toType: 'dir',
                transform(content, filePath) {
                    if (isProduction) {
                        // Minify css
                        if (path.extname(filePath) === '.css') {
                            return postcss([cssnano({ preset: 'default' })]).process(content).then(v => v.css);
                        }
                    }
                    return content;
                },
            },
        ],
    });
    const miniCssExtractPlugin = new MiniCssExtractPlugin({ filename: '[name].css' });

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
        test: /(main\.js)$/,
        raw: true,
        banner: '/*!\n' +
                ' * This Source Code Form is subject to the terms of the Mozilla Public\n' +
                ' * License, v. 2.0. If a copy of the MPL was not distributed with this\n' +
                ' * file, You can obtain one at http://mozilla.org/MPL/2.0/.\n' +
                ' */\n',
    });

    const postcssPlugins = [postcssImport()];
    const postcssNoPurgePlugins = [postcssImport()];
    if (isProduction) {
        const purgecssPlugin = purgecss({
            content: [ './static/**/*.html', './src/**/*.tsx' ],
            fontFace: true,
            keyframes: true,
            variables: true,
            whitelistPatterns: [/^simplebar-/],
        });

        postcssNoPurgePlugins.push(cssnano({ preset: 'default' }));
        postcssPlugins.push(cssnano({ preset: 'default' }), purgecssPlugin);
    }

    // ===============
    //  COMMON CONFIG
    // ===============
    /** @type {import('webpack').Configuration} */
    const baseConfig = {
        entry: { main: './src/index.tsx' },
        output: {
            path: DIST_PATH,
            filename: '[name].js',
        },
        resolve: {
            extensions: [ '.css', '.ts', '.tsx', '.js', '.jsx' ],
            plugins: [
                threeJsMinifierPlugin.resolver,
            ],
            fallback: {
                assert: require.resolve('assert/'),
                net: false,
                tls: false,
                url: require.resolve('url'),
            },
        },
        module: {
            rules: [
                {
                    oneOf: [
                        {
                            test: /\.(js|ts)x?$/,
                            loader: 'babel-loader',
                            exclude: [/node_modules/],
                        },
                        {
                            // NO PURGECSS
                            test: /[\\/](simplebar)\.css$/,
                            use: [
                                MiniCssExtractPlugin.loader,
                                { loader: 'css-loader', options: { importLoaders: 1, url: false } },
                                {
                                    loader: 'postcss-loader',
                                    options: {
                                        postcssOptions: {
                                            plugins: postcssNoPurgePlugins,
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            test: /\.css$/,
                            use: [
                                MiniCssExtractPlugin.loader,
                                { loader: 'css-loader', options: { importLoaders: 1, url: false } },
                                {
                                    loader: 'postcss-loader',
                                    options: {
                                        postcssOptions: {
                                            plugins: postcssPlugins,
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            test: /project(\.properties)?\.json$/,
                            loader: path.resolve(__dirname, 'build-scripts', 'project-json-loader.js'),
                        },
                        {
                            test: /\.(json|jsonc)$/,
                            loader: path.resolve(__dirname, 'build-scripts', 'jsonc-loader.js'),
                        },
                        {
                            test: /\.svg$/i,
                            issuer: /\.(js|ts)x?$/,
                            loader: '@svgr/webpack',
                        },
                        {
                            type: 'asset/resource',
                            exclude: [ /\.(js|mjs|jsx|ts|tsx)$/, /\.json$/, /\.html$/ ],
                        },
                    ],
                },
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [ terserPlugin, bannerPlugin ],
            splitChunks: {
                chunks: 'all',
                name: (_module, _chunks, cacheGroupKey) => cacheGroupKey,
                cacheGroups: {
                    'lib-a': { // modules that are less likely to be updated
                        test: module => {
                            if (/\.css$/.test(module.resource)) return false;
                            const p = escapeRegExp(path.resolve(__dirname, '..'));
                            return /[\\/]node_modules[\\/](@fortawesome|color-convert|html2canvas|musicbrainz-api|simplebar(-.*)?)[\\/]/.test(module.resource)
                                || RegExp(`${p}[\\/](html2canvas|musicbrainz-api)[\\/]`).test(module.resource);
                        },
                        priority: 10,
                    },
                    'lib-b': { // modules that are more likely to be updated
                        test: module => {
                            return !(/\.css$/.test(module.resource))
                                && /[\\/]node_modules[\\/](fuse.js|idb|lodash|@?xstate)[\\/]/.test(module.resource);
                        },
                        priority: 10,
                    },
                    three: { // three.js
                        test: /[\\/]node_modules[\\/]three[\\/]/,
                        priority: 10,
                    },
                    react: {
                        test: module => {
                            if (/\.css$/.test(module.resource)) return false;
                            return /[\\/]node_modules[\\/](react(-.+)?)[\\/]/.test(module.resource)
                                || /[\\/]node_modules[\\/](prop-types|.*react.*|scheduler)[\\/]/.test(module.resource); // transitive dependencies
                        },
                        enforce: true,
                        priority: 1,
                    },
                    defaultVendors: {
                        name: 'vendors',
                        test: module => {
                            return !(/\.css$/.test(module.resource))
                                && /[\\/]node_modules[\\/]/.test(module.resource);
                        },
                        enforce: true,
                    },
                },
            },
        },
        plugins: [
            progressPlugin,         // Report compilation progress
            dotenvPlugin,           // Dotenv plugin + Fail build if required variables are not defined
            licensePlugin,          // Output third party licenses to a file
            lodashPlugin,
            threeJsMinifierPlugin,
            copyPlugin,             // Copy static files to build directory
            miniCssExtractPlugin,   // Extract CSS into separate files; one .css file per .js
        ],
        performance: {
            hints: false,
            assetFilter: assetFilename => {
                return !(/^preview\.gif$/.test(assetFilename));
            },
        },
        stats: {
            all: false,
            assets: true,
            assetsSort: '!size',
            builtAt: true,
            chunks: true,
            chunkGroups: true,
            chunkModules: true,
            chunksSort: '!size',
            colors: true,
            entrypoints: true,
            errors: true,
            errorDetails: true,
            excludeModules: false,
            modules: true,
            modulesSort: '!size',
            performance: true,
            version: true,
            warnings: true,
        },
        watchOptions: {
            ignored: [
                '**/node_modules',
                path.resolve(__dirname, './dist').replace(/\\/g, '/'),
            ],
        },
    };

    if (!noLint) {
        baseConfig.plugins = [ eslintPlugin, ...baseConfig.plugins ];
    }

    // ============
    //  PRODUCTION
    // ============
    /** @type {import('webpack').Configuration} */
    const _prodConf = {
        mode: 'production',
        plugins: [
            bundleAnalyzerPlugin,
            ...baseConfig.plugins,
        ],
    };
    const prodConfig = _.merge({}, baseConfig, _prodConf);

    // =============
    //  DEVELOPMENT
    // =============
    /** @type {import('webpack').Configuration} */
    const _devConfig = {
        mode: 'development',
        output: { publicPath: '/' },
        optimization: { minimize: false },
        plugins: [ ...baseConfig.plugins, bannerPlugin ],
        devServer: {
            port: 3000,
            hot: true,
            open: true,
            contentBase: DIST_PATH,
            publicPath: '/',
        },
        devtool: 'inline-source-map',
    };
    const devConfig = _.merge({}, baseConfig, _devConfig);

    if (hot) {
        const hotDevEntry = [
            'webpack-dev-server/client?http://localhost:3000',
            'webpack/hot/only-dev-server',
        ];
        devConfig.entry.main = typeof devConfig.entry.main === 'string' ? [ ...hotDevEntry, devConfig.entry.main ] : [ ...hotDevEntry, ...devConfig.entry.main ];
        devConfig.plugins = [
            ...devConfig.plugins,
            new webpack.HotModuleReplacementPlugin(),
        ];
    }

    const config = isProduction ? prodConfig : devConfig;

    if (!buildTests) {
        config.plugins = [
            new webpack.NormalModuleReplacementPlugin(/tests[\\/]tests\.ts/, path.resolve(__dirname, 'src/tests/noop.ts')),
            ...config.plugins,
        ];
    }

    return config;
}

module.exports = getWebpackConfig;
