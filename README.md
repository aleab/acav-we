# aCAV-WE
> A highly customizable audio visualizer for [Wallpaper Engine](https://www.wallpaperengine.io/).

[![GitHub last commit (master)](https://img.shields.io/github/last-commit/aleab/acav-we/master)][commits/master]
[![GitHub license](https://img.shields.io/github/license/aleab/acav-we?cacheSeconds=3600)][license]
[![Steam subscribers](https://img.shields.io/steam/subscriptions/2071366191?color=1C3F56&logo=steam&cacheSeconds=300)][steam-workshop]

## Contributing

### Getting Started
1. `npm install`
2. Duplicate the file named **`.env_template`** and rename it to **`.env`**. The following variables are required:

Variable name         | Description
--------------------- | ---------------------
`BACKEND_API_BASEURL` | URL to the server handling Spotify's token requests, e.g. `http://localhost:4000`.<br>Can be left empty if not needed during debugging.<br>(Minimal server code is available [here](https://github.com/aleab/acav-we-server))

3. Build the project with `npm run build:dev` or `npm run build:dev -- --watch`.
4. To test your changes:
   - Create a symbolic link inside Wallpaper Engine's projects folder pointing to the build directory:  
   `mklink /D "WALLPAPER_ENGINE_ROOT\projects\myprojects\aCAV-dev" "REPO_ROOT\dist"`
   - Launch Wallpaper Engine and open the new wallpaper.
   - Set up a _CEF devtools port_ in Wallpaper Engine's settings, e.g. port 10000.
   - Open your browser and go to e.g. `http://localhost:10000`.

## Donations
Although absolutely not necessary, if you'd like to support me and this project, you can do so [here](https://aleab.github.io/acav-we/#donations).


[//]: # (Links)
[commits/master]: <https://github.com/aleab/acav-we/commits/master>
[license]: </LICENSE.txt>
[steam-workshop]: <https://steamcommunity.com/sharedfiles/filedetails/?id=2071366191>
