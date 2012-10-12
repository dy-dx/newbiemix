$(document).ready(function() {
    

Array.prototype.transpose = function() {
  var a = this,
    w = a.length ? a.length : 0,
    h = a[0] instanceof Array ? a[0].length : 0;
  var i, j, t = [];
  for(i=0; i<h; i++) {
    t[i] = [];
    for(j=0; j<w; j++) {
      t[i][j] = a[j][i];
    }
  }
  return t;
};

var state = {
    newbies: [],
    coaches: [],
    winners: []
};

function addToQueue (player) {
    var listItem = '<li id="user' + player.id + '"><span class="name">';
    if (player.rank === 'coach') {
        state.coaches.push(player);
        listItem += 'coach-';
    } else if (player.rank === 'newbie') {
        state.newbies.push(player);
        listItem += 'newbie-';
    } else if (player.rank === 'winner') {
        state.winners.push(player);
        listItem += 'newbie-';
    }
    listItem += player.id + '</span><span class="primary">';
    listItem += player.classes[0] + '</span><span class="classes">';
    var len = player.classes.length;
    for (var i=1; i<len; i++) {
        listItem += ', ' + player.classes[i];
    }
    listItem += '</span></li>';
    $('#' + player.rank + 'list').prepend(listItem);
}

//***************************//
//    Hungarian Algorithm    //
//***************************//
function hungarian (matrix) {
    var done = false;
    //var C = matrix.transpose(); // Cost Matrix
    var C = matrix;
    var nrow = C.length;
    var ncol = 12;
    var step = 1;

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
        //var TM = M.transpose();
        var TM = M;
        var winners = [];
        for (var i = 0; i < nrow; i++) {

            var index = TM[i].indexOf(1);
            if (index !== -1) {
                winners[index] = i;
            }
        }
        aWinnerIsYou(winners);
    }

    while (!done) {
        switch (step)
        {
            case 1:
                //stepOne();
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
                stepSeven();
                done = true;
                break;
        }
    }
}

function aWinnerIsYou(winners) {
    var classes = ['S','S','S','S','P','P','R','R','D','D','M','M'];

    $.each(winners, function(index, value) {
        var fakeuser = {
            id: state.newbies[value].id,
            classes: [classes[index]],
            rank: 'winner'
        };
        $('#user'+fakeuser.id).addClass('selected');
        addToQueue(fakeuser);
    });
}

// Populate queues with fake people
var userid = 0;
$('#populateButton').click( function() {
    for (var i=0; i<30; i++) {
        var classes = ['S','P','R','D','M'];
    
        var fakeuser = {
            id: userid,
            classes: [],
            rank: 'newbie'
        };
        
        classes.sort(function() { return 0.5 - Math.random();}); //Shuffle the classes array
        var randomclasses = Math.floor(Math.random()*5)+1;
        for (var j=0; j<randomclasses; j++) {
            fakeuser.classes.push(classes.pop());
        };
        // 1/6 chance of being a coach
        // if (Math.floor(Math.random()*6) === 0) {
        //     fakeuser.rank = 'coach';
        // };

        //For the Hungarian Algorithm
        //assign costs to each class. [s,s,s,s,p,p,r,r,d,d,m,m]
        var costs = [100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000];
        var len = fakeuser.classes.length;
        // How much the class preferences matter in terms of cost
        var prefscale = 1; 
        $.each(fakeuser.classes, function(index, value) { 
            if (value === 'S') {
                costs[0] = (index + 1)*prefscale; costs[1] = (index + 1)*prefscale;
                costs[2] = (index + 1)*prefscale; costs[3] = (index + 1)*prefscale;
            } else if (value === 'P') { costs[4] = (index + 1)*prefscale; costs[5] = (index + 1)*prefscale;
            } else if (value === 'R') { costs[6] = (index + 1)*prefscale; costs[7] = (index + 1)*prefscale;
            } else if (value === 'D') { costs[8] = (index + 1)*prefscale; costs[9] = (index + 1)*prefscale;
            } else if (value === 'M') { costs[10] = (index + 1)*prefscale; costs[11] = (index + 1)*prefscale;
            };
        });
        fakeuser.costs = costs;
        addToQueue(fakeuser);
        userid++;
    };
});


$('#hungarianButton').click( function() {
    // Build the matrix
    var matrix = [];
    $.each(state.newbies, function(queueposition, player) {
        //Add 10 to cost for every queue position you are away from the front
        var costs = player.costs;
        $.each(costs, function(index,cost) {
            costs[index] = cost + queueposition * 10 + (index);
        });
        matrix.push(costs);
    });
    //hungarian(matrix.transpose());
    hungarian(matrix);
    window.state = state;
});


}); //end $(document).ready