// development testing script - not used for library

require.config({
  baseUrl: "../js"
});


/*global require, KMap, $*/
require(["main"], function(KMap){
  // create the model/settings so we can pass it into the views
  var graphModel = new KMap.GraphModel(),
      settings = {model: graphModel, useWisps: false,  graphDirection: "TB", showTransEdgesWisps: true};

  var graphView = new KMap.GraphView(settings),
      graphListView = new KMap.GraphListView({model: graphModel});

  var handleDataFun = function (data) {

    // add the data to the graph model
    graphModel.addJsonNodesToGraph(data);

    // set the graph placement (don't use if "x" and "y" are specified in the data)
    graphView.optimizeGraphPlacement(false, false);

    // render the views
    graphView.render();
    graphListView.render();

    // insert them into the html
    $("body").prepend(graphListView.$el);
    $("#graph-view-wrapper").append(graphView.$el);

    // TODO integrate this into the view
    var $wrap = $(document.body);
    $wrap.height($(window).height());
    $(window).resize(function () {
      $wrap.height($(window).height());
    });

    // center on a leaf element
    var topoSortList = graphModel.getTopoSort();
    graphView.centerForNode(graphModel.getNode(topoSortList[topoSortList.length -1]));

  };

  // fetch some graph data
  $.getJSON("../data/metacademy_demo.json", handleDataFun);

});
