(function() {
  'use strict';

  /**=========================================================
  * File: Cookie.js
  * Cookie Service
  =========================================================*/

  var API = require('./config.js').API;

  App.factory('Cookie', function ($rootScope, $q, $http) {
    var api = {};

    api.edit = function(cookie) {
      var deferred = $q.defer();
      $http
        .put(API.host + '/api/cs/cookies/' + cookie.name, cookie)
        .then(function(res){
          deferred.resolve(res);
        })
        .catch(function(err){
          deferred.reject(err);
        });
      return deferred.promise;
    };

    api.delete = function(name) {
      var deferred = $q.defer();
      $http
        .delete(API.host + '/api/cs/cookies/' + name)
        .then(function(res){
          deferred.resolve(res);
        })
        .catch(function(err){
          deferred.reject(err);
        });
      return deferred.promise;
    };

    return api;
  });

})();
