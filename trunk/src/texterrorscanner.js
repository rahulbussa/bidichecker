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
 * @fileoverview Runs all standard text error detectors on one level of the DOM.
 */


goog.provide('bidichecker.TextErrorScanner');

goog.require('bidichecker.Detector');
goog.require('bidichecker.ErrorCollector');
goog.require('bidichecker.OverallDirectionalityDetector');
goog.require('bidichecker.Scanner');
goog.require('bidichecker.SpilloverDetector');
goog.require('bidichecker.UndeclaredFieldDetector');
goog.require('bidichecker.UndeclaredTextDetector');
goog.require('goog.i18n.bidi');


/**
 * A scanner that runs the standard text error detectors.
 * @param {number} revision Revision of checks to run.
 * @param {Array.<!bidichecker.Filter>=} opt_filters Error suppression filters.
 * @constructor
 * @extends {bidichecker.Scanner}
 */
bidichecker.TextErrorScanner = function(revision, opt_filters) {
  bidichecker.Scanner.call(this, opt_filters,
                           /* opt_needDirChunkWalker */ true);

  /**
   * @type {number}
   * @private
   */
  this.revision_ = revision;
};
goog.inherits(bidichecker.TextErrorScanner, bidichecker.Scanner);


/**
 * Builds all the standard text error detectors on a given level of the DOM.
 * @param {!Element} element The root element of the DOM subtree to be scanned,
 *     usually the body.
 * @param {goog.i18n.bidi.Dir} expectedDir Expected overall directionality, or
 *     {@code UNKNOWN} if not applicable.
 * @return {Array.<!bidichecker.Detector>} List of detectors to run.
 */
bidichecker.TextErrorScanner.prototype.buildDetectors = function(
    element, expectedDir) {
  return bidichecker.TextErrorScanner.buildDetectors(element, expectedDir,
      this.errorCollector, this.revision_);
};


/**
 * Static method which implements {@code buildDetectors()} for text error
 * detectors.
 * @param {!Element} element The root element of the DOM subtree to be scanned,
 *     usually the body.
 * @param {goog.i18n.bidi.Dir} expectedDir Expected overall directionality, or
 *     {@code UNKNOWN} if not applicable.
 * @param {!bidichecker.ErrorCollector} errorCollector The error collector.
 * @param {number} revision Revision of checks to run.
 * @return {Array.<!bidichecker.Detector>} List of detectors to run.
 */
bidichecker.TextErrorScanner.buildDetectors = function(element,
                                                       expectedDir,
                                                       errorCollector,
                                                       revision) {
  var detectors = [];
  if (expectedDir != goog.i18n.bidi.Dir.UNKNOWN) {
    var shouldBeRtl = (expectedDir == goog.i18n.bidi.Dir.RTL);
    detectors.push(
        new bidichecker.OverallDirectionalityDetector(shouldBeRtl,
                                                      errorCollector));
  }
  detectors.push(
      new bidichecker.UndeclaredTextDetector(revision, errorCollector));
  if (revision >= 2) {
    detectors.push(new bidichecker.UndeclaredFieldDetector(errorCollector));
  }
  detectors.push(new bidichecker.SpilloverDetector(errorCollector));

  return detectors;
};
