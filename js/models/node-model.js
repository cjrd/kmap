/*global define
 This file contains the node model, which contains the data for each concept TODO should this be renamed "concept-model"?
 */

define(["backbone", "underscore", "../collections/edge-collection"], function(Backbone, _, DirectedEdgeCollection){
  /**
   * Node: node model that encompasses several collections and sub-models
   */
  return  (function(){
    // maintain ancillary/user-specific info and fields in a private object
    var pvt = {};

    return Backbone.Model.extend({
      /**
       * all possible attributes are present by default
       */
      defaults: function() {
        return {
          title: "",
          id: "",
          dependencies: new DirectedEdgeCollection(),
          outlinks: new DirectedEdgeCollection()
        };
      },

      /**
       * Collection fields
       */
      collFields: ["dependencies", "outlinks"],

      /**
       * Non-collection fields, nominally referred to as text fields
       */
      txtFields: ["id", "title"],

      /**
       * Returns all outlinks that are not transitive edges
       */
      getDirectOutlinks: function () {
        return this.get("outlinks").filter(function (edge) {
          return !edge.get("isTransitive");
        });
      },
      /**
        * Returns all outlinks that are not transitive edges
        */
       getDirectDeps: function () {
         return this.get("dependencies").filter(function (edge) {
           return !edge.get("isTransitive");
         });
       }

    });
  })();
});
