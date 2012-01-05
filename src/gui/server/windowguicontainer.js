// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview A GuiContainer for popup windows.
 */
goog.provide('bidichecker.gui.server.WindowGuiContainer');

goog.require('bidichecker.gui.server.GuiContainer');


/**
 * A popup window which displays the BidiChecker GUI.
 * @param {Window} hostWindow The window to be used as the container. If null, a
 *     suitable window will be created.
 * @constructor
 * @extends {bidichecker.gui.server.GuiContainer}
 * @throws {Error} If null was given and the window couldn't be created.
 */
bidichecker.gui.server.WindowGuiContainer = function(hostWindow) {
  goog.base(this);

  if (!hostWindow) {
    hostWindow =
        bidichecker.gui.server.WindowGuiContainer.createBrowserWindow_();
    if (!hostWindow) {
      throw Error('can\'t create window');
    }
  }

  bidichecker.gui.server.WindowGuiContainer.adjustPopup_(hostWindow);
  this.setContentWindow(hostWindow);
};
goog.inherits(bidichecker.gui.server.WindowGuiContainer,
    bidichecker.gui.server.GuiContainer);


/**
 * Width to which the popup window will be resized.
 * @const
 * @private
 */
bidichecker.gui.server.WindowGuiContainer.WINDOW_WIDTH_ = 800;


/**
 * Height to which the popup window will be resized.
 * @const
 * @private
 */
bidichecker.gui.server.WindowGuiContainer.WINDOW_HEIGHT_ = 600;


/**
 * Adjusts the popup window's appearance, including resizing it to the
 * appropriate size. It is our desire to relieve the bookmarklet (which must
 * create the host window itself in order to bypass popup blockers) from having
 * to do the adjusting correctly itself.
 * @param {!Window} hostWindow The window to adjust.
 * @private
 */
bidichecker.gui.server.WindowGuiContainer.adjustPopup_ = function(hostWindow) {
  // Call resizeTo inside a setTimeout, to avoid a Chrome bug where, if resizeTo
  // was called too soon the window was downsized into nothingness.
  setTimeout(function() {
    hostWindow.resizeTo(
        bidichecker.gui.server.WindowGuiContainer.WINDOW_WIDTH_,
        bidichecker.gui.server.WindowGuiContainer.WINDOW_HEIGHT_);
  }, 1);
};


/**
 * Attempts to create a blank browser window with the right settings for the
 * GUI.
 * @return {Window} Handle to the newly created window, or null if creation
 *     blocked (e.g. because of popup blockers).
 * @private
 */
bidichecker.gui.server.WindowGuiContainer.createBrowserWindow_ = function() {
  var features =
      'width=' + bidichecker.gui.server.WindowGuiContainer.WINDOW_WIDTH_ +
      ',height=' + bidichecker.gui.server.WindowGuiContainer.WINDOW_HEIGHT_ +
      ',menubar=no,toolbar=no,location=no';

  return window.open('about:blank', '_blank', features);
};


/** @override */
bidichecker.gui.server.WindowGuiContainer.prototype.dispose = function() {
  try {
    this.getContentWindow().close();
  } catch (e) {
    // The close() call may throw an exception if the user has already closed
    // the window manually. Ignore this exception.
  }
};
