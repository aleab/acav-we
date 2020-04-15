/* eslint-disable import/no-extraneous-dependencies */
const chalk = require('chalk');
const DotenvPlugin = require('dotenv-webpack');

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

    apply(compiler) {
        compiler.plugin('environment', (compilation, callback) => {
            console.log('Checking for necessary env variables...');
            const dotenv = new DotenvPlugin(this._dotenvOptions);

            const missingEnvVars = [];
            for (let i = 0; i < this._environmentVariableNames.length; ++i) {
                const env = this._environmentVariableNames[i];
                if (dotenv.definitions[`process.env.${env}`] === undefined) {
                    missingEnvVars.push(env);
                }
            }

            if (missingEnvVars.length) {
                console.error(chalk.yellow('Please set the following environment variables in .env before building the project.'));
                console.error(chalk.red(`  - ${missingEnvVars.join('\n  * ')}`));
                throw new Error('Missing env variables. Please see additional logging above');
            }

            dotenv.apply(compiler);
        });
    }
}

module.exports = RequireVarsDotenvPlugin;
