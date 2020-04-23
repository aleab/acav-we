# aCAV-WE
> A highly customizable audio visualizer for [Wallpaper Engine](https://www.wallpaperengine.io/).

[![GitHub last commit (master)](https://img.shields.io/github/last-commit/aleab/acav-we/master)][commits/master]
[![GitHub license](https://img.shields.io/github/license/aleab/acav-we)][license]
[![Steam subscribers](https://img.shields.io/steam/subscriptions/2071366191?color=1C3F56&logo=steam)][steam-workshop]

## Contributing

### Requirements
Wallpaper Engine, `npm` (_or other package manager_), `git`

### Getting Started and more
1. Set up your local copy.
   - **Fork** this repo and **clone** it: `git clone https://github.com/USERNAME/acav-we`.
   - Create a new **branch**: `git checkout -b BRANCH_NAME master`.
2. Install the project's **dependencies** with `npm install`.
3. Create a file named **`.env`** in the root folder and add the following environment variables in the form `NAME=VALUE`:

Variable name         | Description
--------------------- | ---------------------
`BACKEND_API_BASEURL` | URL to local server handling Spotify's token requests, e.g. `http://localhost:4000`.<br>Only needed if working on the Spotify overlay; leave an empty value otherwise.<br>(Minimal server code is available [here](https://github.com/aleab/acav-we-server))

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
[steam-workshop]: <https://steamcommunity.com/sharedfiles/filedetails/?id=2071366191>
