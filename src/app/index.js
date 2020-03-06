/// <reference path="../@types/app.d.ts" />

import Log from '../common/Log';

if (!window.wallpaperRegisterAudioListener) {
    window.wallpaperRegisterAudioListener = samples => {};
}

if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'development';
}
if (process.env['NODE_ENV'] === 'production') {
    Log.debug = () => {};
    Log.info = () => {};
}

window.acav = {};
