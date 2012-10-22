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
    $scope.buttonStyle = {};
    $scope.buttonText = added ? 'Remove' : 'Add Up';
    $scope.buttonClass = added ? 'btn-danger' : 'btn-success';
    if (added) {
      jQuery('.classpicker').sortable('disable');
    } else {
      jQuery('.classpicker').sortable('enable');
    }
  };

  $scope.selectClass = function(c) {
    if ($scope.added) return;
    c.selected = !c.selected;
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
      // Check if enough classes are selected
      var selected = _.find($scope.classes, function(c){ return c.selected; });
      if (!selected) {
        jQuery('.classpicker').popover('show');
        setTimeout(function() {
          jQuery('.classpicker').popover('hide');
        }, 5000);
        return;
      }
      // Add to queue
      socket.emit('queue:add', $scope.classes, function(response) {
        if (typeof(response) !== 'number') {
          alert('Something went wrong.');
        }
        updateAddedState(true);
        $scope.queuePos = response;
        $rootScope.statusCounts[$scope.rank] += 1;
      });
    }
  };

  /**
   * Initialization
   */

  socket.on('state:init', function(data) {
    $rootScope.id = data.id;
    $scope.rank = data.rank;
    $scope.classes = data.classes;
    $scope.disconnected = false;
    updateAddedState(data.added);
    if (typeof(data.queuepos) === 'number') {
      $scope.queuePos = data.queuepos;
    }
  });


  /**
   * Status updates
   */

  socket.on('status:counts', function(data) {
    $rootScope.statusCounts = data;
  });

  socket.on('queue:add', function(data) {
    $rootScope.statusCounts[data.rank] += 1;
  });

  socket.on('queue:remove', function(data) {
    $rootScope.statusCounts[data.rank] -= 1;
    if ($scope.queuePos && data.queuePos < $scope.queuePos) {
      $scope.queuePos -= 1;
    }
  });

  $scope.$watch('queuePos', function(queuePos) {
    $scope.queueOrd = getOrdinal(queuePos+1);
  });

  // Socket.io

  socket.on('disconnect', function() {
    // Drop a modal on d/c, but only if the socket has been authenticated
    if ($rootScope.id) {
      $scope.disconnected = true;
    }
  });

  // When player gets picked for a mix, play a sound, flash the
  //  title bar, and change location to the mix page
  var sound = document.getElementById("sound_player");
  var sounds = ['navi-out.wav'
                // 'navi-heylisten.mp3'
               ];
  sound.src = '/snd/' + sounds[Math.floor(Math.random()*sounds.length)];
  socket.on('match:join', function(data) {
    updateAddedState(false);
    sound.play();
    var msg = 'You got picked!';
    var intervalId, oldTitle = document.title;
    intervalId = setInterval(function(){
      document.title = document.title == msg ? oldTitle : msg;
    }, 1000);
    window.onmousemove = function() {
      if(oldTitle && document.hasFocus()) {
        clearInterval(intervalId);
        document.title = oldTitle;
        oldTitle = intervalId = null;
        window.onmousemove = null;
      }
    };
    $location.url('/mix/' + data.mixId);
  });


  // Helpers
  function getOrdinal(n) {
    var s=["th","st","nd","rd"];
    var v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
  }


}


function PageCtrl($scope, $window, $rootScope, $routeParams, $http) {
  if (!$rootScope.pages) {
    $http.get('/api/pages')
    .success(function(data, status, headers, config) {
      $rootScope.pages = data.pages;
    });
  }
  $http.get('/api/page/' + ($routeParams.id || 'welcome') )
    .success(function(data, status, headers, config) {
      $rootScope.page = data.page;
    });
  $scope.isActive = function(index) {
    return $rootScope.page.slug === $rootScope.pages[index].slug;
  };
}


function MixCtrl($scope, $window, $rootScope, $routeParams, $http) {

  $scope.mix = {};

  $http.get('/api/mixes/' + $routeParams.id)
    .success(function(data, status, headers, config) {
      $scope.mix = data.mix;
    });

}
