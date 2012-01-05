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
goog.require('bidichecker.utils');
goog.require('goog.style');


/**
 * Class representing the highlightable area of a BiDi error without associated
 * text.
 * @param {!Element} element A DOM element indicating the location of the error.
 * @implements {bidichecker.HighlightableArea}
 * @constructor
 */
bidichecker.HighlightableElement = function(element) {
  /**
   * The element associated with the error.
   * @type {!Element}
   * @private
   */
  this.element_ = element;
};


/**
 * Contains the color, backgroundColor and outline fields of the element's
 * original style.
 * @type {Object}
 * @private
 */
bidichecker.HighlightableElement.prototype.savedStyle_ = null;


/** @override */
bidichecker.HighlightableElement.prototype.highlightOnPage = function() {
  this.savedStyle_ = bidichecker.utils.highlightElementStyle(this.element_);
  return goog.style.getPageOffset(this.element_);
};


/** @override */
bidichecker.HighlightableElement.prototype.unhighlightOnPage = function() {
  // Restore the original styles.
  if (this.savedStyle_) {
    this.element_.style.color = this.savedStyle_.color;
    this.element_.style.backgroundColor = this.savedStyle_.backgroundColor;
    this.element_.style.outline = this.savedStyle_.outline;
  }
};
