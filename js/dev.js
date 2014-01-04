// development testing script - not used for library

/*global require, KMap, $*/
require(["main"], function(KMap){
  // create the model and pass it into the views
  var graphModel = new KMap.GraphModel(),
      graphView = new KMap.GraphView({model: graphModel, includeShortestDep: true}),
      graphListView = new KMap.GraphListView({model: graphModel});

  var handleDataFun = function (data) {

    // add the data to the graph model
    graphModel.addJsonNodesToGraph(data);

    // set the graph placement (don't use if "x" and "y" are specified in the data)
    graphView.optimizeGraphPlacement(false, false);

    // render the views
    graphView.render();
    graphView.centerForNode(graphModel.getNode(graphModel.getTopoSort().shift()));
    graphListView.render();

    // insert them into the html
    $("body").prepend(graphListView.$el);
    $("#graph-view-wrapper").append(graphView.$el);
  };

  // fetch some graph data (multiple fetches since demo_kmap is not stored in repo yet
  $.getJSON("/data/demo_kmap.json", handleDataFun)
    .fail(function () {
      $.getJSON("/data/metacademy_demo.json", handleDataFun);
    });

});
