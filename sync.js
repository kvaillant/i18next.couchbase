var couchbase = require('couchbase');

module.exports = {

    // __connect:__ connects the underlaying database.
    //
    // `storage.connect(callback)`
    //
    // - __callback:__ `function(err, storage){}`
    connect: function(options, callback) {
        this.isConnected = false;

        if (typeof options === 'function'){
            callback = options;
        }
        /**
         * {
	     *          cluster: 127.0.0.1:8091 (default) -- Can be one or more address:ports, separated by semi-colon, or an array
	     *          username: '',   -- Should be same as bucket name, if provided
	     *          password: '',
	     *          bucket: 'i18next' (default)
	     *          cachefile: ''
	     *          ttl: 86400,
	     *          prefix: 'sess',
	     *          operationTimeout:2000,
	                connectionTimeout:2000,
	     *      }
         */
        
        var defaults = {
        	cluster: 'http://localhost:8091',
            bucket: 'i18next',
            password: '',
            resCollectionName: 'resources'
        };

        options = mergeOptions(options, defaults);

        this.resCollectionName = options.resCollectionName;

        var self = this;

        var client = new couchbase.Cluster(options.cluster);
        var db = client.openBucket(options.bucket, options.password, function(err) {
        	function finish() {
                self.client = client;
                self.db = db;
                self.isConnected = true;

                if (callback) { return callback(null, self); }
            }

            if (err) {
                if (callback) { return callback(err); }
            } else {
                finish();
            }
        });
    },

    saveResourceSet: function(lng, ns, resourceSet, cb) {
        var id = ns + '_' + lng;
        var self = this;
        this.db.get(this.resCollectionName + ':' + id, function (err, res) {
            self.db.upsert(res._id, resourceSet, cb);
        });
    },

    fetchOne: function(lng, ns, cb) {

        var id = ns + '_' + lng;
        var self = this;

        this.db.get(this.resCollectionName + ':' + id, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if(!res || !res.value) {
                    cb(null, { });
                } else {
                    self.functions.log('loaded from couchbase: ' + id);
                    cb(null, res.value);
                }
            }
        });
    },

    saveMissing: function(lng, ns, key, defaultValue, callback) {
        // add key to resStore
        var keys = key.split(this.options.keyseparator);
        var x = 0;
        var value = this.resStore[lng][ns];
        while (keys[x]) {
            if (x === keys.length - 1) {
                value = value[keys[x]] = defaultValue;
            } else {
                value = value[keys[x]] = value[keys[x]] || {};
            }
            x++;
        }

        var self = this;
        this.saveResourceSet(lng, ns, this.resStore[lng][ns], function(err) {
            if (err) {
                self.functions.log('error saving missingKey `' + key + '` to couchbase');
            } else {
                self.functions.log('saved missingKey `' + key + '` with value `' + defaultValue + '` to couchbase');
            }
            if (typeof callback === 'function') callback(err);
        });
    },

    postChange: function(lng, ns, key, newValue, callback) {
        var self = this;

        this.load([lng], {ns: {namespaces: [ns]}}, function(err, fetched) {
            // change key in resStore
            var keys = key.split(self.options.keyseparator);
            var x = 0;
            var value = fetched[lng][ns];
            while (keys[x]) {
                if (x === keys.length - 1) {
                    value = value[keys[x]] = newValue;
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            self.saveResourceSet(lng, ns, fetched[lng][ns], function(err) {
                if (err) {
                    self.functions.log('error updating key `' + key + '` to couchbase');
                } else {
                    self.functions.log('updated key `' + key + '` with value `' + newValue + '` to couchbase');
                }
                if (typeof callback === 'function') callback(err);
            });
        });
    },

    postRemove: function(lng, ns, key, callback) {
        var self = this;

        this.load([lng], {ns: {namespaces: [ns]}}, function(err, fetched) {
            // change key in resStore
            var keys = key.split(self.options.keyseparator);
            var x = 0;
            var value = fetched[lng][ns];
            while (keys[x]) {
                if (x === keys.length - 1) {
                    delete value[keys[x]];
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            self.saveResourceSet(lng, ns, fetched[lng][ns], function(err) {
                if (err) {
                    self.functions.log('error removing key `' + key + '` to couchbase');
                } else {
                    self.functions.log('removed key `' + key + '` to couchbase');
                }
                if (typeof callback === 'function') callback(err);
            });
        });
    }

};

// helpers
// var handleResultSet = function(err, res, callback) {
//     if (err) {
//         callback(err);
//     }
//     else if (res && res.length > 0) {
//         var arr = [];

//         res.forEach(function(item) {
//             arr.push(JSON.parse(item));
//         });

//         callback(null, arr);
//     }
//     else {
//         callback(null, []);
//     }
// };

var mergeOptions = function(options, defaultOptions) {
    if (!options || typeof options === 'function') {
        return defaultOptions;
    }
    
    var merged = {};
    for (var attrname in defaultOptions) { merged[attrname] = defaultOptions[attrname]; }
    for (attrname in options) { if (options[attrname]) merged[attrname] = options[attrname]; }
    return merged;  
};
