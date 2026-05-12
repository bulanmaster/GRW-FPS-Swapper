'use strict';

import { MAIN_MENU, appState } from './state.js';
import { renderRightPane } from './right-pane.js';
import { updateApplyButton, persistCurrent, updateLockedItems } from './apply.js';

/**
 * Cycle the toggler at `key` by `direction` (no wrap). Updates the item's
 * `current`, the displayed state text, the disabled state of the arrows, and
 * (if visible) the right pane.
 * @param {string|null} key
 * @param {-1|1} direction
 */
export const cycleToggler = (key, direction) => {
  const currentMenuChildren = appState.currentTab === MAIN_MENU
    ? appState.children
    : appState.children[appState.currentTab].children;
  const item = currentMenuChildren[key];
  if (!item?.options) {
    return;
  }

  // Don't allow Version to change while Activate is currently applied as ON —
  // the file set differs between modes, so a switch mid-active would leak files.
  // User must toggle Activate OFF and Apply first.
  if (key === 'version' && appState.applied?.activate === 'fps') {
    return;
  }

  const optionKeys = Object.keys(item.options);
  const length = optionKeys.length;
  const nextIndex = optionKeys.indexOf(item.current) + direction;
  if (nextIndex < 0 || nextIndex >= length) {
    return;
  }

  // Refuse to switch Version to a version whose zip isn't present.
  if (key === 'version' && !appState.availableVersions[optionKeys[nextIndex]]) {
    return;
  }

  // Refuse to activate FPS when the current version's mod zip isn't present —
  // Apply would just fail. Allow FPS→vanilla always (deactivation reads from
  // the backup folder, not the source zip).
  if (key === 'activate' && optionKeys[nextIndex] === 'fps') {
    const currentVersion = appState.children.setup.children.version.current;
    if (!appState.availableVersions[currentVersion]) {
      return;
    }
  }

  // Refuse any Activate cycle while the game is running — the file copy
  // would fail because GRW.exe holds OS write locks on the swapped files.
  if (key === 'activate' && appState.gameRunning) {
    return;
  }

  item.current = optionKeys[nextIndex];

  const button = document.querySelector(`#${key}-button`);
  if (!button) {
    return;
  }
  button.querySelector('.state').innerText = item.options[item.current];
  button.querySelector('.arrow.left').classList.toggle('disabled', nextIndex === 0);
  button.querySelector('.arrow.right').classList.toggle('disabled', nextIndex === length - 1);

  if (key === appState.selected) {
    renderRightPane(item);
  }

  updateApplyButton();
  persistCurrent();
  updateLockedItems();
};
