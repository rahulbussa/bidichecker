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
 * @fileoverview Class which checks a web page for bidi-related errors.
 * This file has the top-level entry points for use as a Javascript API, along
 * with JSON-based interface functions meant to be called from an external
 * testing framework like WebDriver.
 */


goog.provide('bidichecker');
goog.provide('bidichecker.BidiChecker');
goog.provide('bidichecker.Revision');

goog.require('bidichecker.Error');
goog.require('bidichecker.Filter');
goog.require('bidichecker.FilterFactory');
goog.require('bidichecker.TextErrorScanner');
goog.require('bidichecker.gui.server.GuiContainerFactory');
goog.require('bidichecker.gui.server.GuiServer');
goog.require('goog.array');
goog.require('goog.i18n.bidi');
goog.require('goog.json');
goog.require('goog.userAgent.product');


/**
 * A class representing a revision of the BidiChecker checks. Higher revisions
 * indicate later releases, which check for more error situations.
 * @param {number} revision The revision number.
 * @constructor
 */
bidichecker.Revision = function(revision) {
  /**
   * @type {number}
   */
  this.revision = revision;
};


/**
 * Currently the default revision, for backwards-compatibility with existing
 * user tests that did not specify an explicit revision. Includes checks for
 * overall page directionality, undeclared opposite-directionality inline text,
 * and "spillover" which causes garbling of numbers following declared opposite-
 * directionality text.
 * <p>This revision is no longer recommended and will be deprecated. Tests
 * should use {@code REVISION_2}.
 * @type {!bidichecker.Revision}
 * @export
 */
bidichecker.REVISION_1 = new bidichecker.Revision(1);


/**
 * Currently the latest revision. Adds checks for undeclared opposite-
 * directionality text attributes such as input values and tooltip text.
 * @type {!bidichecker.Revision}
 * @export
 */
bidichecker.REVISION_2 = new bidichecker.Revision(2);


/**
 * Always points to the latest revision. Automated tests should avoid using
 * this, as it means that newly-added checks will cause the automated tests to
 * fail.
 * @type {!bidichecker.Revision}
 * @export
 */
bidichecker.LATEST = bidichecker.REVISION_2;




/**
 * Entry point of the GUI web application.
 * @const
 * @type {string}
 * @private
 */
bidichecker.GUI_APP_URL_ =
    'https://bidichecker.googlecode.com/svn/trunk/lib/gui-app/errorpage.html';


/**
 * Default location of the precompiled bidichecker package.
 * @const
 * @type {string}
 * @private
 */
bidichecker.PACKAGE_URL_ =
    'https://bidichecker.googlecode.com/svn/trunk/lib/bidichecker_packaged.js';


/**
 * Class which checks a web page for bidi-related errors. The preferred way to
 * invoke BidiChecker is by constructing an instance of this class. The previous
 * API, based on static methods, is no longer recommended and will be
 * deprecated.
 * @param {!bidichecker.Revision} revision Revision of BidiChecker checks to
 *     run.
 * @export
 * @constructor
 */
bidichecker.BidiChecker = function(revision) {
  /**
   * @type {!bidichecker.Revision}
   * @private
   */
  this.revision_ = revision;

  /**
   * The errors reported by the last call to {@code checkPage()}.
   * @type {!Array.<!bidichecker.Error>}
   * @private
   */
  this.errors_ = [];

};


/**
 * A static instance of BidiChecker, for use by an external interface.
 * @type {bidichecker.BidiChecker}
 * @export
 */
bidichecker.instance = null;


/**
 * Root path for the GUI application.
 * @type {string}
 * @private
 */
bidichecker.BidiChecker.prototype.guiAppUrl_ = bidichecker.GUI_APP_URL_;


/**
 * Checks the contents of the current web page, including all nested frames, for
 * bidi-related errors. If {@code opt_element} is specified, checks only within
 * the given element of the DOM (including any nested frames).
 * @param {boolean} shouldBeRtl Is the root expected to be right-to-left?
 * @param {Element=} opt_element The root element of the DOM subtree to be
 *     checked; if null, checks the entire current web page.
 * @param {Array.<!bidichecker.Filter>=} opt_filters Error suppression filters.
 * @return {!Array.<!bidichecker.Error>} Array of error objects for all failing
 *     checks.
 * @export
 */
bidichecker.BidiChecker.prototype.checkPage = function(shouldBeRtl, opt_element,
    opt_filters) {
  var expectedDir =
      shouldBeRtl ? goog.i18n.bidi.Dir.RTL : goog.i18n.bidi.Dir.LTR;
  // {@top.document.body} always finds the top level of the current page, even
  // if we started within a frame.
  var nonNullElement =
      (/** @type {!Element} */ opt_element || top.document.body);
  var filters = opt_filters || [];

  bidichecker.Error.clearHighlightableAreas();
  var scanner =
      new bidichecker.TextErrorScanner(this.revision_.revision, filters);
  scanner.scan(nonNullElement, expectedDir);
  this.errors_ = scanner.getErrors();
  return goog.array.clone(this.errors_);
};


/**
 * JSON interface to {@code checkPage}.
 * @param {boolean} shouldBeRtl Is the element/page expected to be
 *     right-to-left?
 * @param {Element} element The root element of the DOM subtree to be checked;
 *     if null, checks the entire current web page.
 * @param {string} filtersJson Error suppression filters in a JSON string,
 *     representing a (possibly-empty) array of filter objects.
 * @return {string} Array of {@code bidichecker.Error} objects for all failing
 *     checks, in JSON format. If no errors were found, returns an empty array
 *     ("[]").
 * @export
 */
bidichecker.BidiChecker.prototype.checkPageToJson = function(shouldBeRtl,
    element, filtersJson) {
  var filters = bidichecker.FilterFactory.readFiltersFromJson(filtersJson);
  filters = filters || [];
  var errors = this.checkPage(shouldBeRtl, element, filters);
  return bidichecker.Error.serialize(errors);
};


/**
 * Sets the location of the GUI files.
 * @param {string} guiAppUrl Location of the GUI files.
 * @export
 */
bidichecker.BidiChecker.prototype.setGuiAppUrl = function(guiAppUrl) {
  this.guiAppUrl_ = guiAppUrl;
};


/**
 * Runs the interactive visual error browsing GUI, displaying the errors
 * reported by the last call to {@code checkPage()}. Calling {@code runGui()}
 * before {@code checkPage()} is not supported (and is a no-op). If a GUI opened
 * by any prior BidiChecker call in this window is still open, it will be closed
 * and then re-opened.
 * On IE versions 8 and above, the GUI will always be displayed in an in-page
 * dialog box, regardless of the value of opt_noPopup.
 * On earlier versions of IE, the GUI will not be displayed. An error message
 * will be displayed instead.
 * @param {boolean=} opt_noPopup Disables opening the error browser in a popup
 *     window.
 * @export
 */
bidichecker.BidiChecker.prototype.runGui = function(opt_noPopup) {
  if (this.errors_.length == 0) {
    return;
  }
  this.runGuiWithErrors_(this.errors_, opt_noPopup);
};


/**
 * Runs the interactive visual error browsing GUI, displaying the given errors.
 * If a GUI opened by any prior BidiChecker call in this window is still open,
 * it will be closed and then re-opened.
 * On IE versions 8 and above, the GUI will always be displayed in an in-page
 * dialog box, regardless of the value of opt_noPopup.
 * On earlier versions of IE, the GUI will not be displayed. An error message
 * will be displayed instead.
 * @param {!Array.<!bidichecker.Error>} errors Array of error objects to
 *     display.
 * @param {boolean=} opt_noPopup Disables opening the error browser in a popup
 *     window.
 * @private
 */
bidichecker.BidiChecker.prototype.runGuiWithErrors_ = function(errors,
    opt_noPopup) {
  if (goog.userAgent.IE) {
    if (goog.userAgent.isVersion('8')) {
      // IE version 8 and up, force dialog to be used.
      opt_noPopup = true;
    } else {
      // IE before version 8, display error and quit.
      var guiContainer =
          bidichecker.gui.server.GuiContainerFactory.createFromScratch(true);
      var msg = 'Sorry, bidichecker GUI is not supported in Internet ' +
          'Explorer before version 8.';
      guiContainer.getContentWindow().document.write(msg);
      return;
    }
  }

  var guiContainer =
      bidichecker.gui.server.GuiContainerFactory.createFromScratch(opt_noPopup);
  var server = new bidichecker.gui.server.GuiServer(this, {}, guiContainer,
      this.guiAppUrl_, errors);
  // This disposes of the last GuiServer created by BidiChecker for this window,
  // which disposes of the GuiContainer created for it, which closes the GUI.
  bidichecker.gui.server.GuiServer.startServer(server);
};


/**
 * Runs the bookmarklet GUI with a given set of initial options. If a GUI opened
 * by any prior BidiChecker call in this window is still open, it will be closed
 * and then re-opened.
 * On IE the given window is closed, and the GUI is opened in an in-page dialog.
 * (This is relevant only for IE versions 9 and up, as the bookmarklet doesn't
 * work on earlier versions of IE, due to URL length and other restrictions).
 * @param {Object.<string, Object>} options The initial options.
 *     Options are specified as an object with the following (optional) keys:
 *     <ul>
 *     <li>dir -- string, "rtl" or "ltr" (the default). The expected page
 *     directionality.
 *     <li>severity -- The severity level from which to suppress error messages,
 *     or -1 (for no severity filtering). Default 4.
 *     </ul>
 * @param {Window} hostWindow The underlying browser window object
 *     to be used by the GUI, as returned by window.open, or null to have the
 *     function open a new window itself. If non-null, the window should be
 *     empty. Do not pass null when calling this function in an onload handler
 *     because pop-up blockers will not let it open a window.
 * @param {string=} opt_guiAppUrl Location of the GUI files.
 * @export
 */
bidichecker.runBookmarkletGui = function(options, hostWindow, opt_guiAppUrl) {
  var checker = new bidichecker.BidiChecker(bidichecker.LATEST);
  var guiContainer;
  if (goog.userAgent.IE) {
    if (hostWindow) {
      hostWindow.close();
    }
    guiContainer =
        bidichecker.gui.server.GuiContainerFactory.createFromScratch(true);
  } else {
    guiContainer =
        bidichecker.gui.server.GuiContainerFactory.createFromWindow(hostWindow);
  }
  var server = new bidichecker.gui.server.GuiServer(checker, options,
      guiContainer, opt_guiAppUrl || bidichecker.GUI_APP_URL_);
  bidichecker.gui.server.GuiServer.startServer(server);
};


/**
 * Generates a BidiChecker bookmarklet. This is a javascript: url that loads the
 * BidiChecker package and activates the options page.
 * @param {!Object.<string, !Object>} options The options that the options page
 *     will be initially populated with. See OptionsPage constructor
 *     documentation for more information.
 * @param {string=} opt_scriptUrl Location of the BidiChecker package. Used to
 *     install the GUI server. Must not include characters that have special
 *     meaning inside JavaScript strings.
 * @param {string=} opt_guiAppUrl Location of the GUI application. Must not
 *     include characters that have special meaning inside JavaScript strings.
 * @return {string} The generated link.
 * @export
 */
bidichecker.generateBookmarklet = function(options, opt_scriptUrl,
    opt_guiAppUrl) {
  var scriptUrl = opt_scriptUrl || bidichecker.PACKAGE_URL_;
  var guiAppUrl = opt_guiAppUrl || bidichecker.GUI_APP_URL_;

  var template = 'javascript:' +
    '(function() {' +
      'function run() {' +
        'bidichecker.runBookmarkletGui(%OPTIONS%, ' +
            'g_bidicheckerBookmarkletGuiWnd, "%APPURL%");' +
      '}' +
      // The window object for the last opened window. Make sure the variable is
      // defined.
      'if (typeof g_bidicheckerBookmarkletGuiWnd == "undefined") {' +
        'g_bidicheckerBookmarkletGuiWnd = null;' +
      '}' +
      'if (g_bidicheckerBookmarkletGuiWnd &&' +
          '!g_bidicheckerBookmarkletGuiWnd.closed) {' +
        // If the window is already open, there's nothing more for us to do.
        'g_bidicheckerBookmarkletGuiWnd.focus();' +
      '} else {' +
        // Open a new window. Must be done as an immediate result of the
        // bookmarklet being activated, not in the onload event; otherwise it
        // may be blocked by the popup blocker.
        'g_bidicheckerBookmarkletGuiWnd = window.open("about:blank", ' +
          '"_blank", "width=1,height=1,resizable=yes,scrollbars=yes");' +
        // ID of the element used to hold the script.
        'var scriptElemId = "_bidichecker_bookmarklet";' +
        // Load the script if we haven't done so already.
        'if (document.getElementById(scriptElemId)) {' +
          // Script element already exists. It doesn't mean that the script has
          // been loaded yet, though, so check that bidichecker exists before
          // proceeding. (We could probably just go ahead without checking, as
          // normally JavaScript errors are silently ignored, but the page may
          // have installed an error handler.)
          'if (window.bidichecker) {' +
            'run();' +
          '}' +
        '} else {' +
          // Add script to document and call it when it's loaded.
          'var elem = document.createElement("script");' +
          'elem.src = "%SCRIPTURL%";' +
          'elem.onload = run;' +
          'elem.id = scriptElemId;' +
          'document.getElementsByTagName("head")[0].appendChild(elem);' +
        '}' +
      '}' +
    '})()';

  // Substitute actual values in template. "$" is a meta character in the
  // replace() method, so we need to escape it.
  var optionsStr = goog.json.serialize(options).replace(/\$/g, '$$$$');
  return template.replace('%SCRIPTURL%', scriptUrl)
      .replace('%APPURL%', guiAppUrl)
      .replace('%OPTIONS%', optionsStr);
};


/**
 * Checks the contents of the current web page, including all nested frames, for
 * bidi-related errors. If {@code opt_element} is specified, checks only within
 * the given element of the DOM (including any nested frames).
 * <p>This used to be the main entry point for the Javascript API. It is now
 * deprecated, and is here only for compatibility with any bookmarklets created
 * by users before the class-based API was introduced. All other code should
 * instead construct an instance of {@code bidichecker.BidiChecker} and call its
 * {@code checkPage()} instance method.
 * @param {boolean} shouldBeRtl Is the root expected to be right-to-left?
 * @param {Element=} opt_element The root element of the DOM subtree to be
 *     checked; if null, checks the entire current web page.
 * @param {Array.<!bidichecker.Filter>=} opt_filters Error suppression filters.
 * @return {!Array.<!bidichecker.Error>} Array of error objects for all failing
 *     checks.
 * @export
 * @deprecated Use the checkPage() instance method of the BidiChecker class.
 */
bidichecker.checkPage = function(shouldBeRtl, opt_element, opt_filters) {
  var checker = new bidichecker.BidiChecker(bidichecker.LATEST);
  return checker.checkPage(shouldBeRtl, opt_element, opt_filters);
};


/**
 * Runs the interactive visual error browsing GUI. If a GUI opened by any prior
 * BidiChecker call in this window is still open, it will be closed and then
 * re-opened.
 * <p>This entry point is deprecated, and is here only for compatibility with
 * any bookmarklets created by users before the class-based API was introduced.
 * All other code should instead construct an instance of
 * {@code bidichecker.BidiChecker} and call its {@code checkPage()} and
 * {@code runGui()} instance methods.
 * @param {!Array.<!bidichecker.Error>} errors An array of errors to be
 *     displayed.
 * @param {boolean=} opt_noPopup Disables opening the error browser in a popup
 *     window.
 * @param {string=} opt_guiAppUrl Location of the GUI files.
 * @export
 * @deprecated Use the runGui() instance method of the BidiChecker class.
 */
bidichecker.runGui = function(errors, opt_noPopup, opt_guiAppUrl) {
  var checker = new bidichecker.BidiChecker(bidichecker.LATEST);
  if (opt_guiAppUrl) {
    checker.setGuiAppUrl(opt_guiAppUrl);
  }
  checker.runGuiWithErrors_(errors, opt_noPopup);
};
