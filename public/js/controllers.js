'use strict';

/* Controllers */

function MainCtrl($scope, $location, $rootScope) {
  $scope.path = function() {
    return $location.path();
  };
  $scope.loading = false;
  $rootScope.$on('$routeChangeStart', function() {
    $scope.loading = true;
  });
  $rootScope.$on('$routeChangeSuccess', function() {
    $scope.loading = false;
  });
}
