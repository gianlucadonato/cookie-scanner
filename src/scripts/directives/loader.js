(function(){
  'use strict';

  /**=========================================================
   * Module: loader.js
   * https://github.com/ConnorAtherton/loaders.css
   =========================================================*/

  App.directive('loader', function($location) {
    return {
      restrict: "A",
      link: function(scope, element, attrs) {

        // Inject the correct number of div elements for each animation
        $(element).loaders();

      }
    };

  });

})();
