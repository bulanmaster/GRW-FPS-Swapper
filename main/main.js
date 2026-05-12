const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { exec } = require('child_process');
const sevenZip = require('7zip-min');
const sevenZipBin = require('7zip-bin');
const { autoUpdater } = require('electron-updater');

// Force the 7za binary path to the asar.unpacked location. 7zip-min's
// built-in detection checks process.argv[1] for 'app.asar', which is
// unreliable in packaged Electron apps — the binary path then points
// inside app.asar, where it can't be executed.
sevenZip.config({ binaryPath: sevenZipBin.path7za.replace('app.asar', 'app.asar.unpacked') });

let win;

// Sit next to the running app rather than inside userData so the user can
// inspect everything easily. In dev that's the project folder; when packaged,
// it's the install dir alongside the .exe. For the portable target the .exe
// self-extracts to a temp folder, so `app.getPath('exe')` would point at a
// transient location — electron-builder sets PORTABLE_EXECUTABLE_DIR to the
// folder the user actually placed the .exe in; honor that first.
const APP_BASE_DIR = () => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  return app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
};

const MOD_DROP_DIR = () => path.join(APP_BASE_DIR(), 'mod');
const MOD_EXTRACTED_DIR = (versionKey) => path.join(MOD_DROP_DIR(), 'extracted-' + versionKey);
const BACKUP_DIR = () => path.join(APP_BASE_DIR(), 'backups');
const STATE_FILE = () => path.join(APP_BASE_DIR(), 'state.json');

// Files we copy from the extracted mod into the game folder. Paths are
// relative to the mod's "Drag and drop this folder's contents..." subfolder.
const MOD_SWAP_FILES = [
  path.join('EasyAntiCheat', 'EasyAntiCheat_x64.dll'),
  path.join('EasyAntiCheat', 'EasyAntiCheat_x86.dll'),
  'GRW.exe',
  'shadercontainer_engine_win64_f.dll',
];

const fileExists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const hashFile = async (p) => {
  const buf = await fs.readFile(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
};

/**
 * Recursively walk a directory and return absolute paths of all regular files.
 */
const walkFiles = async (dir) => {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
};

/**
 * Find the folder inside the extracted zip that contains the actual mod
 * files (the "Drag and drop this folder's contents into your game directory"
 * folder, regardless of what the author named it). We locate it by finding
 * GRW.exe and using its parent dir, then verify the rest of the swap files
 * are siblings.
 */
const findSwapSource = async (extractedRoot) => {
  const allFiles = await walkFiles(extractedRoot);
  const grwExeMatches = allFiles.filter(f => path.basename(f) === 'GRW.exe');
  for (const grwExe of grwExeMatches) {
    const candidate = path.dirname(grwExe);
    const allPresent = await Promise.all(
      MOD_SWAP_FILES.map(rel => fileExists(path.join(candidate, rel)))
    );
    if (allPresent.every(Boolean)) {
      return candidate;
    }
  }
  return null;
};

/**
 * Detect whether an extracted zip is the Cheat Engine version (has a *.CT
 * file anywhere in its tree) or the Executable version (no *.CT file).
 */
const detectVersion = async (extractedRoot) => {
  const allFiles = await walkFiles(extractedRoot);
  return allFiles.some(f => f.toUpperCase().endsWith('.CT')) ? 'cheatEngine' : 'executable';
};

/**
 * Look at the user's mod/ folder, find any *.zip files, and ensure each is
 * extracted into its version-specific folder. Caches by zip mtime in
 * state.json so unchanged zips aren't re-extracted (the .exe is ~360 MB).
 *
 * @returns {Promise<{ cheatEngine: string|null, executable: string|null, errors: string[] }>}
 *   The path to the swap-source folder for each version (or null if missing).
 */
const ensureModsExtracted = async () => {
  const dropDir = MOD_DROP_DIR();
  await fs.mkdir(dropDir, { recursive: true });

  const entries = await fs.readdir(dropDir, { withFileTypes: true });
  const zipFiles = entries
    .filter(e => e.isFile() && /\.(zip|7z)$/i.test(e.name))
    .map(e => path.join(dropDir, e.name));

  // Load cache from state.json
  let state = {};
  try {
    state = JSON.parse(await fs.readFile(STATE_FILE(), 'utf8'));
  } catch {}
  const cache = state.modCache ?? {};

  const errors = [];
  const result = { cheatEngine: null, executable: null, errors };

  for (const zipPath of zipFiles) {
    const stat = await fs.stat(zipPath);
    const cached = cache[zipPath];

    let versionKey = cached?.versionKey;
    let needsExtract = !cached || cached.mtimeMs !== stat.mtimeMs;

    if (needsExtract) {
      // Extract to a temp folder, sniff the version, then move.
      const tmpTarget = path.join(dropDir, '_tmp-' + path.basename(zipPath, path.extname(zipPath)));
      await fs.rm(tmpTarget, { recursive: true, force: true });
      try {
        await new Promise((resolve, reject) => {
          sevenZip.unpack(zipPath, tmpTarget, (err) => err ? reject(err) : resolve());
        });
      } catch (err) {
        errors.push(path.basename(zipPath) + ' (extraction failed: ' + err.message + ')');
        await fs.rm(tmpTarget, { recursive: true, force: true });
        continue;
      }

      try {
        versionKey = await detectVersion(tmpTarget);
      } catch (err) {
        errors.push(path.basename(zipPath) + ' (could not detect version: ' + err.message + ')');
        await fs.rm(tmpTarget, { recursive: true, force: true });
        continue;
      }

      const finalTarget = MOD_EXTRACTED_DIR(versionKey);
      await fs.rm(finalTarget, { recursive: true, force: true });
      await fs.rename(tmpTarget, finalTarget);

      cache[zipPath] = { mtimeMs: stat.mtimeMs, versionKey };
    }

    const extractedRoot = MOD_EXTRACTED_DIR(versionKey);
    const swapSource = await findSwapSource(extractedRoot);
    if (!swapSource) {
      errors.push(path.basename(zipPath) + ' (extracted, but expected mod files not found inside)');
      continue;
    }

    result[versionKey] = swapSource;
  }

  // Drop cache entries for zips that no longer exist in the drop folder.
  for (const cachedZip of Object.keys(cache)) {
    if (!zipFiles.includes(cachedZip)) {
      delete cache[cachedZip];
    }
  }

  // Persist updated cache
  state.modCache = cache;
  const tmp = STATE_FILE() + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STATE_FILE());

  return result;
};

/**
 * Detect whether GRW.exe is currently running. Windows-only — returns false
 * elsewhere. Used to lock unsafe actions while the game is holding write
 * locks on the files we swap.
 * @returns {Promise<boolean>}
 */
const isGameRunning = () => new Promise((resolve) => {
  if (process.platform !== 'win32') {
    resolve(false);
    return;
  }
  exec('tasklist /FI "IMAGENAME eq GRW.exe" /NH /FO CSV', (err, stdout) => {
    if (err) {
      resolve(false);
      return;
    }
    resolve(stdout.toLowerCase().includes('grw.exe'));
  });
});

let lastGameRunning = null;
const pollGameRunning = async () => {
  const running = await isGameRunning();
  if (running !== lastGameRunning) {
    lastGameRunning = running;
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-running-changed', running);
    }
  }
};

function createWindow() {
  win = new BrowserWindow({
    width: 960, // 1366,
    height: 540,
    transparent: true,
    frame: false,
    resizable: false,
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // default settings for Electron app, but documented here
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

// Handle close event from renderer
ipcMain.on('close-window', () => {
  if (win) win.close();
});

ipcMain.on('open-external', (_event, url) => {
  // Only allow http/https. Anything else is rejected to avoid abuse.
  if (typeof url === 'string' && /^https?:\/\//.test(url)) {
    shell.openExternal(url);
  }
});

ipcMain.on('open-mod-folder', async () => {
  const dir = MOD_DROP_DIR();
  await fs.mkdir(dir, { recursive: true });
  shell.openPath(dir);
});

ipcMain.handle('copy-to-mod-folder', async (_event, sourcePaths) => {
  try {
    const dir = MOD_DROP_DIR();
    await fs.mkdir(dir, { recursive: true });
    let copied = 0;
    for (const src of sourcePaths) {
      const dest = path.join(dir, path.basename(src));
      await fs.copyFile(src, dest);
      copied++;
    }
    return { ok: true, copied };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dialog:pick-folder', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('load-state', async () => {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE(), 'utf8'));
  } catch {
    return null;
  }
});

ipcMain.handle('save-current', async (_event, currentSnapshot) => {
  let state = {};
  try {
    state = JSON.parse(await fs.readFile(STATE_FILE(), 'utf8'));
  } catch {}
  state.current = currentSnapshot;
  const tmp = STATE_FILE() + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STATE_FILE());
});

ipcMain.handle('get-available-versions', async () => {
  const result = await ensureModsExtracted();
  return {
    cheatEngine: !!result.cheatEngine,
    executable: !!result.executable,
  };
});

ipcMain.handle('verify-originals', async (_event, gamePath) => {
  try {
    if (lastGameRunning === true) {
      return { ok: false, error: 'Close Ghost Recon Wildlands before verifying.' };
    }
    if (!gamePath || !await fileExists(gamePath)) {
      return { ok: false, error: 'Game folder does not exist: ' + gamePath };
    }

    const mods = await ensureModsExtracted();
    // For verification, hash-compare against either mod source — if either
    // matches, the file in the game folder is a modded copy (not pristine).
    const modSources = [mods.cheatEngine, mods.executable].filter(Boolean);
    if (modSources.length === 0) {
      return { ok: false, error: 'No mod zip found in ' + MOD_DROP_DIR() + '. Drop the FPS mod zips there first.' };
    }

    const backupDir = BACKUP_DIR();
    await fs.mkdir(backupDir, { recursive: true });

    let refreshed = 0;
    let skipped = 0;
    const errors = [];

    for (const rel of MOD_SWAP_FILES) {
      const gameFile = path.join(gamePath, rel);
      const backupPath = path.join(backupDir, rel);
      try {
        if (!await fileExists(gameFile)) {
          errors.push(rel + ' (missing in game folder)');
          continue;
        }

        const gameHash = await hashFile(gameFile);

        // If we already have a backup matching this game file, nothing to refresh.
        if (await fileExists(backupPath) && await hashFile(backupPath) === gameHash) {
          skipped++;
          continue;
        }

        // If the game file matches any mod source, it's a modded copy — don't
        // capture it as a "pristine original".
        let isMod = false;
        for (const src of modSources) {
          const modFile = path.join(src, rel);
          if (await fileExists(modFile) && await hashFile(modFile) === gameHash) {
            isMod = true;
            break;
          }
        }
        if (isMod) {
          skipped++;
          continue;
        }

        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(gameFile, backupPath);
        refreshed++;
      } catch (err) {
        errors.push(rel + ' (' + err.message + ')');
      }
    }

    return { ok: true, refreshed, skipped, errors };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('apply-settings', async (_event, desired) => {
  try {
    if (lastGameRunning === true) {
      return { ok: false, error: 'Close Ghost Recon Wildlands before applying.' };
    }
    if (!desired?.path) {
      return { ok: false, error: 'No game path selected.' };
    }
    if (!await fileExists(desired.path)) {
      return { ok: false, error: 'Game folder does not exist: ' + desired.path };
    }

    const mods = await ensureModsExtracted();
    if (mods.errors.length > 0) {
      return { ok: false, error: 'Mod extraction problems:\n' + mods.errors.join('\n') };
    }

    const swapSource = mods[desired.version];
    if (desired.activate === 'fps' && !swapSource) {
      const expected = desired.version === 'cheatEngine' ? 'Cheat Engine' : 'Executable';
      return { ok: false, error: 'No ' + expected + ' version mod found. Drop the corresponding zip into ' + MOD_DROP_DIR() + '.' };
    }

    const backupDir = BACKUP_DIR();
    await fs.mkdir(backupDir, { recursive: true });

    // Capture pristine originals (only the first time we touch each file).
    for (const rel of MOD_SWAP_FILES) {
      const backupPath = path.join(backupDir, rel);
      if (!await fileExists(backupPath)) {
        const gameFile = path.join(desired.path, rel);
        if (!await fileExists(gameFile)) {
          return { ok: false, error: 'Game folder is missing expected file: ' + rel };
        }
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(gameFile, backupPath);
      }
    }

    // Apply: copy mod source (ON) or backup (OFF) into game folder.
    for (const rel of MOD_SWAP_FILES) {
      const target = path.join(desired.path, rel);
      const source = desired.activate === 'fps'
        ? path.join(swapSource, rel)
        : path.join(backupDir, rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }

    // Persist applied state.
    let state = {};
    try {
      state = JSON.parse(await fs.readFile(STATE_FILE(), 'utf8'));
    } catch {}
    state.applied = desired;
    const tmp = STATE_FILE() + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(state, null, 2));
    await fs.rename(tmp, STATE_FILE());

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

let pollHandle = null;

app.whenReady().then(async () => {
  // Make sure the user-facing mod drop folder exists from first launch.
  await fs.mkdir(MOD_DROP_DIR(), { recursive: true });
  createWindow();
  pollHandle = setInterval(pollGameRunning, 3000);
  void pollGameRunning();

  // Auto-update: only meaningful for packaged builds — dev runs have no installer.
  // Default behavior: silent download in the background, install on next quit.
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('Update check failed:', err);
    });
  }
});

app.on('window-all-closed', () => {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
