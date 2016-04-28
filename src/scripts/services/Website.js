(function() {
  'use strict';

  /**=========================================================
  * File: Website.js
  * Website Service
  =========================================================*/

  var API = require('./config.js').API;

  App.factory('Website', function ($rootScope, $q, $http) {
    var api = {};

    api.get = function(name) {
      var deferred = $q.defer();
      $http
        .get(API.host + '/api/cs/websites/' + encodeURIComponent(name))
        .then(function(res){
          deferred.resolve(res.data);
        })
        .catch(function(err){
          deferred.reject(err);
        });
      return deferred.promise;
    };

    api.create = function(data) {
      var deferred = $q.defer();
      $http
        .post(API.host + '/api/cs/reports', data)
        .then(function(res){
          deferred.resolve(res.data);
        })
        .catch(function(err){
          deferred.reject(err);
        });
      return deferred.promise;
    };

    return api;
  });

})();
