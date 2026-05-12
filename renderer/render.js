'use strict';

import { MAIN_MENU, appState } from './state.js';
import { cycleToggler } from './toggler.js';

/**
 * @typedef {import('./state.js').MenuItem} MenuItem
 */

/**
 * @param {string} key
 * @param {MenuItem} item
 * @returns {HTMLDivElement}
 */
export const renderSettingItem = (key, item) => {
  const button = document.createElement('div');
  button.id = `${key}-button`;
  button.className = item.children ? 'setting folder' : 'setting';

  const text = document.createElement('div');
  text.className = item.long ? 'text long' : 'text';
  text.innerText = item.label;
  button.appendChild(text);

  if (item.options) {
    const optionKeys = Object.keys(item.options);
    const currentIndex = optionKeys.indexOf(item.current);
    const length = optionKeys.length;

    const toggler = document.createElement('div');
    toggler.className = 'toggler';

    const leftArrow = document.createElement('div');
    leftArrow.className = currentIndex === 0 ? 'arrow left disabled' : 'arrow left';
    leftArrow.addEventListener('click', event => {
      event.stopPropagation();
      cycleToggler(key, -1);
    });
    toggler.appendChild(leftArrow);

    const state = document.createElement('div');
    state.className = 'state';
    state.innerText = item.options[item.current];
    toggler.appendChild(state);

    const rightArrow = document.createElement('div');
    rightArrow.className = currentIndex === length - 1 ? 'arrow right disabled' : 'arrow right';
    rightArrow.addEventListener('click', event => {
      event.stopPropagation();
      cycleToggler(key, 1);
    });
    toggler.appendChild(rightArrow);

    button.appendChild(toggler);
  }

  return button;
};

/**
 * @param {string} menuKey
 * @param {string} menuTitle
 * @param {Object<string, MenuItem>} children
 * @param {boolean} isActive
 * @returns {HTMLDivElement}
 */
export const renderMenu = (menuKey, menuTitle, children, isActive) => {
  const menu = document.createElement('div');
  menu.id = `${menuKey}-menu`;
  menu.className = isActive ? 'menu' : 'menu hidden';

  if (menuKey !== MAIN_MENU) {
    const sectionName = document.createElement('div');
    sectionName.className = 'section-name';
    sectionName.innerText = 'Main Menu';
    menu.appendChild(sectionName);
  }

  const subSectionName = document.createElement('div');
  subSectionName.className = 'sub-section-name';
  subSectionName.innerText = menuTitle;
  menu.appendChild(subSectionName);

  for (const [key, item] of Object.entries(children)) {
    menu.appendChild(renderSettingItem(key, item));
  }

  return menu;
};

/**
 * Build the menu DOM from `appState.children` and append each menu to `.inner-container`.
 */
export const renderMenus = () => {
  const container = document.querySelector('.inner-container');
  container.appendChild(renderMenu(MAIN_MENU, 'Main Menu', appState.children, true));
  for (const [key, item] of Object.entries(appState.children)) {
    if (item.children) {
      container.appendChild(renderMenu(key, item.label, item.children, false));
    }
  }
};
