// http://msdn.microsoft.com/en-us/scriptjunkie/ff928319.aspx
// http://brandonaaron.net/blog/2009/03/26/special-events
// http://github.com/tzuryby/jquery.hotkeys/blob/master/jquery.hotkeys.js

(function($, window, undefined) {
  $.fn.keylisten = function(fn) {
    if ($.attrFn) $.attrFn.keylisten = true;
    return fn ? this.bind('keylisten', fn) : this.trigger('keylisten');
  };

  var keyNames = {
    8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl",
    18: "alt", 19: "pause", 20: "capslock", 27: "esc", 32: "space",
    33: "pageup", 34: "pagedown", 35: "end", 36: "home", 37: "left",
    38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
    91: "meta", 93: "meta",   // meta is cmd, 91 - left, 93 - right
    96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6",
    103: "7", 104: "8", 105: "9", 106: "*", 107: "+", 108: 'enter',
    109: "-", 110: ".", 111 : "/", 112: "f1", 113: "f2", 114: "f3",
    115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8", 120: "f9",
    121: "f10", 122: "f11", 123: "f12", 144:"numlock", 145: "scroll",
    188: ',', 191: "/", 224: "meta"
  };

  var shiftCodes = {
   "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6",
   "&": "7", "*": "8", "(": "9", ")": "0", "_": "-", "+": "=", ":": ";",
   "<": ",", ">": ".", "?": "/", "|": "\\", "\"": "'"
  };

  var modifiers = ['alt', 'ctrl', 'meta', 'shift'];

  var keyevent = $.browser.mozilla || $.browser.opera ? 'keypress' : 'keydown';
  $.event.special.keylisten = {
    setup: function(data, namespaces) {
      $(this).bind(keyevent, $.event.special.keylisten.handler)
    },

    teardown: function(namespaces) {
      $(this).unbind(keyevent, $.event.special.keylisten.handler)
    },

    handler: function(e) {
      // don't fire in text-accepting inputs that weren't bound directly
      if (this !== e.target && $(e.target).is('textarea,select,input'))
        return;

      var mods = '', key = keyNames[e.keyCode] || String.fromCharCode(e.which).toLowerCase();
      if(shiftCodes[key]) key = shiftCodes[key]; // normalize shift keycodes

      for (var i = 0, len = modifiers.length; i < len; i++) {
        var mod = modifiers[i];
        if (e[mod + 'Key'] && key !== mod) mods += mod + '+';
      }

      e.type = 'keylisten';
      e.keyName = mods + key;
      $.event.handle.apply(this, arguments);
    }
  };
})(jQuery, window);