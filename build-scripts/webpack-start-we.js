/* eslint-disable import/no-extraneous-dependencies */

const exec = require('child_process').exec;
const fs = require('fs');
const os = require('os');
const path = require('path');
const webpack = require('webpack');

const getWebpackConfig = require('../webpack.config');
const buildProjectJson = require('../project.json/build');

const username = os.userInfo().username;
const projectJsonPath = path.win32.join(__dirname, 'dist', 'project.json');

const monitorId = String.raw`//?/DISPLAY#BNQ7F1C#5&49e848f&5&UID4352#{e6f07b5f-ee97-4a90-b076-33f57bf4eaa7}`;
const wePath = String.raw`C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine`;
const weProjectPath = path.win32.join(wePath, 'projects', 'myprojects', "Aleab's Customizable Audio Visualizer");

const handleConsoleOutput = (_err, _stdout, _stderr) => {
    if (_err) {
        console.error(_err);
    } else if (_stderr) {
        console.error(_stderr);
    } else {
        if (_stdout) console.log(_stdout);
        return true;
    }
    return false;
};

const config = getWebpackConfig({}, { mode: 'production' });
config.mode = 'development';
config.plugins.push(new webpack.EnvironmentPlugin({ NODE_ENV: 'development' }));

const compiler = webpack(config);

const watcher = compiler.watch({}, async (err, stats) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log();
    console.log(stats.toString({
        assets: true,
        builtAt: true,
        chunks: false,
        colors: true,
        entrypoints: true,
        hash: true,
        excludeModules: /\/node_modules\//,
        timings: true,
        version: true,
    }));

    await buildProjectJson().catch(e => {
        console.error(e);
    });

    // Get WE properties
    let weProperties = '';
    const weConfig = JSON.parse(fs.readFileSync(path.win32.join(wePath, 'config.json')).toString());
    if (weConfig[username]) {
        /** @type {Array} */
        const wallpaperProperties = weConfig[username]['wallpaperproperties'];
        const wp = wallpaperProperties.find(x => {
            const file = path.normalize(x['file']);
            return file === path.win32.join(weProjectPath, 'index.html');
        });
        if (wp) {
            const props = wp['monitors'][monitorId];
            if (props) {
                weProperties = `-properties RAW~(${JSON.stringify(props)})~END`;
            }
        }
    }

    const _openArgs = `-control openWallpaper -file "${projectJsonPath}" -monitor 1`;
    console.log();
    console.log(`Opening wallpaper: wallpaper32.exe ${_openArgs}`);
    exec(`start "" wallpaper32.exe ${_openArgs}`, { cwd: wePath }, (_err, _stdout, _stderr) => {
        if (weProperties && handleConsoleOutput(_err, _stdout, _stderr)) {
            const _applyArgs = `-control applyProperties -monitor 1 ${weProperties}`;
            console.log(`Applying properties: wallpaper32.exe ${_applyArgs}`);
            exec(`start "" wallpaper32.exe ${_applyArgs}`, { cwd: wePath }, handleConsoleOutput);
        }
    });
});

[ 'SIGINT', 'SIGTERM' ].forEach(sig => {
    process.on(sig, () => {
        watcher.close();
        process.exit();
    });
});
