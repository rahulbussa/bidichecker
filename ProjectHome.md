## [The BidiChecker User's Guide](http://bidichecker.googlecode.com/svn/trunk/docs/users_guide/index.html) ##


# What is BidiChecker? #
BidiChecker is a tool for the automated testing of
web pages for errors in support of right-to-left (RTL) languages, also known as
bidirectional (bidi) because they routinely include left-to-right items such as numbers and Latin-script words and phrases.

## Why you should care about bidi ##
Bidi support for a web page is a common requirement, even for pages in left-to-right scripts. Any page which accepts user input or displays multilingual content is likely to end up handling bidirectional text at some point, as it will eventually encounter data in Arabic, Hebrew or another RTL language. Unfortunately, handling bidirectional text can be tricky and requires special processing at every appearance of potentially bidi data in the UI. ([Examples of common bidi UI bugs can be found here.](http://doctype.googlecode.com/svn-history/trunk/bidihowto/index.html)) As a result, bidi text support often regresses when a developer adds a new feature and simply forgets about bidi.

## How you can use BidiChecker ##
BidiChecker is a library meant to be called from automated test suites that regression-test live web pages in a browser, usually using an automated testing framework such as JSUnit. BidiChecker provides a Javascript API which integrates easily into such a test. The BidiChecker API accepts a page element (by default, the body of the top-level document), runs bidi tests on its contents, and returns a list of bidi errors found, including the type of each error, its location on the page and an estimate of its
level of severity.

For exploratory testing, you can also run BidiChecker manually by installing this [handy bookmarklet](http://bidichecker.googlecode.com/svn/trunk/lib/bookmarklet.html) in your browser.

Using BidiChecker does not require any custom "hooks" or modifications to the product under test. New BidiChecker-based tests can be written in addition to the product's existing test suite.

[The complete User's Guide](http://bidichecker.googlecode.com/svn/trunk/docs/users_guide/index.html), including download and installation instructions, [can be found here](http://bidichecker.googlecode.com/svn/trunk/docs/users_guide/index.html), or in the source repository under [docs/users\_guide](http://code.google.com/p/bidichecker/source/browse/#svn/trunk/docs/users_guide).