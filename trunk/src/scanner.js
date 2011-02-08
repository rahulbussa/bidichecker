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
 * @fileoverview Base class for web page scanners.
 */


goog.provide('bidichecker.Scanner');

goog.require('bidichecker.Detector');
goog.require('bidichecker.DirChunkWalker');
goog.require('bidichecker.DomWalker');
goog.require('bidichecker.ErrorCollector');
goog.require('bidichecker.XpathMatcher');
goog.require('goog.i18n.bidi');


// DOM contents scanning is structured internally in an event-driven
// architecture. There are three main types of objects: walkers, detectors,
// and scanners. Walkers traverse the DOM, translating or summarizing it into a
// series of events. Different walkers summarize the DOM in different ways and
// fire different types of events. Detectors listen for events of types that
// interest them and record the aspects they are meant to detect, such as BiDi
// errors. A scanner ties everything together to accomplish a particular task:
// it sets up the walkers for each DOM, sets up the detectors for the scanner's
// task (e.g. text error checking), kicks off the walkers and recurses into
// contained frames.

/**
 * Base class for DOM scanners.
 * @param {Array.<!bidichecker.Filter>=} opt_filters Error suppression filters.
 * @param {boolean=} opt_needDirChunkWalker True if any of the detectors created
 *     by the derived class need to listen to a {@code DirChunkWalker}.
 * @constructor
 */
bidichecker.Scanner = function(opt_filters, opt_needDirChunkWalker) {
  /**
   * @type {boolean} Whether or not to create a {@code DirChunkWalker}.
   * @private
   */
  this.needDirChunkWalker_ = !!opt_needDirChunkWalker;

  /**
   * @type {!bidichecker.FrameStack} The stack of parent frames.
   * @protected
   */
  this.frameStack = new bidichecker.FrameStack();

  /**
   * @type {!bidichecker.ErrorCollector} The error collector, for use by error
   *     scanners.
   * @protected
   */
   this.errorCollector =
       new bidichecker.ErrorCollector(this.frameStack, opt_filters);
};


/**
 * @type {bidichecker.DomWalker} The DOM walker.
 * @private
 */
bidichecker.Scanner.prototype.domWalker_ = null;


/**
 * @type {bidichecker.DirChunkWalker} The DirChunk walker.
 * @private
 */
bidichecker.Scanner.prototype.dirChunkWalker_ = null;


/**
 * Scans a given DOM, including recursively for all its contained frames.
 * @param {!Element} element The root element of the DOM subtree to be scanned,
 *     usually a page body.
 * @param {goog.i18n.bidi.Dir} expectedDir Expected overall directionality, or
 *     {@code UNKNOWN} if not applicable.
 */
bidichecker.Scanner.prototype.scan = function(element, expectedDir) {
  this.frameStack.start();
  this.scanDomRecursively_(element, expectedDir);
  this.frameStack.end();
};


/**
 * @return {!Array.<!bidichecker.Error>} Non-suppressed errors collected from
 *     the detectors during a scan.
 */
bidichecker.Scanner.prototype.getErrors = function() {
  return this.errorCollector.getErrors();
};


/**
 * Auxiliary function implementing the recursive part of the {@code scan()}
 * method above.
 * @param {!Element} element The root element of the DOM subtree to be scanned,
 *     usually the body.
 * @param {goog.i18n.bidi.Dir} expectedDir Expected overall directionality, or
 *     {@code UNKNOWN} if not applicable.
 * @private
 */
bidichecker.Scanner.prototype.scanDomRecursively_ = function(
    element, expectedDir) {
  bidichecker.XpathMatcher.initCache(element.ownerDocument);

  var newFrames = this.runDetectors_(element, expectedDir);

  // Recurse for any contained frames.
  for (var i = 0; i < newFrames.length; ++i) {
    var frame = newFrames[i];
    this.frameStack.push(frame);
    try {
      // Accessing the body will fail for security reasons if the frame is
      // hosted on a different domain; hence, the try-catch block.
      var frameBody = (/** @type {!Element} */
          goog.dom.getFrameContentDocument(frame).body);

      // We assume we don't know the expected overall directionality of iframes.
      if (frame.tagName == 'IFRAME') {
        expectedDir = goog.i18n.bidi.Dir.UNKNOWN;
      }
      this.scanDomRecursively_(frameBody, expectedDir);
    } catch (e) {
      // Empty catch block; just skip any inaccessible frames.
    }
    this.frameStack.pop();
  }
};



/**
 * Runs a set of detectors on a given DOM (non-recursively).
 * @param {!Element} element The root element of the DOM subtree to be
 *     checked, usually the body.
 * @param {goog.i18n.bidi.Dir} expectedDir Expected overall directionality, or
 *     {@code UNKNOWN} if not applicable.
 * @return {Array.<Element>} List of top-level frames found during traversal.
 * @private
 */
bidichecker.Scanner.prototype.runDetectors_ = function(element, expectedDir) {
  var detectors = this.buildDetectors(element, expectedDir);
  this.domWalker_ = new bidichecker.DomWalker(element);
  this.dirChunkWalker_ = this.needDirChunkWalker_ ?
      new bidichecker.DirChunkWalker(this.domWalker_) : null;
  for (var i = 0; i < detectors.length; ++i) {
    detectors[i].startListening(this);
  }

  this.domWalker_.go();
  return this.domWalker_.getFrames();
};


/**
 * Retrieves the currently active DOM walker. Expected to be called by the
 * detectors, which can register themselves to listen for DOM walker events.
 * @return {bidichecker.DomWalker} The DOM walker. When no traversal is active,
 *     returns null.
 */
bidichecker.Scanner.prototype.getDomWalker = function() {
  return this.domWalker_;
};


/**
 * Retrieves the currently active DirChunk walker. Expected to be called by the
 * detectors, which can register themselves to listen for DirChunkWalker events.
 * @return {bidichecker.DirChunkWalker} The DirChunk walker. When no traversal
 *     is active, returns null.
 */
bidichecker.Scanner.prototype.getDirChunkWalker = function() {
  return this.dirChunkWalker_;
};


/**
 * Factory method which builds a set of detectors to run on a given level of
 * the DOM. To be implemented by the derived class.
 * @param {!Element} element The root element of the DOM subtree to be
 *     checked, usually the body.
 * @param {goog.i18n.bidi.Dir} expectedDir Expected overall directionality, or
 *     {@code UNKNOWN} if not applicable.
 * @return {!Array.<!bidichecker.Detector>} List of detectors to run.
 * @protected
 */
bidichecker.Scanner.prototype.buildDetectors = goog.abstractMethod;

