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
          $scope.isLoading = false;
          $scope.isRunning = true;
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
          console.log('cookie saved successfully!');
        })
        .catch(function(err){
          console.log('Unable to delete cookie');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsInJvdXRlcy5qcyIsImhvbWUuanMiLCJzaXRlLmpzIiwibG9hZGVyLmpzIiwiQ29va2llLmpzIiwiV2Vic2l0ZS5qcyIsInJlbmRlcmVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBLElBQUEsTUFBQSxRQUFBLE9BQUEsVUFBQTtJQUNBO0lBQ0E7Ozs7O0FBS0EsSUFBQSxtQkFBQSxVQUFBLFlBQUE7O0VBRUEsV0FBQSxNQUFBO0lBQ0EsTUFBQTtJQUNBLGFBQUE7SUFDQSxPQUFBLENBQUEsSUFBQSxRQUFBOzs7OztBQ2RBLENBQUEsV0FBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxxRUFBQSxVQUFBLGdCQUFBLG1CQUFBLG9CQUFBOztJQUVBLGtCQUFBLFVBQUE7SUFDQSxtQkFBQSxVQUFBOzs7Ozs7SUFNQTtPQUNBLE1BQUEsUUFBQTtRQUNBLEtBQUE7UUFDQSxPQUFBO1FBQ0EsYUFBQTtRQUNBLFlBQUE7O09BRUEsTUFBQSxRQUFBO1FBQ0EsS0FBQTtRQUNBLE9BQUE7UUFDQSxhQUFBO1FBQ0EsWUFBQTs7Ozs7OztBQzVCQSxDQUFBLFdBQUE7RUFDQTs7Ozs7OztFQU9BO0tBQ0EsT0FBQTtLQUNBLFdBQUEsK0NBQUEsU0FBQSxZQUFBLFFBQUEsUUFBQTs7TUFFQSxPQUFBLGFBQUEsU0FBQSxTQUFBO1FBQ0EsR0FBQSxRQUFBLFFBQUEsZUFBQSxDQUFBLEdBQUE7VUFDQSxVQUFBLFVBQUE7O1FBRUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxNQUFBOzs7Ozs7O0FDaEJBLENBQUEsV0FBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxXQUFBLHNGQUFBLFNBQUEsWUFBQSxRQUFBLGNBQUEsVUFBQSxTQUFBLFFBQUE7O0lBRUEsT0FBQSxjQUFBLGFBQUE7SUFDQSxPQUFBLFVBQUE7SUFDQSxPQUFBLGVBQUE7SUFDQSxPQUFBLFlBQUE7SUFDQSxPQUFBLFlBQUE7SUFDQSxJQUFBLFVBQUE7SUFDQSxJQUFBLFVBQUE7O0lBRUEsSUFBQSxTQUFBLFFBQUE7SUFDQSxJQUFBLGdCQUFBLE9BQUE7SUFDQSxJQUFBLE1BQUE7O0lBRUE7O0lBRUEsU0FBQSxXQUFBO01BQ0EsZUFBQSxhQUFBOzs7SUFHQSxPQUFBLFlBQUEsU0FBQSxNQUFBO01BQ0EsT0FBQSxZQUFBO01BQ0EsT0FBQSxZQUFBO01BQ0EsTUFBQSxJQUFBLGNBQUE7UUFDQSxPQUFBO1FBQ0EsUUFBQTtRQUNBLGFBQUE7UUFDQSxPQUFBO1FBQ0EsTUFBQTs7TUFFQSxJQUFBLFFBQUE7TUFDQSxJQUFBOztNQUVBLElBQUEsWUFBQSxHQUFBLGlCQUFBLFNBQUEsSUFBQTtRQUNBLFNBQUEsVUFBQTtVQUNBLE9BQUEsWUFBQTtVQUNBLE9BQUEsWUFBQTtVQUNBLE9BQUEsZUFBQTtVQUNBLFFBQUEsSUFBQSxpQkFBQTtVQUNBOzs7TUFHQSxJQUFBLFlBQUEsR0FBQSxvQkFBQSxVQUFBO1FBQ0EsSUFBQSxZQUFBLFFBQUEsUUFBQSxJQUFBLElBQUEsU0FBQSxLQUFBLFNBQUE7VUFDQSxJQUFBLGNBQUE7VUFDQSxRQUFBLFFBQUEsU0FBQSxPQUFBO1lBQ0EsSUFBQSxZQUFBO1lBQ0EsT0FBQSxRQUFBLFFBQUEsU0FBQSxFQUFBO2NBQ0EsR0FBQSxPQUFBLFNBQUEsRUFBQSxNQUFBO2dCQUNBLFlBQUE7OztZQUdBLEdBQUEsQ0FBQSxXQUFBO2NBQ0EsT0FBQSxRQUFBLEtBQUE7Z0JBQ0EsTUFBQSxPQUFBO2dCQUNBLFFBQUEsT0FBQTtnQkFDQSxNQUFBLE9BQUE7Z0JBQ0EsUUFBQSxPQUFBO2dCQUNBLGFBQUEsT0FBQTtnQkFDQSxNQUFBLE9BQUE7Z0JBQ0EsV0FBQSxPQUFBO2dCQUNBLFNBQUEsT0FBQTs7Y0FFQSxjQUFBOzs7VUFHQSxPQUFBLFlBQUE7VUFDQSxPQUFBOztVQUVBLEdBQUEsYUFBQTtZQUNBO2VBQ0EsT0FBQTtnQkFDQSxTQUFBO2dCQUNBLFNBQUEsT0FBQTs7ZUFFQSxNQUFBLFNBQUEsSUFBQTtnQkFDQSxRQUFBLElBQUE7Ozs7Ozs7SUFPQSxPQUFBLFdBQUEsV0FBQTtNQUNBLE9BQUEsWUFBQTtNQUNBLE9BQUEsZUFBQTtNQUNBLE9BQUEsWUFBQTtNQUNBLElBQUEsWUFBQSxRQUFBLGlCQUFBLFVBQUE7UUFDQSxRQUFBLElBQUE7UUFDQSxJQUFBOzs7OztJQUtBLE9BQUEsYUFBQSxTQUFBLFFBQUEsT0FBQTtNQUNBLEVBQUEsU0FBQSxPQUFBLFNBQUE7OztJQUdBLE9BQUEsU0FBQSxTQUFBLE9BQUE7TUFDQSxFQUFBLFNBQUEsT0FBQSxZQUFBOzs7SUFHQSxPQUFBLGFBQUEsU0FBQSxRQUFBLE9BQUE7TUFDQSxFQUFBLFNBQUEsT0FBQSxZQUFBO01BQ0E7U0FDQSxLQUFBO1NBQ0EsS0FBQSxTQUFBLEtBQUE7VUFDQSxRQUFBLElBQUE7O1NBRUEsTUFBQSxTQUFBLElBQUE7VUFDQSxRQUFBLElBQUE7Ozs7SUFJQSxPQUFBLGVBQUEsU0FBQSxRQUFBLE9BQUE7TUFDQSxLQUFBO1FBQ0EsT0FBQTtRQUNBLE1BQUE7UUFDQSxNQUFBO1FBQ0Esa0JBQUE7UUFDQSxvQkFBQTtRQUNBLG1CQUFBO1FBQ0EsZ0JBQUE7UUFDQSxNQUFBO1NBQ0EsVUFBQTtRQUNBLEtBQUEsWUFBQSxJQUFBO1FBQ0EsT0FBQSxRQUFBLE9BQUEsT0FBQTtRQUNBO1dBQ0EsT0FBQSxPQUFBO1dBQ0EsTUFBQSxTQUFBLElBQUE7WUFDQSxRQUFBLElBQUE7Ozs7O0lBS0EsU0FBQSxlQUFBLFVBQUE7TUFDQTtTQUNBLElBQUE7U0FDQSxLQUFBLFNBQUEsS0FBQTtVQUNBLE9BQUEsVUFBQSxLQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsT0FBQSxVQUFBOzs7Ozs7O0FDdEpBLENBQUEsVUFBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxVQUFBLHdCQUFBLFNBQUEsV0FBQTtJQUNBLE9BQUE7TUFDQSxVQUFBO01BQ0EsTUFBQSxTQUFBLE9BQUEsU0FBQSxPQUFBOzs7UUFHQSxFQUFBLFNBQUE7Ozs7Ozs7OztBQ2RBLENBQUEsV0FBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxNQUFBLFFBQUEsZUFBQTs7RUFFQSxJQUFBLFFBQUEsd0NBQUEsVUFBQSxZQUFBLElBQUEsT0FBQTtJQUNBLElBQUEsTUFBQTs7SUFFQSxJQUFBLE9BQUEsU0FBQSxRQUFBO01BQ0EsSUFBQSxXQUFBLEdBQUE7TUFDQTtTQUNBLElBQUEsSUFBQSxPQUFBLHFCQUFBLE9BQUEsTUFBQTtTQUNBLEtBQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxRQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxPQUFBOztNQUVBLE9BQUEsU0FBQTs7O0lBR0EsSUFBQSxTQUFBLFNBQUEsTUFBQTtNQUNBLElBQUEsV0FBQSxHQUFBO01BQ0E7U0FDQSxPQUFBLElBQUEsT0FBQSxxQkFBQTtTQUNBLEtBQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxRQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxPQUFBOztNQUVBLE9BQUEsU0FBQTs7O0lBR0EsT0FBQTs7Ozs7QUN2Q0EsQ0FBQSxXQUFBO0VBQ0E7Ozs7Ozs7RUFPQSxJQUFBLE1BQUEsUUFBQSxlQUFBOztFQUVBLElBQUEsUUFBQSx5Q0FBQSxVQUFBLFlBQUEsSUFBQSxPQUFBO0lBQ0EsSUFBQSxNQUFBOztJQUVBLElBQUEsTUFBQSxTQUFBLE1BQUE7TUFDQSxJQUFBLFdBQUEsR0FBQTtNQUNBO1NBQ0EsSUFBQSxJQUFBLE9BQUEsc0JBQUEsbUJBQUE7U0FDQSxLQUFBLFNBQUEsSUFBQTtVQUNBLFNBQUEsUUFBQSxJQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxPQUFBOztNQUVBLE9BQUEsU0FBQTs7O0lBR0EsSUFBQSxTQUFBLFNBQUEsTUFBQTtNQUNBLElBQUEsV0FBQSxHQUFBO01BQ0E7U0FDQSxLQUFBLElBQUEsT0FBQSxtQkFBQTtTQUNBLEtBQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxRQUFBLElBQUE7O1NBRUEsTUFBQSxTQUFBLElBQUE7VUFDQSxTQUFBLE9BQUE7O01BRUEsT0FBQSxTQUFBOzs7SUFHQSxPQUFBOzs7Ozs7QUN0Q0EsTUFBQSxTQUFBLFFBQUE7QUFDQSxNQUFBLE9BQUEsT0FBQSxRQUFBO0FBQ0EsTUFBQSxXQUFBLE9BQUEsUUFBQTs7QUFFQSxJQUFBLHFCQUFBOztBQUVBLE1BQUEsT0FBQSxJQUFBO0FBQ0EsTUFBQSxXQUFBLElBQUEsU0FBQTtFQUNBLE9BQUE7RUFDQSxPQUFBOzs7O0FBSUEsS0FBQSxPQUFBOztBQUVBLE9BQUEsaUJBQUEsZUFBQTs7OztHQUlBLE9BQUEiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQVBQIFNUQVJUXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcbnZhciBBcHAgPSBhbmd1bGFyLm1vZHVsZSgnY3JjbGV4JywgW1xuICAgICd1aS5yb3V0ZXInLFxuICAgICdhbmd1bGFyLWp3dCdcbiAgXSk7XG5cbi8vIEFQUCBSVU5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFxuQXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG4gICRyb290U2NvcGUuYXBwID0ge1xuICAgIG5hbWU6ICdDb29raWUgU2Nhbm5lcicsXG4gICAgZGVzY3JpcHRpb246ICdDcmNsZXggQ29va2llIFNjYW5uZXInLFxuICAgIHllYXI6ICgobmV3IERhdGUoKSkuZ2V0RnVsbFllYXIoKSlcbiAgfTtcblxufSk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKio9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICogTW9kdWxlOiByb3V0ZXMuanNcbiAgICogQXBwIHJvdXRlcyBhbmQgcmVzb3VyY2VzIGNvbmZpZ3VyYXRpb25cbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cbiAgQXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZShmYWxzZSk7XG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICAgLy9cbiAgICAvLyBBcHBsaWNhdGlvbiBSb3V0ZXNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRpdGxlOiAnSG9tZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAndmlld3MvaG9tZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnc2l0ZScsIHtcbiAgICAgICAgdXJsOiAnL3NpdGUvOm5hbWUnLFxuICAgICAgICB0aXRsZTogJ1NpdGUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3NpdGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaXRlQ3RybCdcbiAgICAgIH0pO1xuXG4gIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICogRmlsZTogaG9tZS5qc1xuICAqIEhvbWVQYWdlIENvbnRyb2xsZXJcbiAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuICBhbmd1bGFyXG4gICAgLm1vZHVsZSgnY3JjbGV4JylcbiAgICAuY29udHJvbGxlcignSG9tZUN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc2NvcGUsICRzdGF0ZSkge1xuXG4gICAgICAkc2NvcGUuc3VibWl0Rm9ybSA9IGZ1bmN0aW9uKHdlYnNpdGUpIHtcbiAgICAgICAgaWYod2Vic2l0ZS5pbmRleE9mKCdodHRwOi8vJykgPT09IC0xKSB7XG4gICAgICAgICAgd2Vic2l0ZSA9ICdodHRwOi8vJyt3ZWJzaXRlO1xuICAgICAgICB9XG4gICAgICAgICRzdGF0ZS5nbygnc2l0ZScsIHtuYW1lOiB3ZWJzaXRlfSk7XG4gICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKio9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgKiBGaWxlOiBob21lLmpzXG4gICogSG9tZVBhZ2UgQ29udHJvbGxlclxuICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG4gIEFwcC5jb250cm9sbGVyKCdTaXRlQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzY29wZSwgJHN0YXRlUGFyYW1zLCAkdGltZW91dCwgV2Vic2l0ZSwgQ29va2llKSB7XG5cbiAgICAkc2NvcGUuY3VycmVudFNpdGUgPSAkc3RhdGVQYXJhbXMubmFtZTtcbiAgICAkc2NvcGUuY29va2llcyA9IFtdO1xuICAgICRzY29wZS5zaG93QWxlcnRNc2cgPSBmYWxzZTtcbiAgICAkc2NvcGUuaXNMb2FkaW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLmlzUnVubmluZyA9IGZhbHNlO1xuICAgIHZhciB3ZWJ2aWV3ID0gbnVsbDtcbiAgICB2YXIgY29va2llcyA9IFtdO1xuXG4gICAgdmFyIHJlbW90ZSA9IHJlcXVpcmUoJ3JlbW90ZScpO1xuICAgIHZhciBCcm93c2VyV2luZG93ID0gcmVtb3RlLkJyb3dzZXJXaW5kb3c7XG4gICAgdmFyIHdpbiA9IG51bGw7XG5cbiAgICBhY3RpdmF0ZSgpO1xuXG4gICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gICAgICBnZXRTaXRlQ29va2llcygkc3RhdGVQYXJhbXMubmFtZSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnN0YXJ0U2NhbiA9IGZ1bmN0aW9uKHNpdGUpIHtcbiAgICAgICRzY29wZS5pc0xvYWRpbmcgPSB0cnVlO1xuICAgICAgJHNjb3BlLmlzUnVubmluZyA9IHRydWU7XG4gICAgICB3aW4gPSBuZXcgQnJvd3NlcldpbmRvdyh7XG4gICAgICAgIHdpZHRoOiA4MDAsXG4gICAgICAgIGhlaWdodDogNjAwLFxuICAgICAgICB3ZWJTZWN1cml0eTogZmFsc2UsXG4gICAgICAgIGZyYW1lOiBmYWxzZSxcbiAgICAgICAgc2hvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgd2luLmxvYWRVUkwoc2l0ZSk7XG4gICAgICB3aW4uc2hvdygpO1xuXG4gICAgICB3aW4ud2ViQ29udGVudHMub24oJ2RpZC1mYWlsLWxvYWQnLCBmdW5jdGlvbihlcnIpe1xuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICRzY29wZS5pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUuaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgICAkc2NvcGUuc2hvd0FsZXJ0TXNnID0gZmFsc2U7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2RpZC1mYWlsLWxvYWQnLCBlcnIpO1xuICAgICAgICB9LDApO1xuICAgICAgfSk7XG5cbiAgICAgIHdpbi53ZWJDb250ZW50cy5vbignZGlkLXN0b3AtbG9hZGluZycsIGZ1bmN0aW9uKCl7XG4gICAgICAgIHdpbi53ZWJDb250ZW50cy5zZXNzaW9uLmNvb2tpZXMuZ2V0KHt9LCBmdW5jdGlvbihlcnIsIGNvb2tpZXMpIHtcbiAgICAgICAgICB2YXIgaXNJbnNlcnROZXcgPSBmYWxzZTtcbiAgICAgICAgICBjb29raWVzLmZvckVhY2goZnVuY3Rpb24oY29va2llKXtcbiAgICAgICAgICAgIHZhciBpc1ByZXNlbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5jb29raWVzLmZvckVhY2goZnVuY3Rpb24oYyl7XG4gICAgICAgICAgICAgIGlmKGNvb2tpZS5uYW1lID09PSBjLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBpc1ByZXNlbnQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmKCFpc1ByZXNlbnQpIHtcbiAgICAgICAgICAgICAgJHNjb3BlLmNvb2tpZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogY29va2llLm5hbWUsXG4gICAgICAgICAgICAgICAgZG9tYWluOiBjb29raWUuZG9tYWluLFxuICAgICAgICAgICAgICAgIHBhdGg6IGNvb2tpZS5wYXRoLFxuICAgICAgICAgICAgICAgIHNlY3VyZTogY29va2llLnNlY3VyZSxcbiAgICAgICAgICAgICAgICBmaXJzdF9wYXJ0eTogY29va2llLmhvc3RPbmx5LFxuICAgICAgICAgICAgICAgIGh0dHA6IGNvb2tpZS5odHRwT25seSxcbiAgICAgICAgICAgICAgICBleHBpcmVfYXQ6IGNvb2tpZS5leHBpcmF0aW9uRGF0ZSxcbiAgICAgICAgICAgICAgICBzZXNzaW9uOiBjb29raWUuc2Vzc2lvblxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgaXNJbnNlcnROZXcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgICRzY29wZS5pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgLy8gU2F2ZSBDb29raWVzXG4gICAgICAgICAgaWYoaXNJbnNlcnROZXcpIHtcbiAgICAgICAgICAgIFdlYnNpdGVcbiAgICAgICAgICAgICAgLmNyZWF0ZSh7XG4gICAgICAgICAgICAgICAgd2Vic2l0ZTogc2l0ZSxcbiAgICAgICAgICAgICAgICBjb29raWVzOiAkc2NvcGUuY29va2llc1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW5hYmxlIHRvIHBvc3QgY29va2llcycpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zdG9wU2NhbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLmlzTG9hZGluZyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLnNob3dBbGVydE1zZyA9IGZhbHNlO1xuICAgICAgJHNjb3BlLmlzUnVubmluZyA9IGZhbHNlO1xuICAgICAgd2luLndlYkNvbnRlbnRzLnNlc3Npb24uY2xlYXJTdG9yYWdlRGF0YShmdW5jdGlvbigpe1xuICAgICAgICBjb25zb2xlLmxvZygnZGF0YSBjbGVhcmVkJyk7XG4gICAgICAgIHdpbi5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgJHNjb3BlLmVkaXRDb29raWUgPSBmdW5jdGlvbihjb29raWUsIGluZGV4KSB7XG4gICAgICAkKCcubGluZS0nK2luZGV4KS5hZGRDbGFzcygnZWRpdC1tb2RlJyk7XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJCgnLmxpbmUtJytpbmRleCkucmVtb3ZlQ2xhc3MoJ2VkaXQtbW9kZScpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2F2ZUNvb2tpZSA9IGZ1bmN0aW9uKGNvb2tpZSwgaW5kZXgpIHtcbiAgICAgICQoJy5saW5lLScraW5kZXgpLnJlbW92ZUNsYXNzKCdlZGl0LW1vZGUnKTtcbiAgICAgIENvb2tpZVxuICAgICAgICAuZWRpdChjb29raWUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdjb29raWUgc2F2ZWQgc3VjY2Vzc2Z1bGx5IScpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICBjb25zb2xlLmxvZygnVW5hYmxlIHRvIGRlbGV0ZSBjb29raWUnKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5kZWxldGVDb29raWUgPSBmdW5jdGlvbihjb29raWUsIGluZGV4KSB7XG4gICAgICBzd2FsKHtcbiAgICAgICAgdGl0bGU6IFwiQXJlIHlvdSBzdXJlP1wiLFxuICAgICAgICB0ZXh0OiBcIllvdSB3aWxsIG5vdCBiZSBhYmxlIHRvIHJlY292ZXIgdGhpcyBjb29raWUhXCIsXG4gICAgICAgIHR5cGU6IFwid2FybmluZ1wiLFxuICAgICAgICBzaG93Q2FuY2VsQnV0dG9uOiB0cnVlLFxuICAgICAgICBjb25maXJtQnV0dG9uQ29sb3I6IFwiI0RENkI1NVwiLFxuICAgICAgICBjb25maXJtQnV0dG9uVGV4dDogXCJZZXMsIGRlbGV0ZSBpdCFcIixcbiAgICAgICAgY2xvc2VPbkNvbmZpcm06IGZhbHNlLFxuICAgICAgICBodG1sOiBmYWxzZVxuICAgICAgfSwgZnVuY3Rpb24oKXtcbiAgICAgICAgc3dhbChcIkRlbGV0ZWQhXCIsIFwiXCIsIFwic3VjY2Vzc1wiKTtcbiAgICAgICAgJHNjb3BlLmNvb2tpZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgQ29va2llXG4gICAgICAgICAgLmRlbGV0ZShjb29raWUubmFtZSlcbiAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVbmFibGUgdG8gZGVsZXRlIGNvb2tpZScpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldFNpdGVDb29raWVzKHNpdGVOYW1lKSB7XG4gICAgICBXZWJzaXRlXG4gICAgICAgIC5nZXQoc2l0ZU5hbWUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICRzY29wZS5jb29raWVzID0gZGF0YS5jb29raWVzO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAkc2NvcGUuY29va2llcyA9IFtdO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKio9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICogTW9kdWxlOiBsb2FkZXIuanNcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL0Nvbm5vckF0aGVydG9uL2xvYWRlcnMuY3NzXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG4gIEFwcC5kaXJlY3RpdmUoJ2xvYWRlcicsIGZ1bmN0aW9uKCRsb2NhdGlvbikge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogXCJBXCIsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblxuICAgICAgICAvLyBJbmplY3QgdGhlIGNvcnJlY3QgbnVtYmVyIG9mIGRpdiBlbGVtZW50cyBmb3IgZWFjaCBhbmltYXRpb25cbiAgICAgICAgJChlbGVtZW50KS5sb2FkZXJzKCk7XG5cbiAgICAgIH1cbiAgICB9O1xuXG4gIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICogRmlsZTogQ29va2llLmpzXG4gICogQ29va2llIFNlcnZpY2VcbiAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuICB2YXIgQVBJID0gcmVxdWlyZSgnLi9jb25maWcuanMnKS5BUEk7XG5cbiAgQXBwLmZhY3RvcnkoJ0Nvb2tpZScsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgJGh0dHApIHtcbiAgICB2YXIgYXBpID0ge307XG5cbiAgICBhcGkuZWRpdCA9IGZ1bmN0aW9uKGNvb2tpZSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICRodHRwXG4gICAgICAgIC5wdXQoQVBJLmhvc3QgKyAnL2FwaS9jcy9jb29raWVzLycgKyBjb29raWUubmFtZSwgY29va2llKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfTtcblxuICAgIGFwaS5kZWxldGUgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgJGh0dHBcbiAgICAgICAgLmRlbGV0ZShBUEkuaG9zdCArICcvYXBpL2NzL2Nvb2tpZXMvJyArIG5hbWUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKio9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgKiBGaWxlOiBXZWJzaXRlLmpzXG4gICogV2Vic2l0ZSBTZXJ2aWNlXG4gID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cbiAgdmFyIEFQSSA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJykuQVBJO1xuXG4gIEFwcC5mYWN0b3J5KCdXZWJzaXRlJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCAkaHR0cCkge1xuICAgIHZhciBhcGkgPSB7fTtcblxuICAgIGFwaS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgJGh0dHBcbiAgICAgICAgLmdldChBUEkuaG9zdCArICcvYXBpL2NzL3dlYnNpdGVzLycgKyBlbmNvZGVVUklDb21wb25lbnQobmFtZSkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMuZGF0YSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG5cbiAgICBhcGkuY3JlYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICRodHRwXG4gICAgICAgIC5wb3N0KEFQSS5ob3N0ICsgJy9hcGkvY3MvcmVwb3J0cycsIGRhdGEpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcyl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMuZGF0YSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG5cbiAgICByZXR1cm4gYXBpO1xuICB9KTtcblxufSkoKTtcbiIsIi8vIEFkZHMgYSByaWdodC1jbGljayBtZW51IHdpdGggJ0luc3BlY3QgRWxlbWVudCcgb3B0aW9uXG5jb25zdCByZW1vdGUgPSByZXF1aXJlKCdyZW1vdGUnKTtcbmNvbnN0IE1lbnUgPSByZW1vdGUucmVxdWlyZSgnbWVudScpO1xuY29uc3QgTWVudUl0ZW0gPSByZW1vdGUucmVxdWlyZSgnbWVudS1pdGVtJyk7XG5cbmxldCByaWdodENsaWNrUG9zaXRpb24gPSBudWxsO1xuXG5jb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcbmNvbnN0IG1lbnVJdGVtID0gbmV3IE1lbnVJdGVtKHtcbiAgbGFiZWw6ICdJbnNwZWN0IEVsZW1lbnQnLFxuICBjbGljazogKCkgPT4ge1xuICAgIHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkuaW5zcGVjdEVsZW1lbnQocmlnaHRDbGlja1Bvc2l0aW9uLngsIHJpZ2h0Q2xpY2tQb3NpdGlvbi55KTtcbiAgfVxufSk7XG5tZW51LmFwcGVuZChtZW51SXRlbSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIChlKSA9PiB7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgcmlnaHRDbGlja1Bvc2l0aW9uID0ge3g6IGUueCwgeTogZS55fTtcbiAgbWVudS5wb3B1cChyZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpKTtcbn0sIGZhbHNlKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
