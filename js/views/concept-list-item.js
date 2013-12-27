// This view contains the list item view for the concept list

/*global define*/
define(["backbone", "underscore"], function (Backbone, _) {

  /**
   * Display the concepts as an item in the node list
   */
  return  (function(){
    // define private variables and methods
    var pvt = {};

    pvt.consts = {
      viewClass: "learn-title-display",
      viewIdPrefix: "node-title-view-" // must also change in parent
    };

    // return public object for node list item view
    return Backbone.View.extend({
      id: function(){ return pvt.consts.viewIdPrefix +  this.model.id;},

      tagName: "li",

      // TODO handle click event correctly
      events: {},

      /** override in subclass */
      preinitialize: function () {},

      /**
       * Initialize the view with appropriate listeners
       * NOTE: this should not be overridden in a subclass - use post/preinitialize
       */
      initialize: function(inp){
        var thisView = this;
        thisView.preinitialize(inp);
        thisView.postinitialize(inp);
      },

      /** override in subclass */
      postinitialize: function (inp) {},

      /** override in subclass */
      prerender: function (inp) {},

      /**
       * Render the learning view given the supplied model
       */
      render: function(){
        var thisView = this;
        thisView.prerender();


        thisView.postrender();
        return thisView;
      },

      /** override in subclass */
      postrender: function () {
        // TODO figure out how to return a list item correctly...
      },

      /**
       * Change the title display properties given by prop
       */
      changeTitleClass: function(classVal, status){
        if (status){
          this.$el.addClass(classVal);
        }
        else{
          this.$el.removeClass(classVal);
        }
      },

      /**
       * return a shallow copy of the private consts for this view
       */
      getConstsClone: function () {
        return _.clone(pvt.consts);
      }
    });
  })();
});
