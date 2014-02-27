/*global define
 This file contains the node model, which contains the data for each concept TODO should this be renamed "concept-model"?
 */

define(["backbone", "underscore", "../collections/edge-collection"], function(Backbone, _, DirectedEdgeCollection){

  // Private methods and variables
  var pvt = {};

  /**
   * determines whether the node should be contracted given the edges state
   */
  pvt.nodeShouldBeContracted = function(edgeType){
    var edges = this.get(edgeType);
    return edges.length && edges.every(function(edge){
      return edge.get("isContracted");
    });
  };

  // expand from a node FIXME: DRY with contractFromNode
  pvt.expandFromNode = function(notStart, hasContractedEdgesName, edgeType, edgeEnding){
    if (!notStart){
      this.set(hasContractedEdgesName, false);
    }
    this.get(edgeType)
      .each(function(dep) {
        dep.set("isContracted", false);
        var srcNode = dep.get(edgeEnding);
        if (srcNode.get("isContracted")) {
          srcNode.set("isContracted", false);
          srcNode.set(hasContractedEdgesName, false);
          pvt.expandFromNode.call(srcNode, true, hasContractedEdgesName, edgeType, edgeEnding);
        }
      });
  };

  // contract from a node
  pvt.contractFromNode = function(notStart, hasContractedEdgesName, edgeType, otherEdgeType, edgeEnding){
    if (!notStart){
      this.set(hasContractedEdgesName, true);
    }
    this.get(edgeType)
      .each(function(edge){
        edge.set("isContracted", true);
        var srcNode = edge.get(edgeEnding);
        if (pvt.nodeShouldBeContracted.call(srcNode, otherEdgeType)){
          srcNode.set("isContracted", true);
          srcNode.set(hasContractedEdgesName, false);
          pvt.contractFromNode.call(srcNode, true, hasContractedEdgesName, edgeType, otherEdgeType, edgeEnding);
        }
      });
  };

  /**
   * Node: node model that encompasses several collections and sub-models
   */
  return  (function(){
    // maintain ancillary/user-specific info and fields in a private object
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
      collFields: function () {
        return ["dependencies", "outlinks"];
      },

      /**
       * Non-collection fields, nominally referred to as text fields
       */
      txtFields: function () {
          return  ["id", "title"];
      },

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
       },

      /**
       * @return {boolean} true if the node is visible
       */
      isVisible: function(){
        return !this.get("isContracted"); // TODO add learned/hidden properties as well
      },

      /**
       * Node's deps should be contracted if it has > 0 outlinks that are all invisible
       *
       * @return {boolean} whether the node's deps should be contracted
       */
      depNodeShouldBeContracted: function(){
        return pvt.nodeShouldBeContracted.call(this, "outlinks");
      },

      /**
       * Node's outlinks should be contracted if it has > 0 deps that are all invisible
       *
       * @return {boolean} whether the node's outlinks should be contracted
       */
      olNodeShouldBeContracted: function(){
        return pvt.nodeShouldBeContracted.call(this, "dependencies");
      },

      /**
       * Contracts the dependencies of the node
       */
      contractDeps: function(notStart){
        pvt.contractFromNode.call(this, notStart, "hasContractedDeps", "dependencies", "outlinks", "source");
      },

      /**
       * Expands the dependencies of the node
       */
      expandDeps: function(notStart) {
        pvt.expandFromNode.call(this, notStart, "hasContractedDeps", "dependencies", "source");
      },

      /**
       * Contract the postrequisites of the node
       */
      contractOLs: function(notStart){
        pvt.contractFromNode.call(this, notStart, "hasContractedOLs", "outlinks", "dependencies", "target");
      },

      /**
       * Expand the postrequisites of the node
       */
      expandOLs: function(notStart){
        pvt.expandFromNode.call(this, notStart, "hasContractedOLs", "outlinks", "target");
      }
    });
  })();
});
