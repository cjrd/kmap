/*
 * Basic kmap demonstration
 */

/*global requirejs, define*/

// configure requirejs
requirejs.config(  {
  // TODO use min files here since we're not using a compressor
  paths: {
    jquery:"lib/jquery-1.10.2.min",
    backbone: "lib/backbone-min",
    underscore: "lib/underscore-min",
    d3: "lib/d3",
    "dagre": "lib/dagre",
    "btouch": "lib/backbone.touch"
  },
  shim: {
    d3: {
      exports: "d3"
    },
    dagre: {
      exports: "dagre"
    },
    underscore: {
      exports: "_"
    },
    backbone: {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    },
    "btouch": {
      deps: ["jquery", "underscore", "backbone"]
    }
  }
});

//main execution
define(["models/graph-model", "views/graph-view", "views/concept-list-view", "jquery", "btouch"], function(GraphModel, GraphView, ListView){
  var KMap = {};
  KMap.GraphModel = GraphModel;
  KMap.GraphView = GraphView;
  KMap.GraphListView = ListView;
  /* make the KMap object global
     this hack provides a library-esk mode for kmap
     and preserves metacademy integration */
  window.KMap = KMap;
  return KMap;
});
