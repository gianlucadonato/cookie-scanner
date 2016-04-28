(function() {
  'use strict';

  /**=========================================================
   * Module: routes.js
   * App routes and resources configuration
   =========================================================*/

  App.config(function ($stateProvider, $locationProvider, $urlRouterProvider) {

    $locationProvider.html5Mode(false);
    $urlRouterProvider.otherwise('/');

    //
    // Application Routes
    // -----------------------------------

    $stateProvider
      .state('home', {
        url: '/',
        title: 'Home',
        templateUrl: 'views/home.html',
        controller: 'HomeCtrl'
      })
      .state('site', {
        url: '/site/:name',
        title: 'Site',
        templateUrl: 'views/site.html',
        controller: 'SiteCtrl'
      });

  });

})();
