// Copyright 2010 Google Inc. All Rights Reserved.
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
 * @fileoverview A quick-and-dirty miniature unit test runner, modeled only very
 * loosely after the style of xUnit. This is *not* - repeat: *not* - intended
 * for production use, anywhere. It is included here solely for the purpose of
 * demonstrating how to write unit test suites which use BidiChecker. It is not
 * robust, not full-featured, not well-tested, and most definitely not
 * supported! Real unit test suites for production systems (with or without
 * BidiChecker) should use a production-quality test framework. The best known
 * for JavaScript is JSUnit, but many alternatives are available, most of which
 * are free and open source. We do not use them in our samples to avoid adding
 * an external dependency.
 */

/**
 * Common setup function to be run after each unit test. Undefined by default.
 * User code can replace it with a real function.
 * @type {Function|undefined}
 */
var setUp = undefined;

/**
 * Common cleanup function to be run after each unit test. Undefined by default.
 * User code can replace it with a real function.
 * @type {Function|undefined}
 */
var tearDown = undefined;

/**
 * Asserts that the actual value is equal to its expected value, or else throws
 * an exception constituting a string describing the mismatch. This function is
 * not meant to be robust; it is not guaranteed to work on any but simple types.
 * @param {*} expected The expected value.
 * @param {*} actual The actual value.
 */
function assertEquals(expected, actual) {
  if (expected !== actual) {
    throw 'Expected ' + expected + ', got ' + actual;
  }
}

/**
 * Asserts that the actual contents of an array are equal to its expected
 * contents. This function is not meant to be robust; it is not guaranteed to
 * work on any but simple types.
 * @param {Array.<Object>} expected Expected array of values.
 * @param {Array.<Object>} actual Actal array of values.
 */
function assertArrayEquals(expected, actual) {
  assertEquals(expected.length, actual.length);
  for (var i = 0; i < expected.length; i++) {
    assertEquals(expected[i], actual[i]);
  }
}

/**
 * Runs all the test functions (names start with "test") in the global
 * namespace. If defined, {@code setUp()} is called before each test function
 * and {@code tearDown} is called after. A summary of how many tests were run,
 * how many passed and how many failed is rendered to the page element with the
 * id "test_runner", as well as a list of which test functions passed and
 * failed. This function is designed to be called only once. It should be
 * invoked by a mechanism such as {@code <body onload="runTests()">} so that it
 * runs each time the page is refreshed.
 */
function runTests() {
  var testRunnerElement = document.getElementById('test_runner');
  var resultsSummaryElement = createResultsSummaryElement_(testRunnerElement);
  var testResultsElement = createTestResultsElement_(testRunnerElement);

  var testFunctions = findTestFunctions_();
  var numFailed = 0;
  for (var i = 0; i < testFunctions.length; i++) {
    var testFunction = window[testFunctions[i]];
    var errorText = runOneTest_(testFunction);
    if (errorText != '') {
      numFailed++;
    }

    addResultEntry_(testResultsElement, testFunction.name, errorText);
    updateResultsSummary_(resultsSummaryElement, i + 1, numFailed);
  }
}

/**
 * Finds all global functions whose names start with "test".
 * @return {!Array.<string>} The names of the functions.
 * @private
 */
function findTestFunctions_() {
  var testFunctionNames = [];
  for (var identifier in window) {
    if (identifier.substr(0, 4) == 'test' &&
        typeof(window[identifier]) == 'function') {
      testFunctionNames.push(identifier);
    }
  }
  testFunctionNames.sort();
  return testFunctionNames;
}

/**
 * Creates a DOM element to hold the results summary line.
 * @param {Element} parent The parent element.
 * @return {Element} The newly created element.
 * @private
 */
function createResultsSummaryElement_(parent) {
  var resultsSummaryElement = document.createElement('h1');
  resultsSummaryElement.appendChild(document.createTextNode(''));
  parent.appendChild(resultsSummaryElement);
  return resultsSummaryElement;
}

/**
 * Creates a DOM element to hold the individual test result entries.
 * @param {Element} parent The parent element.
 * @return {Element} The newly created element.
 * @private
 */
function createTestResultsElement_(parent) {
  var testResultsElement = document.createElement('p');
  parent.appendChild(testResultsElement);
  return testResultsElement;
}

/**
 * Runs a single test function, sandwiched by {@code setUp()} and
 * {@code tearDown} if defined.
 * @param {Function} testFunction The test function to be run.
 * @return {string} An empty string for succes; otherwise, the error message.
 * @private
 */
function runOneTest_(testFunction) {
  try {
    if (setUp != undefined) {
      setUp();
    }
    testFunction();
    if (tearDown != undefined) {
      tearDown();
    }
  } catch (exception) {
    return exception;
  }
  return '';
}

/**
 * Adds a DOM element containing the results of a single test.
 * @param {Element} parent The parent element.
 * @param {string} testName The name of the test function.
 * @param {string} errorText Error message generated by the test, or blank.
 * @private
 */
function addResultEntry_(parent, testName, errorText) {
  var newEntry = document.createElement('div');
  var description = testName +
      (errorText == '' ? ' passed' : ' failed: ' + errorText);
  newEntry.appendChild(document.createTextNode(description));
  var descriptionColor = errorText == '' ? 'green' : 'red';
  newEntry.setAttribute('style', 'color: ' + descriptionColor);
  parent.appendChild(newEntry);
}

/**
 * Updates the test results summary line with the result of a single test.
 * @param {Element} parent The parent element.
 * @param {number} numTests The number of tests run so far.
 * @param {number} numFailed The number of failing tests so far.
 * @private
 */
function updateResultsSummary_(parent, numTests, numFailed) {
  var summaryText = 'Ran ' + numTests + ' tests: ' + (numTests - numFailed) +
      ' passed, ' + numFailed + ' failed.';

  var resultsColor = numFailed > 0 ? 'red' : 'green';
  parent.setAttribute('style', 'color: ' + resultsColor);
  parent.replaceChild(document.createTextNode(summaryText), parent.firstChild);
}
