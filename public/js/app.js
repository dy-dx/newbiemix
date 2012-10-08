'use strict';


// Declare app level module which depends on filters, and services
var app = angular.module('myApp', ['myApp.services']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/home'
      })
      .when('/about', {
        templateUrl: 'partials/about'
        // controller: AboutCtrl
      })
      .otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(true);
  }]);