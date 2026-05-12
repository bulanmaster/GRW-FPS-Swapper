'use strict';

/**
 * @typedef {Object} TextBottom
 * @property {string} header
 * @property {string} description
 */

/**
 * @typedef {Object} RightPane
 * @property {'image'|'path'|'text'|'verify'|'openFolder'} type
 * @property {Object<string, string>} [images] - for type='image': option key → image src
 */

/**
 * @typedef {Object} MenuItem
 * @property {string} label
 * @property {boolean} [long]
 * @property {string} [default]
 * @property {string} [current]
 * @property {Object<string, string>} [options]
 * @property {Object<string, MenuItem>} [children]
 * @property {string} [textRight]
 * @property {RightPane} [rightPane]
 * @property {TextBottom} textBottom
 */

/**
 * @typedef {Object} PopupConfig
 * @property {string} header
 * @property {string} content
 * @property {boolean} hasCancel
 * @property {() => void} onAccept
 */

export const MAIN_MENU = 'mainMenu';

/** @type {{ showing: boolean, accept: boolean, config: PopupConfig|null }} */
export const popup = {
  showing: false,
  accept: true,
  config: null,
};

export const appState = {
  currentTab: MAIN_MENU,
  selected: null,
  /** @type {'left'|'right'} which side currently owns keyboard focus */
  focusedSide: 'left',
  /** Which mod versions have a valid extracted zip in mod/. */
  availableVersions: { cheatEngine: false, executable: false },
  /** True when GRW.exe is detected as running by the main process poller. */
  gameRunning: false,
  children: {
    activate: {
      label: 'Activate',
      default: 'vanilla',
      current: 'vanilla',
      options: {
        'vanilla': 'off',
        'fps': 'on',
      },
      rightPane: {
        type: 'image',
        images: {
          'vanilla': 'assets/tps.png',
          'fps': 'assets/fps.png',
        },
      },
      textBottom: {
        header: 'Activate',
        description: 'Toggle between 3rd person and 1st person views',
      },
    },
    setup: {
      label: 'Setup',
      children: {
        path: {
          label: 'Path',
          default: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Tom Clancy\'s Ghost Recon Wildlands',
          current: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Tom Clancy\'s Ghost Recon Wildlands',
          rightPane: {
            type: 'path',
          },
          textBottom: {
            header: 'Path',
            description: 'Point the application towards the folder containing the game',
          },
        },
        version: {
          label: 'Version',
          default: 'executable',
          current: 'executable',
          options: {
            'executable': 'Executable',
            'cheatEngine': 'Cheat Engine',
          },
          rightPane: {
            type: 'image',
            images: {
              'executable': 'assets/version-executable.png',
              'cheatEngine': 'assets/version-cheat-engine.png',
            },
          },
          textBottom: {
            header: 'Version',
            description: 'Toggle between Executable and Cheat Engine mode',
          },
        },
        openModFolder: {
          label: 'Open mod folder',
          long: true,
          rightPane: {
            type: 'openFolder',
          },
          textBottom: {
            header: 'Open mod folder',
            description: 'Show the folder where you should drop the downloaded FPS mod zip files.',
          },
        },
        verifyOriginals: {
          label: 'Verify originals',
          long: true,
          rightPane: {
            type: 'verify',
          },
          textBottom: {
            header: 'Verify originals',
            description: 'Refresh the backup of original game files. Run this after updating the game.',
          },
        },
      },
      textBottom: {
        header: 'Setup',
        description: 'Setup the application so that it can activate/deactivate the mod',
      },
    },
    usage: {
      label: 'Usage',
      children: {
        grwFps: {
          label: 'How to use GRW FPS swapper',
          long: true,
          textRight: '1. Download the FPS mod from Nexus — grab whichever version(s) you want to use: Executable, Cheat Engine, or both.\nhttps://www.nexusmods.com/ghostreconwildlands/mods/20\n\n2. Drop the zip file(s) into the {{mod-folder}} next to this app. The app extracts them automatically and locks the Version setting to whichever versions you provided.\n3. In Setup → Path, pick the folder where Ghost Recon Wildlands is installed (the folder containing GRW.exe).\n4. If you have both versions, pick which one in Setup → Version. Otherwise this is decided for you.\n5. Go back to the Main Menu and toggle Activate to ON.\n6. Press F (or click Apply) to commit.\n\nTo go back to vanilla 3rd-person view, toggle Activate OFF and Apply again.',
          rightPane: {
            type: 'text',
          },
          textBottom: {
            header: 'How to use GRW FPS swapper',
            description: 'Overall workflow for using this app',
          },
        },
        fpsExecutable: {
          label: 'How to use FPS mod as executable',
          long: true,
          textRight: 'Executable mode replaces the relevant game files (GRW.exe, the EasyAntiCheat DLLs, and the shadercontainer DLL) with the modded versions from the Executable zip.\n\nAfter applying, just launch the game normally — first-person view is active by default.\n\nTo return to vanilla, toggle Activate OFF and Apply.',
          rightPane: {
            type: 'text',
          },
          textBottom: {
            header: 'How to use FPS mod as executable',
            description: 'Run the FPS mod by replacing the game executable',
          },
        },
        fpsCheatEngine: {
          label: 'How to use FPS mod with Cheat Engine',
          long: true,
          textRight: 'Cheat Engine mode swaps the same files as Executable mode but using the versions from the Cheat Engine zip.\n\nGet Cheat Engine here:\nhttps://www.cheatengine.org/\n\nAfter applying, launch the game, then open Cheat Engine, attach it to the GRW process, and load the GRW.CT file (inside "mod/extracted-cheatEngine/" you\'ll find a subfolder named by the mod author — GRW.CT lives in there). Activate the table\'s FPS script to enable first-person view.\n\nToggle Activate OFF and Apply when you want to revert.',
          rightPane: {
            type: 'text',
          },
          textBottom: {
            header: 'How to use FPS mod with Cheat Engine',
            description: 'Run the FPS mod through Cheat Engine instead of replacing GRW.exe',
          },
        },
      },
      textBottom: {
        header: 'Usage',
        description: 'Read up on how to use the application, the mod, and the Cheat Engine (if you choose to run it with Cheat Engine)',
      },
    },
    credits: {
      label: 'Credits',
      long: true,
      rightPane: {
        type: 'text',
      },
      textRight: 'GRW FPS Swapper\nMade by bulanmaster\nhttps://www.twitch.tv/bulanmaster\n\n———\n\nFPS Mod for Ghost Recon Wildlands\nCreated by Tavreth\nhttps://www.nexusmods.com/ghostreconwildlands/mods/20\n\nYouTube:\nhttps://www.youtube.com/channel/UCP5S2sxhHc_nNoV6owRfQ0A\n\nBuy Tavreth a coffee:\nhttps://www.buymeacoffee.com/Tavreth\n\nSpecial thanks to SunBeam for the AntiCheat DLLs that ship with the mod. Original post:\nhttps://fearlessrevolution.com/viewtopic.php?t=5980\n\nAdditional thanks to:\nMask\ni_pk_pjers_i\nBean_Burrito',
      textBottom: {
        header: 'Credits',
        description: 'Credits for the app and the FPS mod it depends on',
      },
    },
  },
};

/**
 * Snapshot of the values that were last applied. Initialized to the starting
 * `current` values so the app boots in a clean state. Hydrated from state.json
 * during startup.
 */
appState.applied = {
  activate: appState.children.activate.current,
  version: appState.children.setup.children.version.current,
  path: appState.children.setup.children.path.current,
};