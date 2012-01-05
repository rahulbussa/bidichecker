// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview The GuiContainer abstract class.
 */
goog.provide('bidichecker.gui.server.GuiContainer');



/**
 * An abstract class representing an object which can display the BidiChecker
 * GUI web application and communicate with it. The web application is displayed
 * in a browser window object called the "content window". The GuiContainer is
 * responsible for managing the window chrome, e.g. disposing of it.
 * @constructor
 */
bidichecker.gui.server.GuiContainer = function() {
};


/**
 * The content window object where the GUI resides.
 * @type {Window}
 * @private
 */
bidichecker.gui.server.GuiContainer.prototype.contentWindow_;


/**
 * @param {Window} contentWindow The content window object.
 * @protected
 */
bidichecker.gui.server.GuiContainer.prototype.setContentWindow =
    function(contentWindow) {
  this.contentWindow_ = contentWindow;
};


/**
 * @return {Window} The content window object.
 */
bidichecker.gui.server.GuiContainer.prototype.getContentWindow = function() {
  return this.contentWindow_;
};


/**
 * Frees the resources taken by the object, closing it if necessary.
 */
bidichecker.gui.server.GuiContainer.prototype.dispose = goog.abstractMethod;


/**
 * Notifies the object that the checked document has scrolled to a given
 * position. The default implementation is a no-op.
 * @param {number} scrollY The distance the window moved.
 */
bidichecker.gui.server.GuiContainer.prototype.handleScroll = function(scrollY) {
};
