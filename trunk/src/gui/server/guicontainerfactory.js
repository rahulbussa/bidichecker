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
 * @fileoverview Factory methods for creating GuiContainers.
 */
goog.provide('bidichecker.gui.server.GuiContainerFactory');

goog.require('bidichecker.gui.server.DialogGuiContainer');
goog.require('bidichecker.gui.server.WindowGuiContainer');


/**
 * If hostWindow != null, or a new window can be created, returns a new
 * WindowGuiContainer. Otherwise, returns a new DialogGuiContainer. (Window
 * creation may fail because of popup blockers.)
 * @param {Window} hostWindow The window to be used as the container. If null, a
 *     suitable window will be created.
 * @return {!bidichecker.gui.server.GuiContainer} The created GuiContainer.
 */
bidichecker.gui.server.GuiContainerFactory.createFromWindow =
    function(hostWindow) {
  try {
    return new bidichecker.gui.server.WindowGuiContainer(hostWindow);
  } catch (e) {
    return new bidichecker.gui.server.DialogGuiContainer();
  }
};


/**
 * If opt_noPopup isn't true, and a popup window can be created, returns a new
 * WindowGuiContainer. Otherwise returns a new DialogGuiContainer.
 * @param {boolean=} opt_noPopup If given and true, don't try to create a popup
 *     window.
 * @return {!bidichecker.gui.server.GuiContainer} The created GuiContainer.
 */
bidichecker.gui.server.GuiContainerFactory.createFromScratch =
    function(opt_noPopup) {
  return opt_noPopup ?
    new bidichecker.gui.server.DialogGuiContainer() :
    bidichecker.gui.server.GuiContainerFactory.createFromWindow(null);
};
