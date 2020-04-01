const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const cssnano = require('cssnano');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const DotenvPlugin = require('webpack-dotenv-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const SRC_PATH = path.resolve(__dirname, 'src');
const DIST_PATH = path.resolve(__dirname, 'dist');

/**
 * @type {(env: any, argv: import('webpack').CliConfigOptions) => import('webpack').Configuration}
 */
function getWebpackConfig(env, argv) {
    const isProduction = argv.mode !== 'development';

    // Plugins
    const progressPlugin = new webpack.ProgressPlugin({ profile: true });
    const dotenvPlugin = new DotenvPlugin({
        sample: './.env.example',
        path: './.env.gh-pages',
        allowEmptyValues: false,
    });
    const copyPlugin = new CopyWebpackPlugin([
        {
            from: './public/**/*',
            transformPath(targetPath) { return path.relative('./public', targetPath); },
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
            output: { ecma: 5, comments: false },
        },
        extractComments: false,
    });

    /** @type {import('webpack').Configuration} */
    const config = {
        entry: {
            main: './src/index.ts',
        },
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
                                        plugins: [
                                            cssnano({ preset: 'default' }),
                                        ],
                                    },
                                },
                            ],
                        },
                        {
                            test: /\.(png|jpe?g|gif)$/i,
                            loader: 'file-loader',
                            options: {
                                name: '[path][name].[ext]',
                            },
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
                            if (/\.css$/.test(module.resource)) return false;
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
    };

    // ============
    //  PRODUCTION
    // ============
    /** @type {import('webpack').Configuration} */
    const _prodConf = {
        mode: 'production',
    };
    const prodConfig = _.merge({}, config, _prodConf);

    // =============
    //  DEVELOPMENT
    // =============
    /** @type {import('webpack').Configuration} */
    const _devConfig = {
        mode: 'development',
        output: { publicPath: '/' },
        optimization: { minimize: false },
        devServer: {
            port: 3000,
            hot: true,
            open: true,
            contentBase: SRC_PATH,
            publicPath: '/',
            historyApiFallback: true,
        },
        devtool: 'inline-source-map',
    };
    const devConfig = _.merge({}, config, _devConfig);

    return isProduction ? prodConfig : devConfig;
}

module.exports = getWebpackConfig;
