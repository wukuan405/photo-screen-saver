/*exported use500px*/
var use500px = (function() {
	'use strict';
	/*jshint camelcase: false*/
	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

	var SDK_KEY = 'f6c33b154c30f00eaf6ca8b68a0fd89674f35d56';
	var MAX_PHOTOS = 100; // 100 is api max
	var TYPE_ENUM = Object.freeze({'popular': 1, 'fresh_yesterday': 2});
	// categroies to use - we make them an array to overcome 100 photo limit per call
	var CATS = ['Animals,City and Architecture', 'Landscapes,Still Life', 'Macro,Underwater'];

	return {

		TYPE_ENUM: TYPE_ENUM,

		loadImages: function(type, name, preload) {

			try {
				_500px.init({sdk_key: SDK_KEY});
			} catch (e) {}

			for (var j = 0; j < CATS.length; j++) {
				try {
					_500px.api('/photos',{feature: type, only: CATS[j], rpp: MAX_PHOTOS, sort: 'rating', image_size: 2048}, function(response) {
						var imgs = [], img;
						var images = [], image;
						var aspectRatio;
						for (var i = 0; i < response.data.photos.length; i++) {
							var photo = response.data.photos[i];
							if (!photo.nsfw) {
								if (preload) {
									img = new Image();

									// cut out bad images
									img.onerror = function() {
										/*jshint validthis: true */
										var ims = JSON.parse(localStorage.getItem(name));
										var ind = ims.map(function(e) {return e.url;}).indexOf(this.src);
										if (ind >= 0) {
											ims.splice(ind, 1);
											localStorage.setItem(name, JSON.stringify(ims));
										}
									};
									img.src = photo.images[0].url;
									imgs.push(img);
								}

								aspectRatio = photo.width / photo.height;
								image = {};
								image.url = photo.images[0].url;
								image.author = photo.user.fullname;
								image.asp = aspectRatio.toPrecision(3);
								images.push(image);
							}
						}
						var tmp = [];
						if (localStorage.getItem(name)) {
							tmp = JSON.parse(localStorage.getItem(name));
							tmp = tmp.concat(images);
							myUtils.shuffleArray(tmp);
						} else {
							tmp = images;
						}
						localStorage.setItem(name, JSON.stringify(tmp));
					});
				} catch (e) {console.log(e);}
			}
		}
	};
})();