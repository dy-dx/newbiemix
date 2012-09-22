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
      if (Math.abs(this.x) > Math.abs(this.y))
        return this.x < 0 ? 'w' : 'e';
      else
        return this.y < 0 ? 'n' : 's';
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
    this.img = $('<img>', { src: '/images/sprites/' + this.name + 'png' })
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
        'z-index': Math.floor(this.pos.y),
        // transform: Modernizr.csstransforms ? 'translate(' + offset.toString() + ')' : null,
        transform: 'translate(' + offset.toString() + ')',
        background: 'url(' + this.img.attr('src') + ')' 
      })
      .appendTo($('#container'));
    this.resetOrigin();
    // What is this???
    if (this.ready) this.ready();

    this.animate();

    return this;
  };

  // What is this???
  tf.Sprite.prototype.animate = function() {};

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
    this.frames = this.size.x / 80;
    this.size.x = 80;

    if (this.cycles) this.cycles *= this.frames;

    return tf.Sprite.prototype.draw.call(this);
  };

  tf.IdleSprite.prototype.animate = function(state) {
    var self = this;

    clearTimeout(this.animateTimeout);

    this.frame = ((this.frame + 1) % this.frames);
    this.div.css('background-position', (-this.frame * this.size.x) + 'px 0px');

    if (!this.cycles || ++this.cycle < this.cycles)
      this.animateTimeout = setTimeout(function() { self.animate(); }, 400);
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
    this.idleFrames = (this.size.x - 640) / 80;
    this.size.x = 80;

    this.bubble = $('<div class="bubble">')
      .css('bottom', this.size.y + 10)
      .appendTo(this.div);

    return tf.Sprite.prototype.draw.call(this);
  };

  tf.Player.prototype.frameOffset = { w: 0, e: 2, s: 4, n: 6, idle: 8 };

  tf.Player.prototype.animate = function(state) {
    var self = this;

    clearTimeout(this.animateTimeout);
    if (state) this.state = state;

    var frames = this.state ==='idle' ? this.idleFrames : 2;
    this.frame = ((this.frame + 1) % frames);
    this.div.css('background-position', (-(this.frameOffset[this.state]+this.frame) * this.size.x) + 'px 0px');

    if (this.bubble && this.bubble.is(':visible')) {
      this.bubbleFrame = (this.bubbleFrame + 1) % 3;
      self.bubble
        .removeClass('frame-0 frame-1 frame-2')
        .addClass('frame-' + this.bubbleFrame);
    }

    this.animateTimeout = setTimeout(function() { self.animate(); }, 400);
  };

  tf.Player.prototype.goTo = function(pos, duration, callback) {
    pos = new tf.Vector(pos).minus(this.origin);

    if (typeof(duration) === 'function')
      callback = duration;

    var self = this;
    var delta = pos.minus(this.pos);
    // what the fuck is this?
    var duration = duration !== undefined && typeof(duration) !== 'function' ? duration : delta.length() / 200 * 1000;

    this.animate(delta.cardinalDirection());
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
              self.div.css('z-index', Math.floor(now));
              break;
          }
        },
        complete: function() {
          self.pos = pos;
          // z-index?
          self.animate('idle');
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

  tf.Player.prototype.hug = function hug(otherPlayer) {
    var pos = otherPlayer.pos.minus(this.pos).times(0.5).plus(this.pos);
    new tf.IdleSprite({ name: 'heart', pos: pos.plus({ x: 0, y: -80 }), cycles: 2 });
  };

  tf.Player.prototype.near = function near(pos) {
    return this.pos.minus(pos).length() < 150;
  };

})(tf);