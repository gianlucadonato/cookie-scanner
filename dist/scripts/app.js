// APP START
// ----------------------------------- 
var App = angular.module('crclex', [
    'ui.router',
    'angular-jwt'
  ]);

// APP RUN
// ----------------------------------- 
App.run(["$rootScope", function ($rootScope) {

  $rootScope.app = {
    name: 'Cookie Scanner',
    description: 'Crclex Cookie Scanner',
    year: ((new Date()).getFullYear())
  };

}]);

(function() {
  'use strict';

  /**=========================================================
   * Module: routes.js
   * App routes and resources configuration
   =========================================================*/

  App.config(["$stateProvider", "$locationProvider", "$urlRouterProvider", function ($stateProvider, $locationProvider, $urlRouterProvider) {

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

  }]);

})();

(function() {
  'use strict';

  /**=========================================================
  * File: home.js
  * HomePage Controller
  =========================================================*/

  angular
    .module('crclex')
    .controller('HomeCtrl', ["$rootScope", "$scope", "$state", function($rootScope, $scope, $state) {

      $scope.submitForm = function(website) {
        if(website.indexOf('http://') === -1) {
          website = 'http://'+website;
        }
        $state.go('site', {name: website});
      };

    }]);

})();

(function() {
  'use strict';

  /**=========================================================
  * File: home.js
  * HomePage Controller
  =========================================================*/

  App.controller('SiteCtrl', ["$rootScope", "$scope", "$stateParams", "$timeout", "Website", "Cookie", function($rootScope, $scope, $stateParams, $timeout, Website, Cookie) {

    $scope.currentSite = $stateParams.name;
    $scope.cookies = [];
    $scope.showAlertMsg = false;
    $scope.isLoading = false;
    $scope.isRunning = false;
    var webview = null;
    var cookies = [];

    var remote = require('remote');
    var BrowserWindow = remote.BrowserWindow;
    var win = null;

    activate();

    function activate() {
      getSiteCookies($stateParams.name);
    }

    $scope.startScan = function(site) {
      $scope.isLoading = true;
      $scope.isRunning = true;
      win = new BrowserWindow({
        width: 800,
        height: 600,
        webSecurity: false,
        frame: false,
        show: false
      });
      win.loadURL(site);
      win.show();

      win.webContents.on('did-fail-load', function(err){
        $timeout(function(){
          $scope.showAlertMsg = false;
          console.log('did-fail-load', err);
        },0);
      });

      win.webContents.on('did-stop-loading', function(){
        win.webContents.session.cookies.get({}, function(err, cookies) {
          var isInsertNew = false;
          cookies.forEach(function(cookie){
            var isPresent = false;
            $scope.cookies.forEach(function(c){
              if(cookie.name === c.name) {
                isPresent = true;
              }
            });
            if(!isPresent) {
              $scope.cookies.push({
                name: cookie.name,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                first_party: cookie.hostOnly,
                http: cookie.httpOnly,
                expire_at: cookie.expirationDate,
                session: cookie.session
              });
              isInsertNew = true;
            }
          });
          $scope.isLoading = false;
          $scope.$apply();
          // Save Cookies
          if(isInsertNew) {
            Website
              .create({
                website: site,
                cookies: $scope.cookies
              })
              .catch(function(err){
                console.log('Unable to post cookies');
              });
          }
        });
      });
    };

    $scope.stopScan = function() {
      $scope.isLoading = false;
      $scope.showAlertMsg = false;
      $scope.isRunning = false;
      win.webContents.session.clearStorageData(function(){
        console.log('data cleared');
        win.close();
      });
    };


    $scope.editCookie = function(cookie, index) {
      $('.line-'+index).addClass('edit-mode');
    };

    $scope.cancel = function(index) {
      $('.line-'+index).removeClass('edit-mode');
    };

    $scope.saveCookie = function(cookie, index) {
      $('.line-'+index).removeClass('edit-mode');
      Cookie
        .edit(cookie)
        .then(function(data){
          console.log('cookie updated successfully!');
        })
        .catch(function(err){
          console.log('Unable to update cookie');
        });
    };

    $scope.deleteCookie = function(cookie, index) {
      swal({
        title: "Are you sure?",
        text: "You will not be able to recover this cookie!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: false,
        html: false
      }, function(){
        swal("Deleted!", "", "success");
        $scope.cookies.splice(index, 1);
        Cookie
          .delete(cookie.name)
          .catch(function(err){
            console.log('Unable to delete cookie');
          });
      });
    };

    function getSiteCookies(siteName) {
      Website
        .get(siteName)
        .then(function(data){
          $scope.cookies = data.cookies;
        })
        .catch(function(err){
          $scope.cookies = [];
        });
    }
  }]);

})();

(function(){
  'use strict';

  /**=========================================================
   * Module: loader.js
   * https://github.com/ConnorAtherton/loaders.css
   =========================================================*/

  App.directive('loader', ["$location", function($location) {
    return {
      restrict: "A",
      link: function(scope, element, attrs) {

        // Inject the correct number of div elements for each animation
        $(element).loaders();

      }
    };

  }]);

})();

(function() {
  'use strict';

  /**=========================================================
  * File: Cookie.js
  * Cookie Service
  =========================================================*/

  var API = require('./config.js').API;

  App.factory('Cookie', ["$rootScope", "$q", "$http", function ($rootScope, $q, $http) {
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
  }]);

})();

(function() {
  'use strict';

  /**=========================================================
  * File: Website.js
  * Website Service
  =========================================================*/

  var API = require('./config.js').API;

  App.factory('Website', ["$rootScope", "$q", "$http", function ($rootScope, $q, $http) {
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
  }]);

})();

// Adds a right-click menu with 'Inspect Element' option
const remote = require('remote');
const Menu = remote.require('menu');
const MenuItem = remote.require('menu-item');

let rightClickPosition = null;

const menu = new Menu();
const menuItem = new MenuItem({
  label: 'Inspect Element',
  click: () => {
    remote.getCurrentWindow().inspectElement(rightClickPosition.x, rightClickPosition.y);
  }
});
menu.append(menuItem);

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  rightClickPosition = {x: e.x, y: e.y};
  menu.popup(remote.getCurrentWindow());
}, false);