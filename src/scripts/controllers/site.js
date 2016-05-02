(function() {
  'use strict';

  /**=========================================================
  * File: home.js
  * HomePage Controller
  =========================================================*/

  App.controller('SiteCtrl', function($rootScope, $scope, $stateParams, $timeout, Website, Cookie) {

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
  });

})();
