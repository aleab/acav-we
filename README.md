# aCAV-WE
> A highly customizable audio visualizer for [Wallpaper Engine](https://www.wallpaperengine.io/).

[![GitHub last commit (master)](https://img.shields.io/github/last-commit/aleab/acav-we/master)][commits/master]
[![GitHub license](https://img.shields.io/github/license/aleab/acav-we?cacheSeconds=86400)][license]
[![Steam subscribers](https://img.shields.io/steam/subscriptions/FILE_ID?label=subscribers&color=1C3F56&logo=steam)][steam-workshop]

> TODO: Add preview gif here, show the wallpaper's customizability in particular.

## Contributing

### Requirements
Wallpaper Engine, npm (_or other package manager_), git

### Getting Started and more
1. **Fork** this repo, **clone** your fork and create a new **branch** (`git checkout -b mybranch`).
2. Install the project's **dependencies** with `npm install --no-package-lock`.
3. Create a file named **`.env`** in the root folder and add the following environment variables in the form `NAME=VALUE`:

Variable name         | Description
--------------------- | ---------------------
`BACKEND_API_BASEURL` | URL to local server handling Spotify's token requests (sample server code available [here]()).<br>Only needed if working on the Spotify overlay feature; leave an empty value otherwise.

4. **Code** your awesome new feature or fix a bug or whatever.
5. **Build** the project with `npm run build:dev` or `npm run build:dev -- --watch`.
6. **Test** and debug your changes.
   - Create a symbolic link inside Wallpaper Engine's projects folder pointing to the build directory: `mklink /D "WALLPAPER_ENGINE_ROOT\projects\myprojects\aCAV-dev" "REPO_ROOT\dist"`.
   - Launch Wallpaper Engine and open the wallpaper _aCAV-dev_.
   - Set up a _CEF devtools port_ in Wallpaper Engine's settings, e.g. port 10000.
   - Unfortunately, as of 2020-03-23, the newest versions of basically any browser aren't compatible anymore with the version of CEF used by Wallpaper Engine, so you'll probably need to download an older version of Chrome or alternatively the sample CEF application distributed [here](http://opensource.spotify.com/cefbuilds/index.html); any version ≤ 79 will work fine.
   - Open Chrome or the _Sample Application_ (_cefclient.exe_) and go to e.g. `http://localhost:10000`.
   - Debug, code, build, repeat.
7. **Commit** your changes with a meaningful message and **push** to your branch.
8. Create a **pull request**. ([How?](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork))


[//]: # (Links)
[commits/master]: <https://github.com/aleab/acav-we/commits/master>
[license]: </LICENSE.txt>
[steam-workshop]: <>
