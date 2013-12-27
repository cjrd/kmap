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

      collFields: ["dependencies", "outlinks"],

      txtFields: ["id", "title"],

      /**
       * Check if ancestID is an ancestor of this node
       */
      isAncestor: function(ancestID){
        if (!this.ancestors){
          this.getAncestors(true);
        }
        return this.ancestors.hasOwnProperty(ancestID);
      },

      /**
       * Obtain (and optionally return) a list of the ancestors of this node
       * side effect: creates a list of unique dependencies (dependencies not present as an
       * ancestor of another dependency) which is stored in this.uniqueDeps
       */
      /* ulOnly: set to true to only return unlearned ancestors */
      getAncestors: function(ulOnly){
        var thisModel = this;
        if (!thisModel.ancestors || ulOnly){

          var ancests = {},
              coll = this.collection;

          // TODO fix the ulonly generalization problems
          if (ulOnly) {
              var aux = window.agfkGlobals.auxModel;
          }

          thisModel.get("dependencies").each(function(dep){
            var depNode = dep.get("source"),
                depId = depNode.id;
            if (!ulOnly || !aux.conceptIsLearned(depId)){
              var dAncests = depNode.getAncestors(ulOnly);
              for (var dAn in dAncests){
                if(dAncests.hasOwnProperty(dAn)){
                  ancests[dAn] = 1;
                }
              }
            }
          });
          thisModel.get("dependencies").each(function(dep){
            ancests[dep.get("source").id] = 1;
          });
          if(!ulOnly){
            thisModel.ancestors = ancests;
          }
        }
        return ancests || thisModel.ancestors;
      },

      /**
       * Returns the unique (not transitive) dependencies of the node
       * TODO refactor this view to
       *  (i) take advantage of transitivity flags on edges
       *  (ii) remove ulOnly (unlearned only) flag from this view, or generalize it to a argument function
       */
      getUniqueDeps: function(ulOnly){
        var thisModel = this,
            allDeps = thisModel.get("dependencies").pluck("source"),
            thisColl = thisModel.collection,
            ulDeps = {},
            ulUniqueDeps = {},
            ulAcest,
            dep;

        _.each(allDeps, function(dep){
          if (!ulOnly || !dep.isLearnedOrImplicitLearned()){
            ulDeps[dep.id] = 1;
            ulUniqueDeps[dep.id] = 1;
          }
        });

        // for each unlearned ancestor, check if any of its ancestors are in the unlearned ancestor list
        // if they are, remove it from the ulUniqueDeps object
        for (ulAcest in ulDeps){
          if (ulDeps.hasOwnProperty(ulAcest)){
            var ulAcestAncests = thisColl.get(ulAcest).getAncestors(ulOnly);
            for (var ulAcestAcest in ulAcestAncests){
              if (ulAcestAncests.hasOwnProperty(ulAcestAcest)
                  && ulDeps[ulAcestAcest]){
                if (ulUniqueDeps[ulAcestAcest]){
                  delete ulUniqueDeps[ulAcestAcest];
                }
              }
            }
          }
        }
        return Object.keys(ulUniqueDeps);
      }

    });
  })();
});
