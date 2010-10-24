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
 * @fileoverview Interface for error-suppression filters.
 */


goog.provide('bidichecker.Filter');

goog.require('bidichecker.Error');


/**
 * Interface for an error-suppression filter.
 * @interface
 */
bidichecker.Filter = function() {};


/**
 * Decides whether to suppress a particular error.
 * @param {!bidichecker.Error} error An error object.
 * @param {!Array.<!Element>} locationElements Elements representing the error
 *     location in the DOM, or an empty array if not applicable. The last
 *     element in the array is the actual element where the error occurs;
 *     previous elements represent the frames within which the error appears,
 *     if relevant.
 * @return {boolean} True if the error should be suppressed.
 */
bidichecker.Filter.prototype.isSuppressed = goog.abstractMethod;
