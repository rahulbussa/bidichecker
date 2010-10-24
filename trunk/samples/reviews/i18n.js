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
 * @fileoverview Internationalization support utilities. This file does not
 * contain (known) bidi bugs.
 */




/**
 * Controls the application's UI language and directionality via a button
 * widget.
 * @param {!Element} selectElem The element in which to render the language
 *     selection control.
 * @param {Function} onLanguageChange Function to call when the language
 *     selection changes.
 * @constructor
 */
I18n = function(selectElem, onLanguageChange) {
  if (selectElem) {
    this.drawSelectionControl_(selectElem, onLanguageChange);
  }
};

/**
 * Direction of each supported language.
 * @type {Object}
 * @private
 */
I18n.directions_ = {
    'English': 'ltr',
    'Hebrew': 'rtl'
};

/**
 * The language selection control.
 * @type {Element}
 * @private
 */
I18n.prototype.select_ = null;

/**
 * @return {string} The name of the currently selected language.
 */
I18n.prototype.getLanguage = function() {
  return this.select_.value;
};

/**
 * Sets the UI language. Mostly intended for use in testing. Triggers a call to
 * the rendering callback.
 * @param {string} language Supported values: 'English' and 'Hebrew'.
 */
I18n.prototype.setLanguage = function(language) {
  this.select_.value = language;
};

/**
 * @return {string} The directionality of the currently selected language. Can
 *     be either "ltr" or "rtl".
 */
I18n.prototype.getDirection = function() {
  return I18n.directions_[this.getLanguage()];
};

/**
 * Renders the language selection button, which toggles between English and
 * Hebrew.
 * @param {!Element} selectElem The element in which to render the language
 *     selection control.
 * @param {Function} onLanguageChange Function to call when the language
 *     selection changes.
 * @private
 */
I18n.prototype.drawSelectionControl_ = function(selectElem, onLanguageChange) {
  if (this.select_)
    return;

  this.select_ = document.createElement('input');
  this.select_.setAttribute('type', 'button');
  this.select_.setAttribute('name', 'Language');
  this.select_.setAttribute('value', 'English');
  selectElem.appendChild(this.select_);

  this.select_.onclick = function() {
    this.value = (this.value == 'English' ? 'Hebrew' : 'English');
    onLanguageChange();
  };
};

/**
 * Formats a message string, inserting the fields of an object. Based on
 * {@code goog.getMsg()} from Closure Library.
 * @param {Object} formats Map of language names to formatting strings for that
 *     language, each containing placeholders in the form {$foo}.
 * @param {Object} fields Map of placeholder field name to value. If necessary,
 *     fields should already be sanitized for inclusion in HTML.
 * @return {string} Message with placeholders filled.
 */
I18n.prototype.formatMsg = function(formats, fields) {
  var format = formats[this.getLanguage()];
  for (var key in fields) {
    var value = ('' + fields[key]).replace(/\$/g, '$$$$');
    format = format.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), value);
  }
  return format;
};

/**
 * Translates special HTML characters into their entity encodings.
 * @param {string} text The text to sanitize.
 * @return {string} The HTML-escaped version.
 */
I18n.escapeHtml = function(text) {
    return text.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
};
