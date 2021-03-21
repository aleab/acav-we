const path = require('path');
const webpack = require('webpack');

const cssnano = require('cssnano');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const DotenvPlugin = require('webpack-dotenv-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const SRC_PATH = path.resolve(__dirname, 'src');
const DIST_PATH = path.resolve(__dirname, 'dist');

/**
 * @type {(env: any, argv: import('webpack').CliConfigOptions) => import('webpack').Configuration}
 */
function getWebpackConfig(env, argv) {
    const mode = argv.nodeEnv || argv.mode || 'production';
    const isProduction = mode !== 'development';

    // Plugins
    const progressPlugin = new webpack.ProgressPlugin({ profile: true });
    const dotenvPlugin = new DotenvPlugin({
        sample: './.env.example',
        path: './.env.gh-pages',
        allowEmptyValues: false,
    });
    const copyPlugin = new CopyWebpackPlugin({
        patterns: [
            {
                from: './public/**/*',
                to({ absoluteFilename }) { return path.relative('./public', absoluteFilename); },
            },
            {
                from: './public/.nojekyll',
            },
        ],
    });
    const eslintPlugin = new ESLintPlugin({
        extensions: [ 'js', 'mjs', 'jsx', 'ts', 'tsx' ],
        exclude: ['node_modules'],
    });
    const miniCssExtractPlugin = new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].css',
    });
    const terserPlugin = new TerserPlugin({
        terserOptions: {
            parse: { ecma: 8 },
            compress: { ecma: 5 },
            output: { ecma: 5, comments: false },
        },
        extractComments: false,
    });

    /** @type {import('webpack').Configuration} */
    const config = {
        entry: { main: './src/index.ts' },
        output: {
            path: DIST_PATH,
            filename: '[name].js',
            publicPath: '/',
        },
        resolve: {
            extensions: [ '.ts', '.tsx', '.js', '.css' ],
        },
        module: {
            rules: [
                {
                    oneOf: [
                        {
                            test: /\.(js|ts)x?$/,
                            loader: 'babel-loader',
                            exclude: /node_modules/,
                        },
                        {
                            test: /\.css$/,
                            use: [
                                MiniCssExtractPlugin.loader,
                                { loader: 'css-loader', options: { importLoaders: 1 } },
                                {
                                    loader: 'postcss-loader',
                                    options: {
                                        postcssOptions: {
                                            plugins: [
                                                cssnano({ preset: 'default' }),
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            test: /\.(png|jpe?g|gif)$/i,
                            type: 'asset/resource',
                        },
                    ],
                },
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [terserPlugin],
            splitChunks: {
                cacheGroups: {
                    react: {
                        test: module => {
                            if (!module.resource) return false;
                            if (/\.css$/.test(module.resource)) return false;
                            return /[\\/]node_modules[\\/](react(-.+)?)[\\/]/.test(module.resource)
                                || /[\\/]node_modules[\\/](prop-types|.*react.*|scheduler)[\\/]/.test(module.resource); // transitive dependencies
                        },
                        name: 'react',
                        chunks: 'all',
                        priority: 10,
                    },
                    lib: {
                        test: module => {
                            if (!module.resource) return false;
                            if (/\.(css|svg)$/.test(module.resource)) return false;
                            return /[\\/]node_modules[\\/]/.test(module.resource);
                        },
                        name: 'lib',
                        chunks: 'all',
                        priority: 1,
                    },
                },
            },
        },
        plugins: [
            eslintPlugin,
            progressPlugin,         // Report compilation progress
            dotenvPlugin,
            copyPlugin,             // Copy static files to build directory
            miniCssExtractPlugin,
        ],
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
        devtool: false,
    };

    // ============
    //  PRODUCTION
    // ============
    /** @type {import('webpack').Configuration} */
    const prodConfig = {
        ...config,
        mode: 'production',
        plugins: [
            ...config.plugins,
            new webpack.DefinePlugin({
                'process.env.PUBLIC_URL': JSON.stringify('/acav-we'),
            }),
        ],
    };

    // =============
    //  DEVELOPMENT
    // =============
    /** @type {import('webpack').Configuration} */
    const devConfig = {
        ...config,
        mode: 'development',
        optimization: {
            ...config.optimization,
            minimize: false,
        },
        devServer: {
            port: 3000,
            hot: true,
            open: true,
            contentBase: DIST_PATH,
            publicPath: '/',
            historyApiFallback: true,
        },
        devtool: 'inline-source-map',
    };

    return isProduction ? prodConfig : devConfig;
}

module.exports = getWebpackConfig;
