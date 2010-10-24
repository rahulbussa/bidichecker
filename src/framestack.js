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
 * @fileoverview Dispatches events when frames are entered or exited during
 * DOM traversal.
 */


goog.provide('bidichecker.FrameStack');
goog.provide('bidichecker.FrameStack.EventTypes');

goog.require('goog.events.EventTarget');


/**
 * Class that dispatches events for frames encountered in the DOM traversal.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
bidichecker.FrameStack = function() {
  goog.events.EventTarget.call(this);

  /**
   * Stack of frame elements from the top-level DOM to the current location.
   * @type {!Array.<Element>}
   * @private
   */
  this.frames_ = [];
};
goog.inherits(bidichecker.FrameStack, goog.events.EventTarget);


/**
 * Event types dispatched by {@code bidichecker.FrameStack}.
 * @enum {string}
 */
bidichecker.FrameStack.EventTypes = {
  START_FRAMES: 'StartFrames',
  ENTERING_FRAME: 'EnterFrame',
  EXITING_FRAME: 'ExitFrame',
  END_FRAMES: 'EndFrames'
};


/**
 * Signals the start of a new frame stack traversal.
 */
bidichecker.FrameStack.prototype.start = function() {
  this.dispatchEvent(bidichecker.FrameStack.EventTypes.START_FRAMES);
};


/**
 * Signals the end of the current frame stack traversal.
 */
bidichecker.FrameStack.prototype.end = function() {
  this.dispatchEvent(bidichecker.FrameStack.EventTypes.END_FRAMES);
};


/**
 * Enters a new frame embedded inside the current DOM.
 * @param {Element} element Element representing the frame being entered.
 */
bidichecker.FrameStack.prototype.push = function(element) {
  this.frames_.push(element);
  this.dispatchEvent(bidichecker.FrameStack.EventTypes.ENTERING_FRAME);
};


/**
 * Exits the current frame, returning to its parent.
 */
bidichecker.FrameStack.prototype.pop = function() {
  this.dispatchEvent(bidichecker.FrameStack.EventTypes.EXITING_FRAME);
  this.frames_.pop();
};


/**
 * @return {!Array.<Element>} The stack of frames from the top-level DOM to the
 *     current location.
 */
bidichecker.FrameStack.prototype.getFrames = function() {
  return this.frames_;
};
