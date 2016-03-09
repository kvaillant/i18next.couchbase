'use strict';

var couchbase = require('couchbase');

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }


function getDefaults() {
  return {
    cluster: 'http://localhost:8091',
    bucket: 'i18next',
    password: '',
    resCollectionName: 'resources'
  };
}



var Backend = (function () {
  function Backend(services) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Backend);

    this.init(services, options);

    this.type = 'backend';
  }

  _createClass(Backend, [{
    key: 'init',
    value: function init(services, backendOptions) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var coreOptions = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      this.services = services;
      this.options = this.options || {};
      this.options.resCollectionName = this.options.resCollectionName || 'resources';

      this.options = _extends({}, getDefaults(), this.options, options);

      this.coreOptions = coreOptions;
    }
  }, {
      key: 'read',
      value: function read(language, namespace, callback) {
        var _self = this;

        if (!callback) return;

        var client = new couchbase.Cluster(_self.options.cluster);
        var bucket = client.openBucket(_self.options.bucket, _self.options.password, function (err) {
          if (err) return callback(err);
          var id = namespace + '_' + language;
          bucket.get(_self.options.resCollectionName + ':' + id, function (err, data) {
            if (err) return callback(err);

            callback(null, (data && data.value) ? data.value : {});
            bucket.disconnect(); // shutdown connection on work done
          });
        });
      }
    }, {
      key: 'readMulti',
      value: function read(languages, namespaces, callback) {
        var _self = this;

        if (!callback) return;
        if (typeof languages === 'string') languages = [languages];
        if (typeof namespaces === 'string') namespaces = [namespaces];

        var client = new couchbase.Cluster(_self.options.cluster);
        var bucket = client.openBucket(_self.options.bucket, _self.options.password, function (err) {
          if (err) return callback(err);
          var multiKeys = [];
          for(var i in languages){
              for(var j in namespaces){
                var id = namespaces[j] + '_' + languages[i];
                multiKeys.push(_self.options.resCollectionName + ':' + id);
              }
          }
          bucket.getMulti(multiKeys, function(err, result){
            if (err) return callback(err);
            var datas = {};
            for(var key in result){
              var lg = key.split('_')[1];
              var ns = key.split('_')[0].split(':')[1];
              if(!datas[lg]){
                datas[lg] = {};
              }
              datas[lg][ns] = result[key].value;
            }
            callback(null, datas);
            bucket.disconnect(); // shutdown connection on work done
          });
        });
      }
    }, {
      key: 'create',
      value: function create(languages, namespace, key, fallbackValue) {
        var _self = this;

        if (typeof languages === 'string') languages = [languages];

        var client = new couchbase.Cluster(_self.options.cluster);
        var bucket = client.openBucket(_self.options.bucket, _self.options.password, function (err) {
          if (err){
            console.error('I18next.couchbase - Error with couchbase : ',err);
          }

          languages.forEach(function (lng) {
            var id = namespace + '_' + lng;
            bucket.get(_self.options.resCollectionName + ':' + id, function (err, currentdata) {
              if (err || !currentdata ||  !currentdata.value) { // Resources not already present, we create it
                currentdata = {};
              } else if (currentdata && currentdata.value) {
                currentdata = currentdata.value;
              }
              currentdata[key] = fallbackValue;
              bucket.upsert(_self.options.resCollectionName + ':' + id, currentdata, function (err) {
                if (err){
                  console.error('I18next.couchbase - Error with couchbase : ',err);
                }
                bucket.disconnect(); // shutdown connection on work done
              });
            });
          });
        });
      }
    }]);

  return Backend;
})();

Backend.type = 'backend';

module.exports = Backend;