'use strict';

import { MAIN_MENU, appState } from './state.js';
import { exitBackButtonText } from './dom.js';
import { showPopup, hidePopup } from './popup.js';
import { updateMenuDOM, updateSelectionDOM, moveSelectionWithKeys } from './selection.js';

/**
 * Activate the currently selected menu item: enter the folder if it is one.
 * Togglers are activated by their arrow buttons; plain settings are no-ops for now.
 */
export const activateSelected = () => {
  if (appState.selected === null) {
    return;
  }

  const currentMenuChildren = appState.currentTab === MAIN_MENU
    ? appState.children
    : appState.children[appState.currentTab].children;
  const item = currentMenuChildren[appState.selected];

  if (item?.children) {
    updateMenuDOM(appState.selected);
    exitBackButtonText.innerText = 'Back';
    updateSelectionDOM(null);
    moveSelectionWithKeys();
  }
  // togglers: arrow clicks handle activation; Enter/Space is a no-op
  // plain settings (path, usage entries): no behavior wired yet
};

/**
 * Hide the popup and ask the Electron main process to close the window.
 */
export const closeWindow = () => {
  hidePopup();
  window.electronAPI.closeWindow();
};

/**
 * Navigate from a submenu back to the main menu.
 */
export const goBack = () => {
  if (appState.currentTab === MAIN_MENU) {
    return;
  }

  updateMenuDOM(MAIN_MENU);
  exitBackButtonText.innerText = 'Exit';
  updateSelectionDOM(null);
  moveSelectionWithKeys();
};

/**
 * Go back to the main menu if in a submenu, otherwise show the close-confirmation popup.
 */
export const backOrClose = () => {
  if (appState.currentTab === MAIN_MENU) {
    showPopup({
      header: 'Warning',
      content: 'Are you sure you want to quit to desktop?',
      hasCancel: true,
      onAccept: closeWindow,
    });
    return;
  }

  goBack();
};
