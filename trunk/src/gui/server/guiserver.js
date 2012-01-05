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
 * @fileoverview Class which resides on the page being checked and communicates
 * with a BidiChecker GUI, responding to its requests. See the GUI Message
 * Protocol document for descriptions of the messages sent between the GUI and
 * the page being checked.
 */
goog.provide('bidichecker.gui.server.GuiServer');

goog.require('bidichecker.Error');
goog.require('bidichecker.gui.common.CommChannel');
goog.require('bidichecker.gui.server.GuiContainer');



/**
 * Server which communicates with a GUI and responds to its requests. To ensure
 * that only one instance of the server will be active at any time on a
 * particular page (being checked), and to ensure proper initialization order,
 * call {@code bidichecker.gui.server.GuiServer.startServer} after construction.
 * @param {!bidichecker.BidiChecker} checker A BidiChecker instance used for
 *     checking the page.
 * @param {Object.<string, Object>} options The initial options.
 *     Options are specified as an object with the following (optional) keys:
 *     <ul>
 *     <li>dir -- string, "rtl" or "ltr" (the default). The expected page
 *     directionality.
 *     <li>severity -- The severity level from which to suppress error messages,
 *     or -1 (for no severity filtering). Default 4.
 *     </ul>
 * @param {!bidichecker.gui.server.GuiContainer} guiContainer The object which
 *     displays the BidiChecker GUI web application. The GuiServer will be
 *     responsible for disposing this object.
 * @param {string} guiAppUrl Location of the GUI files.
 * @param {Array.<!bidichecker.Error>=} opt_errors Array of error objects for
 *     initial checkPage request. Subsequent requests will be handled as usual
 *     by invoking the given BidiChecker's checkPage method.
 * @constructor
 */
bidichecker.gui.server.GuiServer = function(checker, options, guiContainer,
    guiAppUrl, opt_errors) {
  // Set defaults for unspecified options.
  options = goog.object.clone(options);
  var defaults = {
    'dir': 'ltr',
    'severity': 4
  };
  for (var key in defaults) {
    if (!(key in options)) {
      options[key] = defaults[key];
    }
  }

  /**
   * A BidiChecker instance used for checking the page.
   * @type {!bidichecker.BidiChecker}
   * @private
   */
  this.checker_ = checker;

  /**
   * The current options. We manage them here instead of at the GUI side because
   * the GUI side may have trouble maintaining state (due to refreshes, etc).
   * @type {Object}
   * @private
   */
  this.options_ = options;

  /**
   * The object that manages the BidiChecker GUI web application.
   * @type {!bidichecker.gui.server.GuiContainer}
   * @private
   */
  this.guiContainer_ = guiContainer;

  /**
   * Location of the GUI files.
   * @type {string}
   * @private
   */
  this.guiAppUrl_ = guiAppUrl;

  /**
   * Errors to return as a response to the first checkPage message. Null if no
   * initial errors were specified or the errors were already returned.
   * @type {Array.<!bidichecker.Error>}
   * @private
   */
  this.initialErrors_ = opt_errors || null;
};


/**
 * Completes initialization of a new GuiServer instance and makes it the active
 * one. Before that, disposes the running server, if any.
 * @param {bidichecker.gui.server.GuiServer} server The GuiServer that will be
 *     server.
 */
bidichecker.gui.server.GuiServer.startServer = function(server) {
  goog.dispose(bidichecker.gui.server.GuiServer.activeServer_);
  bidichecker.gui.server.GuiServer.activeServer_ = server;
  server.start();
};


/**
 * The communication channel.
 * @type {bidichecker.gui.common.CommChannel}
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.channel_ = null;


/**
 * Completes initialization of the server after any existing running server is
 * stopped, and starts the error browser.
 * Visible for testing only.
 */
bidichecker.gui.server.GuiServer.prototype.start = function() {
  var guiWindow = this.guiContainer_.getContentWindow();
  this.channel_ = new bidichecker.gui.common.CommChannel(guiWindow, {
      'checkPage': goog.bind(this.handleCheckPageMessage_, this),
      'highlightError': goog.bind(this.handleHighlightErrorMessage_, this),
      'unhighlightError': goog.bind(this.handleUnhighlightErrorMessage_, this),
      'getOptions': goog.bind(this.handleGetOptionsMessage_, this),
      'setOptions': goog.bind(this.handleSetOptionsMessage_, this)
  });
  guiWindow.location = this.guiAppUrl_;
};


/**
 * Stops listening to messages and closes the GuiContainer. The object shouldn't
 * be used after calling this method.
 */
bidichecker.gui.server.GuiServer.prototype.dispose = function() {
  goog.dispose(this.channel_);
  delete this.channel_;

  goog.dispose(this.guiContainer_);
  delete this.guiContainer_;
};


/**
 * Checks the document using the current options and returns the results.
 * @return {!Array.<!bidichecker.Error>} Array of error objects for all failing
 *     checks.
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.checkPageWithCurrentOptions_ =
    function() {
  var options = this.options_;
  var filters = [];
  if (options['severity'] != -1) {
    filters.push(bidichecker.FilterFactory.severityFrom(options['severity']));
  }
  return this.checker_.checkPage(options['dir'] == 'rtl', null, filters);
};


/**
 * @return {Object} The current options.
 */
bidichecker.gui.server.GuiServer.prototype.getOptions =
    function() {
  return this.options_;
};


/**
 * Sends back an "options" message with the current options.
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.handleGetOptionsMessage_ =
    function() {
  this.channel_.send('options', this.options_);
};


/**
 * Sets the current options.
 * @param {string} type The message type. Should be "setOptions".
 * @param {*} data Message data. The options object to use.
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.handleSetOptionsMessage_ =
    function(type, data) {
  this.options_ = Object(data);
};


/**
 * Checks the page for errors and sends back an "errorList" message with the
 * results.
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.handleCheckPageMessage_ =
    function() {
  var errors;
  if (this.initialErrors_) {
    errors = this.initialErrors_;
    this.initialErrors_ = null;
  } else {
    errors = this.checkPageWithCurrentOptions_();
  }
  // Convert the list of Error objects into a list of "raw" Objects consumable
  // by the send method, by serializing and then deserializing them.
  var rawObjects = goog.json.parse(bidichecker.Error.serialize(errors));
  this.channel_.send('errorList', rawObjects);
};


/**
 * Scrolls the window so a given page position is near the top of the screen.
 * Notifies the GuiContainer so it can update its own location if necessary.
 * @param {goog.math.Coordinate} coords The coordinates to scroll to.
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.scrollTo_ = function(coords) {
  var oldY = window.scrollY;
  window.scrollTo(0, coords.y - 100);
  this.guiContainer_.handleScroll(window.scrollY - oldY);
};


/**
 * @param {string} type The message type. Should be "highlightError".
 * @param {*} data Message data. Should be the deserialized error object.
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.handleHighlightErrorMessage_ =
    function(type, data) {
  var error = new bidichecker.Error(Object(data));
  var highlightableArea = error.getHighlightableArea();
  if (highlightableArea) {
    var coords = highlightableArea.highlightOnPage();
    this.scrollTo_(coords);
  }
};


/**
 * @param {string} type The message type. Should be "unhighlightError".
 * @param {*} data Message data. Should be the deserialized error object.
 * @private
 */
bidichecker.gui.server.GuiServer.prototype.handleUnhighlightErrorMessage_ =
    function(type, data) {
  var error = new bidichecker.Error(Object(data));
  var highlightableArea = error.getHighlightableArea();
  if (highlightableArea) {
    highlightableArea.unhighlightOnPage();
  }
};


