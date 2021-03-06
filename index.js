"use strict";

var mongoose = require("mongoose");
var Model = mongoose.Model;
var model = mongoose.model;
var replaceLanguageCharacters = require("./languageCharacters");

/* istanbul ignore next */
function parseArguments(args, i1, i2) {
  var options = {};
  var callback = null;


  if (args[i1] && isFunction(args[i1])) {
    callback = args[i1];
  } else if (args[i1] && isObject(args[i1])) {
    options = args[i1]; 
  }

  if (!callback && typeof args[i2] === "function") {
    callback = args[i2];
  }

  return { options, callback };
}

/**
 * Removes special symbols from string.
 * @param {string} text - The string to remove the characters.
 * @param {boolean} escapeSpecialCharacters - If this value is true, it will also remove all the special characters.
 * @return {string} the given text without the special characters.
 */
function replaceSymbols(text, escapeSpecialCharacters) {
  text = text.toLowerCase();
  if (escapeSpecialCharacters) {
    text = text.replace(/[!\"#%&+\'\(\)\*,-\.\/:;<=>?@\[\\\]\^`\{\|\}~]/g, ""); // remove special characters
  }
  text = text.replace(/_/g, " ");
  text = replaceLanguageCharacters(text);
  return text;
}

/**
 * Returns if the variable is an object and if the the object is empty
 * @param {any} obj
 * @return {boolean}
 */
function isObject(obj) {
  return !!obj && obj.constructor === Object && Object.keys(obj).length > 0;
}

/**
 * Returns if the variable is a Function
 * @param {any} fn
 * @return {boolean}
 */
function isFunction(fn) {
  return !!(fn && ("function" === typeof fn || fn instanceof Function));
}

/**
 * Converts Object to Array
 * @param {object} object - Object to convert
 * @return {array}
 */
function objectToValuesPolyfill(object) {
  return Object.keys(object).map(function(key) {
    return object[key];
  });
}

/**
 * Removes fuzzy keys from the document
 * @param {array} fields - the fields to remove
 */

/**
 * Plugin's main function. Creates the fuzzy fields on the collection, set's a pre save middleware to create the Ngrams for the fuzzy fields
 * and creates the instance methods `fuzzySearch` which finds the guesses.
 * @param {object} schema - Mongo Collection
 * @param {object} options - plugin options
 */
module.exports = function(schema, options) {
  if (!options || (options && !options.fields)) {
    throw new Error("You must set at least one field for fuzzy search.");
  }

  if (!Array.isArray(options.fields)) {
    throw new TypeError("Fields must be an array.");
  }

  var fields = options.fields;

  options.fields.forEach(function(item) {
    if (
      isObject(item) &&
      item.keys &&
      !Array.isArray(item.keys) &&
      typeof item.keys !== "string"
    ) {
      throw new TypeError("Key must be an array or a string.");
    }
  });

  schema.statics["fuzzySearch"] = function() {
    Object.values = Object.values || objectToValuesPolyfill;

    var args = Object.values(arguments);
   
    if (
      args.length === 0 &&
      (typeof args[0] !== "string" || !isObject(args[0]))
    ) {
      throw new TypeError(
        "Fuzzy Search: First argument is mandatory and must be a string or an object."
      );
    }

    var queryString = isObject(args[0]) ? args[0].query : args[0];
    var query = replaceSymbols(queryString, true);
    var parsedArguments = parseArguments(args, 1, 2);
    var options = parsedArguments.options;
    var callback = parsedArguments.callback; 

    var search;

    if (!options) {
      search = {
        $text: {
          $search: query
        }
      };
    } else {
      try {
        search = makePartialSearchQueries(queryString, fields,options); 
      } catch (err) {
        console.log(err);
      }
    }

    return Model["find"].apply(this, [search, callback]);
  };
};

function makePartialSearchQueries(q, fields,options) {
  if (!q) return {};

  const $or=[]

  //trim the query string to remove any leading and ending whitespace and then split the query 
  const searchStrings=q.trim().split(' ');

  searchStrings.map(word=>{
    fields.map(val=>{
      $or.push({
        [val]: new RegExp(replaceSymbols(word, true), "gi")
      });
    })
  })

  console.log($or)
  const $and =[{$or},options]
  return { $and };
}