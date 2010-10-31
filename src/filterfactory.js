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
 * @fileoverview Factory methods for constructing error-suppression filters.
 */

/**
 * In this file, filters (whether their static factory methods or their class
 * definitions) are ordered alphabetically.
 */


goog.provide('bidichecker.FilterFactory');
goog.provide('bidichecker.FilterFactory.ComposableFilter');

goog.require('bidichecker.Filter');
goog.require('goog.json');


/**
 * Abstract base class for custom filter classes, providing them with
 * {@code and()}, {@code or()} and {@code not()} methods.
 * @constructor
 * @implements {bidichecker.Filter}
 * @export
 */
bidichecker.FilterFactory.ComposableFilter = function() {};


/** @inheritDoc */
bidichecker.FilterFactory.ComposableFilter.prototype.isSuppressed =
    goog.abstractMethod;


/**
 * Create a filter which ands this filter with another.
 * @param {!bidichecker.Filter} other The second subfilter.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.ComposableFilter.prototype.and = function(other) {
  return bidichecker.FilterFactory.and(this, other);
};


/**
 * Create a filter which inverts this filter.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.ComposableFilter.prototype.not = function() {
  return bidichecker.FilterFactory.not(this);
};


/**
 * Create a filter which ors this filter with another.
 * @param {!bidichecker.Filter} other The second subfilter.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.ComposableFilter.prototype.or = function(other) {
  return bidichecker.FilterFactory.or(this, other);
};


/**
 * Constructs a suppression filter from a bare object with suitable contents.
 * For use in deserializing filters from JSON. Throws a string exception if an
 * invalid filter is encountered.
 * @param {!Object} bareFilter The object representing the filter. Must contain
 *     an {@code 'opcode'} field with a string indicating the filter type.
 *     Other supported field names and types are dependent on the filter type.
 * @return {!bidichecker.FilterFactory.ComposableFilter} The new filter.
 * @private
 */
bidichecker.FilterFactory.constructFilter_ = function(bareFilter) {
  var opcode = bareFilter['opcode'];
  switch (opcode) {
    case 'AND':
      return new bidichecker.FilterFactory.AndFilter_(bareFilter);

    case 'AT_TEXT':
      return new bidichecker.FilterFactory.AtTextFilter_(bareFilter);

    case 'AT_TEXT_REGEXP':
      return new bidichecker.FilterFactory.AtTextRegexpFilter_(bareFilter);

    case 'FOLLOWED_BY_TEXT':
      return new bidichecker.FilterFactory.FollowedByTextFilter_(bareFilter);

    case 'FOLLOWED_BY_TEXT_REGEXP':
      return new bidichecker.FilterFactory.FollowedByTextRegexpFilter_(
          bareFilter);

    case 'LOCATION_CLASS':
      return new bidichecker.FilterFactory.LocationClassFilter_(bareFilter);

    case 'LOCATION_CLASS_REGEXP':
      return new bidichecker.FilterFactory.LocationClassRegexpFilter_(
          bareFilter);

    case 'LOCATION_ID':
      return new bidichecker.FilterFactory.LocationIdFilter_(bareFilter);

    case 'LOCATION_ID_REGEXP':
      return new bidichecker.FilterFactory.LocationIdRegexpFilter_(
          bareFilter);

    case 'NOT':
      return new bidichecker.FilterFactory.NotFilter_(bareFilter);

    case 'OR':
      return new bidichecker.FilterFactory.OrFilter_(bareFilter);

    case 'PRECEDED_BY_TEXT':
      return new bidichecker.FilterFactory.PrecededByTextFilter_(bareFilter);

    case 'PRECEDED_BY_TEXT_REGEXP':
      return new bidichecker.FilterFactory.PrecededByTextRegexpFilter_(
          bareFilter);

    case 'SEVERITY':
      return new bidichecker.FilterFactory.SeverityFilter_(bareFilter);

    case 'TYPE':
      return new bidichecker.FilterFactory.TypeFilter_(bareFilter);

    default:
      throw 'Unknown filter opcode: \'' + opcode + '\'';
  }
};


/**
 * Deserializes a list of suppression filters from a JSON-format string.
 * Throws a string exception if an unknown filter is encountered.
 * @param {string=} opt_filtersJson The input string, if provided.
 * @return {Array.<!bidichecker.Filter>} The error suppression filters.
 */
bidichecker.FilterFactory.readFiltersFromJson = function(opt_filtersJson) {
  if (!opt_filtersJson) {
    return null;
  }

  var bareFilters =
      (/** @type {Array.<!Object>} */ goog.json.parse(opt_filtersJson));
  return goog.array.map(bareFilters, function(bareFilter) {
    return bidichecker.FilterFactory.constructFilter_(bareFilter);
  });
};


/**
 * Create a filter which suppresses errors by and-ing component filters.
 * @param {!bidichecker.Filter} filter1 The first subfilter.
 * @param {!bidichecker.Filter} filter2 The second subfilter.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.and = function(filter1, filter2) {
  return new bidichecker.FilterFactory.AndFilter_(
      {'filter1': filter1, 'filter2': filter2});
};


/**
 * Create a filter which suppresses errors based on a literal match of their
 * {@code atText} fields.
 * @param {?string} atText A string which must match the entire {@code atText}
 *     field. If empty or null, will only match an empty or null {@code atText}.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.atText = function(atText) {
  return new bidichecker.FilterFactory.AtTextFilter_({'atText': atText || ''});
};


/**
 * Create a filter which suppresses errors by applying a regular expression to
 * their {@code atText} fields.
 * @param {string|RegExp} atTextRegexp A regular expression, which must match
 *     the entire {@code atText} field. If empty or null, will only match an
 *     empty or null {@code atText}.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.atTextRegexp = function(atTextRegexp) {
  return new bidichecker.FilterFactory.AtTextRegexpFilter_(
      {'atTextRegexp': atTextRegexp || ''});
};


/**
 * Create a filter which suppresses errors based on a literal match of their
 * {@code followedByText} fields.
 * @param {?string} followedByText A string which must match the entire
 *     {@code followedByText} field. If empty or null, will only match an empty
 *     or null {@code followedByText}.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.followedByText = function(followedByText) {
  return new bidichecker.FilterFactory.FollowedByTextFilter_(
      {'followedByText': followedByText || ''});
};


/**
 * Create a filter which suppresses errors by applying a regular expression to
 * their {@code followedByText} fields.
 * @param {string|RegExp} followedByTextRegexp A regular expression, which must
 *     match the entire {@code followedByText} field. If empty or null, will
 *     only match an empty or null {@code followedByText}.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.followedByTextRegexp = function(
    followedByTextRegexp) {
  return new bidichecker.FilterFactory.FollowedByTextRegexpFilter_(
      {'followedByTextRegexp': followedByTextRegexp || ''});
};


/**
 * Create a filter which suppresses errors based on a literal match of one of
 * the class names of any parent node of the error location in the DOM.
 * @param {string} className A string which must match one of the class names in
 *     the {@code class} attribute of the location or one of its ancestors. Must
 *     not be empty or null.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.locationClass = function(className) {
  if (!className || className == '') {
    throw 'Empty or null argument to bidichecker.FilterFactory.locationClass';
  }
  return new bidichecker.FilterFactory.LocationClassFilter_(
      {'className': className});
};


/**
 * Create a filter which suppresses errors based on a regular expression match
 * of one of the class names of any parent node of the error location in the
 * DOM.
 * @param {string|RegExp} classRegexp A regular expression, which must match
 *     one of the class names in the {@code class} attribute of the location or
 *     one of its ancestors. Must not be empty or null.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.locationClassRegexp = function(classRegexp) {
  if (!classRegexp || classRegexp == '') {
    throw 'Empty or null argument to ' +
        'bidichecker.FilterFactory.locationClassRegexp';
  }
  return new bidichecker.FilterFactory.LocationClassRegexpFilter_(
      {'classRegexp': classRegexp});
};


/**
 * Create a filter which suppresses errors based on a literal match of the error
 * location's (or one of its DOM ancestors') {@code id} attribute.
 * @param {string} id A string which must match the entire {@code id} attribute
 *     of the location or one of its ancestors. Must not be empty or null.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.locationId = function(id) {
  if (!id || id == '') {
    throw 'Empty or null argument to bidichecker.FilterFactory.locationId';
  }
  return new bidichecker.FilterFactory.LocationIdFilter_({'id': id});
};


/**
 * Create a filter which suppresses errors by applying a regular expression to
 * the error location's (or one of its DOM ancestors') {@code id} attribute.
 * @param {string|RegExp} idRegexp A regular expression, which must match the
 *     entire {@code id} attribute of the location or one of its ancestors. Must
 *     not be empty or null.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.locationIdRegexp = function(idRegexp) {
  if (!idRegexp || idRegexp == '') {
    throw 'Empty or null argument to ' +
        'bidichecker.FilterFactory.locationIdRegexp';
  }
  return new bidichecker.FilterFactory.LocationIdRegexpFilter_(
      {'idRegexp': idRegexp});
};


/**
 * Create a filter which suppresses errors by inverting another filter.
 * @param {!bidichecker.Filter} filter The subfilter.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.not = function(filter) {
  return new bidichecker.FilterFactory.NotFilter_({'filter': filter});
};


/**
 * Create a filter which suppresses errors by or-ing component filters.
 * @param {!bidichecker.Filter} filter1 The first subfilter.
 * @param {!bidichecker.Filter} filter2 The second subfilter.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.or = function(filter1, filter2) {
  return new bidichecker.FilterFactory.OrFilter_(
      {'filter1': filter1, 'filter2': filter2});
};


/**
 * Create a filter which suppresses errors based on a literal match of their
 * {@code precededByText} fields.
 * @param {?string} precededByText A string which must match the entire
 *     {@code precededByText} field. If empty or null, will only match an empty
 *     or null {@code precededByText}.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.precededByText = function(precededByText) {
  return new bidichecker.FilterFactory.PrecededByTextFilter_(
      {'precededByText': precededByText || ''});
};


/**
 * Create a filter which suppresses errors by applying a regular expression to
 * their {@code precededByText} fields.
 * @param {string|RegExp} precededByTextRegexp A regular expression, which must
 *     match the entire {@code precededByText} field. If empty or null, will
 *     only match an empty or null {@code precededByText}.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.precededByTextRegexp = function(
    precededByTextRegexp) {
  return new bidichecker.FilterFactory.PrecededByTextRegexpFilter_(
      {'precededByTextRegexp': precededByTextRegexp || ''});
};


/**
 * Create a filter which suppresses errors based on their severity levels.
 * @param {number} severityThreshold the severity level from which errors should
 *     be suppressed. At level 1, all messages will be filtered out. Note that
 *     higher values indicate lower severities.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.severityFrom = function(severityThreshold) {
  return new bidichecker.FilterFactory.SeverityFilter_(
      {'severityThreshold': severityThreshold});
};


/**
 * Create a filter which suppresses errors based on their type fields.
 * @param {string} type The error type name to be matched exactly.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter object.
 * @export
 */
bidichecker.FilterFactory.type = function(type) {
  return new bidichecker.FilterFactory.TypeFilter_({'type': type});
};


/**
 * Checks that a required field exists in an object representing a filter, or
 * else throws a string exception.
 * @param {!Object} bareObject The object representing the filter.
 * @param {string} field The name of the field.
 * @private
 */
bidichecker.FilterFactory.checkParamExists_ = function(bareObject, field) {
  if (!(field in bareObject)) {
    throw 'No \'' + field + '\' parameter found for \'' +
        bareObject['opcode'] + '\' filter';
  }
};


/**
 * Checks that a required field of a given type exists in an object representing
 * a filter, or else throws a string exception.
 * @param {!Object} bareObject The object representing the filter.
 * @param {string} field The name of the field.
 * @param {string} type The required type of the field.
 * @private
 */
bidichecker.FilterFactory.checkParam_ = function(bareObject, field, type) {
  bidichecker.FilterFactory.checkParamExists_(bareObject, field);
  if (typeof bareObject[field] != type) {
    throw 'Wrong type for \'' + field + '\' parameter of \'' +
        bareObject['opcode'] + '\' filter; expected ' + type;
  }
};


/**
 * Reads a string-valued field from an object representing a filter.
 * @param {!Object} bareObject The object representing the filter.
 * @param {string} field The name of the field.
 * @return {string} The field value.
 * @private
 */
bidichecker.FilterFactory.getStringParam_ = function(bareObject, field) {
  bidichecker.FilterFactory.checkParam_(bareObject, field, 'string');
  return (/** @type {string} */ bareObject[field]);
};


/**
 * Reads a number-valued field from an object representing a filter.
 * @param {!Object} bareObject The object representing the filter.
 * @param {string} field The name of the field.
 * @return {number} The field value.
 * @private
 */
bidichecker.FilterFactory.getNumberParam_ = function(bareObject, field) {
  bidichecker.FilterFactory.checkParam_(bareObject, field, 'number');
  return (/** @type {number} */ bareObject[field]);
};


/**
 * Reads a regular expression field from an object representing a filter.
 * The field contents must be a string or a RegExp object.
 * @param {!Object} bareObject The object representing the filter.
 * @param {string} fieldName The name of the field.
 * @return {!RegExp} A regular expression anchored at both ends of the string.
 * @private
 */
bidichecker.FilterFactory.getRegexpParam_ = function(bareObject, fieldName) {
  bidichecker.FilterFactory.checkParamExists_(bareObject, fieldName);
  var field = bareObject[fieldName];
  var pattern;
  if (typeof field == 'string') {
    pattern = (/** @type {string} */ field);
  } else if (field instanceof RegExp) {
    pattern = field.source;
  } else {
    throw 'Wrong type for \'' + fieldName + '\' parameter of \'' +
        bareObject['opcode'] + '\' filter; expected string or RegExp';
  }
  return new RegExp('^(' + pattern + ')$');
};


/**
 * Reads a field representing a subfilter from an object representing a filter.
 * The field contents can either be a bare object representing a serialized
 * filter, or an object supporting an {@code isSuppressed()} method.
 * @param {!Object} bareObject The object representing the filter.
 * @param {string} field The name of the field.
 * @return {!bidichecker.FilterFactory.ComposableFilter} A filter constructed
 *     from the field's contents.
 * @private
 */
bidichecker.FilterFactory.getFilterParam_ = function(
    bareObject, field) {
  bidichecker.FilterFactory.checkParam_(bareObject, field, 'object');

  // Recursively build any subfilters referred to by this one.
  var subfilterObject = bareObject[field];
  if (subfilterObject instanceof bidichecker.FilterFactory.ComposableFilter) {
    // Found a constructed filter object.
    return subfilterObject;
  } else if (typeof subfilterObject['opcode'] == 'string') {
    // Found a raw filter object.
    return bidichecker.FilterFactory.constructFilter_(subfilterObject);
  } else {
    throw 'Can\'t make a filter out of the \'' + field + '\' parameter of \'' +
        bareObject['opcode'] + '\' filter';
  }
};


/**
 * A filter which suppresses errors by and-ing component filters.
 * @param {!Object} bareObject An object containing 'filter1' and 'filter2'
 *     fields, each containing a bare object representing a component filter.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.AndFilter_ = function(bareObject) {
  /**
   * @type {!bidichecker.Filter}
   * @private
   */
  this.filter1_ =
      bidichecker.FilterFactory.getFilterParam_(bareObject, 'filter1');

  /**
   * @type {!bidichecker.Filter}
   * @private
   */
  this.filter2_ =
      bidichecker.FilterFactory.getFilterParam_(bareObject, 'filter2');
};
goog.inherits(bidichecker.FilterFactory.AndFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.AndFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  return this.filter1_.isSuppressed(error, locationElements) &&
      this.filter2_.isSuppressed(error, locationElements);
};


/**
 * A filter which suppresses errors by a literal match of their {@code atText}
 * fields.
 * @param {!Object} bareObject An object containing an 'atText' field, which
 *      must match the entire {@code atText} field value. If empty, will only
 *      match an empty or null {@code atText}.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.AtTextFilter_ = function(bareObject) {
  /**
   * @type {string}
   * @private
   */
  this.atText_ =
      bidichecker.FilterFactory.getStringParam_(bareObject, 'atText');
};
goog.inherits(bidichecker.FilterFactory.AtTextFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.AtTextFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  return this.atText_ == (error.getAtText() || '');
};


/**
 * A filter which suppresses errors by applying a regular expression to their
 * {@code atText} fields.
 * @param {!Object} bareObject An object containing an 'atTextRegexp' field
 *     containing a regular expression, which must match the entire
 *     {@code atText} field value. If empty, will only match an empty or null
 *     {@code atText}.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.AtTextRegexpFilter_ = function(bareObject) {
  /**
   * @type {!RegExp}
   * @private
   */
  this.atTextRegexp_ =
      bidichecker.FilterFactory.getRegexpParam_(bareObject, 'atTextRegexp');
};
goog.inherits(bidichecker.FilterFactory.AtTextRegexpFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.AtTextRegexpFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  return this.atTextRegexp_.test(error.getAtText() || '');
};


/**
 * A filter which suppresses errors by a literal match of their {@code
 * followedByText} fields.
 * @param {!Object} bareObject An object containing a 'followedByText' field,
 *     which must match the entire {@code followedByText} field value. If empty,
 *     will only match an empty or null {@code followedByText}.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.FollowedByTextFilter_ = function(bareObject) {
  /**
   * @type {string}
   * @private
   */
  this.followedByText_ =
      bidichecker.FilterFactory.getStringParam_(bareObject, 'followedByText');
};
goog.inherits(bidichecker.FilterFactory.FollowedByTextFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.FollowedByTextFilter_.prototype.isSuppressed =
    function(error, locationElements) {
  return this.followedByText_ == (error.getFollowedByText() || '');
};


/**
 * A filter which suppresses errors by applying a regular expression to their
 * {@code followedByText} fields.
 * @param {!Object} bareObject An object containing a 'followedByTextRegexp'
 *     field containing a regular expression, which must match the entire
 *     {@code followedByText} field value. If empty, will only match an empty or
 *     null {@code followedByText}.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.FollowedByTextRegexpFilter_ = function(bareObject) {
  /**
   * @type {!RegExp}
   * @private
   */
  this.followedByTextRegexp_ =
      bidichecker.FilterFactory.getRegexpParam_(bareObject,
                                                'followedByTextRegexp');
};
goog.inherits(bidichecker.FilterFactory.FollowedByTextRegexpFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.FollowedByTextRegexpFilter_.prototype.isSuppressed =
    function(error, locationElements) {
  return this.followedByTextRegexp_.test(error.getFollowedByText() || '');
};


/**
 * A filter which suppresses errors by a literal match of the error location's
 * (or one of its DOM ancestors') {@code class} name.
 * @param {!Object} bareObject An object containing a 'className' field, which
 *     must match one of the class names in the {@code class} attribute of the
 *     location or one of its ancestors.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.LocationClassFilter_ = function(bareObject) {
  /**
   * @type {string}
   * @private
   */
  this.className_ =
      bidichecker.FilterFactory.getStringParam_(bareObject, 'className');
};
goog.inherits(bidichecker.FilterFactory.LocationClassFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.LocationClassFilter_.prototype.isSuppressed =
    function(error, locationElements) {
  for (var i = 0; i < locationElements.length; ++i) {
    for (var current = locationElements[i]; current;
         current = current.parentNode) {
      if (current.className) {
        // Match each whitespace-separated class name separately.
        var classNames = current.className.split(/\s/);
        for (var j = 0; j < classNames.length; ++j) {
          if (this.className_ == classNames[j]) {
            return true;
          }
        }
      }
    }
  }
  return false;
};


/**
 * A filter which suppresses errors by applying a regular expression to the
 * error location's (or one of its DOM ancestors') {@code class} name.
 * @param {!Object} bareObject An object containing a 'classRegexp' field,
 *     containing a regular expression which must match one of the class names
 *     in the {@code class} attribute of the location or one of its ancestors.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.LocationClassRegexpFilter_ = function(bareObject) {
  /**
   * @type {!RegExp}
   * @private
   */
  this.classRegexp_ =
      bidichecker.FilterFactory.getRegexpParam_(bareObject, 'classRegexp');
};
goog.inherits(bidichecker.FilterFactory.LocationClassRegexpFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.LocationClassRegexpFilter_.prototype.isSuppressed =
    function(error, locationElements) {
  for (var i = 0; i < locationElements.length; ++i) {
    for (var current = locationElements[i]; current;
         current = current.parentNode) {
      if (current.className) {
        // Match each whitespace-separated class name separately.
        var classNames = current.className.split(/\s/);
        for (var j = 0; j < classNames.length; ++j) {
          if (this.classRegexp_.test(classNames[j])) {
            return true;
          }
        }
      }
    }
  }
  return false;
};


/**
 * A filter which suppresses errors by a literal match of the error location's
 * (or one of its DOM ancestors') {@code id} attribute.
 * @param {!Object} bareObject An object containing an 'id' field, which must
 *     match the {@code id} attribute of the location or one of its ancestors.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.LocationIdFilter_ = function(bareObject) {
  /**
   * @type {string}
   * @private
   */
  this.id_ = bidichecker.FilterFactory.getStringParam_(bareObject, 'id');
};
goog.inherits(bidichecker.FilterFactory.LocationIdFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.LocationIdFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  for (var i = 0; i < locationElements.length; ++i) {
    for (var current = locationElements[i]; current;
         current = current.parentNode) {
      if (current.id && this.id_ == current.id) {
        return true;
      }
    }
  }
  return false;
};


/**
 * A filter which suppresses errors by applying a regular expression to the
 * error location's (or one of its DOM ancestors') {@code id} attribute.
 * @param {!Object} bareObject An object containing an 'idRegexp' field
 *     containing a regular expression, which must match the {@code id}
 *     attribute of the location or one of its ancestors.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.LocationIdRegexpFilter_ = function(bareObject) {
  /**
   * @type {!RegExp}
   * @private
   */
  this.idRegexp_ =
      bidichecker.FilterFactory.getRegexpParam_(bareObject, 'idRegexp');
};
goog.inherits(bidichecker.FilterFactory.LocationIdRegexpFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.LocationIdRegexpFilter_.prototype.isSuppressed =
    function(error, locationElements) {
  for (var i = 0; i < locationElements.length; ++i) {
    for (var current = locationElements[i]; current;
         current = current.parentNode) {
      if (current.id && this.idRegexp_.test(current.id)) {
        return true;
      }
    }
  }
  return false;
};


/**
 * A filter which suppresses errors by inverting another filter.
 * @param {!Object} bareObject An object containing a 'filter' field, containing
 *     a bare object representing a component filter.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.NotFilter_ = function(bareObject) {
  /**
   * @type {!bidichecker.Filter}
   * @private
   */
  this.filter_ =
      bidichecker.FilterFactory.getFilterParam_(bareObject, 'filter');
};
goog.inherits(bidichecker.FilterFactory.NotFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.NotFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  return !this.filter_.isSuppressed(error, locationElements);
};


/**
 * A filter which suppresses errors by or-ing component filters.
 * @param {!Object} bareObject An object containing 'filter1' and 'filter2'
 *     fields, each containing a bare object representing a component filter.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.OrFilter_ = function(bareObject) {
  /**
   * @type {!bidichecker.Filter}
   * @private
   */
  this.filter1_ =
      bidichecker.FilterFactory.getFilterParam_(bareObject, 'filter1');

  /**
   * @type {!bidichecker.Filter}
   * @private
   */
  this.filter2_ =
      bidichecker.FilterFactory.getFilterParam_(bareObject, 'filter2');
};
goog.inherits(bidichecker.FilterFactory.OrFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.OrFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  return this.filter1_.isSuppressed(error, locationElements) ||
      this.filter2_.isSuppressed(error, locationElements);
};


/**
 * A filter which suppresses errors by a literal match of their
 * {@code precededByText} fields.
 * @param {!Object} bareObject An object containing a 'precededByText' field,
 *     which must match the entire {@code precededByText} field value. If empty,
 *     will only match an empty or null {@code precededByText}.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.PrecededByTextFilter_ = function(bareObject) {
  /**
   * @type {string}
   * @private
   */
  this.precededByText_ =
      bidichecker.FilterFactory.getStringParam_(bareObject, 'precededByText');
};
goog.inherits(bidichecker.FilterFactory.PrecededByTextFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.PrecededByTextFilter_.prototype.isSuppressed =
    function(error, locationElements) {
  return this.precededByText_ == (error.getPrecededByText() || '');
};


/**
 * A filter which suppresses errors  by applying a regular expression to their
 * {@code precededByText} fields.
 * @param {!Object} bareObject An object containing a 'precededByTextRegexp'
 *     field containing a regular expression, which must match the entire
 *     precededByText field value. If empty, will only match an empty or null
 *     {@code precededByText}.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.PrecededByTextRegexpFilter_ = function(bareObject) {
  /**
   * @type {!RegExp}
   * @private
   */
  this.precededByTextRegexp_ =
      bidichecker.FilterFactory.getRegexpParam_(bareObject,
                                                'precededByTextRegexp');
};
goog.inherits(bidichecker.FilterFactory.PrecededByTextRegexpFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.PrecededByTextRegexpFilter_.prototype.isSuppressed =
    function(error, locationElements) {
  return this.precededByTextRegexp_.test(error.getPrecededByText() || '');
};


/**
 * A filter which suppresses errors based on their severity fields.
 * @param {!Object} bareObject An object containing an integer-valued
 *     'severityThreshold' field representing the threshold severity value for
 *     suppression.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.SeverityFilter_ = function(bareObject) {
  /**
   * @type {number}
   * @private
   */
  this.severityThreshold_ = bidichecker.FilterFactory.getNumberParam_(
      bareObject, 'severityThreshold');
};
goog.inherits(bidichecker.FilterFactory.SeverityFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.SeverityFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  return this.severityThreshold_ <= error.getSeverity();
};


/**
 * A filter which suppresses errors based on their type fields.
 * @param {!Object} bareObject An object containing a string-valued 'type' field
 *     which must exactly match the error type value.
 * @constructor
 * @extends {bidichecker.FilterFactory.ComposableFilter}
 * @private
 */
bidichecker.FilterFactory.TypeFilter_ = function(bareObject) {
  /**
   * @type {string}
   * @private
   */
  this.type_ = bidichecker.FilterFactory.getStringParam_(bareObject, 'type');
};
goog.inherits(bidichecker.FilterFactory.TypeFilter_,
    bidichecker.FilterFactory.ComposableFilter);


/** @inheritDoc */
bidichecker.FilterFactory.TypeFilter_.prototype.isSuppressed = function(
    error, locationElements) {
  return this.type_ == error.getType();
};
