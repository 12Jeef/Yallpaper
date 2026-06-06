<img src="./example.png" />

*A light breeze*<br />
*brings a midnight chill.*<br />
*A sea of stars above*<br />
*a grassy hill.*<br />
*Who needs more than that?*<br />
<p align="right">— 👑</p>

<h1 align="center">Yallpaper</h1>

Yallpaper is a simple, open-source app to have an animated wallpaper on MacOS. It's something I made for y'all!

## Technologies

- Swift app running built-in WebKit
- High-performance WebGPU/HTML/TS
- Static wallpaper for lock screen

> [!WARNING]
> This app is built for MacOS only! To make it so that the wallpaper applies on all desktops/spaces, go to System Settings → Wallpaper → Show on all Spaces, and toggle that on. Otherwise, due to API limitations, I am unable to set the same PNG across all desktops/spaces. Sadly, there is no exposed API for a permanently animated wallpaper.

## Requirements
- XCode ([Install](https://developer.apple.com/xcode/))
- NodeJS/NPM ([Install](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))

## Development

### Web (`./www`)

To set up, run `npm i` to install the required packages.

To run locally via your favorite web browser, run `npm run dev` in the command line, and go to the directed address.

Once you've made the changes you like, run the `build` script in the root of this repository. This will call `npm run build` on `www`, take the extracted files, and move them to the `Resources` location in the `Yallpaper` app.

### App (`./app`)

To set up, open in XCode.

To run, simply click the <kbd>▶</kbd> icon in the top left. To stop, simply click the <kbd>◽️</kbd> icon in the top left. More information about XCode usage can be found [here](https://developer.apple.com/documentation/xcode).
