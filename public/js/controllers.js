'use strict';

/* Controllers */

function MainCtrl($scope, $location, $window, $rootScope, socket) {
  // $scope.path = function() {
  //   return $location.path();
  // };
  $scope.loading = false;
  $rootScope.$on('$routeChangeStart', function() {
    $scope.loading = true;
  });
  $rootScope.$on('$routeChangeSuccess', function() {
    $scope.loading = false;
  });
  // This is a hack.
  $scope.buttonStyle = {display:'none'};

  /**
   * Adding to queue
   */

  var updateAddedState = function(added) {
    $scope.added = added;
    $scope.buttonText = added ? 'Remove' : 'Add Up';
    $scope.buttonClass = added ? 'btn-danger' : 'btn-success';
    $scope.buttonStyle = {};
  };

  $scope.getClassIcon = function(c) {
     return { 'background-image': 'url("/img/icons/' + c.id + '.jpg")' };
  };

  $scope.addOrRemove = function() {
    if ($scope.added) {
      // Remove from queue
      socket.emit('queue:remove');
      updateAddedState(false);
      $scope.queuePos = null;

    } else {
      // Add to queue
      socket.emit('queue:add', $scope.classes, function(response) {
        if (typeof(response) !== 'number') {
          alert('Something went wrong.');
        }
        updateAddedState(true);
        $scope.queuePos = response;
        $scope.userCounts[$scope.rank] += 1;
      });
    }
  };

  /**
   * Initialization
   */

  socket.on('state:init', function(data) {
    $scope.rank = data.rank;
    $scope.classes = data.classes;
    updateAddedState(data.added);
  });


  /**
   * Status updates
   */

  socket.on('status:userCounts', function(data) {
    $scope.userCounts = data;
  });

  socket.on('queue:add', function(data) {
    $scope.userCounts[data.rank] += 1;
  });

  socket.on('queue:remove', function(data) {
    $scope.userCounts[data.rank] -= 1;

    if ($scope.queuePos && data.queuePos < $scope.queuePos) {
      $scope.queuePos -= 1;
    }
  });

  // Socket.io

  socket.on('disconnect', function() {
    // alert('got booted');
  });


  socket.on('match:join', function(data) {
    
    updateAddedState(false);
    $location.url('/mix/' + data.mixId);

  });

}


function HomeCtrl($scope, $window, $rootScope, socket) {


}


function MixCtrl($scope, $window, $rootScope, $routeParams, $http, socket) {

  $scope.mix = {};

  $http.get('/api/mixes/' + $routeParams.id)
    .success(function(data, status, headers, config) {
      $scope.mix = data.mix;

      // var connect = 'steam://connect/' + $scope.mix.server.ip + '/' + $scope.mix.server.password;
      // $window.location.href = connect;
    });

}
