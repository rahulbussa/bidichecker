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
 * @fileoverview Utility functions for bidi support. Adapted in part from
 * <http://code.google.com/p/closure-library/source/browse/trunk/closure/goog/i18n/bidi.js>.
 */


goog.provide('bidichecker.utils');
goog.provide('bidichecker.utils.Substring');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.TagIterator');
goog.require('goog.style');


/**
 * A practical pattern to identify strong LTR characters. This pattern is not
 * theoretically correct according to the Unicode standard. It is simplified for
 * performance and small code size. Note: LRM is treated here as a strong LTR
 * character; this is important for detecting spillover errors.
 * @type {string}
 * @private
 */
bidichecker.utils.ltrChars_ =
    'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' +
    '\u200E\u2C00-\uFB1C\uFE00-\uFE6F\uFEFD-\uFFFF';


/**
 * A practical pattern to identify neutral and weakly directional characters,
 * *not* including whitespace. This pattern is not theoretically correct
 * according to the Unicode standard. It is simplified for performance and small
 * code size.
 * @type {string}
 * @private
 */
bidichecker.utils.nonWhiteNeutralChars_ =
    '\u0000-\u0008\u000e-\u001f!-@[-`{-\u0084\u0086-\u009f\u00a1-\u00BF' +
    '\u00D7\u00F7\u02B9-\u02FF\u200b-\u200d\u2010-\u2027\u2030-\u205e' +
    '\u2060-\u2BFF';


/**
 * A practical pattern to identify neutral and weakly directional characters,
 * including whitespace. This pattern is not theoretically correct according to
 * the Unicode standard. It is simplified for performance and small code size.
 * @type {string}
 * @private
 */
bidichecker.utils.neutralChars_ = bidichecker.utils.nonWhiteNeutralChars_ +
    '\u0009-\u000d\u0020\u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029' +
    '\u202f\u205f\u3000';


/**
 * A practical pattern to identify strong RTL characters. This pattern is not
 * theoretically correct according to the Unicode standard. It is simplified
 * for performance and small code size. Note: RLM is treated here as a strong
 * RTL character; this is important for detecting spillover errors.
 * @type {string}
 * @private
 */
bidichecker.utils.rtlChars_ = '\u0591-\u07FF\u200F\uFB1D-\uFDFF\uFE70-\uFEFC';


/**
 * Nonprinting characters, including whitespace except the standard space.
 * Used in escaping text for output.
 * @type {string}
 * @private
 */
bidichecker.utils.nonprintingChars_ = '\u0000-\u001f\u007f\u0085\u00a0\u1680' +
    '\u180e\u2000-\u200f\u2028-\u202f\u205f\u3000';


/**
 * Regular expression to check for a substring of RTL characters with neutral
 * characters among them (excluding Unicode bidi control characters).
 * @type {RegExp}
 * @private
 */
bidichecker.utils.rtlSubstringReg_ =
    // Pattern starts and ends with an RTL character, with a sequence of
    // RTL or neutral characters between them. The sequence following the
    // first character is optional to allow for a match against a single RTL
    // character.
    new RegExp('[' + bidichecker.utils.rtlChars_ + '](?:[^' +
               bidichecker.utils.ltrChars_ + '\u202A-\u202E]*[' +
               bidichecker.utils.rtlChars_ + '])?', 'g');


/**
 * Regular expression to check for a substring of RTL characters with neutral
 * characters among them (excluding Unicode bidi control characters), or a
 * series of "fake RTL" substrings of LTR or neutral characters sandwiched
 * between Unicode RLO and PDF characters.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.rtlAndFakeRtlSubstringReg_ =
    // Pattern has two alternatives: either an RTL substring as above, or an LTR
    // substring (as below) sandwiched between RLO and PDF characters.
    new RegExp(
        // Starts with an RTL character.
        '(?:[' + bidichecker.utils.rtlChars_ + ']' +
        // Contains a sequence of non-LTR characters.
        '(?:[^' + bidichecker.utils.ltrChars_ + '\u202A-\u202E]*' +
        // And ends with an RTL character.
        '[' + bidichecker.utils.rtlChars_ + '])?)' +
        // Or...
        '|' +
        // Starts with an RLO, followed by an LTR character.
        '(?:\u202E[' + bidichecker.utils.ltrChars_ + ']' +
        // Contains a sequence of non-RTL characters.
        '(?:[^' + bidichecker.utils.rtlChars_ + '\u202A-\u202E]*' +
        // Ends with an LTR character, followed by a PDF.
        '[' + bidichecker.utils.ltrChars_ + '])?\u202C' +
        // Possibly repeated successively, separated by neutrals.
        '[' + bidichecker.utils.neutralChars_ + ']*)+',
        'g');


/**
 * Regular expression to check for a substring of LTR characters with neutral
 * characters among them (excluding Unicode bidi control characters).
 * @type {RegExp}
 * @private
 */
bidichecker.utils.ltrSubstringReg_ =
    // Pattern starts and ends with an LTR character, with a sequence of
    // LTR or neutral characters between them. The sequence following the
    // first character is optional to allow for a match against a single LTR
    // character.
    new RegExp('[' + bidichecker.utils.ltrChars_ + '](?:[^' +
               bidichecker.utils.rtlChars_ + '\u202A-\u202E]*[' +
               bidichecker.utils.ltrChars_ + '])?', 'g');


/**
 * Regular expression to check for a prefix substring of neutral characters,
 * possibly including whitespace but ending with a visible character. Used to
 * find neutrals following opposite-directionality text.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.initialVisibleNeutralSubstringReg_ =
  new RegExp('^[' + bidichecker.utils.neutralChars_ + ']*[' +
             bidichecker.utils.nonWhiteNeutralChars_ + ']');


/**
 * Regular expression to check for a suffix substring of neutral characters,
 * possibly including whitespace but starting with a visible character. Used to
 * find neutrals preceding opposite-directionality text.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.finalVisibleNeutralSubstringReg_ =
  new RegExp('[' + bidichecker.utils.nonWhiteNeutralChars_ + '][' +
             bidichecker.utils.neutralChars_ + ']*$');


/**
 * Regular expression to check for a suffix substring of neutral characters,
 * possibly including whitespace. Used to strip neutrals following a fake RTL
 * string (see {@code bidichecker.utils.rtlAndFakeRtlSubstringReg_}).
 * @type {RegExp}
 * @private
 */
bidichecker.utils.finalNeutralSubstringReg_ =
  new RegExp('[' + bidichecker.utils.neutralChars_ + ']*$');


/**
 * Regular expression to match nonprinting chararacters.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.nonprintingCharsReg_ =
  new RegExp('[' + bidichecker.utils.nonprintingChars_ + ']');


/**
 * Regular expression to check whether a string consists entirely of LRM
 * marks and/or neutral characters.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.lrmOrNeutralReg_ =
  new RegExp('^[' + bidichecker.utils.neutralChars_ + '\u200E]+$');


/**
 * Regular expression to check whether a string consists entirely of RLM
 * marks and/or neutral characters.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.rlmOrNeutralReg_ =
  new RegExp('^[' + bidichecker.utils.neutralChars_ + '\u200F]+$');


/**
 * Regular expression to check for a prefix substring of numbers, possibly mixed
 * with neutral characters or whitespace. Used to identify spillover errors.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.initialNumberSubstringReg_ =
  new RegExp('^[' + bidichecker.utils.neutralChars_ + ']*\\d');


/**
 * Regular expression to check for any strongly-directional character.
 * @type {RegExp}
 * @private
 */
bidichecker.utils.directionalCharReg_ =
    new RegExp('[' + bidichecker.utils.ltrChars_ + bidichecker.utils.rtlChars_ +
               ']');


/**
 * Class representing a substring and its index within some other string.
 * @param {string} text The contents of the substring.
 * @param {number} index Its 0-based string index within the original string.
 * @constructor
 */
bidichecker.utils.Substring = function(text, index) {

  /**
   * The textual contents of the substring.
   * @type {string}
   */
  this.text = text;

  /**
   * The 0-based index of the substring's location in the original string.
   * @type {number}
   */
  this.index = index;
};


/**
 * Finds substrings in a given string of RTL characters with neutral characters
 * among them.
 * @param {string} str The string to be searched.
 * @return {Array.<bidichecker.utils.Substring>} Array of matching substrings.
 *     Returns empty array if no match.
 */
bidichecker.utils.findRtlSubstrings = function(str) {
  var results = [];
  var match;
  while ((match = bidichecker.utils.rtlSubstringReg_.exec(str))) {
    results.push(new bidichecker.utils.Substring(match[0], match.index));
  }
  return results;
};


/**
 * Finds substrings in a given string of RTL characters with neutral characters
 * among them, or "fake RTL" consisting of LTR characters sandwiched between
 * Unicode RLO and PDF characters.
 * @param {string} str The string to be searched.
 * @return {Array.<bidichecker.utils.Substring>} Array of matching substrings.
 *     Returns empty array if no match.
 */
bidichecker.utils.findRtlAndFakeRtlSubstrings = function(str) {
  var results = [];
  var match;
  while ((match = bidichecker.utils.rtlAndFakeRtlSubstringReg_.exec(str))) {
    // The regexp matches trailing neutrals after a fake RTL substring; we want
    // to strip them.
    var matchString = match[0];

    // Trim the neutrals from the end of the matched substring.
    var neutralsMatch =
        bidichecker.utils.finalNeutralSubstringReg_.exec(match[0]);
    if (neutralsMatch) {
      matchString =
          matchString.substr(0, matchString.length - neutralsMatch[0].length);
    }
    results.push(new bidichecker.utils.Substring(matchString, match.index));
  }
  return results;
};


/**
 * Finds substrings in a given string of LTR characters with neutral characters
 * among them. Ignores "fake RTL" strings, when the LTR characters are
 * sandwiched between Unicode RLO and PDF characters.
 * @param {string} str The string to be searched.
 * @return {Array.<bidichecker.utils.Substring>} Array of matching substrings.
 *     Returns empty array if no match.
 */
bidichecker.utils.findLtrSubstrings = function(str) {
  var results = [];
  var match;
  while ((match = bidichecker.utils.ltrSubstringReg_.exec(str))) {
    // Skip fake RTL strings.
    if (str.charAt(match.index - 1) == '\u202E' &&
        str.charAt(match.index + match[0].length) == '\u202C') {
      continue;
    }
    results.push(new bidichecker.utils.Substring(match[0], match.index));
  }
  return results;
};


/**
 * Checks whether a string contains only LRM characters and/or neutrals.
 * @param {string} str The string to be searched.
 * @return {boolean} Does it have only LRMs and neutrals?
 */
bidichecker.utils.hasOnlyLrmChars = function(str) {
  return bidichecker.utils.lrmOrNeutralReg_.exec(str) ? true : false;
};


/**
 * Checks whether a string contains only RLM characters and/or neutrals.
 * @param {string} str The string to be searched.
 * @return {boolean} Does it have only RLMs and neutrals?
 */
bidichecker.utils.hasOnlyRlmChars = function(str) {
  return bidichecker.utils.rlmOrNeutralReg_.exec(str) ? true : false;
};


/**
 * Finds a prefixed substring of neutral characters starting at a given index in
 * a string.
 * @param {string} str The string to be searched.
 * @param {number} index The index from which to begin searching.
 * @return {bidichecker.utils.Substring} Matching substring or null if no match.
 */
bidichecker.utils.findVisibleNeutralTextAtIndex = function(str, index) {
  var match = bidichecker.utils.initialVisibleNeutralSubstringReg_.exec(
      str.substr(index));
  if (match) {
    return new bidichecker.utils.Substring(match[0], index);
  }
  return null;
};


/**
 * Finds a substring of neutral characters ending before a given index in
 * a string.
 * @param {string} str The string to be searched.
 * @param {number} index The index before which to begin searching.
 * @return {bidichecker.utils.Substring} Matching substring or null if no match.
 */
bidichecker.utils.findVisibleNeutralTextBeforeIndex = function(str, index) {
  var match = bidichecker.utils.finalVisibleNeutralSubstringReg_.exec(
      str.substr(0, index));
  if (match) {
    return new bidichecker.utils.Substring(match[0], index - match[0].length);
  }
  return null;
};


/**
 * Finds a prefixed substring of numbers, possibly mixed with neutral characters
 * or whitespace, starting at the beginning of a string.
 * @param {string} str The string to be searched.
 * @return {bidichecker.utils.Substring} Matching substring or null if no match.
 */
bidichecker.utils.findNumberAtStart = function(str) {
  var match = bidichecker.utils.initialNumberSubstringReg_.exec(str);
  if (match) {
    return new bidichecker.utils.Substring(match[0], 0);
  }
  return null;
};


/**
 * Checks a string for any strongly-directional character (LTR or RTL).
 * @param {string} str The string to be searched.
 * @return {boolean} Whether a strongly-directional character is present.
 */
bidichecker.utils.hasDirectionalCharacter = function(str) {
  return bidichecker.utils.directionalCharReg_.test(str);
};


/**
 * Maps raw characters to their escaped versions, preseeded with the special
 * cases. Used by bidichecker.utils.escapeChar.
 * @private
 * @type {Object}
 */
bidichecker.utils.escapedChars_ = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '"': '\\"',
  '\'': '\\\'',
  '\\': '\\\\'
};


/**
 * Takes a string and returns the equivalent escaped string.
 * @param {string} str The string to escape.
 * @return {string} An escaped string representing {@code str}.
 */
bidichecker.utils.escapeString = function(str) {
  var sb = [];
  for (var i = 0; i < str.length; i++) {
    sb[i] = bidichecker.utils.escapeChar(str.charAt(i));
  }
  return sb.join('');
};


/**
 * Takes a character and returns the escaped string for that character. For
 * example escapeChar(String.fromCharCode(15)) -> "\\u000e".
 * @param {string} c The character to escape.
 * @return {string} An escaped string representing {@code c}.
 */
bidichecker.utils.escapeChar = function(c) {
  if (c in bidichecker.utils.escapedChars_) {
    return bidichecker.utils.escapedChars_[c];
  }

  var rv = c;
  if (bidichecker.utils.nonprintingCharsReg_.test(c)) {
    var cc = c.charCodeAt(0);
    rv = '\\u';
    if (cc < 4096) { // \u1000
      rv += '0';
      if (cc < 256) {
        rv += '0';
        if (cc < 16) {
          rv += '0';
        }
      }
    }
    rv += cc.toString(16);
  }

  // Add it to the map for next time.
  return bidichecker.utils.escapedChars_[c] = rv;
};


/**
 * Surround a string with quotes, escaping the contents.
 * @param {string} str The string to be quoted.
 * @return {string} The original string surrounded by single quotes, and with
 *     any quote marks and unprintable characters escaped as hex codes.
 */
bidichecker.utils.singleQuoteString = function(str) {
  return "'" + bidichecker.utils.escapeString(str) + "'";
};


/**
 * Truncates a string if it's longer than a given length. Longer values are
 * abbreviated after that length, appending an ellipsis, so the maximum result
 * length is maxLength + 1.
 * @param {string} str The original string.
 * @param {number} maxLength The length at which to truncate.
 * @return {string} The possibly-truncated string.
 */
bidichecker.utils.truncateString = function(str, maxLength) {
  var ELLIPSIS = '\u2026';
  if (str.length > maxLength) {
    return str.substr(0, maxLength) + ELLIPSIS;
  }
  return str;
};


/**
 * Stringifies an attribute node as xyz='abc', where xyz is the attribute name
 * and abc is its value. Escapes any special characters in the attribute value.
 * Attribute values other than "class" and "id" are truncated to a maximum of 20
 * characters (before escaping).
 * @param {Node} node An attribute node.
 * @return {string} The string description of the attribute.
 * @private
 */
bidichecker.utils.describeAttribute_ = function(node) {
  var TRUNCATION_LENGTH = 20;
  var value = node.nodeValue;
  if (node.nodeName != 'class' && node.nodeName != 'id') {
    value = bidichecker.utils.truncateString(value, TRUNCATION_LENGTH);
  }
  if (node.nodeName == 'style') {
    // IE mangles the case of style attributes; normalize on lowercase.
    value = value.toLowerCase();
  }
  return node.nodeName + '=' + bidichecker.utils.singleQuoteString(value);
};


/**
 * Describes an element node as <div qrs='tuv' xyz='abc'>, where div is the
 * node name and the remain fields are its attributes and their values. Escapes
 * any special characters in the attribute values.
 * @param {Node} node The node to describe.
 * @return {string} The string form of the attribute.
 */
bidichecker.utils.describeNode = function(node) {
  var attributes = [];
  if (node.attributes) {
    for (var i = 0; i < node.attributes.length; ++i) {
      var attribute = node.attributes[i];
      // In IE, node.attributes includes implicitly defined attributes. It also
      // sometimes contains attributes with null values.
      if (attribute.nodeValue &&
          (attribute.specified === undefined || attribute.specified)) {
        attributes.push(attribute);
      }
    }
  }
  var descriptionFields = [node.nodeName.toLowerCase()];
  var attributeDescriptions = goog.array.map(
      attributes, bidichecker.utils.describeAttribute_);
  attributeDescriptions.sort();  // Canonicalize order of attributes.
  descriptionFields = descriptionFields.concat(attributeDescriptions);
  return '<' + descriptionFields.join(' ') + '>';
};


/**
 * Describes the location in the DOM of an element node. Output is a string of
 * the form <div id='xyz'><p dir='rtl'>.
 * @param {Node} node The node to describe.
 * @return {string} The string description.
 */
bidichecker.utils.describeLocation = function(node) {
  var descriptions = [];
  for (var current = node; current; current = current.parentNode) {
    descriptions.push(bidichecker.utils.describeNode(current));

    // Stop below the body (or frameset) node.
    if (current.parentNode.nodeName == 'BODY' ||
        current.parentNode.nodeName == 'FRAMESET') {
      break;
    }
  }

  descriptions.reverse();
  return descriptions.join('');
};


/**
 * Collects all the text in the subtree below the given element in the DOM.
 * @param {Node} node The node at the root of the subtree.
 * @return {string} The text contents of the node.
 */
bidichecker.utils.getTextContents = function(node) {
  // TODO(user): Translate non-text elements such as <IMG>, <BR>, etc., to
  // some sort of visible text, such as a smiley for an image and a newline for
  // BR.
  var textPieces = [];
  var iter = new goog.dom.TagIterator(node);
  goog.iter.forEach(iter, function() {
    if (iter.node.nodeType == goog.dom.NodeType.TEXT) {
      textPieces.push(iter.node.data);
    }
  });

  return textPieces.join('');
};


/**
 * Names of all block-level tags.
 * @type {Object}
 * @private
 */
bidichecker.utils.BLOCK_TAG_NAMES_ = goog.object.createSet(
    'ADDRESS', 'BLOCKQUOTE', 'BODY', 'CAPTION', 'CENTER', 'COL', 'COLGROUP',
    'DIR', 'DIV', 'DL', 'DD', 'DT', 'FIELDSET', 'FORM', 'H1', 'H2', 'H3', 'H4',
    'H5', 'H6', 'HR', 'ISINDEX', 'OL', 'LI', 'MAP', 'MENU', 'OPTGROUP',
    'OPTION', 'P', 'PRE', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR',
    'TL', 'UL');


/**
 * Checks if element is a block-level html element. The <tt>display</tt> css
 * property is ignored.
 * @param {Element} element The element to test.
 * @return {boolean} Whether the element has a block-level tag.
 * @private
 */
bidichecker.utils.isBlockTag_ = function(element) {
  return !!bidichecker.utils.BLOCK_TAG_NAMES_[element.tagName];
};


/**
 * Names of all CSS 'display' styles which are inlined.
 * @type {Object}
 * @private
 */
bidichecker.utils.INLINE_DISPLAY_TYPES_ = goog.object.createSet(
      'inline', 'inline-block', 'inline-table');


/**
 * The result of the most recent call to {@code
 * bidichecker.utils.getDisplayStyle()}, cached to economize on calls to
 * {@code goog.style.get*Style()}. It's commonly called more than once in
 * succession for the same element.
 * @type {Object}
 * @private
 */
bidichecker.utils.lastDisplayStyle_ = { element: null, style: null };


/**
 * Returns the display style of an element.
 * @param {Element} element The element to test.
 * @return {?string} The element's display style, if available.
 */
bidichecker.utils.getDisplayStyle = function(element) {
  if (bidichecker.utils.lastDisplayStyle_.element == element) {
    return bidichecker.utils.lastDisplayStyle_.style;
  }
  var style = goog.style.getCascadedStyle(element, 'display') ||
    goog.style.getComputedStyle(element, 'display');
  bidichecker.utils.lastDisplayStyle_ = { element: element, style: style };
  return style;
};


/**
 * Returns the visibility style of an element.
 * @param {Element} element The element to test.
 * @return {?string} The element's visibility style, if available.
 */
bidichecker.utils.getVisibilityStyle = function(element) {
  var style = goog.style.getCascadedStyle(element, 'visibility') ||
    goog.style.getComputedStyle(element, 'visibility');
  return style;
};


/**
 * Checks if an element is actually displayed as a block-level html element,
 * considering both the default tag type and the <tt>display</tt> css property.
 * @param {Element} element The element to test.
 * @return {boolean} Whether the element is displayed as a block-level element.
 */
bidichecker.utils.isBlockElement = function(element) {
  var display = bidichecker.utils.getDisplayStyle(element);
  if (display) {
    return !bidichecker.utils.INLINE_DISPLAY_TYPES_[display];
  } else {
    return bidichecker.utils.isBlockTag_(element);
  }
};


/**
 * Checks if a node is displayable; that is, it does not have style
 * "display:none", "visibility:hidden" or "visibility:collapse", and is not a
 * script, noscript or style element.
 * <p>In some browsers (such as IE), contents of noscript tags are not
 * accessible anyway with scripting activated. In others (such as Chrome) the
 * DOM contains a noscript element whose contents are the entity-encoded HTML
 * source code of the contents of the noscript tag; if the context is RTL, that
 * produces undeclared-directionality errors.
 * @param {Node} node The node to test.
 * @return {boolean} Whether the node is displayable.
 */
bidichecker.utils.isDisplayable = function(node) {
  if (node.nodeType == goog.dom.NodeType.ELEMENT) {
    if (node.nodeName == 'SCRIPT' || node.nodeName == 'STYLE' ||
        node.nodeName == 'NOSCRIPT') {
      return false;
    }
    var element = /** @type {Element} */ (node);
    if (bidichecker.utils.getDisplayStyle(element) == 'none') {
        return false;
    }
    var visibility = bidichecker.utils.getVisibilityStyle(element);
    return visibility != 'hidden' && visibility != 'collapse';
  }
  return true;
};


/**
 * Modifies the style of an element to highlight its contents visually. Changes
 * the element's text color to red and background color to yellow, and
 * adds a red outline.
 * @param {!Element} element The element to modify.
 * @return {!Object} Contains the color, backgroundColor and outline fields of
 *     the element's original style.
 */
bidichecker.utils.highlightElementStyle = function(element) {
  var oldStyle =
      {'color': element.style.color || '',
       'backgroundColor': element.style.backgroundColor || '',
       'outline': element.style.outline || ''};
  element.style.color = 'red';
  element.style.backgroundColor = 'yellow';
  element.style.outline = 'medium solid red';
  return oldStyle;
};
