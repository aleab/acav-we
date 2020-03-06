/// <reference path="../@types/app.d.ts" />

if (!window.wallpaperRegisterAudioListener) {
    window.wallpaperRegisterAudioListener = samples => {};
}

if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'development';
}

window.acav = {};
