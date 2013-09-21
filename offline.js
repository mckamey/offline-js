/**
 * offline.js v1.0.1
 * http://github.com/mckamey/offline-js
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/*jshint smarttabs:true */
var offline = (function(localStorage, console, window) {
	'use strict';

	/**
	 * @const @type {string} data key prefix
	 */
	var KEY_PREFIX = '\u2023\u00A0\u00A0';

	/**
	 * @const @type {string} expiry key suffix
	 */
	var EXPIRY_SUFFIX = '\u00A0\u00A0\u03BB';

	/**
	 * @const @type {number} expiration date radix (Base-36 produces shortest strings)
	 */
	var EXPIRY_RADIX = 36;

	/**
	 * @const @type {number} expiration date resolution in seconds
	 */
	var EXPIRY_UNITS = 1000;

	/**
	 * @const @type {number} ECMAScript max Date (epoch + 1e8 days)
	 * http://stackoverflow.com/q/7640931
	 */
	var MAX_DATE = Math.floor(8.64e15/EXPIRY_UNITS);

	/**
	 * @type {boolean} logging switch
	 */
	var warnings = false;

	/**
	 * @param {string} msg log message
	 * @param {Error=} ex error
	 */
	var log = ('console' in window && console.warn) ?
		function(msg, ex) {
			if (warnings) {
				console.warn(msg);
				if (ex) {
					console.warn(ex.message);
				}
			}
		} : function(msg, ex){};

	/**
	 * @const @type {boolean} JSON serialization support
	 * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/json.js#L22
	 */
	var HAS_JSON = ('JSON' in window) && ('parse' in JSON);

	/**
	 * Detects if localStorage is supported by the browser.
	 * For perf, replaces test method with trivial method returning result.
	 * Takes 200ms on Android so it's not run at parse-time.
	 * @return {boolean}
	 */
	var hasStorage = function() {
		// Feature detection based on hardened Modernizr approach:
		// https://github.com/Modernizr/Modernizr/blob/master/feature-detects/storage/localstorage.js#L38

		try {
			var test = KEY_PREFIX+'\u2203'+EXPIRY_SUFFIX;
			localStorage.setItem(test, test);
			localStorage.removeItem(test);

			hasStorage = function() { return true; };

		} catch (ex) {
			log('not supported', ex);
			hasStorage = function() { return false; };
		}

		return hasStorage();
	};

	/**
	 * localStorage wrapper method
	 * @param {string} key
	 * @return {null|string}
	 */
	function getItem(key) {
		return localStorage.getItem(KEY_PREFIX + key);
	}

	/**
	 * localStorage wrapper method
	 * @param {string} key
	 * @param {string} value
	 */
	function setItem(key, value) {
		// fixes QUOTA_EXCEEDED_ERR on setItem
		key = KEY_PREFIX + key;
		localStorage.removeItem(key);
		localStorage.setItem(key, value);
	}

	/**
	 * localStorage wrapper method
	 * @param {string} key
	 */
	function removeItem(key) {
		localStorage.removeItem(KEY_PREFIX + key);
	}

	/**
	 * Date.now() polyfill
	 * @return {number} current time
	 */
	var now = Date.now || function() {
		return +new Date();
	};

	/**
	 * The number of seconds since the epoch plus offset.
	 * @param {number=} offset number of seconds added to now
	 * @return {number}
	 */
	var getDate = function(offset) {
		return Math.floor( (+offset||0) + now() / EXPIRY_UNITS );
	};

	/**
	 * Returns the full string for the localStorage expiry item.
	 * @param {string} key
	 * @return {string}
	 */
	var expiryKey = function(key) {
		return key + EXPIRY_SUFFIX;
	};

	/**
	 * Returns the expiration value for the given item.
	 * @param {string} key
	 * @return {number}
	 */
	var getExpiry = function(key) {
		var expiry = getItem( expiryKey(key) );
		return expiry ? parseInt(expiry, EXPIRY_RADIX) : MAX_DATE;
	};

	/**
	 * Sorts the keys with oldest expiry last
	 */
	var keySort = function(a, b) {
		return (b.expiry - a.expiry);
	};

	/**
	 * Removes just enough items to free up given size
	 */
	var expunge = function(size) {
		var start = now();

		// If we exceeded the quota, then sort by expiry and remove the N oldest
		var items = [];

		for (var i=0; i<localStorage.length; i++) {
			var key = localStorage.key(i);

			if ((key.indexOf(KEY_PREFIX) === 0) &&
				key.lastIndexOf(EXPIRY_SUFFIX) < 0) {

				var dataKey = key.substr(KEY_PREFIX.length);
				var expiry = getExpiry(dataKey);
				var itemSize = (''+getItem(dataKey)).length;

				items.push({
					key: dataKey,
					size: itemSize,
					expiry: expiry
				});
			}
		}

		items.sort(keySort);

		while (items.length && size > 0) {
			var item = items.pop();
			log('expunged ['+item.key+']');

			removeItem(item.key);
			removeItem(expiryKey(item.key));
			size -= item.size;
		}

		log('expunge took '+(now() - start)+'ms');
	};

	/**
	 * Tests the freshness of the stored object
	 * @param {string} key
	 * @return {boolean} if value exists and has not expired
	 */
	var isFresh = function(key) {
		// check the expiry date and existence of item
		return !!getItem(key) && (getDate() < getExpiry(key));
	};

	/**
	 * Gets the stored object and rehydrates
	 * @param {string} key
	 * @return {*} stored value or null
	 */
	var getParsed = function(key) {
		// tries to de-serialize stored value, falls back to string value.
		var value = getItem(key);
		if (!value || !HAS_JSON) {
			return value;
		}

		try {
			return JSON.parse(value);

		} catch (ex) {
			return value;
		}
	};

	/**
	 * Removes the item and expiry at key
	 * @param {string} key
	 */
	var removeItemAndExpiry = function(key) {
		removeItem(key);
		removeItem(expiryKey(key));
	};

	return {
		/**
		 * Tests the freshness of the stored object
		 * @param {string} key
		 * @return {boolean} if value exists and has not expired
		 */
		fresh: function(key) {
			if (!hasStorage()) { return false; }

			return isFresh(key);
		},

		/**
		 * Gets the stored object
		 * @param {string} key
		 * @param {boolean} expunge
		 * @return {*} stored value or null
		 */
		get: function(key, expunge) {
			if (!hasStorage()) { return null; }

			// check if should expunge item
			if (expunge && !isFresh(key)) {
				removeItemAndExpiry(key);
				return null;
			}

			return getParsed(key);
		},

		/**
		 * Stores a value in the cache
		 * @param {string} key storage key
		 * @param {*} value storage value
		 * @param {number} seconds expiry in seconds
		 */
		set: function(key, value, seconds) {
			if (!hasStorage()) { return; }

			if (HAS_JSON) {
				try {
					value = JSON.stringify(value);

				} catch (ex) {
					// does not store unserializable object graphs
					return;
				}

			} else if (typeof value !== 'string') {
				// cannot store non-strings
				return;
			}

			if (!isFinite(+seconds)) {
				// use half of MAX_DATE as offset when none set
				// this enables expunging of non-expiring items
				// by insertion time.
				seconds = MAX_DATE/2;
			}

			// encode expiry time as string
			var expiry = getDate(seconds).toString(EXPIRY_RADIX);

			try {
				setItem(key, value);

			} catch (ex2) {
				switch(ex2.name) {
					case 'QUOTA_EXCEEDED_ERR':
					case 'NS_ERROR_DOM_QUOTA_REACHED':
					case 'QuotaExceededError':
						break;
					default:
						log('insert failed ['+key+']', ex2);
						return;
				}

				// attempt to free up space
				expunge( (''+value).length );

				try {
					setItem(key, value);

				} catch (ex3) {
					// value may be larger than total quota
					log('insert failed ['+key+']', ex3);
					return;
				}
			}

			try {
				// store expiry
				setItem(expiryKey(key), expiry);

			} catch (ex4) {
				log('expiry insert failed ['+key+']', ex4);
			}
		},

		/**
		 * Expires the item but does not remove
		 * @param {string} key
		 */
		expire: function(key) {
			if (!hasStorage() || !isFresh(key)) { return; }

			// encode now as expiry string
			var expiry = getDate().toString(EXPIRY_RADIX);

			try {
				// store expiry
				setItem(expiryKey(key), expiry);

			} catch (ex) {
				log('expire failed ['+key+']', ex);
			}
		},

		/**
		 * Removes the item and expiry
		 * @param {string} key
		 */
		remove: function(key) {
			if (!hasStorage()) { return; }

			removeItemAndExpiry(key);
		},

		/**
		 * Removes all items in cache, optionally filtering by prefix
		 * @param {string=} prefix
		 */
		flush: function(prefix) {
			if (!hasStorage()) { return; }

			prefix = KEY_PREFIX + (prefix || '');

			// loop in reverse as removing items changes indices of tail
			for (var i=localStorage.length-1; i>=0; i--) {
				var key = localStorage.key(i);
				if (key.indexOf(prefix) === 0) {
					localStorage.removeItem(key);
				}
			}
		},

		/**
		 * Enables or disables log warnings
		 * @param {boolean} enabled
		 */
		enableWarnings: function(enabled) {
			warnings = enabled;
		},

		/**
		 * Determines if the cache is supported
		 * @param {boolean} enabled
		 */
		supported: hasStorage
	};

})(window.localStorage, window.console, window);
