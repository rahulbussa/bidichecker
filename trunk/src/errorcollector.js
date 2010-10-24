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
 * @fileoverview Class to receive errors found by the checkers.
 */


goog.provide('bidichecker.ErrorCollector');

goog.require('bidichecker.Error');
goog.require('bidichecker.Filter');
goog.require('bidichecker.FrameStack');
goog.require('bidichecker.utils');
goog.require('goog.array');


/**
 * Class that collects errors found by the checkers and stores a filtered list.
 * @param {!bidichecker.FrameStack} frameStack Stack of parent frames.
 * @param {Array.<!bidichecker.Filter>=} opt_filters Error suppression filters.
 * @constructor
 */
bidichecker.ErrorCollector = function(frameStack, opt_filters) {
  /**
   * Stack of parent frames of the current traversal location.
   * @type {!bidichecker.FrameStack}
   * @private
   */
  this.frameStack_ = frameStack;

  /**
   * Filters to be applied to each error to determine whether to suppress it.
   * @type {!Array.<!bidichecker.Filter>}
   * @private
   */
  this.filters_ = opt_filters || [];

  /**
   * Non-suppressed errors collected from the checkers.
   * @type {!Array.<!bidichecker.Error>}
   * @private
   */
  this.errors_ = [];
};


/**
 * If true, every non-suppressed error is thrown as an exception.
 * @type {boolean}
 * @private
 */
bidichecker.ErrorCollector.prototype.throwOnError_ = false;


/**
 * Turns on throwing an exception for any non-suppressed error collected.
 */
bidichecker.ErrorCollector.prototype.SetThrowOnError = function() {
  this.throwOnError_ = true;
};


/**
 * @return {!Array.<!bidichecker.Error>} Non-suppressed errors collected from
 *     the checkers.
 */
bidichecker.ErrorCollector.prototype.getErrors = function() {
  return this.errors_;
};


/**
 * Adds an error to the collection if it passes the suppression filters.
 * If {@code SetThrowOnError()} has been called, also throws an exception.
 * @param {!bidichecker.Error} error The error to add.
 * @param {Element=} opt_locationElement Element representing the error's
 *     location in the DOM, if applicable.
 */
bidichecker.ErrorCollector.prototype.addError = function(
    error, opt_locationElement) {
  // Copy the array of parent frames.
  var locationElements = this.frameStack_.getFrames().slice(0);
  if (opt_locationElement) {
    locationElements.push(opt_locationElement);
  }

  // Accept an error if every filter fails to suppress it.
  var isAccepted = goog.array.every(this.filters_, function(filter) {
    return !filter.isSuppressed(error, locationElements);
  });

  if (isAccepted) {
    var description = this.generateLocationDescription_(locationElements);
    if (description != '') {
      error.setLocationDescription(description);
    }
    this.errors_.push(error);
    if (this.throwOnError_) {
      // Add a newline to clarify where the error message ends in case the
      // runtime environment appends a stack trace.
      throw error.toString() + '\n';
    }
  }
};


/**
 * Generates a textual description of the error location in the DOM.
 * @param {Array.<!Element>} locationElements Elements representing the error
 *     location in the DOM, if available. The last element in the array is the
 *     actual element where the error occurs; previous elements represent the
 *     frames within which the error appears, if relevant.
 * @return {string} The location description.
 * @private
 */
bidichecker.ErrorCollector.prototype.generateLocationDescription_ = function(
    locationElements) {
  // Build up the description in the reverse order of the location elements,
  // starting with the lowest level and ascending through any parent frames.
  var descriptionParts = [];
  goog.array.forEachRight(locationElements, function(frame) {
    descriptionParts.push(bidichecker.utils.describeLocation(frame));
  });
  return descriptionParts.join(' in ');
};
