'use strict';

/**
 * Render plain text into a container, replacing http/https URLs and the
 * `{{mod-folder}}` token with clickable links. URLs open in the user's
 * default browser via the main process; the token opens the app's mod
 * drop folder. Existing children of the container are removed first.
 * @param {HTMLElement} container
 * @param {string} text
 */
export const renderTextWithLinks = (container, text) => {
  container.innerHTML = '';
  const parts = (text ?? '').split(/(https?:\/\/[^\s]+|\{\{mod-folder\}\})/g);
  for (const part of parts) {
    if (/^https?:\/\//.test(part)) {
      const link = document.createElement('a');
      link.href = part;
      link.innerText = part;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.openExternal(part);
      });
      container.appendChild(link);
    } else if (part === '{{mod-folder}}') {
      const link = document.createElement('a');
      link.href = '#';
      link.innerText = 'mod folder';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.openModFolder();
      });
      container.appendChild(link);
    } else if (part) {
      container.appendChild(document.createTextNode(part));
    }
  }
};
