// Copyright 2011 Google Inc. All Rights Reserved.
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
 * @fileoverview A communications channel for exchanging messages with another
 * window of the browser. Used to coordinate between the GUI window and the page
 * being checked.
 */
goog.provide('bidichecker.gui.common.CommChannel');

goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.json');
goog.require('goog.structs.Map');


/**
 * A communications channel for exchanging messages with another window of the
 * browser. On receipt of a message from the window, invokes a handler function
 * corresponding to the message type.
 * @param {Object} otherWindow The window to communicate with.
 * @param {bidichecker.gui.common.CommChannel.MessageMap} messageMap Which
 *     handler to invoke for each type of message received.
 * @constructor
 */
bidichecker.gui.common.CommChannel = function(otherWindow, messageMap) {
  /**
   * The window we communicate with.
   * @private
   */
  this.otherWindow_ = otherWindow;

  /**
   * A mapping from message types to message handlers.
   * @type {bidichecker.gui.common.CommChannel.MessageMap}
   * @private
   */
  this.messageMap_ = messageMap;

  /**
   * Key used to stop listening to the event when the object is disposed.
   * @type {?number}
   * @private
   */
  this.listenerKey_ = goog.events.listen(window, goog.events.EventType.MESSAGE,
      this.handleMessageEvent_, false, this);
};


/**
 * Send a message to the other site.
 * @param {string} type The message type.
 * @param {?*} opt_data Optional message data. Will be serialized as JSON
 *     so it should be a JSON compatible type. Generally an array, object, an
 *     atomic type or combinations thereof.
 */
bidichecker.gui.common.CommChannel.prototype.send = function(type, opt_data) {
  var message = {
    'type': type,
    'data': opt_data
  };
  this.otherWindow_.postMessage(goog.json.serialize(message), '*');
};


/**
 * Stop listening to messages. The object shouldn't be used after calling this
 * method.
 */
bidichecker.gui.common.CommChannel.prototype.dispose = function() {
  goog.events.unlistenByKey(this.listenerKey_);
};


/**
 * Handle an incoming message.
 * @param {goog.events.Event} event The message event that triggered this
 *     handler.
 * @private
 */
bidichecker.gui.common.CommChannel.prototype.handleMessageEvent_ =
    function(event) {
  var underlyingEvent = event.getBrowserEvent();
  // Parse the message data. It should be a JSON string describing an object
  // with the following keys:
  // * 'type' (string)
  // * 'data' (any type)
  var message = goog.json.parse(underlyingEvent.data);
  var type = String(message.type);
  var data = message.data;

  // Get message handler from message map and call it. Query map using
  // "hasOwnProperty" so we don't confuse built-in properties with map contents.
  if (!this.messageMap_.hasOwnProperty(type)) {
    throw 'Unknown message type received by CommChannel: ' + type;
  }
  var handler = this.messageMap_[type];
  handler(type, data);
};


/**
 * A message handler. Message handlers should always verify the message contents
 * since the message may come from any site.
 * @typedef {function(string, *)}
 */
bidichecker.gui.common.CommChannel.MessageHandler;

/**
 * @typedef {Object.<string, bidichecker.gui.common.CommChannel.MessageHandler>}
 */
bidichecker.gui.common.CommChannel.MessageMap;

