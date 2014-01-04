
/*global require*/
require.config({
  baseUrl: "/js",
  paths: {
    jquery:"lib/jquery-1.10.2.min",
    underscore: "lib/underscore-min",
    backbone: "lib/backbone-min",
    d3: "lib/d3",
    "dagre": "lib/dagre",
    "btouch": "lib/backbone.touch",
    "chai": "lib/chai",
    "mocha": "lib/mocha"
  },

  shim: {
    'underscore': {
      exports: '_'
    },
    dagre: {
      exports: "dagre"
    },
    'jquery': {
      exports: '$'
    },
    'backbone': {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    },
    "btouch": {
      deps: ["jquery", "underscore", "backbone"]
    },
    'mocha': {
      init: function () {
        this.mocha.setup('bdd');
        return this.mocha;
      }
    }
  },
  urlArgs: 'bust=' + (new Date()).getTime()
});

require(['require', 'chai', 'mocha', 'jquery'], function(require, chai, mocha, $){

  require([
    'tests/tests'
  ], function(require) {
    if (window.mochaPhantomJS) { window.mochaPhantomJS.run(); }
    else { mocha.run(); }
  });

});
