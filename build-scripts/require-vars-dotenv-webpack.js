/* eslint-disable import/no-extraneous-dependencies */
const chalk = require('chalk');
const DotenvPlugin = require('dotenv-webpack');

const webpack = require('webpack');

const PLUGIN_NAME = 'RequireVarsDotenvWebpackPlugin';

class RequireVarsDotenvPlugin {
    _environmentVariableNames = [];
    _dotenvOptions = undefined;

    /**
     * @param {string[]} environmentVariableNames
     * @param {DotenvPlugin.Options} dotenvOptions
     */
    constructor(environmentVariableNames, dotenvOptions = undefined) {
        this._environmentVariableNames = environmentVariableNames;
        this._dotenvOptions = dotenvOptions;
    }

    /** @param {webpack.Compiler} compiler */
    apply(compiler) {
        /** @type {DotenvPlugin & { getEnvs: () => { env: { [string]: string } } }} */
        const dotenv = new DotenvPlugin(this._dotenvOptions);

        compiler.hooks.environment.tap(PLUGIN_NAME, () => {
            console.log('Checking for necessary env variables...');

            const missingEnvVars = [];
            const envs = dotenv.getEnvs().env;
            for (let i = 0; i < this._environmentVariableNames.length; ++i) {
                const env = this._environmentVariableNames[i];
                if (envs[env] === undefined) {
                    missingEnvVars.push(env);
                }
            }

            if (missingEnvVars.length) {
                console.error(chalk.yellow('Please set the following environment variables in .env before building the project.'));
                console.error(chalk.red(`  - ${missingEnvVars.join('\n  * ')}`));
                throw new Error('Missing env variables. Please see additional logging above');
            }
        });

        dotenv.apply(compiler);
    }
}

module.exports = RequireVarsDotenvPlugin;
