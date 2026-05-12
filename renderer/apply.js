'use strict';

import { MAIN_MENU, appState } from './state.js';
import { applyButton } from './dom.js';
import { showPopup, hidePopup } from './popup.js';
import { renderRightPane } from './right-pane.js';

/**
 * @returns {{ activate: string, version: string, path: string }}
 */
export const getCurrentSnapshot = () => ({
  activate: appState.children.activate.current,
  version: appState.children.setup.children.version.current,
  path: appState.children.setup.children.path.current,
});

/**
 * @returns {boolean}
 */
export const isDirty = () => {
  const current = getCurrentSnapshot();
  return (
    current.activate !== appState.applied.activate ||
    current.version !== appState.applied.version ||
    current.path !== appState.applied.path
  );
};

/**
 * Show or hide the Apply footer button based on whether `current` diverges from `applied`.
 */
export const updateApplyButton = () => {
  applyButton.classList.toggle('hidden', !isDirty() || appState.gameRunning === true);
};

/**
 * Persist the user's `current` snapshot to disk. Fire-and-forget — the next
 * write supersedes any in-flight one if the user toggles rapidly.
 */
export const persistCurrent = () => {
  void window.electronAPI.saveCurrent(getCurrentSnapshot());
};

/**
 * When the mod is currently applied as ON, settings whose changes can't be
 * safely applied mid-active (Version, Path, Verify) are locked. Version is
 * also locked if fewer than 2 mod versions are available (no choice to make).
 * Reflects visually by graying out the row and forcing arrows disabled.
 */
export const updateLockedItems = () => {
  const activateApplied = appState.applied?.activate === 'fps';
  const gameRunning = appState.gameRunning === true;
  const availCount = (appState.availableVersions.cheatEngine ? 1 : 0) + (appState.availableVersions.executable ? 1 : 0);
  const versionLock = activateApplied || availCount < 2;
  const currentVersion = appState.children.setup.children.version.current;
  const activateLock = (!activateApplied && !appState.availableVersions[currentVersion]) || gameRunning;
  const verifyLock = activateApplied || gameRunning;

  document.querySelector('#path-button')?.classList.toggle('locked', activateApplied);
  document.querySelector('#verifyOriginals-button')?.classList.toggle('locked', verifyLock);
  document.querySelector('#version-button')?.classList.toggle('locked', versionLock);
  document.querySelector('#activate-button')?.classList.toggle('locked', activateLock);

  const activateButton = document.querySelector('#activate-button');
  if (activateButton) {
    const leftArrow = activateButton.querySelector('.arrow.left');
    const rightArrow = activateButton.querySelector('.arrow.right');
    if (activateLock) {
      leftArrow.classList.add('disabled');
      rightArrow.classList.add('disabled');
    } else {
      const item = appState.children.activate;
      const optionKeys = Object.keys(item.options);
      const currentIndex = optionKeys.indexOf(item.current);
      leftArrow.classList.toggle('disabled', currentIndex === 0);
      rightArrow.classList.toggle('disabled', currentIndex === optionKeys.length - 1);
    }
  }

  const versionButton = document.querySelector('#version-button');
  if (!versionButton) {
    return;
  }
  const leftArrow = versionButton.querySelector('.arrow.left');
  const rightArrow = versionButton.querySelector('.arrow.right');

  if (versionLock) {
    leftArrow.classList.add('disabled');
    rightArrow.classList.add('disabled');
    return;
  }

  // Not locked — restore boundary-based disabled state.
  const item = appState.children.setup.children.version;
  const optionKeys = Object.keys(item.options);
  const currentIndex = optionKeys.indexOf(item.current);
  leftArrow.classList.toggle('disabled', currentIndex === 0);
  rightArrow.classList.toggle('disabled', currentIndex === optionKeys.length - 1);
};

/**
 * Ask the main process which versions have a valid mod zip extracted, and
 * adjust state/UI accordingly. If the user's `current` version isn't
 * available, switch to one that is. Updates lock state at the end.
 */
export const refreshAvailableVersions = async () => {
  appState.availableVersions = await window.electronAPI.getAvailableVersions();

  const versionItem = appState.children.setup.children.version;
  if (!appState.availableVersions[versionItem.current]) {
    const fallback = appState.availableVersions.cheatEngine
      ? 'cheatEngine'
      : (appState.availableVersions.executable ? 'executable' : null);
    if (fallback && fallback !== versionItem.current) {
      versionItem.current = fallback;
      const stateEl = document.querySelector('#version-button .state');
      if (stateEl) {
        stateEl.innerText = versionItem.options[versionItem.current];
      }
      persistCurrent();
      updateApplyButton();
    }
  }

  updateLockedItems();
};

/**
 * Apply the queued settings: ask the main process to perform the file swap,
 * and on success copy `current` into `applied` and hide the Apply button.
 */
export const applySettings = async () => {
  if (!isDirty()) {
    return;
  }

  const desired = getCurrentSnapshot();
  const previousActivate = appState.applied.activate;

  // The file swap copies ~360 MB (GRW.exe) plus a few DLLs, so it takes
  // a few seconds. Show a popup so the click feels responsive.
  showPopup({
    header: 'Applying',
    content: 'Swapping game files. This can take a few seconds.',
    hasCancel: false,
    onAccept: hidePopup,
  });

  const result = await window.electronAPI.applySettings(desired);

  if (!result?.ok) {
    showPopup({
      header: 'Apply failed',
      content: result?.error ?? 'Unknown error',
      hasCancel: false,
      onAccept: hidePopup,
    });
    return;
  }

  appState.applied = desired;
  updateApplyButton();
  updateLockedItems();

  // The apply call ran ensureModsExtracted in main, which may have changed
  // what's available (e.g., a previously-unzipped version got extracted).
  void refreshAvailableVersions();

  // Re-render right pane so the path panel's button-disabled state reflects
  // the new applied lock.
  if (appState.selected !== null) {
    const currentMenuChildren = appState.currentTab === MAIN_MENU
      ? appState.children
      : appState.children[appState.currentTab].children;
    renderRightPane(currentMenuChildren[appState.selected]);
  }

  // Cheat Engine mode requires the user to launch CE manually after the swap.
  // Show the instructions only on the OFF→ON transition in CE mode.
  // Otherwise dismiss the "Applying..." popup that's still showing.
  if (
    previousActivate !== 'fps' &&
    desired.activate === 'fps' &&
    desired.version === 'cheatEngine'
  ) {
    showPopup({
      header: 'Cheat Engine setup',
      content: appState.children.usage.children.fpsCheatEngine.textRight ?? '',
      hasCancel: false,
      onAccept: hidePopup,
    });
  } else {
    hidePopup();
  }
};
