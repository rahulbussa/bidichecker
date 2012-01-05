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
 * @fileoverview A highlightable text area of the DOM.
 */


goog.provide('bidichecker.HighlightableText');

goog.require('bidichecker.HighlightableArea');
goog.require('bidichecker.utils');
goog.require('goog.dom');
goog.require('goog.style');


/**
 * Class representing the highlightable area of a BiDi error associated with
 * text.
 * <p>Note that this code may not work if more than one error is highlighted
 * simultaneously, if the highlightable text areas share one or more more of the
 * same text nodes in the DOM.
 * @param {Array.<Node>} nodes An array of the text nodes containing the error
 *     text (corresponding to the {@code atText} field of {@code
 *     bidichecker.Error}).
 * @param {number} startOffset The character offset of the error location from
 *     the start of the first node.
 * @param {number} endOffset The character position within the last node to
 *     which the error location extends.
 * @implements {bidichecker.HighlightableArea}
 * @constructor
 */
bidichecker.HighlightableText = function(nodes, startOffset, endOffset) {
  /**
   * The text nodes containing the error text.
   * @type {Array.<Node>}
   * @private
   */
  this.nodes_ = nodes;

  /**
   * The character offset from the start of the first node to the start of the
   * error text.
   * @type {number}
   * @private
   */
  this.startOffset_ = startOffset;

  /**
   * The character offset from the start of the last node to the end of the
   * error text.
   * @type {number}
   * @private
   */
  this.endOffset_ = endOffset;

  /**
   * The DOM nodes which replace the original text nodes (corresponding by
   * array index to the text nodes in {@code this.nodes_}.
   * @type {Array.<Node>}
   * @private
   */
  this.newNodes_ = [];
};


/** @override */
bidichecker.HighlightableText.prototype.highlightOnPage = function() {
  if (this.newNodes_.length == 0) {
    // Wrap each text node in a highlighted span.
    //
    // TODO(user): What should we do if this fails to display the error, e.g.
    // if the error location is concealed behind another DOM element or scrolled
    // out of view in a scrollable element?
    for (var i = 0; i < this.nodes_.length; ++i) {
      // Adjust the boundary character positions for the first and last nodes.
      var startOffset = i == 0 ? this.startOffset_ : 0;
      var endOffset = i == this.nodes_.length - 1 ? this.endOffset_ :
          this.nodes_[i].length;

      var newNode = bidichecker.HighlightableText.highlightNodeText_(
          this.nodes_[i], startOffset, endOffset);
      this.newNodes_.push(newNode);
    }
  } else {
    // We've already highlighted this area before; instead of rebuilding the
    // highlighted nodes, we can just swap the cached highlighted nodes for the
    // original ones.
    for (var i = 0; i < this.newNodes_.length; ++i) {
      goog.dom.replaceNode(this.newNodes_[i], this.nodes_[i]);
    }
  }

  return goog.style.getPageOffset(/** @type {Element} */ (this.newNodes_[0]));
};


/** @override */
bidichecker.HighlightableText.prototype.unhighlightOnPage = function() {
  if (this.newNodes_.length != 0) {
    // Swap back the original nodes for the highlighted ones.
    for (var i = 0; i < this.nodes_.length; ++i) {
      goog.dom.replaceNode(this.nodes_[i], this.newNodes_[i]);
    }
  }
};


/**
 * Highlights a single text node on the web page by wrapping its text in a
 * yellow highlight span. Optionally, highlights just a substring of the text.
 * @param {Node} node A text node.
 * @param {number=} opt_start The starting character to highlight.
 * @param {number=} opt_end One past the final character to highlight.
 * @return {Node} The replacement node.
 * @private
 */
bidichecker.HighlightableText.highlightNodeText_ = function(node, opt_start,
                                                            opt_end) {
  var start = opt_start || 0;
  var end = opt_end || node.data.length;

  /** The children of the new span to replace the original text node. */
  var children = [];

  if (start > 0) {
    // The unhighlighted text prefix, if any.
    children.push(node.data.substring(0, start));
  }
  // The highlighted substring.
  var highlightSpan =
      goog.dom.createDom('span', {}, node.data.substring(start, end));
  bidichecker.utils.highlightElementStyle(highlightSpan);
  children.push(highlightSpan);

  if (end < node.data.length) {
    // The unhighlighted text suffix, if any.
    children.push(node.data.substring(end));
  }

  // And an outer span to hold all the children.
  var newNode = goog.dom.createDom('span', null, children);
  goog.dom.replaceNode(newNode, node);
  return newNode;
};
