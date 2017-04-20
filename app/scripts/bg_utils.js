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
app.BGUtils = (function() {
	'use strict';

	/**
	 * Helper methods for Background script
	 * @namespace BGUtils
	 */

	/**
	 * Determine if there is a full screen chrome window running on a display
	 * @param {object} display a connected display
	 * @param {function} callback (boolean) - true if there is a full screen
	 * window on the display
	 * @private
	 * @memberOf BGUtils
	 */
	function _hasFullscreen(display, callback) {
		callback = callback || function() {};

		if (app.Utils.getBool('chromeFullscreen')) {
			chrome.windows.getAll({populate: false}, function(wins) {
				const left = display ? display.bounds.left : 0;
				const top = display ? display.bounds.top : 0;
				for (let i = 0; i < wins.length; i++) {
					const win = wins[i];
					if ((win.state === 'fullscreen') &&
						(!display || (win.top === top && win.left === left))) {
						callback(true);
						return;
					}
				}
				callback(false);
			});
		} else {
			callback(false);
		}
	}

	/**
	 * Open a screen saver window on the given display
	 * @param {object} display a connected display
	 * @private
	 * @memberOf BGUtils
	 */
	function _openScreenSaver(display) {
		_hasFullscreen(display, function(isTrue) {
			// don't display if there is a fullscreen window
			const left = display ? display.bounds.left : 0;
			const top = display ? display.bounds.top : 0;
			if (!isTrue) {
				if (app.Utils.getChromeVersion() >= 44 && !display) {
					// Chrome supports fullscreen option on create since
					// version 44
					chrome.windows.create({
						url: '/html/screensaver.html',
						focused: true,
						type: 'popup',
						state: 'fullscreen',
					});
				} else {
					chrome.windows.create({
						url: '/html/screensaver.html',
						left: left,
						top: top,
						width: 1,
						height: 1,
						focused: true,
						type: 'popup',
					}, function(win) {
						chrome.windows.update(win.id, {state: 'fullscreen'});
					});
				}
			}
		});
	}

	/**
	 * Open a screensaver on every display
	 * @private
	 * @memberOf BGUtils
	 */
	function _openScreenSavers() {
		chrome.system.display.getInfo(function(displayInfo) {
			if (displayInfo.length === 1) {
				_openScreenSaver(null);
			} else {
				for (let i = 0; i < displayInfo.length; i++) {
					_openScreenSaver(displayInfo[i]);
				}
			}
		});
	}

	/**
	 * Set state based on screen saver enabled flag
	 * Note: this does not effect the keep awake settings so you could
	 * use the extension as a display keep awake scheduler without
	 * using the screensaver
	 * @private
	 * @memberOf BGUtils
	 */
	function _processEnabled() {
		// update context menu text
		const label = app.Utils.getBool('enabled') ? 'Disable' : 'Enable';
		app.Alarm.updateBadgeText();
		chrome.contextMenus.update('ENABLE_MENU', {title: label}, function() {
			if (chrome.runtime.lastError) {
				// noinspection UnnecessaryReturnStatementJS
				return;
			}
		});
	}

	/**
	 * Set power scheduling features
	 * @private
	 * @memberOf BGUtils
	 */
	function _processKeepAwake() {
		app.Utils.getBool('keepAwake') ?
			chrome.power.requestKeepAwake('display') :
			chrome.power.releaseKeepAwake();
		app.Alarm.updateRepeatingAlarms();
		app.Alarm.updateBadgeText();
	}

	/**
	 * Set wait time for screen saver display after machine is idle
	 * @private
	 * @memberOf BGUtils
	 */
	function _processIdleTime() {
		chrome.idle.setDetectionInterval(app.BGUtils.getIdleSeconds());
	}

	return {
		/**
		 * Initialize the localStorage items
		 * @param {Boolean} restore - if true, restore to defaults
		 * @memberOf BGUtils
		 */
		initData: function(restore) {
			// using local storage as a quick and dirty replacement for MVC
			// not using chrome.storage 'cause the async nature of it
			// complicates things
			// just remember to use parse methods because all values are strings

			const oldVersion = localStorage.getItem('version');

			localStorage.version = '9';

			const VALS = {
				'enabled': 'true',
				'idleTime': '{"base": 5, "display": 5, "unit": 0}', // minutes
				'transitionTime':
					'{"base": 30, "display": 30, "unit": 0}', // seconds
				'skip': 'true',
				'shuffle': 'true',
				'photoSizing': '0',
				'photoTransition': '4',
				'showTime': '1', // 12 hr format
				'showPhotog': 'true',
				'background':
					'"background:linear-gradient(to bottom, #3a3a3a, #b5bdc8)"',
				'keepAwake': 'false',
				'chromeFullscreen': 'true',
				'allDisplays': 'false',
				'activeStart': '"00:00"', // 24 hr time
				'activeStop': '"00:00"', // 24 hr time
				'allowSuspend': 'false',
				'useSpaceReddit': 'false',
				'useEarthReddit': 'false',
				'useAnimalReddit': 'false',
				'useEditors500px': 'false',
				'usePopular500px': 'false',
				'useYesterday500px': 'false',
				'useInterestingFlickr': 'false',
				'useChromecast': 'true',
				'useAuthors': 'false',
				'useGoogle': 'true',
				'albumSelections': '[]',
			};

			if (oldVersion < 8) {
				let str;
				let trans;
				let idle;

				// change setting-slider values due to adding units
				trans = localStorage.getItem('transitionTime');
				if (trans) {
					str = '{"base": ' + trans + ', "display": ' + trans +
						', "unit": 0}';
					localStorage.setItem('transitionTime', str);
				}
				idle = localStorage.getItem('idleTime');
				if (idle) {
					str = '{"base": ' + idle + ', "display": ' + idle +
						', "unit": 0}';
					localStorage.setItem('idleTime', str);
				}
			}

			if (restore) {
				// restore defaults
				Object.keys(VALS).forEach(function(key) {
					if ((key !== 'useGoogle') &&
						(key !== 'albumSelections') &&
						(key !== 'os')) {
						// skip Google photos settings and os
						localStorage.setItem(key, VALS[key]);
					}
				});
			} else {
				Object.keys(VALS).forEach(function(key) {
					if (!localStorage.getItem(key)) {
						localStorage.setItem(key, VALS[key]);
					}
				});
			}

			// remove unused variables
			localStorage.removeItem('isPreview');
			localStorage.removeItem('windowID');
			localStorage.removeItem('useFavoriteFlickr');
			localStorage.removeItem('useFlickr');
			localStorage.removeItem('useFlickrSelections');
			localStorage.removeItem('use500px');
			localStorage.removeItem('use500pxSelections');
			localStorage.removeItem('useReddit');
			localStorage.removeItem('useRedditSelections');
		},

		/**
		 * Get the idle time in seconds
		 * @return {Integer} idle time in seconds
		 * @memberOf BGUtils
		 */
		getIdleSeconds: function() {
			const idle = app.Utils.getJSON('idleTime');
			return idle.base * 60;
		},

		/**
		 * Display the options tab
		 * @memberOf BGUtils
		 */
		showOptionsTab: function() {
			// send message to the option tab to focus it.
			chrome.runtime.sendMessage({
				message: 'highlight',
			}, null, function(response) {
				if (!response) {
					// no one listening, create it
					chrome.tabs.create({url: '../html/options.html'});
				}
			});
		},

		/**
		 * Toggle enabled state of the screen saver
		 * @memberOf BGUtils
		 */
		toggleEnabled: function() {
			localStorage.enabled = !app.Utils.getBool('enabled');
			// storage changed event not fired on same page as the change
			_processEnabled();
		},

		/**
		 * Process changes to localStorage items
		 * @param {string} key the item that changed 'all' for everything
		 * @memberOf BGUtils
		 */
		processState: function(key) {
			// Map processing functions to localStorage values
			const STATE_MAP = {
				'enabled': _processEnabled,
				'keepAwake': _processKeepAwake,
				'activeStart': _processKeepAwake,
				'activeStop': _processKeepAwake,
				'allowSuspend': _processKeepAwake,
				'idleTime': _processIdleTime,
			};
			const noop = function() {};
			let fn;

			if (key === 'all') {
				Object.keys(STATE_MAP).forEach(function(ky) {
					fn = STATE_MAP[ky];
					return fn();
				});
				// process photo SOURCES
				app.PhotoSource.processAll();
				// set os, if not already
				if (!localStorage.getItem('os')) {
					chrome.runtime.getPlatformInfo(function(info) {
						localStorage.setItem('os', info.os);
					});
				}
			} else {
				// individual change
				if (app.PhotoSource.contains(key)) {
					app.PhotoSource.process(key, function() {});
				} else {
					(STATE_MAP[key] || noop)();
				}
			}
		},

		/**
		 * Determine if the screen saver is currently showing
		 * @param {function} callback - callback(isShowing)
		 * @memberOf BGUtils
		 */
		isShowing: function(callback) {
			callback = callback || function() {};

			// send message to the screen saver to see if he is around
			chrome.runtime.sendMessage({
				message: 'isShowing',
			}, null, function(response) {
				if (response) {
					// screen saver responded
					callback(true);
				} else {
					callback(false);
				}
			});
		},

		/**
		 * Display the screen saver(s)
		 * !Important: Always request screensaver through this call
		 * @param {Boolean} single if true only show on one display
		 * @memberOf BGUtils
		 */
		displayScreenSaver: function(single) {
			if (!single && app.Utils.getBool('allDisplays')) {
				_openScreenSavers();
			} else {
				_openScreenSaver(null);
			}
		},

		/**
		 * Close all the screen saver windows
		 * @memberOf BGUtils
		 */
		closeScreenSavers: function() {
			// send message to the screen savers to close themselves
			chrome.runtime.sendMessage({
				message: 'close',
			}, function(response) {});
		},
	};
})();
