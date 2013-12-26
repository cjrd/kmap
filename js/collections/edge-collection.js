/*global define */
define(["backbone", "lib/kmap/js/models/edge-model"], function(Backbone, DirectedEdge){
  return  Backbone.Collection.extend({
    model: DirectedEdge
  });
});
