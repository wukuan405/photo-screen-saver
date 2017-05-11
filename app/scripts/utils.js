/*
 *  Copyright (c) 2015-2017, Michael A. Updike All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its contributors
 *  may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 *  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 *  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 *  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 *  OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
window.app = window.app || {};
app.Utils = (function() {
	'use strict';

	/**
	 * Utility methods
	 * @namespace app.Utils
	 */

	return {

		/**
		 * Get the Chrome version
		 * @see http://stackoverflow.com/a/4900484/4468645
		 * @return {int} Chrome major version
		 * @memberOf app.Utils
		 */
		getChromeVersion: function() {
			const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
			return raw ? parseInt(raw[2], 10) : false;
		},

		/**
		 * Get the i18n string
		 * @param {string} messageName - key in message.json
		 * @return {string} internationalized string
		 * @memberOf app.Utils
		 */
		localize: function(messageName) {
			return chrome.i18n.getMessage(messageName);
		},

		/**
		 * Determine if a String is null or whitespace only
		 * @param {?string} str - string to check
		 * @return {boolean} true is str is whitespace (or null)
		 * @memberOf app.Utils
		 */
		isWhiteSpace: function(str) {
			return (!str || str.length === 0 || /^\s*$/.test(str));
		},

		/**
		 * Get integer value from localStorage
		 * @param {!string} key - key to get value for
		 * @return {?int} value as integer
		 * @memberOf app.Utils
		 */
		getInt: function(key) {
			let item = localStorage.getItem(key);
			if (item !== null) {
				item = parseInt(item, 10);
			}
			return item;
		},

		/**
		 * Get boolean value from localStorage
		 * @param {!string} key - key to get value for
		 * @return {?boolean} value as boolean
		 * @memberOf app.Utils
		 */
		getBool: function(key) {
			return app.Utils.get(key);
		},

		/**
		 * Get a JSON parsed value from localStorage
		 * @param {!string} key - key to get value for
		 * @return {?JSON} JSON object, null if key does not exist
		 * @memberOf app.Utils
		 */
		get: function(key) {
			let item = localStorage.getItem(key);
			if (item !== null) {
				item = JSON.parse(item);
			}
			return item;
		},

		/**
		 * JSON stringify and save a value to localStorage
		 * @param {!string} key - key to set value for
		 * @param {?object} value - new value, if null remove item
		 * @memberOf app.Utils
		 */
		set: function(key, value) {
			if (value !== null) {
				localStorage.setItem(key, JSON.stringify(value));
			} else {
				localStorage.removeItem(key);
			}
		},

		/**
		 * Save a value to localStorage only if there is enough room
		 * @param {!string} key - localStorage Key
		 * @param {string} value - JSON stringified value to save
		 * @param {string} [keyBool] - key to a boolean value
		 *                 that is true if the primary key has non-empty value
		 * @return {boolean} true if value was set successfully
		 * @memberOf app.Utils
		 */
		safeSet: function(key, value, keyBool) {
			let ret = true;
			const oldValue = app.Utils.get(key);
			try {
				app.Utils.set(key, value);
			} catch (e) {
				ret = false;
				if (oldValue) {
					// revert to old value
					app.Utils.set(key, oldValue);
				}
				if (keyBool) {
					// revert to old value
					if (oldValue && oldValue.length) {
						app.Utils.set(keyBool, true);
					} else {
						app.Utils.set(keyBool, false);
					}
				}
				// notify listeners
				chrome.runtime.sendMessage({
					message: 'storageExceeded',
					name: keyBool,
				}, function(response) {});
			}

			return ret;
		},

		/**
		 * Get the idle time in seconds
		 * @return {int} idle time in seconds
		 * @memberOf app.Utils
		 */
		getIdleSeconds: function() {
			const idle = app.Utils.get('idleTime');
			return idle.base * 60;
		},

		/**
		 * true if we are MS windows
		 * @return {boolean} true if MS windows
		 * @memberOf app.Utils
		 */
		isWin: function() {
			return app.Utils.get('os') === 'win';
		},

		/**
		 * Returns a random integer between min and max inclusive
		 * @param {int} min - min value
		 * @param {int} max - max value
		 * @return {int} random int
		 * @memberOf app.Utils
		 */
		getRandomInt: function(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		},

		/**
		 * Randomly sort an Array in place
		 * Fisher-Yates shuffle algorithm.
		 * @param {Array} array - Array to sort
		 * @memberOf app.Utils
		 */
		shuffleArray: function(array) {
			for (let i = array.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
		},

		/**
		 * Add an image object to an existing Array
		 * @param {Array} images - Array of image objects
		 * @param {string} url - The url to the photo
		 * @param {string} author - The photographer
		 * @param {number} asp - The aspect ratio of the photo
		 * @param {object} [ex] - Additional information about the photo
		 * @memberOf app.Utils
		 */
		addImage: function(images, url, author, asp, ex) {
			const image = {
				url: url,
				author: author,
				asp: asp.toPrecision(3),
			};
			if (ex) {
				image.ex = ex;
			}
			images.push(image);
		},
	};
})();
