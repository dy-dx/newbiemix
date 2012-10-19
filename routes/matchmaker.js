/*
 * Matchmaking Algorithm
 *
 * Returns an array of *copies* of users who are selected
 */

var _ = require('underscore');

exports.matchmaker = function(newbies, coaches) {
  var benchmark = Date.now();
  var nlen = newbies.length;
  var clen = coaches.length;


  // Need some algorithm here to quickly determine if a solution is possible
  //  without running the entire matchmaking algoritm

  // Try to build a solution with two coaches (the first 2
  //  elements in the array are guaranteed to play) and 10 newbies,
  //  if there aren't enough coaches then just try 12 newbies
  var queue = [];
  if (clen >= 2) {
    queue = coaches.slice(0,2).concat(newbies);
  } else if (nlen >= 12) {
   queue = newbies.slice();
  }

  // Ignore 'idle' players
  queue = _.where(queue, {status: 'active'});

  if (queue.length < 12) {
    return false;
  }

  // For debugging
  // var queue = coaches.slice(0,2).concat(newbies);
  // if (queue.length === 0) {
  //   return false;
  // }



  // Weight is inversely proportional to queue position
  // So the difference in cost between the least favorite and most favorite
  //  classes for the first player in queue is greater than that of
  //  the last player in queue. This makes it more expensive to downgrade
  //  the class of a player early in the queue rather than one at the end.

  // And we must also add the queueposition to the cost as a "tax"
  //  but multiply it such that each of user1's costs are higher than
  //  any of user0's costs.

  // Assume we won't get more than 200 in queue
  var weight = 203;


  // Build the matrix
  var matrix = [];

  queue.forEach(function(player, queueposition) {
    weight--;

    player.costs.forEach(function(cost, index) {
      if (cost === 3000000) return;
      player.costs[index] = cost*weight + queueposition*1000;
    });
    matrix.push(player.costs.slice());
  });

  var winners = hungarian(matrix);
  var classes = ['Scout','Scout','Scout','Scout',
                 'Pocket','Pocket',
                 'Roamer','Roamer',
                 'Demoman','Demoman',
                 'Medic','Medic'];
  var solution = [];
  var noSolution = false;

  winners.forEach(function(value, index) {
    // queue[value] is the player,
    //  classes[index] is his assigned class,
    //  queue[value].costs[index] is his cost to play that class
    queue[value].class = classes[index];
    
    // Maybe use this to report what classes are missing
    if ( queue[value].costs[index] == 3000000 ) {
      noSolution = true;
      return;
    }
    solution.push(queue[value]);
  });

  console.log('matchmaker time: ' + (Date.now() - benchmark) + 'ms' );
  if (noSolution) {
    return false;
  }
  return solution;
};




// Modified Hungarian Algorithm

function hungarian (matrix) {
  var done = false;
  var C = matrix;
  var nrow = C.length;
  var ncol = 12;

  // Step 1 removes the queueposition tax, we don't want that
  // var step = 1;
  var step = 2;

  var M = []; // Mask Matrix
  for (var i=0; i<nrow; i++) {
    M.push([0,0,0,0,0,0]);
  }
  var RowCover = [0,0,0,0,0,0];
  var ColCover = [];
  for (var i=0; i<nrow; i++) {
    ColCover.push(0);
  }

  function stepOne () {
    var min_in_row;
    for (var r=0; r<nrow; r++) {
      min_in_row = C[r][0];
      for (var c=0; c<ncol; c++) {
        if (C[r][c] < min_in_row) {
          min_in_row = C[r][c];
        }
      }
      for (var c=0; c<ncol; c++) {
        C[r][c] -= min_in_row;
      }
    }
    step = 2;
  }

  function stepTwo () {
    for (var r=0; r<nrow; r++) {
      for (var c=0; c<ncol; c++) {
        if (C[r][c] === 0 && RowCover[r] === 0 && ColCover[c] === 0) {
          M[r][c] = 1;
          RowCover[r] = 1;
          ColCover[c] = 1;
        }
      }
    }
    for (var r=0; r<nrow; r++) {
      RowCover[r] = 0;
    }
    for (var c=0; c<ncol; c++) {
      ColCover[c] = 0;
    }
    step = 3;
  }

  function stepThree () {
    var colcount = 0;
    for (var r=0; r<nrow; r++) {
      for (var c=0; c<ncol; c++) {
        if (M[r][c] === 1) {
          ColCover[c] = 1;
        }
      }
    }
    for (var c=0; c<ncol; c++) {
      if (ColCover[c] === 1) {
        colcount += 1;
      }
    }
    if (colcount >= ncol || colcount >= nrow) {
      step = 7;
    } else {
      step = 4;
    }
  }

  function stepFour () {
    var row = -1;
    var col = -1;
    var done = false;

    function find_a_zero() {
      var r=0;
      var c;
      var done = false;
      row = -1;
      col = -1;
      while (!done) {
        c=0;
        while (true) {
          if (C[r][c] === 0 && RowCover[r] === 0 && ColCover[c] === 0) {
            row = r;
            col = c;
            done = true;
          }
          c += 1;
          if (c >= ncol || done) {
            break;
          }
        }
        r += 1;
        if (r >= nrow) {
          done = true;
        }
      }
    }

    function star_in_row () {
      var tmp = false;
      for (var c=0; c<ncol; c++) {
        if (M[row][c] === 1) {
          tmp = true;
        }
      }
      return tmp;
    }

    function find_star_in_row () {
      col = -1;
      for (var c=0; c<ncol; c++) {
        if (M[row][c] === 1) {
          col = c;
        }
      }
    }

    while (!done) {
      find_a_zero ();
      if (row === -1) {
        done = true;
        step = 6;
      } else {
        M[row][col] = 2;
        if (star_in_row()) {
          find_star_in_row(row);
          RowCover[row] = 1;
          ColCover[col] = 0;
        } else {
          done = true;
          step = 5;
          path_row_0 = row;
          path_col_0 = col;
        }
      }
    }
  }

  function stepFive () {
    var done = false;
    var r = -1;
    var c = -1;
    var path_count = 1;
    var pathm = [];
    pathm[path_count-1] = [path_row_0];
    pathm[path_count-1][1] = path_col_0;

    function find_star_in_col(tempc) {
      r=-1;
      for (var i=0; i<nrow; i++) {
        if (M[i][tempc] === 1) {
          r=i;
        }
      }
    }

    function find_prime_in_row(tempr) {
      for (var j=0; j<ncol; j++) {
        if (M[tempr][j] === 2) {
          c = j;
        }
      }
    }

    function augment_path() {
      for (var p=0; p<path_count; p++) {
        if (M[pathm[p][0]][pathm[p][1]] === 1) {
          M[pathm[p][0]][pathm[p][1]] = 0;
        } else {
          M[pathm[p][0]][pathm[p][1]] = 1;
        }
      }
    }

    function clear_covers() {
      for (var r=0; r<nrow; r++) {
        RowCover[r] = 0;
      }
      for (var c=0; c<ncol; c++) {
        ColCover[c] = 0;
      }
    }

    function erase_primes() {
      for (var r=0; r<nrow; r++) {
        for (var c=0; c<ncol; c++) {
          if (M[r][c] === 2) {
            M[r][c] = 0;
          }
        }
      }
    }

    while(!done) {
      find_star_in_col(pathm[path_count-1][1]);
      if (r>-1) {
        path_count += 1;
        pathm[path_count-1] = [r];
        pathm[path_count-1][1] = pathm[path_count-2][1];
      } else {
        done = true;
      }
      if (!done) {
        find_prime_in_row(pathm[path_count-1][0]);
        path_count += 1;
        pathm[path_count-1] = [pathm[path_count-2][0]];
        pathm[path_count-1][1] = c;
      }
    }
    augment_path();
    clear_covers();
    erase_primes();
    step = 3;
  }

  function stepSix () {
    var minval = 999999; // Supposed to be int.MaxValue

    function find_smallest() {
      for (var r=0; r<nrow; r++) {
        for (var c=0; c<ncol; c++) {
          if (RowCover[r] === 0 && ColCover[c] === 0) {
            if (minval > C[r][c]) {
              minval = C[r][c];
            }
          }
        }
      }
    }

    find_smallest();
    for (var r=0; r<nrow; r++) {
      for (var c = 0; c<ncol; c++) {
        if (RowCover[r] === 1) {
          C[r][c] += minval;
        }
        if (ColCover[c] === 0) {
          C[r][c] -= minval;
        }
      }
    }
    step = 4;
  }

  function stepSeven () {
    var TM = M;
    var winners = [];
    for (var i = 0; i < nrow; i++) {

      var index = TM[i].indexOf(1);
      if (index !== -1) {
        winners[index] = i;
      }
    }
    return winners;
  }

  while (!done) {
    switch (step)
    {
      case 1:
        // Step One removes queue position tax
        // stepOne();
        step = 2;
        break;
      case 2:
        stepTwo();
        break;
      case 3:
        stepThree();
        break;
      case 4:
        stepFour();
        break;
      case 5:
        stepFive();
        break;
      case 6:
        stepSix();
        break;
      case 7:
        return stepSeven();
        // done = true;
        // break;
    }
  }
}
