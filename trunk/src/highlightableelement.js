// Copyright 2009 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview A highlightable element of the DOM.
 */


goog.provide('bidichecker.HighlightableElement');

goog.require('bidichecker.HighlightableArea');
goog.require('goog.style');


/**
 * Class representing the highlightable area of a BiDi error without associated
 * text.
 * @param {Element} element A DOM element indicating the location of the error.
 * @implements {bidichecker.HighlightableArea}
 * @constructor
 */
bidichecker.HighlightableElement = function(element) {
  /**
   * The element associated with the error.
   * @type {Element}
   * @private
   */
  this.element_ = element;
};


/**
 * The original background color of the element.
 * @type {?string}
 * @private
 */
bidichecker.HighlightableElement.prototype.oldBackgroundColor_ = null;


/** @inheritDoc */
bidichecker.HighlightableElement.prototype.highlightOnPage = function() {
  // Change the element's background color to yellow.
  // TODO(user): What should we do if the background is already yellow?
  this.oldBackgroundColor_ = goog.style.getBackgroundColor(this.element_);
  goog.style.setStyle(this.element_, 'background-color', 'yellow');
  return goog.style.getPageOffset(/** @type {Element} */ (this.element_));
};


/** @inheritDoc */
bidichecker.HighlightableElement.prototype.unhighlightOnPage = function() {
  // Restore the original border style.
  if (this.oldBackgroundColor_ != null) {
    goog.style.setStyle(this.element_, 'background-color',
        this.oldBackgroundColor_);
  }
};

