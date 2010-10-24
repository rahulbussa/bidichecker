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
 * @fileoverview Walker to listen to DOM events and dispatch events representing
 * same-directionality sequences of text in the same block-level element of the
 * DOM.
 */


goog.provide('bidichecker.DirChunkWalker');

goog.require('bidichecker.DirChunk');
goog.require('bidichecker.DomWalker');
goog.require('bidichecker.NullDirChunk');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');


/**
 * A walker which dispatches an event for each same-directionality chunk of text
 * within a block in the DOM.
 * @param {bidichecker.DomWalker} domWalker A walker which dispatches DOM node
 *     events while walking the DOM of a particular block.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
bidichecker.DirChunkWalker = function(domWalker) {
  goog.events.EventTarget.call(this);

  /**
   * The current chunk under assembly. When complete, a DirChunk event is
   * dispatched and a listener can access the chunk using {@code getChunk()}.
   * @type {bidichecker.DirChunk}
   * @private
   */
  this.chunk_ = bidichecker.NullDirChunk;

  /**
   * Service object to manage cleanup of event listeners.
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  // Listen for text node events and the end-of-DOM event.
  this.eventHandler_.listen(domWalker,
                            bidichecker.DomWalker.EventTypes.TEXT_NODE,
                            this.handleTextNode_);
  this.eventHandler_.listenOnce(domWalker,
                                bidichecker.DomWalker.EventTypes.END_OF_DOM,
                                this.handleEndOfDom_);
};
goog.inherits(bidichecker.DirChunkWalker, goog.events.EventTarget);


/**
 * Event types dispatched by {@code bidichecker.DirChunkWalker}.
 * @enum {string}
 */
bidichecker.DirChunkWalker.EventTypes = {
  DIR_CHUNK: 'DirChunk',
  END_OF_CHUNKS: 'EndOfChunks'
};


/**
 * Handles events indicating a text node in the DOM by updating the current
 * chunk or creating an new one. Dispatches a DirChunk event if the end of a
 * chunk is encountered.
 * @param {!goog.events.Event} event A TextNode event.
 * @private
 */
bidichecker.DirChunkWalker.prototype.handleTextNode_ = function(event) {
  var domWalker = event.target;
  var node = domWalker.getNode();
  if (this.chunk_.hasSameContext(domWalker.inRtl(),
                                 domWalker.getCurrentBlock(),
                                 domWalker.inDeclaredDir())) {
    // No change of directionality context - just accumulate the content.
    this.chunk_.append(node.data, node);
  } else {
    // When the direction changes or the block changes, return the previous
    // chunk and start a new one.
    // TODO(user): Also handle Unicode BiDi marks in node.data, including
    // LRE, RLE, RLO, LRO and PDF.
    if (!this.chunk_.isEmpty()) {
      this.dispatchEvent(bidichecker.DirChunkWalker.EventTypes.DIR_CHUNK);
    }

    this.chunk_ = new bidichecker.DirChunk(
        node.data,
        domWalker.inRtl(),
        node,
        domWalker.getCurrentBlock(),
        domWalker.inDeclaredDir());
  }
};


/**
 * Handles an end-of-DOM event by dispatching a DirChunk event if a non-empty
 * chunk is available, then dispatching an EndOfChunks event (always). Also
 * unlistens from all DOM events.
 * @param {!goog.events.Event} event An EndOfDom event.
 * @private
 */
bidichecker.DirChunkWalker.prototype.handleEndOfDom_ = function(event) {
  if (!this.chunk_.isEmpty()) {
    // Need to handle leftovers at end.
    this.dispatchEvent(bidichecker.DirChunkWalker.EventTypes.DIR_CHUNK);
  }
  this.dispatchEvent(bidichecker.DirChunkWalker.EventTypes.END_OF_CHUNKS);

  // Stop listening to DOM events.
  this.eventHandler_.removeAll();
};


/**
 * Returns the current chunk (either complete or under construction).
 * @return {bidichecker.DirChunk} The chunk.
 */
bidichecker.DirChunkWalker.prototype.getChunk = function() {
  return this.chunk_;
};
