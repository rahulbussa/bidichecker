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
 * @fileoverview Detector which looks for spillover errors.
 */


goog.provide('bidichecker.SpilloverDetector');

goog.require('bidichecker.Detector');
goog.require('bidichecker.DomWalker');
goog.require('bidichecker.Error');
goog.require('bidichecker.HighlightableText');
goog.require('bidichecker.Scanner');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventHandler');


/**
 * A detector which listens for DOM node events and checks for spillover: text
 * with declared directionality opposite to the surrounding context, followed
 * in-line by a number without a separate directionality declaration, with
 * nothing but neutrals in between.
 * <p>The following algorithm is used to identify spillover errors:
 * <ol><li>When an element with a dir attribute closes, and this causes a change
 * in the current directionality, the element becomes a spillover candidate.
 * <li>Following a spillover candidate element, if we encounter a text node
 * containing a number (with only neutral characters preceding it), a spillover
 * error has been identified.
 * <li>Following a spillover candidate element, if we encounter a text node
 * containing a strongly-directional character, or the opening of an element
 * with a dir attribute, or the closing of an element with a dir attribute which
 * does not change the current directionality, or the opening or closing of a
 * block-level element, we cancel the spillover candidate.
 * </ol>
 * @param {!bidichecker.ErrorCollector} errorCollector Collects any new errors
 *     discovered by this checker.
 * @implements {bidichecker.Detector}
 * @constructor
 */
bidichecker.SpilloverDetector = function(errorCollector) {
  /**
   * @type {!bidichecker.ErrorCollector}
   * @private
   */
  this.errorCollector_ = errorCollector;

  /**
   * The text nodes containing the text following a spillover candidate.
   * @type {Array.<Node>}
   * @private
   */
  this.textNodes_ = [];
};


/**
 * Are we at a candidate spillover element? If non-null, holds the element.
 * @type {Element}
 * @private
 */
bidichecker.SpilloverDetector.prototype.candidate_ = null;


/** @override */
bidichecker.SpilloverDetector.prototype.startListening = function(scanner) {

  /**
   * Service object to manage cleanup of event listeners.
   * @type {goog.events.EventHandler}
   */
  var eventHandler = new goog.events.EventHandler(this);

  // Listen for three types of DOM events: Entering an element, exiting an
  // element, and encountering text.
  eventHandler.listen(scanner.getDomWalker(),
                      bidichecker.DomWalker.EventTypes.START_TAG,
                      this.handleStartTag_);
  eventHandler.listen(scanner.getDomWalker(),
                      bidichecker.DomWalker.EventTypes.END_TAG,
                      this.handleEndTag_);
  eventHandler.listen(scanner.getDomWalker(),
                      bidichecker.DomWalker.EventTypes.TEXT_NODE,
                      this.handleTextNode_);

  // Listen for the end-of-DOM event; then call on event handler to stop
  // listening to DOM events.
  eventHandler.listenOnce(scanner.getDomWalker(),
                          bidichecker.DomWalker.EventTypes.END_OF_DOM,
                          eventHandler.removeAll, false, eventHandler);

  // Temp assignment to convince static analysis we will dispose eventHandler.
  var eventTarget = /** @type {!goog.events.EventTarget}*/ (
      scanner.getDomWalker());
  eventTarget.registerDisposable(eventHandler);
};


/**
 * Handles events indicating the start of a DOM element by canceling the
 * spillover candidate element when appropriate.
 * @param {!goog.events.Event} event A StartTag event.
 * @private
 */
bidichecker.SpilloverDetector.prototype.handleStartTag_ = function(event) {
  var domWalker = event.target;
  var element = /** @type {Element} */ (domWalker.getNode());
  // Cancel spillover candidate status if a start tag has a dir attribute, or
  // we're entering a new block.
  if (element.dir || element == domWalker.getCurrentBlock()) {
    this.candidate_ = null;
  }
};


/**
 * Handles events indicating the end of a DOM element by setting the
 * spillover candidate element when appropriate.
 * @param {!goog.events.Event} event An EndTag event.
 * @private
 *  */
bidichecker.SpilloverDetector.prototype.handleEndTag_ = function(event) {
  var domWalker = event.target;
  var element = /** @type {Element} */ (domWalker.getNode());
  // Cancel spillover candidacy if the current block changes, or the closing
  // element has a dir attribute which does not change the current
  // directionality.
  if (element == domWalker.getCurrentBlock()) {
    this.candidate_ = null;
  } else if (element.dir) {
    if (domWalker.inRtl() == domWalker.parentInRtl()) {
      this.candidate_ = null;
    } else {
      // A closing inline (i.e., non-block) element, with a dir attribute which
      // changes the current directionality, is a candidate spillover element.
      this.candidate_ = element;
      // Start collecting the text in the next block.
      this.textNodes_ = [];
    }
  }
};


/**
 * Handles events indicating a text node in the DOM by checking for a spillover
 * error if in a spillover candidate situation.
 * @param {!goog.events.Event} event A TextNode event.
 * @private
 */
bidichecker.SpilloverDetector.prototype.handleTextNode_ = function(event) {
  var domWalker = event.target;
  var node = domWalker.getNode();

  // Check for a spillover error or cancel spillover candidate element.
  if (this.candidate_) {
    // Accumulate text following a spillover candidate.
    this.textNodes_.push(node);

    var match = bidichecker.utils.findNumberAtStart(node.data);
    if (match) {
      // We found a number in this text node, but we want to report all the text
      // from the spillover location to this point, not just this node. We can
      // truncate the end of the accumulated text by the same number of
      // characters which were left after the match in the node text.
      var currentText = goog.array.map(this.textNodes_,
          function(node) { return node.data; }).join('');
      var postMatchLength = node.data.length - match.text.length;
      var prefixLength = currentText.length - postMatchLength;
      var atText = currentText.substr(0, prefixLength);
      var locationElement = goog.array.peek(this.textNodes_).parentNode;

      this.errorCollector_.addError(this.makeError_(atText,
                                                    match.text.length,
                                                    domWalker.inRtl(),
                                                    domWalker.inDeclaredDir()),
                                    locationElement);

      this.candidate_ = null;
    } else if (bidichecker.utils.hasDirectionalCharacter(node.data)) {
      this.candidate_ = null;
    }
  }
};


/**
 * Creates a spillover error object. The error location (used to generate the
 * description) is the text node containing the number (the last of {@code
 * this.textNodes_}). The highlightable area includes all of the text nodes
 * up to and including the number in the last node, but excluding the rest of
 * the last node (the part starting with {@code endOffset}).
 * @param {string} atText The text with the numbers following the spillover
 *     location.
 * @param {number} endOffset The character position in the last of {@code
 *     this.textNodes_} beyond the highlightable area, i.e. past the number.
 * @param {boolean} inRtl Whether the number is in a right-to-left context.
 * @param {boolean} inDeclaredDir Whether the error location has declared-
 *     directionality context.
 * @return {!bidichecker.Error} An error message.
 * @private
 */
bidichecker.SpilloverDetector.prototype.makeError_ = function(atText,
                                                              endOffset,
                                                              inRtl,
                                                              inDeclaredDir) {
  var errorType = 'Declared ' + (inRtl ? 'LTR' : 'RTL') +
      ' spillover to number';
  var severity = inDeclaredDir ? 4 : 2;
  var highlightableArea =
      new bidichecker.HighlightableText(this.textNodes_, 0, endOffset);
  var error =
      new bidichecker.Error(errorType, severity, highlightableArea, atText);
  error.setPrecededByText(bidichecker.utils.getTextContents(this.candidate_));
  return error;
};
