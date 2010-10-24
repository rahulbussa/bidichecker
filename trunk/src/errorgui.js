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
 * @fileoverview Browser-based UI for viewing error locations.
 */


goog.provide('bidichecker.ErrorGui');

goog.require('bidichecker.Error');
goog.require('goog.dom');
goog.require('goog.events.Event');
goog.require('goog.string');
goog.require('goog.style');
goog.require('goog.ui.Dialog');
goog.require('goog.ui.Dialog.ButtonSet');


/**
 * In-browser interactive error viewer.
 * @param {Array.<!bidichecker.Error>} errors The errors to display.
 * @constructor
 */
bidichecker.ErrorGui = function(errors) {
  /**
   * The errors to display.
   * @type {Array.<!bidichecker.Error>}
   * @private
   */
  this.errors_ = errors;

  /**
   * Currently displayed error number (indexed from 0).
   * @type {number}
   * @private
   */
  this.currentError_ = 0;

  /**
   * Element representing the dialog box.
   * @type {Element}
   * @private
   */
  this.dialogElement_ = null;

  /**
   * Element representing the error number input field.
   * @type {Element}
   * @private
   */
  this.errorNumField_ = null;

  /**
   * Element representing the error message display field.
   * @type {Element}
   * @private
   */
  this.errorTextElem_ = null;
};


/**
 * Builds and launches the error browser dialog box.
 */
bidichecker.ErrorGui.prototype.launch = function() {
  if (this.dialogElement_ ||  // The UI has already been launched.
      this.errors_.length == 0) {  // Nothing to display.
    return;
  }
  this.createDialogBox_();
  this.highlightCurrentError_();
  this.listen_();
};


/**
 * Style definitions for the dialog box elements.
 * @const
 * @type {string}
 * @private
 */
bidichecker.ErrorGui.DIALOG_STYLES_ =
    '.bidichecker-dialog-bg { position: absolute; top: 0; left: 0; }' +

    '.bidichecker-dialog { position: absolute; padding: 5px;' +
    ' background-color: #fcb; border: 1px solid #000; ' +
    'font-family: arial, sans-serif; width: 475px; color: #000; ' +
    'outline: none; direction: ltr }' +

    '.bidichecker-dialog a, .bidichecker-dialog a:link,' +
    '.bidichecker-dialog a:visited  { color: #0066cc; cursor: pointer; }' +

    '.bidichecker-dialog-title { position: relative; ' +
    'background-color: #f9efeb; color: #000000; padding: 10px 15px;' +
    ' font-size: 16px; font-weight: bold; vertical-align: middle; ' +
    'cursor: pointer; cursor: hand }' +

    '.bidichecker-dialog-content { padding: 15px; font-size: 90%; ' +
    'background-color: #fff }' +

    '.bidichecker-dialog-buttons { padding: 0 15px 15px; ' +
    'background-color: #fff }' +

    '.bidichecker-dialog-error-text { font-weight: bold; font-size: 125%; ' +
    'color: #f00; height: 80px; overflow: auto; border: 1px dotted #f00 }';


/**
 * HTML content for the dialog box.
 * TODO(user): Use a message catalog to support internationalization of the
 * dialog box contents.
 * @const
 * @type {string}
 * @private
 */
bidichecker.ErrorGui.DIALOG_CONTENT_ =
    // A field for displaying the text of the error message.
    '<div id="bidichecker-dialog-error-text" ' +
    'class="bidichecker-dialog-error-text"> </div>' +

    // An input field for displaying and changing the current error number.
    '<p>Error <input name="current" id="bidichecker-dialog-error-num" ' +
    'type="text" size="3" value="1" /> of ' +

    // A field for displaying the total number of errors.
    '<span id="bidichecker-dialog-error-count"></span></p>' +

    '<p style="font-size:75%">Drag this box if it conceals a part of the ' +
    'page you need.</p>';


/**
 * Assembles the error browser dialog box.
 * @private
 */
bidichecker.ErrorGui.prototype.createDialogBox_ = function() {
  /**
   * @type {goog.ui.Dialog}
   * @private
   */
  this.dialog_ = new goog.ui.Dialog('bidichecker-dialog');
  this.dialog_.setTitle('BidiChecker error browser');
  this.dialog_.setModal(false);  // Underlying page remains accessible.

  var buttonset = new goog.ui.Dialog.ButtonSet();
  buttonset.set('prev', '< Prev');
  buttonset.set('next', 'Next >');
  this.dialog_.setButtonSet(buttonset);

  this.dialog_.setContent(bidichecker.ErrorGui.DIALOG_CONTENT_);
  this.dialog_.setVisible(true);

  this.dialogElement_ = this.dialog_.getElement();
  goog.style.installStyles(bidichecker.ErrorGui.DIALOG_STYLES_,
                           this.dialogElement_);

  // Prevent page elements from leaking through the dialog box.
  this.dialogElement_.style.zIndex = 10000;

  var dom = this.dialog_.getDomHelper();
  var errorCountField = dom.getElement('bidichecker-dialog-error-count');
  goog.dom.setTextContent(errorCountField, this.errors_.length + '');

  this.errorNumField_ = dom.getElement('bidichecker-dialog-error-num');
  this.errorTextElem_ = dom.getElement('bidichecker-dialog-error-text');

  // Make sure the box is centered on the page.
  this.dialog_.reposition();

  // TODO(user): The dialog box doesn't function correctly on YouTube pages.
  // Figure out why and fix it.
};


/**
 * Starts listening for user events:  button presses and changes to the error
 * number input field.
 * @private
 */
bidichecker.ErrorGui.prototype.listen_ = function() {
  // Listen for button presses.
  goog.events.listen(this.dialog_, goog.ui.Dialog.EventType.SELECT,
      this.handleButtonEvent_, false, this);

  // Listen for changes to the error number input field.
  this.errorNumField_.onchange =
      goog.bind(this.handleErrorNumFieldChange_, this);
};


/**
 * Handles changes to the current error number input field.
 * @private
 */
bidichecker.ErrorGui.prototype.handleErrorNumFieldChange_ = function() {
  var newError = goog.string.isNumeric(this.errorNumField_.value) ?
      goog.string.toNumber(this.errorNumField_.value) - 1 : -1;
  if (newError >= 0 && newError < this.errors_.length &&
      newError != this.currentError_) {
    this.changeCurrentError_(newError);
  } else {
    // If the input value was invalid, reset the field contents to the current
    // error.
    this.setErrorNumField_();
  }
};


/**
 * Handles button presses.
 * @param {!goog.events.Event} event A button press event.
 * @return {boolean} Whether the dialog box should be dismissed.
 * @private
 */
bidichecker.ErrorGui.prototype.handleButtonEvent_ = function(event) {
  var newError;
  if (event.key == 'next') {
    // Advance to next error, wrapping around the end.
    newError = this.currentError_ == this.errors_.length - 1 ? 0 :
        this.currentError_ + 1;
  } else {
    // Revert to previous error, wrapping around the start.
    newError = this.currentError_ == 0 ? this.errors_.length - 1 :
        this.currentError_ - 1;
  }
  this.changeCurrentError_(newError);
  return false;
};


/**
 * Displays the current error and scrolls the window to show its position.
 * @private
 */
bidichecker.ErrorGui.prototype.highlightCurrentError_ = function() {
  var error = this.errors_[this.currentError_];
  var highlightableArea = error.getHighlightableArea();
  if (highlightableArea) {
    var coords = highlightableArea.highlightOnPage();
    this.scrollTo_(coords);
  }
  goog.dom.setTextContent(this.errorTextElem_, error.toString());
};


/**
 * Clears highlighting from the current error.
 * @private
 */
bidichecker.ErrorGui.prototype.unhighlightCurrentError_ = function() {
  var error = this.errors_[this.currentError_];
  var highlightableArea = error.getHighlightableArea();
  if (highlightableArea) {
    highlightableArea.unhighlightOnPage();
  }
};


/**
 * Changes the currently-displayed error.
 * @param {number} newErrorNumber The number of the new error to display.
 * @private
 */
bidichecker.ErrorGui.prototype.changeCurrentError_ = function(newErrorNumber) {
  this.unhighlightCurrentError_();
  this.currentError_ = newErrorNumber;
  this.setErrorNumField_();
  this.highlightCurrentError_();
};


/**
 * Sets the error number field to display the current error number.
 * @private
 */
bidichecker.ErrorGui.prototype.setErrorNumField_ = function() {
  this.errorNumField_.value = this.currentError_ + 1;
};


/**
 * Scrolls the window so a given page position is near the top of the screen.
 * Also scrolls the dialog box by the opposite amount to keep it in the same
 * place in the viewport.
 * TODO(user): Make this do the right thing for frames and other scrollable
 * elements.
 * @param {goog.math.Coordinate} coords The coordinates to scroll to.
 * @private
 */
bidichecker.ErrorGui.prototype.scrollTo_ = function(coords) {
  var oldY = window.scrollY;
  window.scrollTo(0, coords.y - 100);
  this.scrollDialogBoxBy_(window.scrollY - oldY);
};


/**
 * Moves the dialog box by a given vertical amount.
 * @param {number} scrollY The distance to move it, in pixels.
 * @private
 */
bidichecker.ErrorGui.prototype.scrollDialogBoxBy_ = function(scrollY) {
  var coords = goog.style.getPosition(this.dialogElement_);
  goog.style.setPosition(this.dialogElement_, coords.x, coords.y + scrollY);
};
