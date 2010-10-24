// Copyright 2010 Google Inc. All Rights Reserved.
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
 * @fileoverview A widget formatting movie title and review data for display in
 * a localized UI. Contains a bidi bug for BidiChecker to catch.
 */




/**
 * Application which displays user review counts in different UI languages.
 * @param {Array.<!Object>} reviews The review data to display.
 * @param {!Element} displayElem The element in which to display them.
 * @constructor
 */
ReviewsApp = function(reviews, displayElem) {
  /**
   * The review data to display. Each entry should have "title" and "reviews"
   * fields.
   * @type {Array.<!Object>}
   * @private
   */
  this.reviews_ = reviews;

  /**
   * The element in which to render the app.
   * @type {!Element}
   * @private
   */
  this.displayElem_ = displayElem;

  /**
   * The element containing the language selection menu.
   * The menu stays in English, so we set its directionality to LTR.
   * @type {!Element}
   * @private
   */
  this.selectElem_ = document.createElement('div');
  this.selectElem_.setAttribute('id', 'selector');
  this.selectElem_.setAttribute('dir', 'ltr');
  displayElem.appendChild(this.selectElem_);

  /**
   * The element containing the list of reviews.
   * @type {!Element}
   * @private
   */
  this.reviewsElem_ = document.createElement('div');
  this.reviewsElem_.setAttribute('id', 'reviews');
  displayElem.appendChild(this.reviewsElem_);

  var self = this;
  /**
   * Internationalization support utility object.
   * @type {!I18n}
   * @private
   */
  this.i18n_ = new I18n(this.selectElem_, function() { self.render(); });
};

/**
 * Localized format strings for output of an entry.
 * @type {Object}
 * @private
 */
ReviewsApp.outputFormats_ = {
    'English': '{$title}: {$reviews} reviews',
    'Hebrew': '{$title}: {$reviews} ביקורות'
};

/**
 * Removes all the child nodes on a DOM node. Based on
 * {@code goog.dom.removeChildren()} from Closure Library.
 * @param {Node} node Node to remove children from.
 * @private
 */
ReviewsApp.removeChildren_ = function(node) {
  var child;
  while ((child = node.firstChild)) {
    node.removeChild(child);
  }
};

/**
 * Renders the list of review counts using the specified interface language.
 */
ReviewsApp.prototype.render = function() {
  ReviewsApp.removeChildren_(this.reviewsElem_);

  this.displayElem_.dir = this.i18n_.getDirection();
  for (var i = 0; i < this.reviews_.length; i++) {
    var description = this.getFormattedDescription_(this.reviews_[i]);
    this.addReviewLine_(description);
  }
};

/**
 * Generates the formatted, localized description of an entry in the current
 * language.
 * @param {Object} entry A single review entry, containing "title" and
 *     "reviews" fields.
 * @return {string} Formatted, localized description of the entry.
 * @private
 */
ReviewsApp.prototype.getFormattedDescription_ = function(entry) {
  // In order to demonstrate BidiChecker capabilities, this function
  // intentionally contains two bidi bugs:
  //
  // 1. When text of one direction is embedded in a context of the opposite
  // direction, the text's direction must be declared (e.g. with a dir
  // attribute) on an element wrapped precisely around the text. Otherwise, the
  // text may be displayed in the wrong visual ordering.
  //
  // 2. The inline opposite-directionality context following the text will also
  // be displayed in the wrong visual ordering if it contains a numeric
  // character or more text of the other direction before a "strong" character
  // in its own direction. The best way to prevent this is to insert an
  // invisible "strong" character of the context's direction (LRM in LTR and RLM
  // in RTL) at the beginning of the context wrapping the text.

  // Sanitize user data by escaping any HTML markup or entities.
  var placeholderValues = {
    // The bidi bug is here. The title needs to be wrapped as described above.
    'title': I18n.escapeHtml(entry['title']),
    'reviews': entry['reviews']  // We expect a number, no need to sanitize.
  };
  return this.i18n_.formatMsg(ReviewsApp.outputFormats_, placeholderValues);
};

/**
 * Renders the DOM for a review entry in the data.
 * @param {string} description The text to display.
 * @return {!Element} The newly created DOM element.
 * @private
 */
ReviewsApp.prototype.addReviewLine_ = function(description) {
  // Add the entry's DOM structure to the document.
  var newEntry = document.createElement('div');
  newEntry.appendChild(document.createTextNode(description));
  this.reviewsElem_.appendChild(newEntry);
  return newEntry;
};

/**
 * Sets the UI language. Mostly intended for use in testing. Triggers a call to
 * {@code render()}.
 * @param {string} language Supported values: 'English' and 'Hebrew'.
 */
ReviewsApp.prototype.setLanguage = function(language) {
  this.i18n_.setLanguage(language);
};
