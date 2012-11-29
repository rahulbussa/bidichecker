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
 * @fileoverview Detector which looks for undeclared opposite-directionality
 * text errors.
 */


goog.provide('bidichecker.UndeclaredTextDetector');

goog.require('bidichecker.Detector');
goog.require('bidichecker.DirChunk');
goog.require('bidichecker.DirChunkWalker');
goog.require('bidichecker.Error');
goog.require('bidichecker.Scanner');
goog.require('bidichecker.utils');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');


/**
 * A detector which listens for {@code bidichecker.DirChunkEvent} events and
 * checks for text with the opposite directionality as is declared for its
 * chunk.
 * @param {number} revision Revision of checks to run. Revision 2 adds a check
 *     for undeclared "fake RTL" strings.
 * @param {!bidichecker.ErrorCollector} errorCollector Collects any new errors
 *     discovered in this checking pass.
 * @constructor
 * @implements {bidichecker.Detector}
 */
bidichecker.UndeclaredTextDetector = function(revision, errorCollector) {
  /**
   * @type {number}
   * @private
   */
  this.revision_ = revision;

  /**
   * @type {!bidichecker.ErrorCollector}
   * @private
   */
   this.errorCollector_ = errorCollector;
};


/** @override */
bidichecker.UndeclaredTextDetector.prototype.startListening =
    function(scanner) {
  /**
   * Service object to manage cleanup of event listeners.
   * @type {goog.events.EventHandler}
   */
  var eventHandler = new goog.events.EventHandler(this);

  // Start listening for DirChunk events.
  eventHandler.listen(scanner.getDirChunkWalker(),
                      bidichecker.DirChunkWalker.EventTypes.DIR_CHUNK,
                      this.handleChunk_);

  // Listen for the end-of-DOM event; then call on event handler to stop
  // listening to DOM events.
  eventHandler.listenOnce(scanner.getDirChunkWalker(),
                          bidichecker.DirChunkWalker.EventTypes.END_OF_CHUNKS,
                          eventHandler.removeAll, false, eventHandler);

  // Temp assignment to convince static analysis we will dispose eventHandler.
  var eventTarget = /** @type {!goog.events.EventTarget}*/ (
      scanner.getDirChunkWalker());
  eventTarget.registerDisposable(eventHandler);
};


/**
 * Checks whether the contents of a chunk of text have the same directionality
 * as its context.
 * @param {!goog.events.Event} event A {@code bidichecker.DirChunkEvent}.
 * @private
 */
bidichecker.UndeclaredTextDetector.prototype.handleChunk_ = function(event) {
  var self = this;
  var chunk = event.target.getChunk();
  if (chunk.isRtl()) {
    var matches = bidichecker.utils.findLtrSubstrings(chunk.getText());
    goog.array.forEach(matches, function(match) {
      // LRMs may appear in an RTL context in order to fix spillover errors, as
      // well as due to Hotshots, which encodes message ids using LRMs and RLMs.
      // These intentional and valid uses of LRM/RLM should not be reported as
      // errors.
      if (!bidichecker.utils.hasOnlyLrmChars(match.text)) {
        self.addError_(chunk, match, 'Undeclared LTR text');
      }
    });
  } else {
    var matches = this.revision_ >= 2 ?
        bidichecker.utils.findRtlAndFakeRtlSubstrings(chunk.getText()) :
        bidichecker.utils.findRtlSubstrings(chunk.getText());
    goog.array.forEach(matches, function(match) {
      // As above, but for RLMs in an LTR context.
      if (!bidichecker.utils.hasOnlyRlmChars(match.text)) {
        self.addError_(chunk, match, 'Undeclared RTL text');
      }
    });
  }
};


/**
 * Adds a new error for undeclared text directionality.
 * @param {!bidichecker.DirChunk} chunk The chunk where the error was found.
 * @param {!bidichecker.utils.Substring} match The error location.
 * @param {string} message The error message description prefix.
 * @private
 */
bidichecker.UndeclaredTextDetector.prototype.addError_ = function(
    chunk, match, message) {
  // Undeclared text wrapped in a directionality declaration is unlikely to
  // be a real error, since someone's clearly already handled it.
  var severity = chunk.isDeclared() ? 4 : 3;
  var highlightableArea =
      chunk.getHighlightableArea(match.index, match.text.length);
  var error =
      new bidichecker.Error(message, severity, highlightableArea, match.text);
  this.addAdjacentNeutrals_(chunk.getText(), match, error);
  var locationElement =
      /** @type {Element} */ (chunk.findNodeAtPosition(match.index).parentNode);
  this.errorCollector_.addError(error, locationElement);
};


/**
 * Modifies an undeclared-text error to take account of any adjacent neutral
 * characters; they raise the severity of the error since they're likely to be
 * garbled.
 * @param {string} text The text of the chunk in which the error appears.
 * @param {!bidichecker.utils.Substring} match The error location in the text.
 * @param {!bidichecker.Error} error The original error object. The function
 *     modifies this object if adjacent neutral text is found.
 * @private
 */
bidichecker.UndeclaredTextDetector.prototype.addAdjacentNeutrals_ = function(
    text, match, error) {
  var neutralsBefore =
      bidichecker.utils.findVisibleNeutralTextBeforeIndex(text, match.index);
  if (neutralsBefore) {
    if (error.getSeverity() == 3) {
      error.setSeverity(2);
    }
    error.setPrecededByText(neutralsBefore.text);
  }

  var neutralsAfter = bidichecker.utils.findVisibleNeutralTextAtIndex(
      text, match.index + match.text.length);
  if (neutralsAfter) {
    if (error.getSeverity() == 3) {
      error.setSeverity(2);
    }
    error.setFollowedByText(neutralsAfter.text);
  }
};
