/**
 * test-matchmaker.js
 * 
 * I don't know what I'm doing
 */

var assert = require('assert');
var _ = require('underscore');
var matchmaker = require('../routes/matchmaker');


// Helpers

function findById(source, id) {
  return source.filter(function( obj ) {
    return obj._id === id;
  })[ 0 ];
}


// Mock users

function User(id, selectedClasses) {
  var self = this;
  this._id = id;
  this.classes = selectedClasses;
  this.costs = [3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000,3000000];
  this.classes.forEach( function(cid, index) {
    var c = index+1;
    if (cid === 'scout') {
      self.costs[0] = c;
      self.costs[1] = c;
      self.costs[2] = c;
      self.costs[3] = c;
    } else if (cid === 'psoldier') {
      self.costs[4] = c;
      self.costs[5] = c;
    } else if (cid === 'rsoldier') {
      self.costs[6] = c;
      self.costs[7] = c;
    } else if (cid === 'demoman') {
      self.costs[8] = c;
      self.costs[9] = c;
    } else if (cid === 'medic') {
      self.costs[10] = c;
      self.costs[11] = c;
    } else {
      return console.log('what?');
    }
  });
}




/**
 * Test 1
 *
 * Coaches get first pick
 */

var newbieQueue = [];
for (var i=0; i<13; i++) {
  newbieQueue.push( new User('noob:P-S-R-D-M', ['psoldier', 'scout', 'rsoldier', 'demoman', 'medic']) );
}

var coachQueue = [];
coachQueue.push( new User('coach1:P-S-R-D-M', ['psoldier', 'scout', 'rsoldier', 'demoman', 'medic']) );
coachQueue.push( new User('coach2:P-S-R-D-M', ['psoldier', 'scout', 'rsoldier', 'demoman', 'medic']) );
coachQueue.push( new User('coach3:P-S-R-D-M', ['psoldier', 'scout', 'rsoldier', 'demoman', 'medic']) );

console.log('Test 1:');
var testResult1 = matchmaker.matchmaker(newbieQueue, coachQueue);
assert.ok(testResult1 !== false &&
          findById(testResult1, 'coach1:P-S-R-D-M').class === 'P' &&
          findById(testResult1, 'coach2:P-S-R-D-M').class === 'P', 'Test 1 Failed');



/**
 * Test 2
 *
 * Input too few players
 */

var newbieQueue = [];
for (var i=0; i<9; i++) {
  newbieQueue.push( new User('noob:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
}

var coachQueue = [];
for (var j=0; j<2; j++) {
  coachQueue.push( new User('coach:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
}

console.log('Test 2 - Too Few Players:');
var testResult2 = matchmaker.matchmaker(newbieQueue, coachQueue);
assert.ok(testResult2 === false, 'Test 2 Failed -- Too few players, should return false');


/**
 * Test 3
 *
 * Solution not possible, every noob wants to play Medic
 */

var newbieQueue = [];
for (var i=0; i<10; i++) {
  newbieQueue.push( new User('noob:M', ['medic']) );
}

var coachQueue = [];
for (var j=0; j<2; j++) {
  coachQueue.push( new User('coach:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
}

console.log('Test 3 - No Solution:');
var testResult3 = matchmaker.matchmaker(newbieQueue, coachQueue);
assert.ok(testResult3 === false, 'Test 3 Failed -- No solution possible, should return false');



/**
 * Test 4
 *
 * The two newbies who want to play medic should get medic
 */

var newbieQueue = [];
for (var i=0; i<8; i++) {
  newbieQueue.push( new User('noob:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
}
newbieQueue.push( new User('noob:M', ['medic']) );
newbieQueue.push( new User('noob:M', ['medic']) );

var coachQueue = [];
for (var j=0; j<2; j++) {
  coachQueue.push( new User('coach:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
}

console.log('Test 4:');
var testResult4 = matchmaker.matchmaker(newbieQueue, coachQueue);
assert.ok(testResult4 !== false && findById(testResult4, 'noob:M').class === 'M', 'Test 4 Failed');


/**
 * Test 5
 *
 * Just a benchmark, run through 80 random players
 */


var newbieQueue = [];
for (var i=0; i<80; i++) {

  var classes = ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic'];
  var randomClasses = [];
  //Shuffle the classes array
  classes.sort(function() { return 0.5 - Math.random();});
  var randomInt = Math.floor(Math.random()*5)+1;
  for (var j=0; j<randomInt; j++) {
      randomClasses.push(classes.pop());
  };

  newbieQueue.push( new User('noob'+i+'', randomClasses) );
}

var coachQueue = [];
console.log('Test 5 - 80 random:');
var testResult5 = matchmaker.matchmaker(newbieQueue, coachQueue);



/**
 * Test 6
 *
 * A contrived example! noob10 should get the medic spot rather than noobs 11 and 12
 */

var newbieQueue = [];
newbieQueue.push( new User('noob0:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob1:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob2:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob3:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob4:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob5:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob6:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob7:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob8:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob9:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
newbieQueue.push( new User('noob10:M', ['medic']) );
newbieQueue.push( new User('noob11:M', ['medic']) );
newbieQueue.push( new User('noob12:M', ['medic']) );
newbieQueue.push( new User('noob13:S-P-R-D-M', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );

var coachQueue = [];

console.log('Test 6:');
var testResult6 = matchmaker.matchmaker(newbieQueue, coachQueue);
assert.ok(testResult6 !== false && findById(testResult6, 'noob10:M').class === 'M', 'Test 6 Failed');



/**
 * Test 7
 *
 * Can we *really* take in a queue of 200?
 */

var newbieQueue = [];
for (var i=0; i<192; i++) {
  newbieQueue.push( new User('noob'+i+':M', ['medic']) );
}

newbieQueue.push( new User('noob192', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob193', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob194', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob195', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob196', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob197', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob198', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob199', ['rsoldier', 'demoman', 'medic', 'scout', 'psoldier']) );

var coachQueue = [];
coachQueue.push( new User('coach0', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );
coachQueue.push( new User('coach1', ['scout', 'psoldier', 'rsoldier', 'demoman', 'medic']) );

console.log('Test 7: 192 goddamn medics');
var testResult7 = matchmaker.matchmaker(newbieQueue, coachQueue);
assert.ok(testResult7 !== false &&
          findById(testResult7, 'coach0').class === 'S' &&
          findById(testResult7, 'coach1').class === 'S' &&
          findById(testResult7, 'noob0:M').class === 'M' &&
          findById(testResult7, 'noob1:M').class === 'M' &&
          findById(testResult7, 'noob192').class === 'R' &&
          findById(testResult7, 'noob193').class === 'R' &&
          findById(testResult7, 'noob194').class === 'D' &&
          findById(testResult7, 'noob195').class === 'D' &&
          findById(testResult7, 'noob196').class === 'S' &&
          findById(testResult7, 'noob197').class === 'S' &&
          findById(testResult7, 'noob198').class === 'P' &&
          findById(testResult7, 'noob199').class === 'P', 'Test 7 Failed');




/**
 * Test 8
 *
 * Coaches should get downgraded if necessary
 */

var newbieQueue = [];
newbieQueue.push( new User('noob0', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob1', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob2', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob3', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob4', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob5', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob6', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob7', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob8', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob9', ['rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob10', ['demoman', 'rsoldier', 'medic', 'scout', 'psoldier']) );
newbieQueue.push( new User('noob11', ['demoman', 'rsoldier', 'medic', 'scout', 'psoldier']) );

var coachQueue = [];
coachQueue.push( new User('coach0', ['scout', 'demoman', 'medic', 'psoldier']) );
coachQueue.push( new User('coach1', ['rsoldier', 'demoman', 'psoldier']) );

console.log('Test 8:');
var testResult8 = matchmaker.matchmaker(newbieQueue, coachQueue);
assert.ok(testResult8 !== false &&
          findById(testResult8, 'coach0').class === 'D' &&
          findById(testResult8, 'coach1').class === 'D', 'Test 8 Failed');







console.log('all tests passed');
