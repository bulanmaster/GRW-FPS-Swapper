'use strict';

// Static DOM elements that exist in index.html before any rendering. Queried
// once at module load (modules are deferred, so DOM is parsed by the time
// these run).

export const popupContainer = document.querySelector('#popup-container');
export const popupInner = document.querySelector('#popup');
export const popupHeader = document.querySelector('#popup-header');
export const popupContent = document.querySelector('#popup-content');
export const popupButtons = document.querySelectorAll('.popup-buttons');
export const popupAcceptButton = document.querySelector('#popup-accept');
export const popupCancelButton = document.querySelector('#popup-cancel');

export const footerHeader = document.querySelector('#footer-header');
export const footerDescription = document.querySelector('#footer-description');
export const footerButtons = document.querySelectorAll('.footer-buttons');
export const exitBackButtonText = document.querySelector('#exitBackText');

export const rightContainer = document.querySelector('#right-container');
export const applyButton = document.querySelector('#apply');
