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
 * @fileoverview Walker to traverse the DOM and dispatch events indicating its
 * contents, while tracking the directionality.
 */


goog.provide('bidichecker.DomWalker');
goog.provide('bidichecker.DomWalker.EventTypes');

goog.require('bidichecker.utils');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.TagIterator');
goog.require('goog.events.EventTarget');
goog.require('goog.style');


/**
 * A DOM tree traverser with bidi-related services which generates events for
 * each type of node it encounters. Based on {@code goog.dom.TagIterator}, but
 * skips non-displayable elements.
 * @param {Element} block A block-level element in the DOM within which to
 *     traverse.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
bidichecker.DomWalker = function(block) {
  goog.events.EventTarget.call(this);

  /**
   * Iterator over the tags in the DOM in the top-level block we're working on.
   * @type {goog.dom.TagIterator}
   * @private
   */
  this.nodeIter_ = new goog.dom.TagIterator(block);

  /**
   * The root block within which we are traversing. Will not be modified over
   * the lifetime of this object.
   * @type {Element}
   * @private
   */
  this.rootBlock_ = block;

  /**
   * Stack of isRtl values of elements from the current location up to the root
   * block.
   * <p>The stack is initialized with the directionality of the root node. This
   * value will be added (again) to the stack when the root node is entered
   * during traversal. In principle, the initial value entered here should
   * represent the parent of the root node, but we don't actually use that
   * because by definition the root node is the highest node we're interested
   * in; data about its parent is never used.
   * <p>For simplicity of implementation of {@code isDeclared} (see below in
   * {@code next_()}), we duplicate the root node's directionality at the start
   * of the stack to ensure that the root node is never attributed {@code
   * isDeclared} status; otherwise, any arbitrary value could be used here.
   * @type {Array.<boolean>}
   * @private
   */
  this.isRtlStack_ = [goog.style.isRightToLeft(block)];

  /**
   * Stack of isDeclared values of elements from the current location up to the
   * root block.
   * @type {Array.<boolean>}
   * @private
   */
  this.isDeclaredStack_ = [];

  /**
   * Stack of block elements from the current location up to the root block.
   * @type {Array.<Element>}
   * @private
   */
  this.blockStack_ = [block];

  /**
   * Frames found so far during traversal.
   * @type {Array.<Element>}
   * @private
   */
  this.frames_ = [];
};
goog.inherits(bidichecker.DomWalker, goog.events.EventTarget);


/**
 * The node currently being traversed.
 * @type {Node}
 * @private
 */
bidichecker.DomWalker.prototype.node_ = null;


/**
 * Walks the entire DOM, dispatching events as it goes. Dispatches four types of
 * events: {@code StartTag}, {@code EndTag}, {@code TextNode}, and {@code
 * EndOfDom}.
 */
bidichecker.DomWalker.prototype.go = function() {
  try {
    for (;; this.next_()) {
      // Empty body; iterator events are handled by the event listeners.
    }
  } catch (e) {
    // Ignore StopIteration; it's just the end of the DOM. Otherwise, rethrow.
    if (e !== goog.iter.StopIteration) {
      throw e;
    } else {
      this.dispatchEvent(bidichecker.DomWalker.EventTypes.END_OF_DOM);
    }
  }
};


/**
 * Event types dispatched by {@code bidichecker.DomWalker}.
 * @enum {string}
 */
bidichecker.DomWalker.EventTypes = {
  START_TAG: 'StartTag',
  END_TAG: 'EndTag',
  TEXT_NODE: 'TextNode',
  END_OF_DOM: 'EndOfDom'
};


/**
 * Advances to the next displayable node position in the DOM, dispatching an
 * appropriate event if relevant: {@code StartTag}, {@code EndTag}, {@code
 * TextNode}.
 * @throws {goog.iter.StopIteration} when iteration is done.
 * @private
 */
bidichecker.DomWalker.prototype.next_ = function() {
  this.node_ = this.nextDisplayableNode_();

  if (this.nodeIter_.isStartTag()) {
    var element = /** @type {Element} */ (this.node_);
    var isRtl = goog.style.isRightToLeft(element);

    // If this element has "declared directionality" (see below), we've
    // entered a "declared" subtree of the DOM. From that point, we stay
    // declared all the way down.
    var isDeclared = goog.array.peek(this.isDeclaredStack_) ||
        isRtl != goog.array.peek(this.isRtlStack_) ||
        this.declaresDir_(element);
    this.isDeclaredStack_.push(isDeclared);
    this.isRtlStack_.push(isRtl);

    // Have to check for a frame before a block, since on some browsers frames
    // are also identified as blocks.
    if (element.nodeName == 'IFRAME' || element.nodeName == 'FRAME') {
      this.frames_.push(element);
    } else if (bidichecker.utils.isBlockElement(element)) {
      // Entering a new block.
      this.blockStack_.push(element);
    }

    this.dispatchEvent(bidichecker.DomWalker.EventTypes.START_TAG);
  } else if (this.nodeIter_.isEndTag()) {
    this.dispatchEvent(bidichecker.DomWalker.EventTypes.END_TAG);

    // Now pop all the stacks; the state of the stacks when an END_TAG event is
    // dispatched should be identical with the state after the corresponding
    // START_TAG event.
    this.isRtlStack_.pop();
    this.isDeclaredStack_.pop();
    if (this.node_ == goog.array.peek(this.blockStack_)) {
      // Exiting a block.
      this.blockStack_.pop();
    }
  } else if (this.node_.nodeType == goog.dom.NodeType.TEXT) {
    this.dispatchEvent(bidichecker.DomWalker.EventTypes.TEXT_NODE);
  }
};


/**
 * @return {Node} The node at the current traversal position.
 */
bidichecker.DomWalker.prototype.getNode = function() {
  return this.node_;
};


/**
 * @return {boolean} Whether the current position has declared directionality
 *     of right-to-left.
 */
bidichecker.DomWalker.prototype.inRtl = function() {
  return /** @type {boolean} */ (goog.array.peek(this.isRtlStack_));
};


/**
 * @return {boolean} Whether the element containing the current position has
 *     declared directionality of right-to-left. Never reaches above the root
 *     node; calling this with the traversal at the root node returns its own
 *     directionality, not its parent's.
 */
bidichecker.DomWalker.prototype.parentInRtl = function() {
  // Once an event has been dispatched, isRtlStack_ always contains at least two
  // elements, since it's initialized with an extra copy of the root block's
  // directionality.
  return /** @type {boolean} */ (this.isRtlStack_[this.isRtlStack_.length - 2]);
};


/**
 * @return {boolean} Whether the current position has "declared directionality"
 *     status.
 */
bidichecker.DomWalker.prototype.inDeclaredDir = function() {
  return /** @type {boolean} */ (goog.array.peek(this.isDeclaredStack_));
};


/**
 * @return {Element} The block-level element directly containing the current
 *     position.
 */
bidichecker.DomWalker.prototype.getCurrentBlock = function() {
  return (/** @type {Element} */ goog.array.peek(this.blockStack_));
};


/**
 * @return {Element} The root block-level element whose contents we are
 *     traversing.
 */
bidichecker.DomWalker.prototype.getRootBlock = function() {
  return this.rootBlock_;
};


/**
 * @return {Array.<Element>} List of frames found so far during traversal.
 *     Only contains top-level frames, not any nested within them.
 */
bidichecker.DomWalker.prototype.getFrames = function() {
  return this.frames_;
};


/**
 * Does this element impart "declared directionality" status to the text it
 * contains? This is true for an element below the root element which has a
 * "dir" attribute, unless the element also contains a block-level element.
 * @param {Element} element The element to test.
 * @return {boolean} Does the element have "isDeclared" status?
 * @private
 */
bidichecker.DomWalker.prototype.declaresDir_ = function(element) {
  if (!element.dir || element == this.rootBlock_) {
    return false;
  }

  for (var child = element.firstChild; child; child = child.nextSibling) {
    if (child.nodeType == goog.dom.NodeType.ELEMENT &&
        bidichecker.utils.isBlockElement(/** @type {Element} */ (child))) {
      return false;
    }
  }
  return true;
};


/**
 * Advances the node iterator while skipping scripts or elements with style
 * display:none.
 * @return {Node} Returns the next node in a displayable element.
 * @throws goog.iter.StopIteration when the whole DOM has been read.
 * @private
 */
bidichecker.DomWalker.prototype.nextDisplayableNode_ = function() {
  var node = this.nodeIter_.next();
  while (this.nodeIter_.isStartTag() &&
         !bidichecker.utils.isDisplayable(node)) {
    this.nodeIter_.skipTag();
    node = this.nodeIter_.next();
  }
  return node;
};
