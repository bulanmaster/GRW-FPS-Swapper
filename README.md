# GRW FPS Swapper

A small Windows app that toggles the first-person view mod for **Tom Clancy's Ghost Recon Wildlands** on and off without manually swapping files each time.

The actual FPS mod is by [Tavreth](https://www.nexusmods.com/ghostreconwildlands/mods/20) — this app just makes installing, switching versions, and reverting one-click.

## Download

Grab the latest installer from the [Releases page](https://github.com/bulanmaster/GRW-FPS-Swapper/releases). Run the `.exe`, pick an install location, done. The app auto-updates itself on subsequent launches.

## Usage

1. Download the FPS mod from [Nexus Mods](https://www.nexusmods.com/ghostreconwildlands/mods/20) — grab whichever version(s) you want: Executable, Cheat Engine, or both.
2. Drop the zip file(s) into the `mod/` folder next to the app (use **Setup → Open mod folder** to find it). The app extracts them automatically.
3. In **Setup → Path**, point at your Ghost Recon Wildlands install (the folder containing `GRW.exe`).
4. If you have both versions, pick one in **Setup → Version**. Otherwise it's decided for you.
5. Toggle **Activate** to **ON** on the main menu.
6. Press **F** (or click **Apply**) to commit.

To revert to vanilla 3rd-person view, toggle **Activate** to **OFF** and Apply again.

### Cheat Engine mode

After applying in Cheat Engine mode, launch the game, then open [Cheat Engine](https://www.cheatengine.org/), attach it to the GRW process, and load the `GRW.CT` file from `mod/extracted-cheatEngine/<author-subfolder>/`. Activate the table's FPS script to enable first-person view.

## Features

- **Auto-update** — new releases download silently and install on next quit.
- **Verify originals** — backs up pristine game files so reverting always works, even after a game patch.
- **Game-running detection** — locks unsafe actions while `GRW.exe` is open (the game holds write locks on the files this app swaps).
- **Two mod versions supported** — Executable (replaces `GRW.exe` directly) and Cheat Engine (load the mod table after launch).

## Building from source

    npm install
    npm start          # run in dev mode
    npm run build:win  # build the NSIS installer into dist/

Requires Node.js 18+ and Windows for the NSIS installer target.

## Credits

- **FPS mod** by [Tavreth](https://www.nexusmods.com/ghostreconwildlands/mods/20) — the actual mod this app installs. Support him on [YouTube](https://www.youtube.com/channel/UCP5S2sxhHc_nNoV6owRfQ0A) or [Buy Me a Coffee](https://www.buymeacoffee.com/Tavreth).
- **AntiCheat DLLs** bundled with the mod by SunBeam — [original post](https://fearlessrevolution.com/viewtopic.php?t=5980).
- Additional thanks to **Mask**, **i_pk_pjers_i**, and **Bean_Burrito**.
- **GRW FPS Swapper** by [bulanmaster](https://www.twitch.tv/bulanmaster).

## License

[GPL-3.0-only](LICENSE)
