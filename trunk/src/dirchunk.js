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
 * @fileoverview Class representing a same-directionality sequence of text in
 * the same block-level element of the DOM.
 */


goog.provide('bidichecker.DirChunk');
goog.provide('bidichecker.NullDirChunk');

goog.require('bidichecker.HighlightableArea');
goog.require('bidichecker.HighlightableText');
goog.require('bidichecker.utils');
goog.require('goog.array');


/**
 * Class associating a character position within a string with a DOM node.
 * This is used to keep track of where in the DOM a substring is. Note that the
 * actual string and its contents are not accessible from here.
 * @param {number} charPos A character position within the string.
 * @param {Node} node The lowest-level DOM node whose text contents
 *     begin or resume at that position.
 * @constructor
 * @private
 */
bidichecker.CharPositionNode_ = function(charPos, node) {

  /** @type {number} */
  this.charPos = charPos;

  /** @type {Node} */
  this.node = node;
};


/**
 * Class mapping positions in a string to the DOM nodes which contain them.
 * Used to tell where in the DOM a bit of the string is. Note that the actual
 * string and its contents are not accessible from here.
 * @param {Node} firstNode The lowest-level DOM node whose text
 *     contents begin at the start of the string (character position 0).
 * @constructor
 * @private
 */
bidichecker.CharPositionNodeFinder_ = function(firstNode) {

  /**
   * A list of CharPositionNode's, in the order they appear in the string.
   * @type {Array.<bidichecker.CharPositionNode_>}
   * @private
   */
  this.nodePositions_ = [new bidichecker.CharPositionNode_(0, firstNode)];

  /**
   * The node most recently added to the list of nodes. Used to avoid
   * redundant entries.
   * @type {Node}
   * @private
   */
  this.lastNode_ = firstNode;
};


/**
 * Adds the next DOM node, mapped to its position in the string.
 * Must have a greater charPos than the previous node added to this object.
 * @param {number} charPos The character position within the string.
 * @param {Node} node The text DOM node whose contents begin at that position.
 */
bidichecker.CharPositionNodeFinder_.prototype.append = function(charPos, node) {
  if (this.lastNode_ != node) {
    this.nodePositions_.push(new bidichecker.CharPositionNode_(charPos, node));
    this.lastNode_ = node;
  }
};


/**
 * Given a character position, returns the index of the node containing the
 * character at that position.
 * @param {number} charPos The character position.
 * @return {number} The arary index of the node containing the character.
 * @private
 */
bidichecker.CharPositionNodeFinder_.prototype.findNodeIndexAtPosition_ =
    function(charPos) {
  var index = goog.array.binarySearch(this.nodePositions_, charPos,
    function(targetPos, entry) {
      return targetPos - entry.charPos;
    });
  // If the exact character position appears in nodePositions_, binarySearch()
  // returns its index in the array. Otherwise, it returns (-i - 1), where i is
  // the index at which it would be inserted. In that case, the array index
  // we're looking for is the one preceding the insertion point.
  return index >= 0 ? index : -index - 2;
};


/**
 * Given a character position, returns the node immediately containing the
 * character at that position.
 * @param {number} charPos The character position of the substring start.
 * @return {Node} The text node containing the character at charPos.
 */
bidichecker.CharPositionNodeFinder_.prototype.findNodeAtPosition = function(
    charPos) {
  var index = this.findNodeIndexAtPosition_(charPos);
  return this.nodePositions_[index].node;
};


/**
 * Given the character location of a substring of this chunk, returns the
 * highlightable area of the DOM containing its text.
 * @param {number} startPos The character index of the substring start.
 * @param {number} length The substring length in characters.
 * @return {!bidichecker.HighlightableArea} The error location.
 */
bidichecker.CharPositionNodeFinder_.prototype.getHighlightableArea = function(
    startPos, length) {
  var startIndex = this.findNodeIndexAtPosition_(startPos);
  var endIndex = this.findNodeIndexAtPosition_(startPos + length - 1);
  var nodes = [];
  for (var i = startIndex; i <= endIndex; ++i) {
    nodes.push(this.nodePositions_[i].node);
  }
  return new bidichecker.HighlightableText(nodes,
      startPos - this.nodePositions_[startIndex].charPos,
      startPos + length - this.nodePositions_[endIndex].charPos);
};


/**
 * Class representing a chunk of text with the same declared directionality
 * within the same block-level element. Chunks can span multiple inline elements
 * within a block, so long as the declared directionality is unchanged.
 * Successive inline pieces of the chunk are added using the append() method.
 * @param {string} text The text contents of the first piece of the chunk.
 * @param {boolean} isRtl Whether the declared directionality is right-to-left.
 * @param {Node} node The text node containing the first piece of the chunk.
 * @param {Element} block The lowest block-level ancestor of {@code node}.
 * @param {boolean} isDeclared Whether the chunk is in a declared-directionality
 *     context.
 * @constructor
 */
bidichecker.DirChunk = function(text, isRtl, node, block, isDeclared) {

  /**
   * Is the declared directionality right-to-left?
   * @type {boolean}
   * @private
   */
  this.isRtl_ = isRtl;

  /**
   * Is this chunk contained somewhere within an element with a declared
   * directionality? (That is, any element below the root element which has a
   * "dir" attribute, unless the element also contains a block-level element.)
   * @type {boolean}
   * @private
   */
  this.isDeclared_ = isDeclared;

  /**
   * The block immediately containing this chunk.
   * @type {Element}
   * @private
   */
  this.block_ = block;

  /**
   * The pieces of text comprising the contents of the chunk.
   * @type {Array.<string>}
   * @private
   */
  this.textPieces_ = [text];

  /**
   * The cumulative string length of the text of the chunk so far.
   * @type {number}
   * @private
   */
  this.textLength_ = text.length;

  /**
   * The map from character positions to nodes containing them.
   * @type {bidichecker.CharPositionNodeFinder_}
   * @private
   */
  this.nodeFinder_ = new bidichecker.CharPositionNodeFinder_(node);
};


/**
 * The concatenated textual contents of the chunk, computed lazily on demand.
 * @type {?string}
 * @private
 */
bidichecker.DirChunk.prototype.text_ = null;


/**
 * @return {boolean} Is the declared directionality right-to-left?
 */
bidichecker.DirChunk.prototype.isRtl = function() {
  return this.isRtl_;
};


/**
 * @return {boolean} Is the chunk in a declared-directionality context?
 */
bidichecker.DirChunk.prototype.isDeclared = function() {
  return this.isDeclared_;
};


/**
 * @return {Element} The block immediately containing this chunk.
 */
bidichecker.DirChunk.prototype.getBlock = function() {
  return this.block_;
};


/**
 * Does the chunk contain any characters?
 * @return {boolean} Are all the pieces empty?
 */
bidichecker.DirChunk.prototype.isEmpty = function() {
  return goog.array.every(this.textPieces_,
      function(s) { return s.length == 0; }
  );
};


/**
 * Appends another segment of text to this chunk.
 * @param {string} text The text to append.
 * @param {Node} node The text node containing it.
 */
bidichecker.DirChunk.prototype.append = function(text, node) {
  this.nodeFinder_.append(this.textLength_, node);
  this.textLength_ += text.length;
  this.textPieces_.push(text);
  this.text_ = null;  // Invalidate precomputed value, if any.
};


/**
 * Is this chunk in the given context (declared directionality and enclosing
 * block)?
 * @param {boolean} isRtl Whether the declared directionality is right-to-left.
 * @param {Element} block The containing block element.
 * @param {boolean} isDeclared Whether the chunk is in a declared-directionality
 *     context.
 * @return {boolean} Is it in the same context?
 */
bidichecker.DirChunk.prototype.hasSameContext = function(isRtl, block,
                                                         isDeclared) {
  return isRtl == this.isRtl_ && block == this.block_ &&
      isDeclared == this.isDeclared_;
};


/**
 * Assembles and returns the complete text contents of this chunk.
 * @return {string} The text contents of this chunk.
 */
bidichecker.DirChunk.prototype.getText = function() {
  // TODO(user): Translate <BR> to a newline, or some other visible text.
  if (this.text_ === null) {
    this.text_ = this.textPieces_.join('');
  }
  return /** @type {string} */ (this.text_);
};


/**
 * Given the string character index of a substring in this chunk, returns the
 * node immediately containing the character at that position.
 * @param {number} charPos The character index of the substring start.
 * @return {Node} The text node containing the character at charPos.
 */
bidichecker.DirChunk.prototype.findNodeAtPosition = function(charPos) {
  return this.nodeFinder_.findNodeAtPosition(charPos);
};


/**
 * Given the character location of a substring of this chunk, returns the DOM
 * location containing its text.
 * @param {number} startPos The character index of the substring start.
 * @param {number} length The substring length in characters.
 * @return {!bidichecker.HighlightableArea} The error location.
 */
bidichecker.DirChunk.prototype.getHighlightableArea = function(startPos,
                                                               length) {
  return this.nodeFinder_.getHighlightableArea(startPos, length);
};


/**
 * A canonical empty instance of {@code bidichecker.DirChunk} (the Null Object
 * pattern).
 * @type {bidichecker.DirChunk}
 */
bidichecker.NullDirChunk =
    new bidichecker.DirChunk('', false, null, null, false);
