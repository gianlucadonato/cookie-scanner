// APP START
// ----------------------------------- 
var App = angular.module('crclex', [
    'ui.router',
    'angular-jwt'
  ]);

// APP RUN
// ----------------------------------- 
App.run(function ($rootScope) {

  $rootScope.app = {
    name: 'Cookie Scanner',
    description: 'Crclex Cookie Scanner',
    year: ((new Date()).getFullYear())
  };

});
