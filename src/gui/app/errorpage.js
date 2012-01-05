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
 * @fileoverview Code for the error browser, a GUI page which displays the list
 *     of BIDI errors.
 */

goog.provide('bidichecker.gui.app.ErrorPage');

goog.require('bidichecker.Error');
goog.require('bidichecker.gui.common.CommChannel');
goog.require('goog.dom');
goog.require('goog.dom.Range');
goog.require('goog.events');
goog.require('goog.events.EventType');


/**
 * The error browser. The constructor sets up event listeners on the GUI page,
 * and triggers checking of the subject page.
 * @constructor
 * @export
 */
bidichecker.gui.app.ErrorPage = function() {
  /**
   * The errors to display.
   * @type {!Array.<!bidichecker.Error>}
   * @private
   */
  this.errors_ = [];

  this.errorTextElem_ = goog.dom.getElement('error-text');

  goog.events.listen(window, goog.events.EventType.UNLOAD, this.handleClosing_,
      false, this);

  // Set up communication channel with the page being checked and send a
  // "checkPage" message. The page is expected to reply with an "errorList"
  // message. Most of the error page setup is done while handling the errorList
  // message.
  this.channel_ = new bidichecker.gui.common.CommChannel(
      window.opener || window.parent, {
        'errorList': goog.bind(this.handleErrorListMessage_, this)
      });
  this.channel_.send('checkPage');
};


/**
 * Height of the errors table.
 * @private
 */
bidichecker.gui.app.ErrorPage.TABLE_HEIGHT_ = '300px';


/**
 * The message channel used to communicate with the subject site.
 * @type {bidichecker.gui.common.CommChannel}
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.channel_;


/**
 * Currently displayed error.
 * @type {bidichecker.Error}
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.currentError_ = null;


/**
 * Element representing the error message display field.
 * @type {Element}
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.errorTextElem_;


/**
 * Handles a window closing event.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.handleClosing_ = function() {
  if (this.errors_.length > 0) {
    this.unhighlightCurrentError_();
  }
};


/**
 * Select the table contents for easy copy-and-paste.
 * @param {goog.events.Event} event The event.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.handleSelectTableClick_ =
    function(event) {
  var range = goog.dom.Range.createFromNodeContents(this.tableContainer_);
  range.select();

  // Don't follow the link that the user clicked.
  event.preventDefault();
};


/**
 * Handles the "errorList" message from the subject site.
 * @param {string} type The message type. Assumed to be "errorList".
 * @param {*} data The message data. Should be an array of "raw" JSON objects
 *     resulting from serialization of Error objects.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.handleErrorListMessage_ = function(type,
    data) {
  if (!(data instanceof Array)) {
    throw 'Invalid data type in errorList message; expected Array.';
  }
  var errors = data.map(function(obj) { return new bidichecker.Error(obj); });
  this.setErrorList_(errors);
};


/**
 * Creates an object to be given as a cell in the error table. The cell supports
 * case-insensitive sorting, and clipping of long lines. This function is useful
 * only for columns of type 'string'.
 * @param {?string} text Text content of the cell. If null is given, the
 *     function will simply return null.
 * @param {string=} opt_width CSS width specifier for the cell.
 * @return {Object} The cell object.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.makeTableCell_ = function(text,
    opt_width) {
  if (!text) {
    return null;
  }

  var style = opt_width ? 'width: ' + opt_width : '';
  var formatted = '<span class="table-cell-ellipsize" style="' + style + '">' +
      goog.string.htmlEscape(text) + '</span>';
  return {
    // The sort key. Lowercased to make sort case insensitive.
    'v': text.toLowerCase(),
    // Formatted HTML to display to the user.
    'f': formatted
  };
};


/**
 * Setups the UI when there are errors to display.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.setupErrorUi_ = function() {
  var data = new google.visualization.DataTable();
  data.addColumn('number', '#');  // Error number.
  data.addColumn('string', 'Type');
  data.addColumn('number', 'Sev');
  data.addColumn('string', 'Location');
  data.addColumn('string', 'Text');

  for (var i = 0; i < this.errors_.length; i++) {
    var error = this.errors_[i];

    data.addRow([
        i + 1,
        this.makeTableCell_(error.getType()),
        error.getSeverity(),
        this.makeTableCell_(error.getLocationDescription(), '280px'),
        this.makeTableCell_(error.getAtText(), '150px')
        ]);
  }

  this.tableContainer_ = goog.dom.getElement('table-container');
  this.table_ = new google.visualization.Table(this.tableContainer_);
  this.table_.draw(data, {
    'height': bidichecker.gui.app.ErrorPage.TABLE_HEIGHT_,
    'allowHtml': true
  });
  google.visualization.events.addListener(this.table_, 'select',
      goog.bind(this.handleTableSelect_, this));

  var errorCountField = goog.dom.getElement('error-count');
  goog.dom.setTextContent(errorCountField, this.errors_.length + '');

  this.selectTableRow_(0);
  this.changeCurrentError_(this.errors_[0]);

  var selectTableControl = goog.dom.getElement('select-table');
  goog.events.listen(selectTableControl, goog.events.EventType.CLICK,
      this.handleSelectTableClick_, false, this);
};

/**
 * Makes the given error list the current one, and update the page based on it.
 * @param {!Array.<!bidichecker.Error>} errors The error list.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.setErrorList_ = function(errors) {
  this.errors_ = errors;

  var displayErrors = this.errors_.length > 0;
  var errorContainers = document.getElementsByClassName('show-on-errors');
  for (var i = 0; i < errorContainers.length; i++) {
    goog.style.showElement(errorContainers[i], displayErrors);
  }
  goog.style.showElement(goog.dom.getElement('no-errors-container'),
      !displayErrors);
  if (displayErrors) {
    this.setupErrorUi_();
  }
};


/**
 * Makes the table row for the given error the only selected row in the table.
 * @param {number} errorNum Index of the error to select.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.selectTableRow_ =
    function(errorNum) {
  this.table_.setSelection([{'row': errorNum, 'column': null}]);
};


/**
 * Changes the currently-displayed error.
 * @param {!bidichecker.Error} error The new error to display.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.changeCurrentError_ = function(error) {
  this.unhighlightCurrentError_();
  this.currentError_ = error;
  this.highlightCurrentError_();
};


/**
 * Called when the table selection is changed. Set the current error to a
 * selected row, if any.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.handleTableSelect_ = function() {
  var selection = this.table_.getSelection();
  if (selection.length > 0) {
    var errorNum = selection[0]['row'];  // Anti-obfuscation bracket notation.
    this.changeCurrentError_(this.errors_[errorNum]);
  }
};


/**
 * Highlight current error.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.highlightCurrentError_ = function() {
  if (this.currentError_) {
    this.channel_.send('highlightError', this.currentError_);
    goog.dom.setTextContent(goog.dom.getElement('error-text'),
        this.currentError_.toString());
  }
};


/**
 * Clears highlighting from the current error.
 * @private
 */
bidichecker.gui.app.ErrorPage.prototype.unhighlightCurrentError_ = function() {
  if (this.currentError_) {
    this.channel_.send('unhighlightError', this.currentError_);
  }
};
