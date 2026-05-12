'use strict';

import { appState } from './state.js';
import { rightContainer } from './dom.js';
import { showPopup, hidePopup } from './popup.js';
import { updateApplyButton, persistCurrent, refreshAvailableVersions } from './apply.js';
import { renderTextWithLinks } from './text.js';

/**
 * @typedef {import('./state.js').MenuItem} MenuItem
 */

let rightFocusIndex = 0;

/** Cleanup function for listeners attached to rightContainer by the current panel. */
let rightPaneCleanup = null;

/**
 * @returns {NodeListOf<HTMLButtonElement>}
 */
const getRightPaneButtons = () => rightContainer.querySelectorAll('button:not(:disabled)');

/**
 * Move keyboard focus from the menu into the right pane (first enabled button).
 * No-op if the current right pane has no focusable buttons.
 */
export const enterRightPane = () => {
  const buttons = getRightPaneButtons();
  if (buttons.length === 0) {
    return;
  }
  appState.focusedSide = 'right';
  rightFocusIndex = 0;
  buttons[0].focus();
};

/**
 * Return keyboard focus to the menu side.
 */
export const exitRightPane = () => {
  appState.focusedSide = 'left';
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

/**
 * Cycle focus between buttons in the right pane (no wrap).
 * @param {-1|1} direction
 */
export const moveRightPaneFocus = (direction) => {
  const buttons = getRightPaneButtons();
  if (buttons.length === 0) {
    return;
  }
  rightFocusIndex = Math.max(0, Math.min(buttons.length - 1, rightFocusIndex + direction));
  buttons[rightFocusIndex].focus();
};

/**
 * Render the right pane based on the given menu item's `rightPane` field.
 * If item is null or has no `rightPane`, the right pane is cleared.
 * @param {MenuItem|null} item
 */
export const renderRightPane = (item) => {
  // Re-rendering the right pane invalidates any focused element inside it.
  if (appState.focusedSide === 'right') {
    appState.focusedSide = 'left';
  }
  if (rightPaneCleanup) {
    rightPaneCleanup();
    rightPaneCleanup = null;
  }
  rightContainer.classList.remove('dragging');
  rightContainer.innerHTML = '';

  if (!item?.rightPane) {
    return;
  }

  switch (item.rightPane.type) {
    case 'image': {
      const img = document.createElement('img');
      img.src = item.rightPane.images[item.current];
      img.alt = item.options?.[item.current] ?? '';
      rightContainer.appendChild(img);
      break;
    }
    case 'text': {
      const textBox = document.createElement('div');
      textBox.className = 'right-text';
      renderTextWithLinks(textBox, item.textRight ?? '');
      rightContainer.appendChild(textBox);
      break;
    }
    case 'path': {
      const locked = appState.applied?.activate === 'fps';

      const pathDiv = document.createElement('div');
      pathDiv.id = 'path-details';

      const pickButton = document.createElement('button');
      pickButton.id = 'path-pick';
      pickButton.innerText = 'Pick folder';
      pickButton.disabled = locked;
      pickButton.addEventListener('click', async () => {
        const folder = await window.electronAPI.pickFolder();
        if (folder !== null) {
          item.current = folder;
          pathInput.value = folder;
          updateApplyButton();
          persistCurrent();
        }
      });
      pathDiv.appendChild(pickButton);

      const pathInput = document.createElement('input');
      pathInput.id = 'path-text';
      pathInput.type = 'text';
      pathInput.readOnly = true;
      pathInput.placeholder = item.default ?? '';
      pathInput.title = item.current ?? item.default ?? '';
      pathInput.value = item.current === item.default ? '' : (item.current ?? '');
      pathDiv.appendChild(pathInput);

      const resetButton = document.createElement('button');
      resetButton.id = 'path-reset';
      resetButton.innerText = 'Reset to default';
      resetButton.disabled = locked;
      resetButton.addEventListener('click', () => {
        item.current = item.default;
        pathInput.value = '';
        updateApplyButton();
        persistCurrent();
      });
      pathDiv.appendChild(resetButton);

      rightContainer.appendChild(pathDiv);
      break;
    }
    case 'openFolder': {
      const wrapDiv = document.createElement('div');
      wrapDiv.id = 'open-folder-details';

      const explainP = document.createElement('p');
      explainP.innerText = 'Drop your downloaded FPS mod zip files (.7z or .zip) here, or click the button to open the mod folder in your file explorer.';
      wrapDiv.appendChild(explainP);

      const openButton = document.createElement('button');
      openButton.id = 'open-mod-folder-btn';
      openButton.innerText = 'Open folder';
      openButton.addEventListener('click', () => window.electronAPI.openModFolder());
      wrapDiv.appendChild(openButton);

      rightContainer.appendChild(wrapDiv);

      // Make the entire right side a drop zone while this panel is shown.
      // AbortController lets us tear down all listeners in one shot when the
      // panel changes (see rightPaneCleanup at top of this module).
      const ac = new AbortController();
      const opts = { signal: ac.signal };

      rightContainer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        rightContainer.classList.add('dragging');
      }, opts);
      rightContainer.addEventListener('dragover', (e) => e.preventDefault(), opts);
      rightContainer.addEventListener('dragleave', (e) => {
        // Only clear when actually leaving rightContainer (not transitioning
        // between its children).
        if (!rightContainer.contains(e.relatedTarget)) {
          rightContainer.classList.remove('dragging');
        }
      }, opts);
      rightContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        rightContainer.classList.remove('dragging');
        const paths = Array.from(e.dataTransfer.files)
          .map(f => window.electronAPI.getFilePath(f))
          .filter(p => /\.(zip|7z)$/i.test(p));
        if (paths.length === 0) {
          showPopup({
            header: 'Invalid file',
            content: 'Drop .zip or .7z files only.',
            hasCancel: false,
            onAccept: hidePopup,
          });
          return;
        }
        const result = await window.electronAPI.copyToModFolder(paths);
        if (!result?.ok) {
          showPopup({
            header: 'Copy failed',
            content: result?.error ?? 'Unknown error',
            hasCancel: false,
            onAccept: hidePopup,
          });
          return;
        }
        await refreshAvailableVersions();
        showPopup({
          header: 'Files added',
          content: `${result.copied} file(s) copied to the mod folder.`,
          hasCancel: false,
          onAccept: hidePopup,
        });
      }, opts);

      rightPaneCleanup = () => ac.abort();
      break;
    }
    case 'verify': {
      const locked = appState.applied?.activate === 'fps';

      const verifyDiv = document.createElement('div');
      verifyDiv.id = 'verify-details';

      const explainP = document.createElement('p');
      explainP.innerText = 'If the game has been updated since you last activated the mod, the saved originals are stale. Refresh them now (Activate must be OFF).';
      verifyDiv.appendChild(explainP);

      const verifyButton = document.createElement('button');
      verifyButton.id = 'verify-now';
      verifyButton.innerText = 'Verify now';
      verifyButton.disabled = locked;
      verifyButton.addEventListener('click', async () => {
        const gamePath = appState.children.setup.children.path.current;
        const result = await window.electronAPI.verifyOriginals(gamePath);

        if (!result?.ok) {
          showPopup({
            header: 'Verify failed',
            content: result?.error ?? 'Unknown error',
            hasCancel: false,
            onAccept: hidePopup,
          });
          return;
        }

        showPopup({
          header: 'Originals refreshed',
          content: `Refreshed: ${result.refreshed}\nSkipped (already modded): ${result.skipped}` + (result.errors?.length ? `\nErrors: ${result.errors.join(', ')}` : ''),
          hasCancel: false,
          onAccept: hidePopup,
        });
      });
      verifyDiv.appendChild(verifyButton);

      rightContainer.appendChild(verifyDiv);
      break;
    }
    default:
  }
};
