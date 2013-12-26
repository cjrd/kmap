/*global define */
define(["backbone", "../models/edge-model"], function(Backbone, DirectedEdge){
  return  Backbone.Collection.extend({
    model: DirectedEdge
  });
});
