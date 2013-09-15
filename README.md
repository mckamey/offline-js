[Offline data cache (offline.js)](http://github.com/mckamey/offline-js)
=======================================================================

`offline.js` enables access to recently retrieved data when the application becomes disconnected.
It can also act as a simple expiring data cache, or as a wrapper for localStorage access.

This library does not depend on anything else besides [DOM Storage](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Storage).
If localStorage is not available, then it will simply not ever hold anything in cache. Nothing needs to change from the client perspective.

Primary Usage Pattern
---------------------

To achieve both an expiring cache (for recently requested data) as well as an offline data cache, this is the pattern to integrate into your remote data access.
To achieve just an offline data cache, skip step 1 or set `expiry` to zero.

1. If `offline.fresh(key)`, then return `offline.get(key)`.
2. Otherwise, execute remote API call.
3. If remote API call was successful, store `offline.set(key, value, expiry)` and return `value`.
4. If remote API call failed (e.g., `status === 0`), attempt `offline.get(key)`.
5. If `value` is missing, notify caller of offline/remote error.

lscache
-------

This library began as a fork of the excellent [lscache](https://github.com/pamelafox/lscache) by Pamela Fox.
While trying to implement the offline usage pattern, it became clear that some breaking changes needed to be made to the interface.
Rather than confuse the two libraries, `offline.js` deviates from `lscache.js` to solve a related but slightly different problem:

- Additional methods were added to allow insight into freshness of cached items and the expiring of items without removing.
- `offline.get()` does not automatically remove items by default.
There is an optional argument to achieve that effect.
- Data stored without expiry times are given an expiry of `MAX_DATE/2`.
This enables expunging non-expiring values by insertion time but they still effectively never expire.
- The storage format has been altered to make a little easier to read with smaller keys and expiry values.
- All data values are JSON encoded (including strings, unlike in lscache) to avoid ambiguity with JSON-like string values.
- The additional space required is more than made up for by shorter keys and expiry values.
- The concept of "buckets" has been removed in favor of being able to `flush()` items with a prefix.
The purpose is the same but the usage is simpler and less error prone.

Online / Offline Events
-----------------------

Initially, this was going to incorporate hooks for [HTML 5 Online/Offline events](https://developer.mozilla.org/en-US/docs/Online_and_offline_events).
Ultimately, this seemed to only be partially useful and [potentially broken](http://remysharp.com/2011/04/19/broken-offline-support/).
Even in browsers where `navigator.onLine` is implemented to spec, it doesn't apply to the situation where the remote API is unavailable.
The decision has therefore been made to allow the application to decide what is considered "offline".
Typically, this is implemented as a status of `0` as opposed to the server response of the `400`-`500` range.

Methods
-------

### `value = offline.get(key, expunge)`

Retrieves a previously stored value, optionally removing stale data.

#### Arguments

- `string` **key**: the storage key
- `boolean` **expunge** (optional): if should auto-remove expired items

#### Returns

- `object|array|string|number|boolean|null`: the storage value

### `offline.set(key, value, expiry)`

Stores the key-value pair with a freshness time limit.

#### Arguments

- `string` **key**: the storage key
- `object|array|string|number|boolean|null` **value**: the storage value
- `number` **expiry** (optional): the number of minutes before value is stale

### `isFresh = offline.fresh(key)`

Tests the expiration of the data. Returns false if the value is stale or missing.

#### Arguments

- `string` **key**: the storage key

#### Returns

- `boolean`: if the value has expired or is missing

### `offline.expire(key)`

If still fresh then marks the data as now expired.

#### Arguments

- `string` **key**: the storage key

### `offline.remove(key)`

Removes the data stored at `key`.

#### Arguments

- `string` **key**: the storage key

### `offline.flush(prefix)`

Removes all data with the given key prefix.

#### Arguments

- `string` **prefix** (optional): the storage key

### `offline.enableWarnings(enabled)`

Enables or disables log warnings on quota or insertion errors.

#### Arguments

- `boolean` **enabled**: true to enable warnings

### `hasLocalStorage = offline.supported()`

Tests the support of localStorage.

#### Returns

- `boolean`: if localStorage is supported.

Unit Tests
----------

Run the [unit tests](./test/unit.html).

License
-------

[offline.js](http://github.com/mckamey/offline-js) is licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).  
Copyright &copy; 2013, [Stephen M. McKamey](http://mck.me).

offline.js is a derivative work of [lscache](https://github.com/pamelafox/lscache) which is also licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).  
Copyright &copy; 2011, Pamela Fox.