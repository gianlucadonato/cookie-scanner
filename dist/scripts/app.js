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
          $scope.isRunning = false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsInJvdXRlcy5qcyIsImhvbWUuanMiLCJzaXRlLmpzIiwibG9hZGVyLmpzIiwiQ29va2llLmpzIiwiV2Vic2l0ZS5qcyIsInJlbmRlcmVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBLElBQUEsTUFBQSxRQUFBLE9BQUEsVUFBQTtJQUNBO0lBQ0E7Ozs7O0FBS0EsSUFBQSxtQkFBQSxVQUFBLFlBQUE7O0VBRUEsV0FBQSxNQUFBO0lBQ0EsTUFBQTtJQUNBLGFBQUE7SUFDQSxPQUFBLENBQUEsSUFBQSxRQUFBOzs7OztBQ2RBLENBQUEsV0FBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxxRUFBQSxVQUFBLGdCQUFBLG1CQUFBLG9CQUFBOztJQUVBLGtCQUFBLFVBQUE7SUFDQSxtQkFBQSxVQUFBOzs7Ozs7SUFNQTtPQUNBLE1BQUEsUUFBQTtRQUNBLEtBQUE7UUFDQSxPQUFBO1FBQ0EsYUFBQTtRQUNBLFlBQUE7O09BRUEsTUFBQSxRQUFBO1FBQ0EsS0FBQTtRQUNBLE9BQUE7UUFDQSxhQUFBO1FBQ0EsWUFBQTs7Ozs7OztBQzVCQSxDQUFBLFdBQUE7RUFDQTs7Ozs7OztFQU9BO0tBQ0EsT0FBQTtLQUNBLFdBQUEsK0NBQUEsU0FBQSxZQUFBLFFBQUEsUUFBQTs7TUFFQSxPQUFBLGFBQUEsU0FBQSxTQUFBO1FBQ0EsR0FBQSxRQUFBLFFBQUEsZUFBQSxDQUFBLEdBQUE7VUFDQSxVQUFBLFVBQUE7O1FBRUEsT0FBQSxHQUFBLFFBQUEsQ0FBQSxNQUFBOzs7Ozs7O0FDaEJBLENBQUEsV0FBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxXQUFBLHNGQUFBLFNBQUEsWUFBQSxRQUFBLGNBQUEsVUFBQSxTQUFBLFFBQUE7O0lBRUEsT0FBQSxjQUFBLGFBQUE7SUFDQSxPQUFBLFVBQUE7SUFDQSxPQUFBLGVBQUE7SUFDQSxPQUFBLFlBQUE7SUFDQSxPQUFBLFlBQUE7SUFDQSxJQUFBLFVBQUE7SUFDQSxJQUFBLFVBQUE7O0lBRUEsSUFBQSxTQUFBLFFBQUE7SUFDQSxJQUFBLGdCQUFBLE9BQUE7SUFDQSxJQUFBLE1BQUE7O0lBRUE7O0lBRUEsU0FBQSxXQUFBO01BQ0EsZUFBQSxhQUFBOzs7SUFHQSxPQUFBLFlBQUEsU0FBQSxNQUFBO01BQ0EsT0FBQSxZQUFBO01BQ0EsT0FBQSxZQUFBO01BQ0EsTUFBQSxJQUFBLGNBQUE7UUFDQSxPQUFBO1FBQ0EsUUFBQTtRQUNBLGFBQUE7UUFDQSxPQUFBO1FBQ0EsTUFBQTs7TUFFQSxJQUFBLFFBQUE7TUFDQSxJQUFBOztNQUVBLElBQUEsWUFBQSxHQUFBLGlCQUFBLFNBQUEsSUFBQTtRQUNBLFNBQUEsVUFBQTtVQUNBLE9BQUEsWUFBQTtVQUNBLE9BQUEsWUFBQTtVQUNBLE9BQUEsZUFBQTtVQUNBLFFBQUEsSUFBQSxpQkFBQTtVQUNBOzs7TUFHQSxJQUFBLFlBQUEsR0FBQSxvQkFBQSxVQUFBO1FBQ0EsSUFBQSxZQUFBLFFBQUEsUUFBQSxJQUFBLElBQUEsU0FBQSxLQUFBLFNBQUE7VUFDQSxJQUFBLGNBQUE7VUFDQSxRQUFBLFFBQUEsU0FBQSxPQUFBO1lBQ0EsSUFBQSxZQUFBO1lBQ0EsT0FBQSxRQUFBLFFBQUEsU0FBQSxFQUFBO2NBQ0EsR0FBQSxPQUFBLFNBQUEsRUFBQSxNQUFBO2dCQUNBLFlBQUE7OztZQUdBLEdBQUEsQ0FBQSxXQUFBO2NBQ0EsT0FBQSxRQUFBLEtBQUE7Z0JBQ0EsTUFBQSxPQUFBO2dCQUNBLFFBQUEsT0FBQTtnQkFDQSxNQUFBLE9BQUE7Z0JBQ0EsUUFBQSxPQUFBO2dCQUNBLGFBQUEsT0FBQTtnQkFDQSxNQUFBLE9BQUE7Z0JBQ0EsV0FBQSxPQUFBO2dCQUNBLFNBQUEsT0FBQTs7Y0FFQSxjQUFBOzs7VUFHQSxPQUFBLFlBQUE7VUFDQSxPQUFBOztVQUVBLEdBQUEsYUFBQTtZQUNBO2VBQ0EsT0FBQTtnQkFDQSxTQUFBO2dCQUNBLFNBQUEsT0FBQTs7ZUFFQSxNQUFBLFNBQUEsSUFBQTtnQkFDQSxRQUFBLElBQUE7Ozs7Ozs7SUFPQSxPQUFBLFdBQUEsV0FBQTtNQUNBLE9BQUEsWUFBQTtNQUNBLE9BQUEsZUFBQTtNQUNBLE9BQUEsWUFBQTtNQUNBLElBQUEsWUFBQSxRQUFBLGlCQUFBLFVBQUE7UUFDQSxRQUFBLElBQUE7UUFDQSxJQUFBOzs7OztJQUtBLE9BQUEsYUFBQSxTQUFBLFFBQUEsT0FBQTtNQUNBLEVBQUEsU0FBQSxPQUFBLFNBQUE7OztJQUdBLE9BQUEsU0FBQSxTQUFBLE9BQUE7TUFDQSxFQUFBLFNBQUEsT0FBQSxZQUFBOzs7SUFHQSxPQUFBLGFBQUEsU0FBQSxRQUFBLE9BQUE7TUFDQSxFQUFBLFNBQUEsT0FBQSxZQUFBO01BQ0E7U0FDQSxLQUFBO1NBQ0EsS0FBQSxTQUFBLEtBQUE7VUFDQSxRQUFBLElBQUE7O1NBRUEsTUFBQSxTQUFBLElBQUE7VUFDQSxRQUFBLElBQUE7Ozs7SUFJQSxPQUFBLGVBQUEsU0FBQSxRQUFBLE9BQUE7TUFDQSxLQUFBO1FBQ0EsT0FBQTtRQUNBLE1BQUE7UUFDQSxNQUFBO1FBQ0Esa0JBQUE7UUFDQSxvQkFBQTtRQUNBLG1CQUFBO1FBQ0EsZ0JBQUE7UUFDQSxNQUFBO1NBQ0EsVUFBQTtRQUNBLEtBQUEsWUFBQSxJQUFBO1FBQ0EsT0FBQSxRQUFBLE9BQUEsT0FBQTtRQUNBO1dBQ0EsT0FBQSxPQUFBO1dBQ0EsTUFBQSxTQUFBLElBQUE7WUFDQSxRQUFBLElBQUE7Ozs7O0lBS0EsU0FBQSxlQUFBLFVBQUE7TUFDQTtTQUNBLElBQUE7U0FDQSxLQUFBLFNBQUEsS0FBQTtVQUNBLE9BQUEsVUFBQSxLQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsT0FBQSxVQUFBOzs7Ozs7O0FDdEpBLENBQUEsVUFBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxVQUFBLHdCQUFBLFNBQUEsV0FBQTtJQUNBLE9BQUE7TUFDQSxVQUFBO01BQ0EsTUFBQSxTQUFBLE9BQUEsU0FBQSxPQUFBOzs7UUFHQSxFQUFBLFNBQUE7Ozs7Ozs7OztBQ2RBLENBQUEsV0FBQTtFQUNBOzs7Ozs7O0VBT0EsSUFBQSxNQUFBLFFBQUEsZUFBQTs7RUFFQSxJQUFBLFFBQUEsd0NBQUEsVUFBQSxZQUFBLElBQUEsT0FBQTtJQUNBLElBQUEsTUFBQTs7SUFFQSxJQUFBLE9BQUEsU0FBQSxRQUFBO01BQ0EsSUFBQSxXQUFBLEdBQUE7TUFDQTtTQUNBLElBQUEsSUFBQSxPQUFBLHFCQUFBLE9BQUEsTUFBQTtTQUNBLEtBQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxRQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxPQUFBOztNQUVBLE9BQUEsU0FBQTs7O0lBR0EsSUFBQSxTQUFBLFNBQUEsTUFBQTtNQUNBLElBQUEsV0FBQSxHQUFBO01BQ0E7U0FDQSxPQUFBLElBQUEsT0FBQSxxQkFBQTtTQUNBLEtBQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxRQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxPQUFBOztNQUVBLE9BQUEsU0FBQTs7O0lBR0EsT0FBQTs7Ozs7QUN2Q0EsQ0FBQSxXQUFBO0VBQ0E7Ozs7Ozs7RUFPQSxJQUFBLE1BQUEsUUFBQSxlQUFBOztFQUVBLElBQUEsUUFBQSx5Q0FBQSxVQUFBLFlBQUEsSUFBQSxPQUFBO0lBQ0EsSUFBQSxNQUFBOztJQUVBLElBQUEsTUFBQSxTQUFBLE1BQUE7TUFDQSxJQUFBLFdBQUEsR0FBQTtNQUNBO1NBQ0EsSUFBQSxJQUFBLE9BQUEsc0JBQUEsbUJBQUE7U0FDQSxLQUFBLFNBQUEsSUFBQTtVQUNBLFNBQUEsUUFBQSxJQUFBOztTQUVBLE1BQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxPQUFBOztNQUVBLE9BQUEsU0FBQTs7O0lBR0EsSUFBQSxTQUFBLFNBQUEsTUFBQTtNQUNBLElBQUEsV0FBQSxHQUFBO01BQ0E7U0FDQSxLQUFBLElBQUEsT0FBQSxtQkFBQTtTQUNBLEtBQUEsU0FBQSxJQUFBO1VBQ0EsU0FBQSxRQUFBLElBQUE7O1NBRUEsTUFBQSxTQUFBLElBQUE7VUFDQSxTQUFBLE9BQUE7O01BRUEsT0FBQSxTQUFBOzs7SUFHQSxPQUFBOzs7Ozs7QUN0Q0EsTUFBQSxTQUFBLFFBQUE7QUFDQSxNQUFBLE9BQUEsT0FBQSxRQUFBO0FBQ0EsTUFBQSxXQUFBLE9BQUEsUUFBQTs7QUFFQSxJQUFBLHFCQUFBOztBQUVBLE1BQUEsT0FBQSxJQUFBO0FBQ0EsTUFBQSxXQUFBLElBQUEsU0FBQTtFQUNBLE9BQUE7RUFDQSxPQUFBOzs7O0FBSUEsS0FBQSxPQUFBOztBQUVBLE9BQUEsaUJBQUEsZUFBQTs7OztHQUlBLE9BQUEiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQVBQIFNUQVJUXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBcbnZhciBBcHAgPSBhbmd1bGFyLm1vZHVsZSgnY3JjbGV4JywgW1xuICAgICd1aS5yb3V0ZXInLFxuICAgICdhbmd1bGFyLWp3dCdcbiAgXSk7XG5cbi8vIEFQUCBSVU5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFxuQXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG4gICRyb290U2NvcGUuYXBwID0ge1xuICAgIG5hbWU6ICdDb29raWUgU2Nhbm5lcicsXG4gICAgZGVzY3JpcHRpb246ICdDcmNsZXggQ29va2llIFNjYW5uZXInLFxuICAgIHllYXI6ICgobmV3IERhdGUoKSkuZ2V0RnVsbFllYXIoKSlcbiAgfTtcblxufSk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKio9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICogTW9kdWxlOiByb3V0ZXMuanNcbiAgICogQXBwIHJvdXRlcyBhbmQgcmVzb3VyY2VzIGNvbmZpZ3VyYXRpb25cbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cbiAgQXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZShmYWxzZSk7XG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICAgLy9cbiAgICAvLyBBcHBsaWNhdGlvbiBSb3V0ZXNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRpdGxlOiAnSG9tZScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAndmlld3MvaG9tZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnc2l0ZScsIHtcbiAgICAgICAgdXJsOiAnL3NpdGUvOm5hbWUnLFxuICAgICAgICB0aXRsZTogJ1NpdGUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3NpdGUuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaXRlQ3RybCdcbiAgICAgIH0pO1xuXG4gIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICogRmlsZTogaG9tZS5qc1xuICAqIEhvbWVQYWdlIENvbnRyb2xsZXJcbiAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuICBhbmd1bGFyXG4gICAgLm1vZHVsZSgnY3JjbGV4JylcbiAgICAuY29udHJvbGxlcignSG9tZUN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc2NvcGUsICRzdGF0ZSkge1xuXG4gICAgICAkc2NvcGUuc3VibWl0Rm9ybSA9IGZ1bmN0aW9uKHdlYnNpdGUpIHtcbiAgICAgICAgaWYod2Vic2l0ZS5pbmRleE9mKCdodHRwOi8vJykgPT09IC0xKSB7XG4gICAgICAgICAgd2Vic2l0ZSA9ICdodHRwOi8vJyt3ZWJzaXRlO1xuICAgICAgICB9XG4gICAgICAgICRzdGF0ZS5nbygnc2l0ZScsIHtuYW1lOiB3ZWJzaXRlfSk7XG4gICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKio9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgKiBGaWxlOiBob21lLmpzXG4gICogSG9tZVBhZ2UgQ29udHJvbGxlclxuICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG4gIEFwcC5jb250cm9sbGVyKCdTaXRlQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzY29wZSwgJHN0YXRlUGFyYW1zLCAkdGltZW91dCwgV2Vic2l0ZSwgQ29va2llKSB7XG5cbiAgICAkc2NvcGUuY3VycmVudFNpdGUgPSAkc3RhdGVQYXJhbXMubmFtZTtcbiAgICAkc2NvcGUuY29va2llcyA9IFtdO1xuICAgICRzY29wZS5zaG93QWxlcnRNc2cgPSBmYWxzZTtcbiAgICAkc2NvcGUuaXNMb2FkaW5nID0gZmFsc2U7XG4gICAgJHNjb3BlLmlzUnVubmluZyA9IGZhbHNlO1xuICAgIHZhciB3ZWJ2aWV3ID0gbnVsbDtcbiAgICB2YXIgY29va2llcyA9IFtdO1xuXG4gICAgdmFyIHJlbW90ZSA9IHJlcXVpcmUoJ3JlbW90ZScpO1xuICAgIHZhciBCcm93c2VyV2luZG93ID0gcmVtb3RlLkJyb3dzZXJXaW5kb3c7XG4gICAgdmFyIHdpbiA9IG51bGw7XG5cbiAgICBhY3RpdmF0ZSgpO1xuXG4gICAgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gICAgICBnZXRTaXRlQ29va2llcygkc3RhdGVQYXJhbXMubmFtZSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnN0YXJ0U2NhbiA9IGZ1bmN0aW9uKHNpdGUpIHtcbiAgICAgICRzY29wZS5pc0xvYWRpbmcgPSB0cnVlO1xuICAgICAgJHNjb3BlLmlzUnVubmluZyA9IHRydWU7XG4gICAgICB3aW4gPSBuZXcgQnJvd3NlcldpbmRvdyh7XG4gICAgICAgIHdpZHRoOiA4MDAsXG4gICAgICAgIGhlaWdodDogNjAwLFxuICAgICAgICB3ZWJTZWN1cml0eTogZmFsc2UsXG4gICAgICAgIGZyYW1lOiBmYWxzZSxcbiAgICAgICAgc2hvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgd2luLmxvYWRVUkwoc2l0ZSk7XG4gICAgICB3aW4uc2hvdygpO1xuXG4gICAgICB3aW4ud2ViQ29udGVudHMub24oJ2RpZC1mYWlsLWxvYWQnLCBmdW5jdGlvbihlcnIpe1xuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICRzY29wZS5pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAkc2NvcGUuaXNSdW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLnNob3dBbGVydE1zZyA9IGZhbHNlO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdkaWQtZmFpbC1sb2FkJywgZXJyKTtcbiAgICAgICAgfSwwKTtcbiAgICAgIH0pO1xuXG4gICAgICB3aW4ud2ViQ29udGVudHMub24oJ2RpZC1zdG9wLWxvYWRpbmcnLCBmdW5jdGlvbigpe1xuICAgICAgICB3aW4ud2ViQ29udGVudHMuc2Vzc2lvbi5jb29raWVzLmdldCh7fSwgZnVuY3Rpb24oZXJyLCBjb29raWVzKSB7XG4gICAgICAgICAgdmFyIGlzSW5zZXJ0TmV3ID0gZmFsc2U7XG4gICAgICAgICAgY29va2llcy5mb3JFYWNoKGZ1bmN0aW9uKGNvb2tpZSl7XG4gICAgICAgICAgICB2YXIgaXNQcmVzZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuY29va2llcy5mb3JFYWNoKGZ1bmN0aW9uKGMpe1xuICAgICAgICAgICAgICBpZihjb29raWUubmFtZSA9PT0gYy5uYW1lKSB7XG4gICAgICAgICAgICAgICAgaXNQcmVzZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZighaXNQcmVzZW50KSB7XG4gICAgICAgICAgICAgICRzY29wZS5jb29raWVzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IGNvb2tpZS5uYW1lLFxuICAgICAgICAgICAgICAgIGRvbWFpbjogY29va2llLmRvbWFpbixcbiAgICAgICAgICAgICAgICBwYXRoOiBjb29raWUucGF0aCxcbiAgICAgICAgICAgICAgICBzZWN1cmU6IGNvb2tpZS5zZWN1cmUsXG4gICAgICAgICAgICAgICAgZmlyc3RfcGFydHk6IGNvb2tpZS5ob3N0T25seSxcbiAgICAgICAgICAgICAgICBodHRwOiBjb29raWUuaHR0cE9ubHksXG4gICAgICAgICAgICAgICAgZXhwaXJlX2F0OiBjb29raWUuZXhwaXJhdGlvbkRhdGUsXG4gICAgICAgICAgICAgICAgc2Vzc2lvbjogY29va2llLnNlc3Npb25cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGlzSW5zZXJ0TmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAkc2NvcGUuaXNMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgIC8vIFNhdmUgQ29va2llc1xuICAgICAgICAgIGlmKGlzSW5zZXJ0TmV3KSB7XG4gICAgICAgICAgICBXZWJzaXRlXG4gICAgICAgICAgICAgIC5jcmVhdGUoe1xuICAgICAgICAgICAgICAgIHdlYnNpdGU6IHNpdGUsXG4gICAgICAgICAgICAgICAgY29va2llczogJHNjb3BlLmNvb2tpZXNcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VuYWJsZSB0byBwb3N0IGNvb2tpZXMnKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc3RvcFNjYW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICRzY29wZS5zaG93QWxlcnRNc2cgPSBmYWxzZTtcbiAgICAgICRzY29wZS5pc1J1bm5pbmcgPSBmYWxzZTtcbiAgICAgIHdpbi53ZWJDb250ZW50cy5zZXNzaW9uLmNsZWFyU3RvcmFnZURhdGEoZnVuY3Rpb24oKXtcbiAgICAgICAgY29uc29sZS5sb2coJ2RhdGEgY2xlYXJlZCcpO1xuICAgICAgICB3aW4uY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgICRzY29wZS5lZGl0Q29va2llID0gZnVuY3Rpb24oY29va2llLCBpbmRleCkge1xuICAgICAgJCgnLmxpbmUtJytpbmRleCkuYWRkQ2xhc3MoJ2VkaXQtbW9kZScpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICQoJy5saW5lLScraW5kZXgpLnJlbW92ZUNsYXNzKCdlZGl0LW1vZGUnKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNhdmVDb29raWUgPSBmdW5jdGlvbihjb29raWUsIGluZGV4KSB7XG4gICAgICAkKCcubGluZS0nK2luZGV4KS5yZW1vdmVDbGFzcygnZWRpdC1tb2RlJyk7XG4gICAgICBDb29raWVcbiAgICAgICAgLmVkaXQoY29va2llKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICBjb25zb2xlLmxvZygnY29va2llIHNhdmVkIHN1Y2Nlc3NmdWxseSEnKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1VuYWJsZSB0byBkZWxldGUgY29va2llJyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlQ29va2llID0gZnVuY3Rpb24oY29va2llLCBpbmRleCkge1xuICAgICAgc3dhbCh7XG4gICAgICAgIHRpdGxlOiBcIkFyZSB5b3Ugc3VyZT9cIixcbiAgICAgICAgdGV4dDogXCJZb3Ugd2lsbCBub3QgYmUgYWJsZSB0byByZWNvdmVyIHRoaXMgY29va2llIVwiLFxuICAgICAgICB0eXBlOiBcIndhcm5pbmdcIixcbiAgICAgICAgc2hvd0NhbmNlbEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgY29uZmlybUJ1dHRvbkNvbG9yOiBcIiNERDZCNTVcIixcbiAgICAgICAgY29uZmlybUJ1dHRvblRleHQ6IFwiWWVzLCBkZWxldGUgaXQhXCIsXG4gICAgICAgIGNsb3NlT25Db25maXJtOiBmYWxzZSxcbiAgICAgICAgaHRtbDogZmFsc2VcbiAgICAgIH0sIGZ1bmN0aW9uKCl7XG4gICAgICAgIHN3YWwoXCJEZWxldGVkIVwiLCBcIlwiLCBcInN1Y2Nlc3NcIik7XG4gICAgICAgICRzY29wZS5jb29raWVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIENvb2tpZVxuICAgICAgICAgIC5kZWxldGUoY29va2llLm5hbWUpXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVW5hYmxlIHRvIGRlbGV0ZSBjb29raWUnKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRTaXRlQ29va2llcyhzaXRlTmFtZSkge1xuICAgICAgV2Vic2l0ZVxuICAgICAgICAuZ2V0KHNpdGVOYW1lKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAkc2NvcGUuY29va2llcyA9IGRhdGEuY29va2llcztcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgJHNjb3BlLmNvb2tpZXMgPSBbXTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAqIE1vZHVsZTogbG9hZGVyLmpzXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9Db25ub3JBdGhlcnRvbi9sb2FkZXJzLmNzc1xuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuICBBcHAuZGlyZWN0aXZlKCdsb2FkZXInLCBmdW5jdGlvbigkbG9jYXRpb24pIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6IFwiQVwiLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cbiAgICAgICAgLy8gSW5qZWN0IHRoZSBjb3JyZWN0IG51bWJlciBvZiBkaXYgZWxlbWVudHMgZm9yIGVhY2ggYW5pbWF0aW9uXG4gICAgICAgICQoZWxlbWVudCkubG9hZGVycygpO1xuXG4gICAgICB9XG4gICAgfTtcblxuICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAqIEZpbGU6IENvb2tpZS5qc1xuICAqIENvb2tpZSBTZXJ2aWNlXG4gID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cbiAgdmFyIEFQSSA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJykuQVBJO1xuXG4gIEFwcC5mYWN0b3J5KCdDb29raWUnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsICRodHRwKSB7XG4gICAgdmFyIGFwaSA9IHt9O1xuXG4gICAgYXBpLmVkaXQgPSBmdW5jdGlvbihjb29raWUpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAkaHR0cFxuICAgICAgICAucHV0KEFQSS5ob3N0ICsgJy9hcGkvY3MvY29va2llcy8nICsgY29va2llLm5hbWUsIGNvb2tpZSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlcyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH07XG5cbiAgICBhcGkuZGVsZXRlID0gZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICRodHRwXG4gICAgICAgIC5kZWxldGUoQVBJLmhvc3QgKyAnL2FwaS9jcy9jb29raWVzLycgKyBuYW1lKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfTtcblxuICAgIHJldHVybiBhcGk7XG4gIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICogRmlsZTogV2Vic2l0ZS5qc1xuICAqIFdlYnNpdGUgU2VydmljZVxuICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG4gIHZhciBBUEkgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpLkFQSTtcblxuICBBcHAuZmFjdG9yeSgnV2Vic2l0ZScsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgJGh0dHApIHtcbiAgICB2YXIgYXBpID0ge307XG5cbiAgICBhcGkuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICRodHRwXG4gICAgICAgIC5nZXQoQVBJLmhvc3QgKyAnL2FwaS9jcy93ZWJzaXRlcy8nICsgZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzLmRhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgYXBpLmNyZWF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAkaHR0cFxuICAgICAgICAucG9zdChBUEkuaG9zdCArICcvYXBpL2NzL3JlcG9ydHMnLCBkYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzLmRhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgfSk7XG5cbn0pKCk7XG4iLCIvLyBBZGRzIGEgcmlnaHQtY2xpY2sgbWVudSB3aXRoICdJbnNwZWN0IEVsZW1lbnQnIG9wdGlvblxuY29uc3QgcmVtb3RlID0gcmVxdWlyZSgncmVtb3RlJyk7XG5jb25zdCBNZW51ID0gcmVtb3RlLnJlcXVpcmUoJ21lbnUnKTtcbmNvbnN0IE1lbnVJdGVtID0gcmVtb3RlLnJlcXVpcmUoJ21lbnUtaXRlbScpO1xuXG5sZXQgcmlnaHRDbGlja1Bvc2l0aW9uID0gbnVsbDtcblxuY29uc3QgbWVudSA9IG5ldyBNZW51KCk7XG5jb25zdCBtZW51SXRlbSA9IG5ldyBNZW51SXRlbSh7XG4gIGxhYmVsOiAnSW5zcGVjdCBFbGVtZW50JyxcbiAgY2xpY2s6ICgpID0+IHtcbiAgICByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmluc3BlY3RFbGVtZW50KHJpZ2h0Q2xpY2tQb3NpdGlvbi54LCByaWdodENsaWNrUG9zaXRpb24ueSk7XG4gIH1cbn0pO1xubWVudS5hcHBlbmQobWVudUl0ZW0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCAoZSkgPT4ge1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIHJpZ2h0Q2xpY2tQb3NpdGlvbiA9IHt4OiBlLngsIHk6IGUueX07XG4gIG1lbnUucG9wdXAocmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKSk7XG59LCBmYWxzZSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
