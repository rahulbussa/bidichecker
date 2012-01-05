// Copyright 2011 Google Inc. All Rights Reserved.
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
 * @fileoverview Detector which looks for undeclared opposite-directionality
 * errors in text-valued attributes.
 */


goog.provide('bidichecker.UndeclaredFieldDetector');

goog.require('bidichecker.Detector');
goog.require('bidichecker.DomWalker');
goog.require('bidichecker.Error');
goog.require('bidichecker.HighlightableElement');
goog.require('bidichecker.Scanner');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventHandler');


/**
 * A detector which listens for DOM node events and checks for undeclared
 * opposite-directionality text in user-visible text-valued attributes of
 * various elements.
 * @param {!bidichecker.ErrorCollector} errorCollector Collects any new errors
 *     discovered by this checker.
 * @implements {bidichecker.Detector}
 * @constructor
 */
bidichecker.UndeclaredFieldDetector = function(errorCollector) {
  /**
   * @type {!bidichecker.ErrorCollector}
   * @private
   */
  this.errorCollector_ = errorCollector;
};


/**
 * Types of fields to be checked; values are used in the error type string.
 * @enum {string}
 * @private
 */
bidichecker.UndeclaredFieldDetector.FieldType_ = {
  ALT_TEXT: 'alt text',
  BUTTON_LABEL: 'button label',
  INPUT_VALUE: 'input value',
  TEXTAREA_VALUE: 'textarea value',
  TITLE_TEXT: 'title text'
};


/** @override */
bidichecker.UndeclaredFieldDetector.prototype.startListening =
    function(scanner) {

  /**
   * Service object to manage cleanup of event listeners.
   * @type {goog.events.EventHandler}
   */
  var eventHandler = new goog.events.EventHandler(this);

  // Listen for DOM elements.
  eventHandler.listen(scanner.getDomWalker(),
                      bidichecker.DomWalker.EventTypes.START_TAG,
                      this.handleStartTag_);

  // Listen for the end-of-DOM event; then tell event handler to stop listening
  // to DOM events.
  eventHandler.listenOnce(scanner.getDomWalker(),
                          bidichecker.DomWalker.EventTypes.END_OF_DOM,
                          eventHandler.removeAll, false, eventHandler);
};


/**
 * Handles events indicating the start of a DOM element by checking relevant
 * attributes for opposite-directionality text.
 * @param {!goog.events.Event} event A StartTag event.
 * @private
 */
bidichecker.UndeclaredFieldDetector.prototype.handleStartTag_ =
    function(event) {
  var domWalker = event.target;
  var element = /** @type {!Element} */ (domWalker.getNode());
  this.checkElement_(element);
};


/**
 * Checks the directionality of text-valued attributes on an element, generating
 * errors if appropriate.
 * @param {!Element} element The element to check.
 * @private
 */
bidichecker.UndeclaredFieldDetector.prototype.checkElement_ = function(
    element) {
  var FieldType = bidichecker.UndeclaredFieldDetector.FieldType_;

  // All elements may have a "title" attribute.
  if (element.title) {
    this.checkField_(element, element.title, FieldType.TITLE_TEXT);
  }
  var nodeName = element.nodeName;
  // Certain types of "input" elements have attributes to check.
  if (nodeName == 'INPUT') {
    if (element.type.match(/^(text|search)$/)) {
      this.checkField_(element, element.value, FieldType.INPUT_VALUE);
    } else if (element.type == 'image') {
      this.checkField_(element, element.alt, FieldType.ALT_TEXT);
    } else if (element.type.match(/^(button|reset|submit)$/)) {
      this.checkField_(element, element.value, FieldType.BUTTON_LABEL);
    } else if (element.type == 'file') {
      this.checkFileInput_(element);
    }
  } else if (nodeName == 'IMG') {
    // Images may have an "alt" attribute.
    this.checkField_(element, element.alt, FieldType.ALT_TEXT);
  } else if (nodeName == 'TEXTAREA') {
    this.checkField_(element, element.value, FieldType.TEXTAREA_VALUE);
  }
};


/**
 * Checks the directionality of an attribute value, generating an error if
 * appropriate.
 * @param {!Element} element The element with the field to check.
 * @param {string} value The value to check.
 * @param {bidichecker.UndeclaredFieldDetector.FieldType_} fieldType The type of
 *     the field being checked.
 * @private
 */
bidichecker.UndeclaredFieldDetector.prototype.checkField_ = function(
    element, value, fieldType) {
  var isRtlElement = goog.style.isRightToLeft(element);
  var hasLtrText = !!bidichecker.utils.findLtrSubstrings(value).length;
  var hasRtlText =
      !!bidichecker.utils.findRtlAndFakeRtlSubstrings(value).length;
  // Has text of only one direction, but is declared as the other direction.
  if ((hasLtrText != hasRtlText) && (isRtlElement != hasRtlText)) {
    var fieldDirection = isRtlElement ? 'LTR' : 'RTL';
    var errorType = 'Undeclared ' + fieldDirection + ' ' + fieldType;
    var severity = this.getErrorSeverity_(element, value, fieldType);
    var highlightableArea = new bidichecker.HighlightableElement(element);
    var error = new bidichecker.Error(errorType, severity, highlightableArea,
        value);
    this.errorCollector_.addError(error, element);
  }
};


/**
 * Checks that input tags with type=file have LTR directionality, generating an
 * error if appropriate.
 * @param {!Element} element The element with the field to check.
 * @private
 */
bidichecker.UndeclaredFieldDetector.prototype.checkFileInput_ = function(
    element) {
  var isRtlElement = goog.style.isRightToLeft(element);
  if (isRtlElement) {
    var errorType = 'File input not LTR';
    var severity = 2;
    var highlightableArea = new bidichecker.HighlightableElement(element);
    var error = new bidichecker.Error(errorType, severity, highlightableArea);
    this.errorCollector_.addError(error, element);
  }
};


/**
 * Determines the severity of a directionality error. Default value is 3. If the
 * value starts or ends with neutral characters, promote it to 2 since the text
 * will be garbled. But if the element itself has a "dir" attribute, demote it
 * to 4 since it's apparently deliberate, to some extent. However, errors in
 * textarea or input values always get severity 1 due to the nuisance of
 * entering data with the wrong directionality.
 * @param {!Element} element The element with the field with the error.
 * @param {string} value The value with the error.
 * @param {bidichecker.UndeclaredFieldDetector.FieldType_} fieldType The type of
 *     the field being checked.
 * @return {number} The severity level of the error.
 * @private
 */
bidichecker.UndeclaredFieldDetector.prototype.getErrorSeverity_ = function(
    element, value, fieldType) {
  var FieldType = bidichecker.UndeclaredFieldDetector.FieldType_;
  if (fieldType == FieldType.INPUT_VALUE ||
      fieldType == FieldType.TEXTAREA_VALUE) {
    return 1;
  }
  if (element.dir || element.style.direction ||
      goog.style.isRightToLeft(element) !=
      goog.style.isRightToLeft(/** @type {Element} */ (element.parentNode))) {
    return 4;
  }
  if (bidichecker.utils.findVisibleNeutralTextAtIndex(value, 0) ||
      bidichecker.utils.findVisibleNeutralTextBeforeIndex(value,
                                                          value.length)) {
    return 2;
  }
  return 3;
};
