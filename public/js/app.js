'use strict';


// Declare app level module which depends on filters, and services
var app = angular.module('myApp', ['myApp.services', 'ui']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/page',
        controller: PageCtrl
      })
      .when('/page/:id', {
        templateUrl: 'partials/page',
        controller: PageCtrl
      })
      .when('/mix/:id', {
        templateUrl: 'partials/mix',
        controller: MixCtrl
      })
      .otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(true);
  }]);

// Angular-ui Options
app.value('ui.config', {
   sortable: {
      revert: 70,
      distance: 2,
      cursor: 'move',
      axis: 'x',
      sort: function (event, ui) {
        var that = $(this);
        var w = ui.helper.outerWidth();
        that.children().each(function () {
          if ( $(this).hasClass('ui-sortable-helper') || $(this).hasClass('ui-sortable-placeholder') )
            return true;
          // If overlap is more than half of the dragged item
          var dist = Math.abs(ui.position.left - $(this).position().left);
          var before = ui.position.left > $(this).position().left;
          if ((w - dist) > (w / 2) && (dist < w)) {
            if (before)
              $('.ui-sortable-placeholder', that).insertBefore($(this));
            else
              $('.ui-sortable-placeholder', that).insertAfter($(this));
            return false;
          }
        });
      }
   }
});