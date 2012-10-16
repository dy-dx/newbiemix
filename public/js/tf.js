/**
 * This file mostly copied from github.com/nko3/website/blob/master/public/javascripts/watchmaker.js
 */

var tf = {};
(function(tf) {
  ////// Vector //////
  tf.Vector = function(x, y) {
    if (typeof(x) === 'undefined') return;
    if (typeof(x) === 'number') {
      this.x = x || 0;
      this.y = y || 0;
    } else if (0 in x) {
      this.x = x[0];
      this.y = x[1];
    } else if ('left' in x) {
      this.x = x.left;
      this.y = x.top;
    } else {
      this.x = x.x;
      this.y = x.y;
    }
  };
  tf.Vector.prototype = {
    constructor: tf.Vector,

    plus: function(other) {
      return new this.constructor(this.x + other.x, this.y + other.y);
    },

    minus: function(other) {
      return new this.constructor(this.x - other.x, this.y - other.y);
    },

    times: function(s) {
      return new this.constructor(this.x * s, this.y * s);
    },

    length: function() {
      return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y,2));
    },

    toString: function() {
      return this.x + 'px, ' + this.y + 'px';
    },

    cardinalDirection: function() {
      // Gang Garrison sprites are only east or west!
      // if (Math.abs(this.x) > Math.abs(this.y))
        return this.x < 0 ? 'w' : 'e';
      // else
      //   return this.y < 0 ? 'n' : 's';
    }
  };

  ////// Sprite //////
  tf.Sprite = function(options) {
    if (!options) return;

    var self = this;

    this.name = options.name;
    this.pos = new tf.Vector(options.pos);
    this.size = new tf.Vector(options.size);
    this.ready = options.ready;

    this.div = $('<div class="sprite">').addClass(this.name);
    this.img = $('<img>', { src: '/img/sprites/' + this.name + '.png' })
      .load(function() {
        self.size = new tf.Vector(this.width, this.height);
        self.draw();
      });
  };

  tf.Sprite.prototype.getPosition = function() {
    return this.pos.plus(this.origin);
  };

  tf.Sprite.prototype.toJSON = function() {
    return {
      name: this.name,
      pos: this.pos,
      size: this.size,
      origin: this.origin
    };
  };

  tf.Sprite.prototype.resetOrigin = function() {
    this.origin = new tf.Vector(this.div.offsetParent().offset());
  };

  tf.Sprite.prototype.draw = function() {
    // What is this???
    var offset = new tf.Vector(this.size.x * -0.5, -this.size.y + 20);
    this.div
      .css({
        left: this.pos.x,
        top: this.pos.y,
        width: this.size.x,
        height: this.size.y,
        'z-index': Math.floor(this.pos.y-2000),
        // transform: Modernizr.csstransforms ? 'translate(' + offset.toString() + ')' : null,

        transform: 'translate(' + offset.toString() + ')',
        background: 'url(' + this.img.attr('src') + ')'
      })
      .appendTo($('#container'));
    this.resetOrigin();
    // What is this???
    if (this.ready) this.ready();

// This does nothing:
    // this.animate();

    return this;
  };

  // What is this???
  // tf.Sprite.prototype.animate = function() {};

  tf.Sprite.prototype.remove = function() {
    this.div.fadeOut(function() { $(this).remove(); });
  };


  ////// Idle Sprite //////
  // need this?? what is it for?
  tf.IdleSprite = function(options) {
    tf.Sprite.call(this, options);
    this.frame = 0;

    this.cycles = options && options.cycles;
    this.cycle = 0;
  };
  tf.IdleSprite.prototype = new tf.Sprite();
  tf.IdleSprite.prototype.constructor = tf.IdleSprite;

  tf.IdleSprite.prototype.draw = function() {
    // Probably have to change this stuff
    // this.frames = this.size.x / 80;
    // this.size.x = 80;
    // 64px per frame now
    this.frames = this.size.x / 64;
    this.size.x = 64;

    if (this.cycles) this.cycles *= this.frames;

    return tf.Sprite.prototype.draw.call(this);
  };

  tf.IdleSprite.prototype.animateFrames = function(state) {
    var self = this;

    clearTimeout(this.animateTimeout);

    this.frame = ((this.frame + 1) % this.frames);
    this.div.css('background-position', (-this.frame * this.size.x) + 'px 0px');

    if (!this.cycles || ++this.cycle < this.cycles)
      this.animateTimeout = setTimeout(function() { self.animateFrames(); }, 400);
    else
      $(this.div).remove();
  };


  ////// Character //////
  tf.Player = function(options) {
    tf.Sprite.call(this, options);

    this.id = options.id;
    this.state = 'idle';
    this.frame = 0;
    this.bubbleFrame = 0;
    this.div.addClass('player');
  };
  tf.Player.prototype = new tf.Sprite();
  tf.Player.prototype.constructor = tf.Player;

  tf.Player.prototype.toJSON = function() {
    var json = tf.Sprite.prototype.toJSON.call(this);
    json.id = this.id;

    return json;
  };

  tf.Player.prototype.draw = function() {
    // this.idleFrames = (this.size.x - 640) / 80;
    // this.size.x = 80;
    // Idle Frames start at frame 6
    this.idleFrames = (this.size.x - 320) / 64;
    this.size.x = 64;

    this.bubble = $('<div class="bubble">')
      .css('bottom', this.size.y + 2)
      .appendTo(this.div);

    return tf.Sprite.prototype.draw.call(this);
  };

  // tf.Player.prototype.frameOffset = { w: 0, e: 2, s: 4, n: 6, idle: 8 };
  tf.Player.prototype.frameOffset = { w: 2, e: 0, idle: 5 };

  // tf.Player.prototype.animateFrames = function(state) {
  tf.Player.prototype.animateFrames = function(state, direction) {
    var self = this;

    clearTimeout(this.animateTimeout);
    if (state) this.state = state;

    var frames = this.state ==='idle' ? this.idleFrames : 2;
    this.frame = ((this.frame + 1) % frames);

    if (direction) {
      // This is a hack to change the idle frame based on direction
      this.div.css('background-position', (-(this.frameOffset[direction]+this.frame) * this.size.x) + 'px 0px');
    } else {
      this.div.css('background-position', (-(this.frameOffset[this.state]+this.frame) * this.size.x) + 'px 0px');
    }

    if (this.bubble && this.bubble.is(':visible')) {
      this.bubbleFrame = (this.bubbleFrame + 1) % 3;
      self.bubble
        .removeClass('frame-0 frame-1 frame-2')
        .addClass('frame-' + this.bubbleFrame);
    }
    // STOP ANIMATING YOURSELF!
    if (this.state === 'idle') return;
    this.animateTimeout = setTimeout(function() { self.animateFrames(); }, 150);
  };

  tf.Player.prototype.goTo = function(pos, duration, callback) {
    pos = new tf.Vector(pos).minus(this.origin);

    if (typeof(duration) === 'function')
      callback = duration;

    var self = this;
    var delta = pos.minus(this.pos);
    var speed = 0.25;
    var duration = duration !== undefined && typeof(duration) !== 'function' ? duration : delta.length() / speed;

    this.animateFrames(delta.cardinalDirection());
    var offset = new tf.Vector(this.size.x * -0.5, -this.size.y + 20);

    if (duration && duration > 0)
      this.div.stop();
    this.div
      .animate({
        left: pos.x,
        top: pos.y
      }, {
        duration: duration,
        easing: 'linear',
        step: function(now, fx) {
          switch (fx.prop) {
            case 'left':
              self.pos.x = now;
              break;
            case 'top':
              self.pos.y = now;
              self.div.css('z-index', Math.floor(now-2000));
              break;
          }
        },
        complete: function() {
          self.pos = pos;
          // z-index?
          // self.animateFrames('idle');
          self.animateFrames('idle', delta.cardinalDirection());
          if (callback) callback();
        }
      });
  };

  tf.Player.prototype.warp = function(pos) {
    var self = this;

    this.div
      .stop()
      .fadeOut(null, null, function() {
        self.goTo(pos, 0);
        self.div.fadeIn();
      });
  };

  tf.Player.prototype.speak = function(text) {
    if (!text)
      this.bubble.fadeOut();
    else
      this.bubble
        .text(text)
        .scrollTop(this.bubble.prop("scrollHeight"))
        .fadeIn();
  };


  ////// Let's Begin //////
  $(function() {
    // Choose a random sprite
    // var types = [ 'suit', 'littleguy', 'beast', 'gifter', 'flannel' ];
    var types = [ 'scout-red', 'soldier-red', 'demoman-red', 'medic-red' ];
    var me = tf.me = new tf.Player({
      name: types[Math.floor(types.length * Math.random())],
      pos: new tf.Vector(-100, -100),
      ready: function() {
        this.speak('type to chat. click to move around.');
        speakTimeout = setTimeout(function() { me.speak(''); }, 5000);
      }
    });

    // Random sprite placement?? not really
    $(window).load(function() {
      // var el = $(location.hash);
      // if (el.length === 0) el = $('body');
      var el = $('#container');
      tf.warpTo(el);
    });

    ////// Networking //////
    var players = tf.players = {};
    // var ws = tf.ws = io.connect(null, {
    //   // 'port': '#socketIoPort#'
    //   'port': 8003
    // });
    var ws = tf.ws = io.connect();
    ws.on('connect', function() {
      me.id = ws.socket.sessionid;
      tf.players[me.id] = me;
      (function heartbeat() {
        tf.send({ obj: me }, true);
        setTimeout(heartbeat, 5000);
      })();
    });
    ws.on('message', function(data) {
      var player = players[data.id];

      if (data.disconnect && player) {
        player.remove();
        delete players[data.id];
      }

      if (data.obj && !player && data.obj.pos.x < 10000 && data.obj.pos.y < 10000)
        player = players[data.id] = new tf.Player(_.extend(data.obj, { id: data.id })).draw();

      if (player && data.method) {
        player.origin = data.obj.origin;
        var arguments = _.map(data.arguments, function(obj) {
          return obj.id ? tf.players[obj.id] : obj;
        });
        tf.Player.prototype[data.method].apply(player, arguments);
      }
    });


    ////// Helper Methods //////
    randomPositionOn = function(selector) {
      var page = $(selector);
      var pos = page.position();

      return new tf.Vector(pos.left + 210 + Math.random() * (page.width() + 290),
                            pos.top + 60 + Math.random() * (page.height() + 90 ));
    };

    tf.warpTo = function (selector) {
      var pos = randomPositionOn(selector);

      me.warp(pos);
      tf.send({
        obj: me,
        method: 'warp',
        arguments: [ pos ]
      });
    };

    tf.goTo = function(selector) {
      var page = $(selector);
      if (page.length === 0) return;

      var $window = ($window);
      var pos = page.offset();
      var left = pos.left - ($window.width() - page.width()) / 2;
      var top = pos.top - ($window.height() - page.height()) / 2;

      $('body')
        .stop()
        .animate({ scrollLeft: left, scrollTop: top }, 1000);

      pos = randomPositionOn(page);

      me.goTo(pos);
      tf.send({
        obj: me,
        method: 'goTo',
        arguments: [ pos ]
      });

      page.click();
    };

    tf.send = function(data, heartbeat) {
      if (!ws) return;
      
      var now = Date.now();
      if (now - ws.lastSentAt < 10) return; //throw Error('throttled');
      ws.lastSentAt = now;

      if (!heartbeat || ws.lastActionAt)
        ws.json.send(data);

      // Disconnect after 15 minutes of idling; refresh after 2 hours
      // if (now - ws.lastActionAt > 900000) ws.disconnect();
      // if (now - ws.lastActionAt > 7200000) location.reload();
      if (!heartbeat) ws.lastActionAt = now;
    };


    ////// Event Listeners //////
    // enter watchmaker land
    // $('.thing.streetlamp').live('click touchend', function() {
    //   $('#inner').fadeToggle()
    // });

    ////// Movement //////
    $(window)
      .resize(_.debounce(function() { me.resetOrigin(); }, 300))
      .click(function(e) { // move on click

        // Check if target has an ancestor with class "nomove"
        if( $(e.target).closest('.nomove').length ) return;
        if (e.pageX === undefined || e.pageY === undefined) return;

        var pos = { x: e.pageX, y: e.pageY };
        me.goTo(pos);

        tf.send({
          obj: me,
          method: 'goTo',
          arguments: [ pos ]
        });
      });


    // chat
    var speakTimeout;
    var $text = $('<textarea>')
      .appendTo($('<div class="textarea-container">')
      .appendTo(me.div))
      .bind('keyup', function(e) {
        var text = $text.val();
        switch (e.keyCode) {
          case 13:
            $text.val('');
            $text.blur();
            return false;
          default:
            me.speak(text);
            tf.send({
              obj: me,
              method: 'speak',
              arguments: [ text ]
            });
            clearTimeout(speakTimeout);
            speakTimeout = setTimeout(function() {
              $text.val('');
              me.speak();
              tf.send({
                obj: me,
                method: 'speak'
              });
            }, 5000);
        }
      }).focus();
    $(document).keylisten(function(e) {
      // Press 'y' to chat
      if (e.keyCode === 89)
        $text.focus();
    });


    //// flare
    // tf.map = function(map) {
    //   $.each(map, function() {
    //     for (var name in this)
    //       new tf.Sprite({ name: name, pos: new tf.Vector(this[name]) });
    //   });
    // };
    // tf.map([
    //   { 'streetlamp': [  -10, 160  ] },
    //   { 'livetree':   [  -80, 120  ] },
    //   { 'livetree':   [  580, 80   ] },
    //   { 'livetree':   [ 1000, 380  ] },
    //   { 'deadtree':   [ 1050, 420  ] },

    //   //// lounge
    //   { 'livetree':   [  -60, 870  ] },
    //   { 'deadtree':   [    0, 900  ] },
    //   { 'portopotty': [   80, 900  ] },
    //   { 'livetree':   [  550, 1050 ] },
    //   { 'livetree':   [  500, 1250 ] },
    //   { 'deadtree':   [  560, 1300 ] },
    //   { 'desk':       [  500, 1350 ] },
    //   { 'livetree':   [  120, 1800 ] },
    //   { 'deadtree':   [   70, 1700 ] },
    //   { 'livetree':   [  -10, 1900 ] }
    // ]);


  });

})(tf);