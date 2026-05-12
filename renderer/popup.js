'use strict';

import { popup } from './state.js';
import {
  popupContainer,
  popupInner,
  popupHeader,
  popupContent,
  popupAcceptButton,
  popupCancelButton,
} from './dom.js';
import { renderTextWithLinks } from './text.js';

/**
 * @typedef {import('./state.js').PopupConfig} PopupConfig
 */

/**
 * Display the popup with the given config. Remembers the config so the accept
 * action can dispatch correctly when the user confirms.
 * @param {PopupConfig} config
 */
export const showPopup = (config) => {
  // Drop focus from any underlying button so Enter doesn't both confirm
  // the popup AND re-trigger a native click on the focused button.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  popup.showing = true;
  popup.accept = true;
  popup.config = config;

  popupHeader.innerText = config.header;
  renderTextWithLinks(popupContent, config.content);
  popupAcceptButton.innerText = config.hasCancel ? 'Accept' : 'OK';
  popupCancelButton.classList.toggle('hidden', !config.hasCancel);
  popupInner.classList.toggle('no-cancel', !config.hasCancel);

  popupAcceptButton.classList.add('selected');
  popupCancelButton.classList.remove('selected');
  popupContainer.classList.remove('hidden');
};

/**
 * Hide the popup and reset the accept/cancel focus.
 */
export const hidePopup = () => {
  popup.showing = false;
  popup.accept = true;
  popup.config = null;
  popupContainer.classList.add('hidden');
  popupAcceptButton.classList.add('selected');
  popupCancelButton.classList.remove('selected');
};

/**
 * Toggle which popup button (accept/cancel) is focused when arrow keys are pressed.
 */
export const popupKeysHandler = () => {
  if (!popup.config?.hasCancel) {
    return;
  }
  popup.accept = !popup.accept;
  popupCancelButton.classList.toggle('selected');
  popupAcceptButton.classList.toggle('selected');
};

/**
 * @param {MouseEvent} event
 */
export const popupButtonsMouseEnterListener = (event) => {
  if (!popup.config?.hasCancel) {
    return;
  }
  popup.accept = event.target.id === 'popup-accept';
  if (event.target.id === 'popup-accept') {
    popupCancelButton.classList.remove('selected');
    popupAcceptButton.classList.add('selected');
    return;
  }
  popupAcceptButton.classList.remove('selected');
  popupCancelButton.classList.add('selected');
};

/**
 * @param {MouseEvent} event
 */
export const popupButtonsListener = (event) => {
  switch (event.currentTarget.id) {
    case 'popup-accept':
      popup.config?.onAccept?.();
      break;
    case 'popup-cancel':
      hidePopup();
      break;
    default:
  }
};
