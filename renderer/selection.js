'use strict';

import { MAIN_MENU, appState } from './state.js';
import { footerHeader, footerDescription } from './dom.js';
import { renderRightPane } from './right-pane.js';

/**
 * @typedef {import('./state.js').MenuItem} MenuItem
 */

/**
 * @param {string} headerText
 * @param {string} descriptionText
 */
export const setFooterTexts = (headerText, descriptionText) => {
  footerHeader.innerText = headerText;
  footerDescription.innerText = descriptionText;
};

/**
 * Clear the footer header and description text.
 */
export const resetFooterTexts = () => {
  setFooterTexts('', '');
};

/**
 * @param {string|null} selected
 */
export const updateSelectionDOM = (selected) => {
  if (appState.selected !== null) {
    document.querySelector(`#${appState.selected}-button`).classList.remove('selected');
  }

  appState.selected = selected;

  if (selected !== null) {
    document.querySelector(`#${selected}-button`).classList.add('selected');
  }

  const currentMenuChildren = appState.currentTab === MAIN_MENU
    ? appState.children
    : appState.children[appState.currentTab].children;
  renderRightPane(selected !== null ? currentMenuChildren[selected] : null);
};

/**
 * @param {string} selected
 */
export const updateMenuDOM = (selected) => {
  document.querySelector(`#${appState.currentTab}-menu`).classList.add('hidden');
  appState.currentTab = selected;
  document.querySelector(`#${appState.currentTab}-menu`).classList.remove('hidden');
};

/**
 * @param {-1|1} [direction = 1]
 */
export const moveSelectionWithKeys = (direction = 1) => {
  const currentMenuChildren = appState.currentTab === MAIN_MENU
    ? appState.children
    : appState.children[appState.currentTab].children;
  const currentMenuChildrenArray = Object.keys(currentMenuChildren);
  const length = currentMenuChildrenArray.length;

  const nextIndex = appState.selected === null
    ? 0
    : (currentMenuChildrenArray.indexOf(appState.selected) + direction + length) % length;

  updateSelectionDOM(currentMenuChildrenArray[nextIndex]);

  setFooterTexts(
    currentMenuChildren[appState.selected].textBottom.header,
    currentMenuChildren[appState.selected].textBottom.description,
  );
};

/**
 * Look up the currently selected MenuItem in whatever menu is active.
 * @returns {MenuItem|null}
 */
export const getSelectedItem = () => {
  if (appState.selected === null) {
    return null;
  }
  const currentMenuChildren = appState.currentTab === MAIN_MENU
    ? appState.children
    : appState.children[appState.currentTab].children;
  return currentMenuChildren[appState.selected] ?? null;
};
