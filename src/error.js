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
 * @fileoverview Error class for BiDi checks.
 */


goog.provide('bidichecker.Error');

goog.require('bidichecker.HighlightableArea');
goog.require('bidichecker.utils');
goog.require('goog.array');
goog.require('goog.json');
goog.require('goog.string.StringBuffer');


/**
 * Class representing a BiDi error.
 * <p>This constructor can be called in two ways: 1. To create a new object,
 * pass it typed parameter values (string/number), and 2. To reconstitute an
 * object from serialization, pass it a bare Javascript object with its fields
 * already initialized. In the first case, a new 'id' value will be assigned;
 * in the second case, it should already be present in the bare object.
 * @param {string|Object} typeOrRawObject If a string, the error type
 *     description (human readable). If an object, should contain the error's
 *     required data fields - id, type, severity - and, optionally: atText,
 *     locationDescription, precededByText and followedByText.
 * @param {number=} opt_severity Error severity level: 1 is highest, 4 is
 *     lowest. Required if {@code typeOrRawObject} is a string.
 * @param {bidichecker.HighlightableArea=} opt_highlightableArea The
 *     highlightable area of the DOM at the error's location. Required if {@code
 *     typeOrRawObject} is a string, except for testing.
 * @param {string=} opt_atText Text contents where the error manifests on the
 *     page. Optional.
 * @constructor
 */
bidichecker.Error = function(typeOrRawObject, opt_severity,
                             opt_highlightableArea, opt_atText) {
  if (typeof typeOrRawObject == 'object') {
    // Reconstitute an error object from the fields of a deserialized raw
    // object.
    var object = typeOrRawObject;
    /** @const */ var fields = ['id', 'type', 'severity', 'atText',
                                'locationDescription', 'precededByText',
                                'followedByText'];
    /** @const */ var requiredFields = ['id', 'type', 'severity'];
    for (var i = 0; i < fields.length; ++i) {
      var field = fields[i];
      this[field] = field in object ? object[field] : null;
      if (this[field] == null &&
          goog.array.indexOf(requiredFields, field) >= 0) {
        throw "Required field '" + field + "' not found in bidichecker.Error.";
      }
    }
    return;
  }

  // Create a new error object from scratch.
  //
  // Since bidichecker.Error objects are serialized for output to JSON, the
  // object fields are always accessed via strings, not dot-fields, to keep
  // the JSCompiler from obfuscating them. To ensure the uniformity of this
  // access pattern and reduce the likelihood of bugs, getters and setters have
  // been provided for all relevant fields.
  if (opt_severity == undefined) {
    throw "Required parameter 'opt_severity' not found in bidichecker.Error.";
  }

  /**
   * ID number for this error, globally unique during this session.
   * @type {number}
   * @private
   */
  this['id'] = bidichecker.Error.nextErrorId_++;

  /**
   * Textual description of the error type.
   * @type {string}
   * @private
   */
  this['type'] = typeOrRawObject;

  /**
   * Severity level of the error.
   * @type {number}
   * @private
   */
  this['severity'] = opt_severity;

  this.setHighlightableArea(opt_highlightableArea || null);

  /**
   * Text where the error occurs on the page, if applicable.
   * @type {?string}
   * @private
   */
  this['atText'] = opt_atText || null;
};


/**
 * The text preceding the error's location in the DOM.
 * @type {?string}
 * @private
 */
bidichecker.Error.prototype['precededByText'] = null;


/**
 * The text following the error's location in the DOM.
 * @type {?string}
 * @private
 */
bidichecker.Error.prototype['followedByText'] = null;


/**
 * Textual description of the error's location in the DOM, if applicable.
 * @type {?string}
 * @private
 */
bidichecker.Error.prototype['locationDescription'] = null;


/**
 * Human-readable description of the error message, used only for serialization
 * to the JSON interface. This field is always null except during serialization.
 * @type {?string}
 * @private
 */
bidichecker.Error.prototype['asString'] = null;


/**
 * Next unallocated error ID number.
 * @type {number}
 * @private
 */
bidichecker.Error.nextErrorId_ = 0;


/**
 * Highlightable areas of the DOM for errors in the current session. Indexed by
 * error ID numbers. These are not stored in the error objects themselves
 * because 1) they are not easily serializable to/from JSON, and 2) they need
 * to remain accessible between a call to {@code checkPage()} and a subsequent
 * call to {@code runGui()}.
 * @type {!Array.<bidichecker.HighlightableArea>}
 * @private
 */
bidichecker.Error.highlightableAreas_ = [];


/** @return {number} The error id. */
bidichecker.Error.prototype.getId = function() {
  return this['id'];
};


/** @return {string} The error type. */
bidichecker.Error.prototype.getType = function() {
  return this['type'];
};


/** @return {number} The error severity level. */
bidichecker.Error.prototype.getSeverity = function() {
  return this['severity'];
};


/** @return {?string} The text at the error's location in the DOM. */
bidichecker.Error.prototype.getAtText = function() {
  return this['atText'];
};


/** @return {?string} The text preceding the error's location in the DOM. */
bidichecker.Error.prototype.getPrecededByText = function() {
  return this['precededByText'];
};


/** @return {?string} The text following the error's location in the DOM. */
bidichecker.Error.prototype.getFollowedByText = function() {
  return this['followedByText'];
};


/**
 * @return {?string} Textual description of the error location in the DOM.
 */
bidichecker.Error.prototype.getLocationDescription = function() {
  return this['locationDescription'];
};


/**
 * Sets the error severity level.
 * @param {number} value The severity level.
 */
bidichecker.Error.prototype.setSeverity = function(value) {
  this['severity'] = value;
};


/**
 * Sets the text preceding the error's location in the DOM.
 * @param {string} text The preceding text.
 */
bidichecker.Error.prototype.setPrecededByText = function(text) {
  this['precededByText'] = text;
};


/**
 * Sets the text following the error's location in the DOM.
 * @param {string} text The folowing text.
 */
bidichecker.Error.prototype.setFollowedByText = function(text) {
  this['followedByText'] = text;
};


/**
 * Sets the textual description of the error location in the DOM.
 * @param {string} text The description.
 */
bidichecker.Error.prototype.setLocationDescription = function(text) {
  this['locationDescription'] = text;
};


/**
 * Sets the highlightable DOM area for the error.
 * @param {bidichecker.HighlightableArea} highlightableArea The area.
 */
bidichecker.Error.prototype.setHighlightableArea = function(highlightableArea) {
  bidichecker.Error.highlightableAreas_[this['id']] = highlightableArea;
};


/**
 * @return {bidichecker.HighlightableArea} The highlightable DOM area.
 */
bidichecker.Error.prototype.getHighlightableArea = function() {
  return bidichecker.Error.highlightableAreas_[this['id']] || null;
};


/**
 * Empties the cache of highlightable error areas. After this is called, {@code
 * getHighlightableArea()} will no longer work for previously-created error
 * objects.
 */
bidichecker.Error.clearHighlightableAreas = function() {
  bidichecker.Error.highlightableAreas_ = [];
  bidichecker.Error.nextErrorId_ = 0;
};


/**
 * @return {string} Human-readable error description.
 * @override
 */
bidichecker.Error.prototype.toString = function() {
  var buffer = new goog.string.StringBuffer(
      '[', this.getSeverity().toString(), '] ', this.getType());

  var value;
  if ((value = this.getAtText())) {
    var AT_TEXT_TRUNCATION_LENGTH = 20;
    value = bidichecker.utils.truncateString(value, AT_TEXT_TRUNCATION_LENGTH);
    buffer.append(': ', bidichecker.utils.singleQuoteString(value));
  }
  if ((value = this.getPrecededByText())) {
    buffer.append(' preceded by ', bidichecker.utils.singleQuoteString(value));
  }
  if ((value = this.getFollowedByText())) {
    buffer.append(' followed by ', bidichecker.utils.singleQuoteString(value));
  }
  if ((value = this.getLocationDescription())) {
    buffer.append(' in ', value);
  }
  return buffer.toString();
};


/**
 * Serialize an array of errors to JSON, adding an 'asString' field containing
 * a human-readable error message.
 * @param {!Array.<!bidichecker.Error>} errors Array of error objects.
 * @return {string} JSON-format string representing the errors.
 */
bidichecker.Error.serialize = function(errors) {
  for (var i = 0; i < errors.length; ++i) {
    var error = errors[i];
    error['asString'] = error.toString();
  }
  return goog.json.serialize(errors);
};
