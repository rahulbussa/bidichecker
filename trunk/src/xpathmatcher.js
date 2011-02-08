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
 * @fileoverview Matches XPath expressions in a document, caching the results.
 */


goog.provide('bidichecker.XpathMatcher');


/**
 * Matches XPath expressions, caching the results.
 * @param {string} xpath An XPath expression.
 * @constructor
 */
bidichecker.XpathMatcher = function(xpath) {
  /**
   * @type {string}
   * @private
   */
  this.xpath_ = xpath;
};


/**
 * Key used for storing XPath caches on document objects. Hopefully this will
 * not clash with keys used by other code.
 * @type {string}
 * @const
 * @private
 */
bidichecker.XpathMatcher.DOCUMENT_CACHE_KEY_ = '_bidicheckerXpathMatcherCache_';


/**
 * Initializes the XPath results cache for a given document. Must be called
 * before {@code matches()} for each document to be used.
 * @param {Document} doc The document in which XPaths are to be evaluated.
 */
bidichecker.XpathMatcher.initCache = function(doc) {
  doc[bidichecker.XpathMatcher.DOCUMENT_CACHE_KEY_] = {};
};


/**
 * Checks whether a given element matches the XPath expression.
 * @param {Element} element The element to be matched.
 * @return {boolean} Whether or not it matches the XPath expression.
 */
bidichecker.XpathMatcher.prototype.matches = function(element) {
  var xpathResult = this.evaluate_(element.ownerDocument);
  for (var i = 0; i < xpathResult.snapshotLength; ++i) {
    if (xpathResult.snapshotItem(i) == element) {
      return true;
    }
  }
  return false;
};


/**
 * Evaluates the XPath expression in a given document.
 * @param {Document} doc The document in which XPaths are to be evaluated.
 * @return {XPathResult} An unordered snapshot containing all the nodes in the
 *     document which match the XPath expression.
 * @private
 */
bidichecker.XpathMatcher.prototype.evaluate_ = function(doc) {
  var xpathResult = this.getCachedResults_(doc);
  if (!xpathResult) {
    try {
      // IE does not support document.evaluate (which evaluates XPaths).
      // TODO(user): Add support for IE by using an external XPath library.
      if (!doc.evaluate) {
        throw 'XPath not supported by this browser';
      }
      xpathResult = doc.evaluate(this.xpath_, doc, null,
          XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      this.setCachedResults_(doc, xpathResult);
    } catch (except) {
      throw 'Error evaluating XPath expression ' + this.xpath_ + ': ' + except;
    }
  }
  return xpathResult;
};


/**
 * Retrieves cached results of evaluating the XPath expression in a given
 * document, if available. Assumes {@code initCache} has already been called.
 * @param {Document} doc The document in which XPaths are to be evaluated and
 *     their results cached.
 * @return {XPathResult} An unordered snapshot containing all the nodes in the
 *     document which match the XPath expression. If no cached results are
 *     available, returns null.
 * @private
 */
bidichecker.XpathMatcher.prototype.getCachedResults_ = function(doc) {
  return doc[bidichecker.XpathMatcher.DOCUMENT_CACHE_KEY_][this.xpath_];
};


/**
 * Caches results of evaluating the XPath expression in a given document.
 * @param {Document} doc The document in which XPath results are to be cached.
 * @param {XPathResult} xpathResult An unordered snapshot containing all the
 *     nodes in the document which match the XPath expression.
 * @private
 */
bidichecker.XpathMatcher.prototype.setCachedResults_ = function(
    doc, xpathResult) {
  doc[bidichecker.XpathMatcher.DOCUMENT_CACHE_KEY_][this.xpath_] = xpathResult;
};
