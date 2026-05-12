'use strict';

import { MAIN_MENU, appState, popup } from './state.js';
import { footerButtons, popupButtons } from './dom.js';
import { popupKeysHandler, popupButtonsListener, popupButtonsMouseEnterListener, hidePopup } from './popup.js';
import { renderMenus } from './render.js';
import { cycleToggler } from './toggler.js';
import {
  setFooterTexts,
  resetFooterTexts,
  updateSelectionDOM,
  moveSelectionWithKeys,
  getSelectedItem,
} from './selection.js';
import {
  applySettings,
  updateApplyButton,
  updateLockedItems,
  refreshAvailableVersions,
} from './apply.js';
import { activateSelected, backOrClose } from './actions.js';
import { enterRightPane, exitRightPane, moveRightPaneFocus } from './right-pane.js';

/**
 * @param {KeyboardEvent} event
 */
const navigationKeysListener = (event) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      if (popup.showing) {
        break;
      }
      if (appState.focusedSide === 'right') {
        moveRightPaneFocus(-1);
        break;
      }
      moveSelectionWithKeys(-1);
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      if (popup.showing) {
        break;
      }
      if (appState.focusedSide === 'right') {
        moveRightPaneFocus(1);
        break;
      }
      moveSelectionWithKeys();
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      if (popup.showing) {
        popupKeysHandler();
        break;
      }
      if (appState.focusedSide === 'right') {
        exitRightPane();
        break;
      }
      cycleToggler(appState.selected, -1);
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      if (popup.showing) {
        popupKeysHandler();
        break;
      }
      if (appState.focusedSide === 'right') {
        moveRightPaneFocus(1);
        break;
      }
      // Togglers cycle on right; non-togglers shift focus into the right pane
      // (if it has interactive elements).
      if (getSelectedItem()?.options) {
        cycleToggler(appState.selected, 1);
      } else {
        enterRightPane();
      }
      break;
    case ' ':
    case 'Enter':
      if (popup.showing) {
        if (popup.accept) {
          popup.config?.onAccept?.();
        } else {
          hidePopup();
        }
        break;
      }
      // When a right-pane button is focused, the browser fires the click
      // natively on Enter/Space — don't double-trigger.
      if (appState.focusedSide === 'right') {
        break;
      }
      activateSelected();
      break;
    case 'f':
    case 'F':
      if (popup.showing) {
        break;
      }
      void applySettings();
      break;
    case 'Escape':
      if (popup.showing) {
        hidePopup();
        break;
      }
      if (appState.focusedSide === 'right') {
        exitRightPane();
        break;
      }
      backOrClose();
      break;
    default:
  }
};

/**
 * @param {MouseEvent} event
 */
const settingsMouseEnterLeaveListener = (event) => {
  const currentMenuChildren = appState.currentTab === MAIN_MENU
    ? appState.children
    : appState.children[appState.currentTab].children;
  const selected = event.target.id.split('-button')[0];
  switch (event.type) {
    case 'mouseenter':
      updateSelectionDOM(selected);
      setFooterTexts(
        currentMenuChildren[selected].textBottom.header,
        currentMenuChildren[selected].textBottom.description,
      );
      break;
    case 'mouseleave':
      updateSelectionDOM(null);
      resetFooterTexts();
      break;
    default:
  }
};

/**
 * @param {MouseEvent} event
 */
const footerButtonsListener = (event) => {
  switch (event.currentTarget.id) {
    case 'apply':
      void applySettings();
      break;
    case 'exitBack':
      backOrClose();
      break;
    default:
  }
};

window.addEventListener('keydown', navigationKeysListener);

// Suppress default browser drop behavior outside the right-pane drop zone,
// otherwise dropping a file on the window navigates to its file:// URL.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

for (let index = 0, footerButtonsLength = footerButtons.length; index < footerButtonsLength; index++) {
  footerButtons[index].addEventListener('click', footerButtonsListener);
}

for (let index = 0, popupButtonsLength = popupButtons.length; index < popupButtonsLength; index++) {
  popupButtons[index].addEventListener('mouseenter', popupButtonsMouseEnterListener);
  popupButtons[index].addEventListener('click', popupButtonsListener);
}

(async () => {
  // Hydrate from saved state before first render so togglers and inputs
  // reflect the user's last session.
  const saved = await window.electronAPI.loadState();
  if (saved) {
    if (saved.applied) {
      appState.applied = saved.applied;
    }
    if (saved.current) {
      if (saved.current.activate !== undefined) {
        appState.children.activate.current = saved.current.activate;
      }
      if (saved.current.version !== undefined) {
        appState.children.setup.children.version.current = saved.current.version;
      }
      if (saved.current.path !== undefined) {
        appState.children.setup.children.path.current = saved.current.path;
      }
    }
  }

  renderMenus();

  const settingButtons = document.querySelectorAll('.setting');
  for (let index = 0, settingButtonsLength = settingButtons.length; index < settingButtonsLength; index++) {
    settingButtons[index].addEventListener('mouseenter', settingsMouseEnterLeaveListener);
    settingButtons[index].addEventListener('mouseleave', settingsMouseEnterLeaveListener);
    settingButtons[index].addEventListener('click', activateSelected);
  }

  moveSelectionWithKeys();
  updateApplyButton();
  updateLockedItems();

  window.electronAPI.onGameRunningChange((running) => {
    appState.gameRunning = running;
    updateLockedItems();
    updateApplyButton();
  });

  // Detect available mod versions in the background — extraction can take
  // a moment for large zips, so don't block the initial render.
  void refreshAvailableVersions();
})();
