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

  // Adding up as a class
  $scope.addUp = function() {

    var classes = [];
    var validClasses = ['class-scout','class-psoldier','class-rsoldier', 'class-medic', 'class-demoman'];
    socket.emit('addUp', validClasses, function(response) {
      if (typeof(response) !== 'Number') {
        // Do something
      }
      alert('Queue position: ' + response);
    }); // Need a callback for this

    // if ($(this).hasClass('active')) {
    //   $(this).button('reset').button('toggle');
    //   return ss.rpc('app.removeFromQueue');
    // }
    // var classes = $('#classes-selected').sortable('toArray');
    // if (!hasSteamInfo()) {
    //   return jqueryalert('You must sign in to do that.');
    // } else {
    //   return ss.rpc('app.addUp', classes, function(success) {
    //     if (success) {
    //       $('#addup-button').button('complete').button('toggle');
    //       // $('#addup-button').toggleClass('disabled').setAttribute('disabled');
    //       return;
    //     } else {
    //       return jqueryalert('Something went wrong.');
    //     }
    //   });
    // };
  };

  // Socket.io

  socket.on('disconnect', function() {
    alert('got booted');
  });

  socket.on('addUp', function(data) {
    console.log(data);
  });
  // socket.emit('stats:subscribe', $routeParams.id);
  // socket.on('stats:send', function (data) {
  //   $scope.stats = data.stats;
  //   $scope.playerMetaData = data.playerdata;
  // });
}
