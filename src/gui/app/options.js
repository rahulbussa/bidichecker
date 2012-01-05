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
 * @fileoverview The options page.
 */

goog.provide('bidichecker.gui.app.OptionsPage');

goog.require('bidichecker');
goog.require('bidichecker.gui.common.CommChannel');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');



/**
 * The options page. The constructor sets up event listeners on the page, and
 * queries the checked page for the current options.
 * @constructor
 * @export
 */
bidichecker.gui.app.OptionsPage = function() {
  this.severityField_ = goog.dom.getElement('severity');
  goog.events.listen(this.severityField_, goog.events.EventType.CHANGE,
      this.handleSeverityFieldChange_, false, this);
  goog.events.listen(document, goog.events.EventType.CHANGE,
      this.handleGeneralChange_, false, this);

  var helpButton = goog.dom.getElement('show-bookmarklet-help');
  goog.events.listen(helpButton, goog.events.EventType.CLICK,
      this.handleShowHelpClick_, false, this);

  this.bookmarklet_ = goog.dom.getElement('bookmarklet');
  goog.events.listen(this.bookmarklet_, goog.events.EventType.CLICK,
      this.handleBookmarkletClick_, false, this);

  var checkPageButton = goog.dom.getElement('run');
  goog.events.listen(checkPageButton, goog.events.EventType.CLICK,
      this.handleCheckPageButton_, false, this);

  // Set up communication channel and send a "getOptions" message. The page
  // being checked is expected to reply with an "options" message.
  var otherWindow = window.opener || window.parent;
  this.channel_ = new bidichecker.gui.common.CommChannel(otherWindow, {
        'options': goog.bind(this.handleOptionsMessage_, this)
      });
  this.channel_.send('getOptions');
};


/**
 * Get the value of the checked radio button in the given radio button group.
 * @param {goog.dom.DomHelper} domHelper DOM helper used to find the group.
 * @param {string} name The name attribute used for the group.
 * @return {?string} Value of checked radio button, or null if there's none.
 * @private
 */
bidichecker.gui.app.getRadioButtonGroupValue_ =
    function(domHelper, name) {
  var elems = domHelper.getDocument().getElementsByName(name);

  // Find the checked element and return its value.
  for (var i = 0; i < elems.length; i++) {
    var elem = elems[i];
    if (elem.checked) {
      return elem.value;
    }
  }

  // No checked element found.
  return null;
};


/**
 * Check the radio button with the given value in the given radio button group.
 * @param {goog.dom.DomHelper} domHelper DOM helper used to find the group.
 * @param {string} name The name attribute used for the group.
 * @param {string} value Check the radio button with this value.
 * @private
 */
bidichecker.gui.app.setRadioButtonGroupValue_ =
    function(domHelper, name, value) {
  var elems = domHelper.getDocument().getElementsByName(name);

  // Find the element with the given value and check it.
  var found = false;
  for (var i = 0; i < elems.length; i++) {
    var elem = elems[i];
    if (elem.value == value) {
      elem.checked = true;
      found = true;
      break;
    }
  }

  if (!found) {
    throw 'No radio button with name ' + name + ' and value ' + value;
  }
};


/**
 * The element containing the bookmarklet.
 * @type {Element}
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.bookmarklet_;


/**
 * The element showing the severity option value.
 * @type {Element}
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.severityField_;


/**
 * The message channel used to communicate with the page being checked.
 * @type {bidichecker.gui.common.CommChannel}
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.channel_;


/**
 * Sends current settings to the page being checked and then navigates to the
 * error browser. The error browser, when loaded, will trigger error checking on
 * the page.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.handleCheckPageButton_ = function() {
  this.channel_.send('setOptions', this.getOptions_());
  window.location = 'errorpage.html';
};


/**
 * Handles the "options" message from the page being checked.
 * @param {string} type The message type. Assumed to "options".
 * @param {*} data The message data. Should be an options object.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.handleOptionsMessage_ =
    function(type, data) {
  // Fill in controls based on received options.
  var options = Object(data);
  var severity = options['severity'];
  if (severity != -1) {
    this.severityField_.value = severity;
  } else {
    // Suppression by severity is disabled, but we still need a valid value to
    // appear in the text box.
    this.severityField_.value = 4;
  }
  // Save last known valid value.
  this.severityField_.validValue = this.severityField_.value;
  bidichecker.gui.app.setRadioButtonGroupValue_(
      goog.dom.getDomHelper(), 'severity-filtering',
      (severity != -1) ? 'on' : 'off');

  bidichecker.gui.app.setRadioButtonGroupValue_(
      goog.dom.getDomHelper(), 'dir', options['dir']);

  this.updateControls_();
};


/**
 * Validates changes to the current severity level option. If the change is
 * invalid it is reverted.
 * @param {goog.events.Event} event The event that triggered this handler.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.handleSeverityFieldChange_ =
    function(event) {
  var newValue = goog.string.toNumber(this.severityField_.value);
  if (1 <= newValue && newValue <= 4) {
    // Valid input. Save it in case we need to restore later.
    this.severityField_.validValue = newValue;
    this.updateControls_();
  } else {
    // Invalid input, reset the field contents to the previous value.
    this.severityField_.value = this.severityField_.validValue;
  }

  // Prevent bubbling of the event so that handleGeneralChange_ won't see this
  // change.
  event.stopPropagation();
};


/**
 * Handles changes not handled by more specific listeners.
 * Since there's no way to listen on a radio button group, we listen
 * on the whole page element.
 * @param {goog.events.Event} event The event that triggered this handler.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.handleGeneralChange_ =
    function(event) {
  this.updateControls_();
};


/**
 * Describe the bookmarklet feature to the user.
 * @param {goog.events.Event} event The event that triggered this handler.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.handleShowHelpClick_ =
    function(event) {
  var message =
    'You can add a button (a "bookmarklet") to your browser to run ' +
    'BidiChecker on any web page, using the current BidiChecker settings. ' +
    'To do this, just drag the link labeled BidiChecker to your browser\'s ' +
    'bookmarks toolbar. ' +
    'In Google Chrome, press Ctrl-Shift-B to show the bookmarks toolbar.';
  alert(message);
  event.preventDefault();
};


/**
 * Makes the browser ignore clicks on the bookmarklet link, since the user
 * probably doesn't want to activate the bookmarklet from within the
 * bookmarklet.
 * @param {goog.events.Event} event The event that triggered this handler.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.handleBookmarkletClick_ =
    function(event) {
  event.preventDefault();
};


/**
 * Updates the state of the controls using current values.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.updateControls_ = function() {
  // Enable the severity level text box iff severity filtering is on.
  var severityFiltering =
      bidichecker.gui.app.getRadioButtonGroupValue_(goog.dom.getDomHelper(),
          'severity-filtering') == 'on';
  goog.dom.getElement('severity').disabled = !severityFiltering;

  this.updateBookmarklet_();
};


/**
 * Updates the bookmarklet link with the current settings.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.updateBookmarklet_ = function() {
  var link = bidichecker.generateBookmarklet(this.getOptions_());
  this.bookmarklet_.href = link;
};


/**
 * Returns the current options.
 * @return {!Object} The current options.
 * @private
 */
bidichecker.gui.app.OptionsPage.prototype.getOptions_ = function() {
  var options = {};

  var severityFiltering =
      bidichecker.gui.app.getRadioButtonGroupValue_(goog.dom.getDomHelper(),
          'severity-filtering') == 'on';
  options.severity = severityFiltering ?
      goog.string.toNumber(this.severityField_.value) :
      -1;

  options.dir = /** @type {string} */
      bidichecker.gui.app.getRadioButtonGroupValue_(goog.dom.getDomHelper(),
          'dir');

  return options;
};
