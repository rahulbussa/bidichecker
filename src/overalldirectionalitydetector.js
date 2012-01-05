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
 * @fileoverview Detector which generates an error if the overall directionality
 * of the root element is not as expected.
 */


goog.provide('bidichecker.OverallDirectionalityDetector');

goog.require('bidichecker.Detector');
goog.require('bidichecker.DomWalker');
goog.require('bidichecker.Error');
goog.require('bidichecker.HighlightableElement');
goog.require('bidichecker.Scanner');
goog.require('goog.events');
goog.require('goog.events.Event');


/**
 * A detector which checks the directionality of the top-level DOM element
 * against an expected value.
 * @param {boolean} shouldBeRtl Is the root expected to be right-to-left?
 * @param {!bidichecker.ErrorCollector} errorCollector Collects any new errors
 *     discovered by this detector.
 * @constructor
 * @implements {bidichecker.Detector}
 */
bidichecker.OverallDirectionalityDetector = function(
    shouldBeRtl, errorCollector) {
  /**
   * @type {boolean}
   * @private
   */
  this.shouldBeRtl_ = shouldBeRtl;

  /**
   * @type {!bidichecker.ErrorCollector}
   * @private
   */
  this.errorCollector_ = errorCollector;
};


/** @override */
bidichecker.OverallDirectionalityDetector.prototype.startListening = function(
    scanner) {
  // Listen for the start of the first tag in the DOM so we can check its
  // directionality.
  goog.events.listenOnce(scanner.getDomWalker(),
                         bidichecker.DomWalker.EventTypes.START_TAG,
                         this);
};


/**
 * Handles the start-of-DOM event, adding an error if the root element has the
 * wrong directionality.
 * @param {!goog.events.Event} event A StartTag event.
 */
bidichecker.OverallDirectionalityDetector.prototype.handleEvent =
    function(event) {
  var domWalker = event.target;
  if (this.shouldBeRtl_ != domWalker.inRtl()) {
    var expectedDir = this.shouldBeRtl_ ? 'RTL' : 'LTR';
    var highlightableArea =
        new bidichecker.HighlightableElement(domWalker.getNode());
    var error =
        new bidichecker.Error('Overall directionality not ' + expectedDir, 1,
                              highlightableArea);
    this.errorCollector_.addError(error);
  }
};
