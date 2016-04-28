(function() {
  'use strict';

  /**=========================================================
  * File: home.js
  * HomePage Controller
  =========================================================*/

  angular
    .module('crclex')
    .controller('HomeCtrl', function($rootScope, $scope, $state) {

      $scope.submitForm = function(website) {
        if(website.indexOf('http://') === -1) {
          website = 'http://'+website;
        }
        $state.go('site', {name: website});
      };

    });

})();
