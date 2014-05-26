
/*global define*/
define(["backbone", "underscore", "jquery", "../views/concept-list-item"], function (Backbone, _, $, ConceptListItem) {

  return (function(){
    // private class variables and methods
    var pvt = {};

    pvt.consts = {
      clickedItmClass: "clicked-title",
      titleIdPrefix: "node-title-view-",
      visibleClass: "show-clist",
      hiddenClass: "hide-clist",
      viewId: "concept-list-panel",
      activeClass: "active",
      olId: "concept-list",
      wrapperId: "concept-list-wrapper",
      templateId : "concept-list-template"
    };

    return Backbone.View.extend({

      template: _.template(document.getElementById(pvt.consts.templateId).innerHTML),

      id: pvt.consts.viewId,

      events: {
        "keyup #concept-list-search-input": "keyUpCLSearchInput",
        "click #concept-list-show-button": "clickListShowButton",
        "click #concept-list-hide-button": "clickListHideButton",
        "click #cancel-search-input": "clickCancelSearchInput"
      },

      /** override in subclass */
      preinitialize: function () {},

      /**
       * initialize this view
       * NOTE: this function should typically not be overridden -- use pre/post initialize to customize
       */
      initialize: function (inp) {
        var thisView = this;
        thisView.preinitialize(inp);
        thisView.idToTitleView = {};
        thisView.listenTo(thisView.model, "setFocusNode", function (id) {
          thisView.changeSelectedTitle(id);
        });
        thisView.postinitialize(inp);
      },

      /** override in subclass */
      postinitialize: function (inp) {
        var thisView = this;
        thisView.ListItem = ConceptListItem;
      },

      /** override in subclass */
      prerender: function (inp) {
        var thisView = this;
        thisView.$el.html(thisView.template());
      },

      /**
       * Render the concept list view
       * NOTE: this function should typically not be overridden -- use pre/post render to customize
       */
      render: function () {
        var thisView = this,
            nodes = thisView.model.getNodes(),
            appRouter = thisView.appRouter, // TODO disentangle metacademy object from graph
            consts = pvt.consts,
            olId = consts.olId,
            curNode,
            nliview;
        thisView.prerender();

        thisView.isRendered = false;

        var $list = thisView.$el.find("#" + olId),
            nodeOrdering = thisView.model.getTopoSort();
        $list = $list.length ? $list : $(document.createElement("ol"));
        $list.attr("id", olId);

        // add the list elements with the correct properties
        var i;
        for(i = 0; i < nodeOrdering.length; i++){
          curNode = nodes.get(nodeOrdering[i]);
          nliview = new thisView.ListItem({model: curNode, appRouter: appRouter});
          nliview.parentView = thisView;
          thisView.idToTitleView[curNode.id] = nliview;
          $list.append(nliview.render().el);
        }

        thisView.$list = $list;

        thisView.postrender();

        thisView.isRendered = true;
        return thisView;
      },

      /** can override in subclass */
      postrender: function () {
        var thisView = this;
        thisView.$el.find("#" + pvt.consts.olId).append(thisView.$list);
      },

      /**
       * Return a shallow copy of the private consts
       */
      getConstsClone: function () {
        return _.clone(pvt.consts);
      },

      /**
       * handle click event on the "show sidebar" element
       */
      clickListShowButton: function (evt) {
        this.$el.parent().addClass(pvt.consts.visibleClass);
        this.$el.parent().removeClass(pvt.consts.hiddenClass);
      },

      /**
       * handle click event on the "hide sidebar" element
       */
      clickListHideButton: function (evt) {
        this.$el.parent().removeClass(pvt.consts.visibleClass);
        this.$el.parent().addClass(pvt.consts.hiddenClass);
      },

      /**
       * Change the selected title element
       *
       * @param selId - the model id of the selected element
       */
      changeSelectedTitle: function (selId) {
        var thisView = this,
            clickedItmClass = pvt.consts.clickedItmClass;
        thisView.$el.find("." + clickedItmClass).removeClass(clickedItmClass);
        $("#" + thisView.getDomIdFromId(selId)).addClass(clickedItmClass);
      },

      /**
       * get the title dom element corresponding to the input id
       */
      getDomIdFromId: function (id) {
        return pvt.consts.titleIdPrefix + id;
      },

      /**
       * Handle keyup event on search input
       */
      keyUpCLSearchInput: function () {
        var thisView = this,
            $inpEl = $("#concept-list-search-input"),
            inpVal = $.trim($inpEl.val()).toLowerCase();

        if (inpVal.length) {
          $("#cancel-search-input").show();
        } else {
          $("#cancel-search-input").hide();
        }

        thisView.model.getNodes().each(function (node) {
         // TODO notGoalRelevant is not needed for kmapjs, only metacademy
          if (!node.get("notGoalRelevant") && (!inpVal.length || node.get("title").toLowerCase().match(inpVal))) {
            $("#" + pvt.consts.titleIdPrefix + node.id).show();
          } else {
            $("#" + pvt.consts.titleIdPrefix + node.id ).hide();
          }
        });
      },

      /**
       * handle click event on search input
       */
      clickCancelSearchInput: function () {
        $("#concept-list-search-input").val("");
        this.keyUpCLSearchInput();
      },

      /**
       * Return true if the view has been rendered
       */
      isViewRendered: function(){
        return this.isRendered;
      },

      /**
       * Clean up the view
       */
      close: function(){
        this.remove();
        this.unbind();
      }
    });
  })(); // end of return statement
});
