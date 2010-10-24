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
 * @fileoverview Utility functions for bidichecker Javascript unit tests.
 */


goog.require('bidichecker.Error');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.testing.jsunit');

// Common initializations before each unit test.
function setUp() {
  // Some of the unit tests add content to the page by creating a div with
  // id="test". We remove it before each test to make way for the next one.
  var testDiv = document.getElementById('test');
  if (testDiv) {
    goog.dom.removeNode(testDiv);
  }

  // Make sure no event listeners are present before the test starts.
  goog.events.removeAll();
}

function tearDown() {
  // Verify that no listeners are still alive.
  assertEquals(0, goog.events.getTotalListenerCount());
}


/**
 * Checks that an array of {@code bidichecker.Error} objects matches an array
 * of expected results, where the results are objects with simple key-value
 * pairs representing the data fields expected in the error objects.
 * This lets us easily avoid comparing uninteresting object fields, such as
 * functions and error ids.
 * @param {Array.<Object>} expected For each expected error, the fields we
 *     expect to see and their values.
 * @param {Array.<bidichecker.Error>} errors The list of actual errors returned
 *     from the bidi checks.
 */
function assertErrorFields(expected, errors) {
  /**
   * The data fields we care to compare among error objects.
   * @type {Array.<string>}
   */
  var relevantFields = ['type', 'severity', 'atText', 'locationDescription',
                        'precededByText', 'followedByText'];

  // Extract from the error objects the fields of interest to us into an array
  // with the same type of contents as {@code expected}.
  var errorFields = goog.array.map(errors, function(error) {
    var extractedFields = {};
    goog.array.forEach(relevantFields, function(field) {
      if (field in error && error[field] != null) {

        extractedFields[field] = error[field];
      }
    });
    return extractedFields;
  });
  assertArrayEquals(expected, errorFields);
}

