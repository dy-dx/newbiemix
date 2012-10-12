'use strict';

/* Controllers */

function MainCtrl($scope, $location, $rootScope, socket) {
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


  /**
   * Adding to queue
   */

  $scope.classes = [
    {name: 'Scout', id: 'scout', selected: true},
    {name: 'Pocket', id: 'psoldier', selected: true},
    {name: 'Roamer', id: 'rsoldier', selected: true},
    {name: 'Medic', id: 'medic', selected: true},
    {name: 'Demoman', id: 'demoman', selected: true}
  ];

  $scope.added = false;
  $scope.buttonText = $scope.added ? 'Remove' : 'Add Up';
  $scope.buttonClass = $scope.added ? 'btn-danger' : 'btn-success';

  $scope.addOrRemove = function() {
    if ($scope.added) {
      // Remove from queue
      socket.emit('queue:remove', null, function(response) {
        if (!response) {
          alert('Something went wrong.');
        }
        $scope.added = false;
        $scope.buttonText = 'Add Up';
        $scope.buttonClass = 'btn-success';
        $scope.queuePos = null;
        $scope.userCounts[$scope.rank] -= 1;
      });
    } else {
      // Add to queue
      socket.emit('queue:add', $scope.classes, function(response) {
        if (typeof(response) !== 'number') {
          alert('Something went wrong.');
        }
        $scope.added = true;
        $scope.buttonText = 'Remove';
        $scope.buttonClass = 'btn-danger';
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
    console.log(data);
  });
  // socket.emit('stats:subscribe', $routeParams.id);
  // socket.on('stats:send', function (data) {
  //   $scope.stats = data.stats;
  //   $scope.playerMetaData = data.playerdata;
  // });
}
