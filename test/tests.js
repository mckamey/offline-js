try{

module('offline.js', {
	setup: function() {
		// Reset localStorage before each test
		try {
			localStorage.clear();
		} catch(ex) {}
	},
	teardown: function() {
		// Reset localStorage after each test
		try {
			localStorage.clear();
		} catch(ex) {}
	}
});

test('set() and get() with string', function() {
	var key = 'thekey';
	var value = 'thevalue'
	offline.set(key, value, 1);
	if (offline.supported()) {
		equal(offline.get(key), value, 'Expect value to be ' + value);
	} else {
		equal(offline.get(key), null, 'Expect null value');
	}
});

test('set() and get() with number', function() {
	var key = 'numberkey';
	var value = 2;
	offline.set(key, value, 3);
	if (offline.supported()) {
		equal(typeof offline.get(key), typeof value, 'Expect value to be a ' + (typeof value));
		equal(offline.get(key), value, 'Expect incremented value to be ' + value);
	} else {
		equal(typeof offline.get(key), typeof null, 'Expect value to be a ' + (typeof null));
		equal(offline.get(key), null, 'Expect null value');
	}
});

test('set() and get() with array', function() {
	var key = 'arraykey';
	var value = ['a', 'b', 'c'];
	offline.set(key, value, 3);
	if (offline.supported()) {
		equal(offline.get(key).length, value.length, 'Expect array to have length ' + value.length);
	} else {
		equal(offline.get(key), null, 'Expect null value');
	}
});

test('set() and get() with object', function() {
	var key = 'objectkey';
	var value = {'name': 'Pamela', 'age': 26};
	offline.set(key, value, 3);
	if (offline.supported()) {
		equal(offline.get(key).name, value.name, 'Expect name to be ' + value.name);
	} else {
		equal(offline.get(key), null, 'Expect null value');
	}
});

test('fresh() with remove()', function() {
	var key = 'thekey';
	offline.set(key, 'bla', 5);

	if (offline.supported()) {
		equal(offline.fresh(key), true, 'Expect value to still be fresh');
	} else {
		equal(offline.fresh(key), false, 'Expect value to never be fresh');
	}

	offline.remove(key);

	if (offline.supported()) {
		equal(offline.fresh(key), false, 'Expect value to no longer be fresh');
	} else {
		equal(offline.fresh(key), false, 'Expect value to never be fresh');
	}
});

test('fresh() with expire()', function() {
	var key = 'thekey';
	offline.set(key, 'bla', 5);

	if (offline.supported()) {
		equal(offline.fresh(key), true, 'Expect value to still be fresh');
	} else {
		equal(offline.fresh(key), false, 'Expect value to never be fresh');
	}

	offline.expire(key);

	if (offline.supported()) {
		equal(offline.fresh(key), false, 'Expect value to no longer be fresh');
	} else {
		equal(offline.fresh(key), false, 'Expect value to never be fresh');
	}
});

test('remove()', function() {
	var key = 'thekey';
	offline.set(key, 'bla', 5);
	offline.remove(key);
	equal(offline.get(key), null, 'Expect value to be null');
});

test('flush()', function() {
	if (offline.supported()) {
		localStorage.setItem('outside-cache', 'not part of offline');
	}
	var key = 'thekey';
	offline.set(key, 'bla', 100);
	offline.flush();
	equal(offline.get(key), null, 'Expect flushed value to be null');
	if (offline.supported()) {
		equal(localStorage.getItem('outside-cache'), 'not part of offline', 'Expect localStorage value to still persist');
	}
});

test('flush() with prefix', function() {

	var key = 'thekey';
	var value1 = 'thevalue1';
	var value2 = 'thevalue2';
	var minutes = 5;
	var prefix = 'alternate';
	offline.set(key, value1, minutes);
	offline.set(prefix+key, value2, minutes);

	equal(offline.get(key), value1, 'Expect value to be ' + value1 + ' without the prefix.');
	equal(offline.get(prefix+key), value2, 'Expect value to be ' + value2 + ' with the prefix.');

	offline.flush(prefix);
	equal(offline.get(key), value1, 'Expect value to be ' + value1 + ' without the prefix.');
	equal(offline.get(prefix+key), null, 'Expect value to be null with the prefix.');
});

test('enableWarnings()', function() {
	if (!offline.supported()) {
		return;
	}

	var originalWarn = window.console.warn;
	try {
		var calls = 0;
		window.console.warn = function() { calls++; };

		var longString = (new Array(10000)).join('s');
		var num = 0;
		while(num < 10000) {
			try {
				localStorage.setItem("key" + num, longString);
				num++;
			} catch (e) {
				break;
			}
		}
		localStorage.clear()

		for (var i = 0; i <= num; i++) {
			offline.set("key" + i, longString);
		}

		// Warnings not enabled, nothing should have been logged
		equal(calls, 0);

		offline.enableWarnings(true);

		offline.set("key" + i, longString);
		equal(calls, 2, "Expect two warnings to have been printed");

	} finally {
		window.console.warn = originalWarn;
		offline.enableWarnings(false);
	}
});

test('quota exceeding', function() {
	if (!offline.supported()) {
		return;
	}

	offline.enableWarnings(true);
	try {
		var key = 'thekey';

		// Figure out this browser's localStorage limit -
		// Chrome is around 2.6 mil, for example
		var stringLength = 10000;
		var longString = (new Array(stringLength+1)).join('s');
		var num = 0;
		while(num < 10000) {
			try {
				localStorage.setItem(key + num, longString);
				num++;
			} catch (e) {
				break;
			}
		}
		localStorage.clear();
		// Now add enough to go over the limit
		var approxLimit = num * stringLength;
		var numKeys = Math.ceil(approxLimit/(stringLength+8)) + 1;
		for (var i = 0; i <= numKeys; i++) {
			var currentKey = key + i;
			offline.set(currentKey, longString, i+1);
		}
		// Test that last-to-expire is still there
		equal(offline.get(currentKey), longString, 'Expect newest value to still be there');
		// Test that the first-to-expire is kicked out
		equal(offline.get(key + '0'), null, 'Expect oldest value to be kicked out (null)');

		// Test trying to add something thats bigger than previous items,
		// check that it is successfully added (requires removal of multiple keys)
		var veryLongString = longString + longString;
		offline.set(key + 'long', veryLongString, i+1);
		equal(offline.get(key + 'long'), veryLongString, 'Expect long string to get stored');

		// Try the same with no expiry times
		localStorage.clear();
		for (var i = 0; i <= numKeys; i++) {
			var currentKey = key + i;
			offline.set(currentKey, longString);
		}
		// Test that latest added is still there
		equal(offline.get(currentKey), longString, 'Expect value to be set');
	} finally {
		offline.enableWarnings(false);
	}
});

// Do this test last since it must wait 1 minute
test('set(), get() and fresh() with expiration of 0 minutes', function() {
	expect(4);

	var key = 'thekey';
	var value = Math.PI;
	var minutes = 0;

	offline.set(key, value, minutes);

	equal(offline.fresh(key), false, 'Expect value to have expired');
	if (offline.supported()) {
		equal(offline.get(key), Math.PI, 'Expect value to exist');
	} else {
		equal(offline.get(key), null, 'Expect value to be null');
	}
	equal(offline.get(key, true), null, 'Expect value to be null');
	equal(offline.get(key), null, 'Expect value to ne null');
});

// Do this test last since it must wait 1 minute
asyncTest('set(), get() and fresh() with expiration of 1 minute', function() {
	expect(4);

	var key = 'thekey';
	var value = Math.PI;
	var minutes = 1;

	offline.set(key, value, minutes);

	setTimeout(function() {
		equal(offline.fresh(key), false, 'Expect value to have expired');
		if (offline.supported()) {
			equal(offline.get(key), Math.PI, 'Expect value to exist');
		} else {
			equal(offline.get(key), null, 'Expect value to be null');
		}
		equal(offline.get(key, true), null, 'Expect value to be null');
		equal(offline.get(key), null, 'Expect value to ne null');
		start();
	}, 1000*60*minutes);
});

}catch(ex){alert(ex);}
