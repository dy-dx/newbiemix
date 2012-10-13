'use strict';


// Declare app level module which depends on filters, and services
var app = angular.module('myApp', ['myApp.services', 'ui']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/home',
        controller: HomeCtrl
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
      placeholder: 'placeholder',
      tolerance: 'pointer',
      revert: 70,
      distance: 2,
      cursor: 'move',
      axis: 'x'
   }
});