// Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview A GuiContainer for in-page dialog.
 */
goog.provide('bidichecker.gui.server.DialogGuiContainer');

goog.require('bidichecker.gui.server.GuiContainer');
goog.require('goog.style');
goog.require('goog.ui.Dialog');


/**
 * A dialog box used to render the GUI within the page being checked, rather
 * than in a popup window. The dialog box contains an iframe element which
 * contains the GUI.
 * @constructor
 * @extends {bidichecker.gui.server.GuiContainer}
 */
bidichecker.gui.server.DialogGuiContainer = function() {
  goog.base(this);

  var dialog = new goog.ui.Dialog('bidichecker-dialog');
  dialog.setModal(false);  // Underlying page remains accessible.
  dialog.setVisible(true);
  var dialogElement = dialog.getElement();

  // Prevent page elements from leaking through the dialog box.
  dialogElement.style.zIndex = 10000;

  // Set up the "X" button.
  // TODO(user): Use a real image instead of a character.
  dialog.getTitleCloseElement().innerHTML = '&times;';

  // Set the disposeOnHide flag, so the dialog will really be "closed" when
  // the close button is clicked, not merely hidden.
  dialog.setDisposeOnHide(true);

  var iframe = goog.dom.createElement('iframe');

  var dialogContent = dialog.getContentElement();
  dialogContent.appendChild(iframe);

  this.setContentWindow(iframe.contentWindow);

  /**
   * The stylesheet used to style the dialog.
   * @type {Element|StyleSheet}
   * @private
   */
  this.styleSheet_ = goog.style.installStyles(
      bidichecker.gui.server.DialogGuiContainer.DIALOG_STYLES, dialogContent);

  // Resize the content element so it will fill the vertical dialog space not
  // taken by other elements.
  // Note that this calculation doesn't take into account the content element's
  // padding, border, or margins. It assumes there are none.
  var dialogInnerHeight = goog.style.getContentBoxSize(dialogElement).height;
  var contentHeight = dialogInnerHeight - dialog.getTitleElement().offsetHeight;
  goog.style.setHeight(dialogContent, contentHeight);

  // Center dialog in the viewport.
  dialog.reposition();

  /**
   * The underlying Dialog object.
   * @type {!goog.ui.Dialog}
   * @private
   */
  this.dialog_ = dialog;
};
goog.inherits(bidichecker.gui.server.DialogGuiContainer,
    bidichecker.gui.server.GuiContainer);


/**
 * Style definitions for the dialog box.
 * @const
 * @type {string}
 */
bidichecker.gui.server.DialogGuiContainer.DIALOG_STYLES =
    '.bidichecker-dialog-bg { position: absolute; top: 0; left: 0; }' +

    '.bidichecker-dialog {' +
    'font-family: arial, sans-serif' +
    '}' +

    '.bidichecker-dialog-buttons {' +
      'display: none;' +
    '}' +

    '.bidichecker-dialog-title-close {' +
      'position: absolute;' +
      'right: 0;' +
      'padding-right: 5px;' +
      'padding-left: 5px;' +
    '}' +

    '.bidichecker-dialog-title-close:hover {' +
      'background-color: #fee;' +
    '}' +

    '.bidichecker-dialog iframe {' +
      'border: 0;' +
      'height: 100%;' +
      'width: 100%;' +
      'background: white;' +
    '}' +

    '.bidichecker-dialog { position: absolute;' +
    ' background-color: #fcb; border: 1px solid #000; ' +
    'width: 800px; height: 600px; color: #000; ' +
    'outline: none; direction: ltr }' +

    '.bidichecker-dialog-title { position: relative; ' +
    'padding-bottom: 5px;' +
    'height: 1em;' +
    'color: #000000;' +
    'font-size: 16px; font-weight: bold; vertical-align: middle; }' +

    '.bidichecker-dialog .bidichecker-dialog-title {' +
    'cursor: pointer; cursor: hand }' +

    '';


/** @override */
bidichecker.gui.server.DialogGuiContainer.prototype.dispose = function() {
  this.dialog_.dispose();
  goog.style.uninstallStyles(this.styleSheet_);
};


/** @override */
bidichecker.gui.server.DialogGuiContainer.prototype.handleScroll =
    function(scrollY) {
  var dialogElement = this.dialog_.getElement();
  var coords = goog.style.getPosition(dialogElement);
  goog.style.setPosition(dialogElement, coords.x, coords.y + scrollY);
};
