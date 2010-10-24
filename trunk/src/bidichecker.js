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
 * @fileoverview Testing utilities to check a web page for BiDi-related errors.
 * This file has the top-level entry points for use as a Javascript API, along
 * with JSON-based interface functions meant to be called from an external
 * testing framework like WebDriver.
 */


goog.provide('bidichecker');

goog.require('bidichecker.Error');
goog.require('bidichecker.ErrorGui');
goog.require('bidichecker.Filter');
goog.require('bidichecker.FilterFactory');
goog.require('bidichecker.TextErrorScanner');
goog.require('goog.array');
goog.require('goog.i18n.bidi');
goog.require('goog.json');


/**
 * Checks the contents of the current web page, including all nested frames, for
 * BiDi-related errors. If {@code opt_element} is specified, checks only within
 * the given element of the DOM (including any nested frames). This is the main
 * entry point for the Javascript API.
 * @param {boolean} shouldBeRtl Is the root expected to be right-to-left?
 * @param {Element=} opt_element The root element of the DOM subtree to be
 *     checked; if null, checks the entire current web page.
 * @param {Array.<!bidichecker.Filter>=} opt_filters Error suppression filters.
 * @return {!Array.<!bidichecker.Error>} Array of error objects for all failing
 *     checks.
 * @export
 */
bidichecker.checkPage = function(shouldBeRtl, opt_element, opt_filters) {
  bidichecker.Error.clearHighlightableAreas();
  // {@top.document.body} always finds the top level of the current page, even
  // if we started within a frame.
  var element = (/** @type {!Element} */ opt_element || top.document.body);
  var expectedDir =
      shouldBeRtl ? goog.i18n.bidi.Dir.RTL : goog.i18n.bidi.Dir.LTR;
  var scanner = new bidichecker.TextErrorScanner(opt_filters);
  scanner.scan(element, expectedDir);
  return scanner.getErrors();
};


/**
 * JSON interface to {@code checkPage}.
 * @param {boolean} shouldBeRtl Is the element/page expected to be
 *     right-to-left?
 * @param {Element=} opt_element The root element of the DOM subtree to be
 *     checked; if null, checks the entire current web page.
 * @param {string=} opt_filtersJson Error suppression filters in a JSON string.
 * @return {string} Array of {@code bidichecker.Error} objects for all failing
 *     checks, in JSON format. If no errors were found, returns an empty array
 *     ("[]").
 * @export
 */
bidichecker.checkPageToJson = function(shouldBeRtl, opt_element,
                                       opt_filtersJson) {
  var filters = bidichecker.FilterFactory.readFiltersFromJson(opt_filtersJson);
  var errors = bidichecker.checkPage(shouldBeRtl, opt_element, filters);
  return bidichecker.Error.serialize(errors);
};


/**
 * Runs the interactive visual error browsing mode.
 * @param {Array.<!bidichecker.Error>} errors An array of errors to be
 *     displayed.
 * @export
 */
bidichecker.runGui = function(errors) {
  var gui = new bidichecker.ErrorGui(errors);
  gui.launch();
};


/**
 * JSON interface to {@code runGui}.
 * @param {string} errorsJson An array of errors to be displayed, in JSON
 *     format (similar to that produced by {@code checkPageJson()}).
 * @export
 */
bidichecker.runGuiFromJson = function(errorsJson) {
  var bareErrors = (/** @type {Array.<!Object>} */ goog.json.parse(errorsJson));

  /** @type {Array.<!bidichecker.Error>} */
  var errors = goog.array.map(bareErrors, function(bareError) {
    return new bidichecker.Error(bareError);
  });
  bidichecker.runGui(errors);
};
