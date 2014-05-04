// demo: khan academy data

require.config({
  baseUrl: "../js"
});


/*global require, KMap, $*/
require(["main"], function(KMap){
  // create the model and pass it into the views
  var graphModel = new KMap.GraphModel({allowCycles: true}),
      graphListView = new KMap.GraphListView({model: graphModel}),
      graphView,
      settings = {model: graphModel};

  var handleDataFun = function (data) {

    // check if we're doing targeted learning
    var splitHref = window.location.href.split("#");
    if (splitHref.length > 1) {
      var target = splitHref.pop();
        // only add the subgraph to the graph
        graphModel.addJsonSubGraphToGraph(data, target);
        settings.includeShortestOutlink = true;
        settings.minWispLenPx = 500;
    } else {
      // not targeted: add all the data to the graph model
      graphModel.addJsonNodesToGraph(data);
      settings.includeShortestDep = true;
      settings.minWispLenPx = 300;
    }

    // set some basic settings
    settings.useWisps = true;
    settings.showTransEdgesWisps = true;
    settings.showEdgeSummary = false;
    graphView = new KMap.GraphView(settings);

    // set the graph placement (don't use if "x" and "y" are specified in the data)
    graphView.optimizeGraphPlacement(false, false);

    // render the views
    graphView.render();
    graphListView.render();

    // insert them into the html
    $("body").prepend(graphListView.$el);
    $("#graph-view-wrapper").html(graphView.$el);


    // allows correct x-browser list scrolling/svg when the window size changes
    // TODO integrate this into the view
    var $wrap = $(document.body);
    $wrap.height($(window).height());
    $(window).resize(function () {
      $wrap.height($(window).height());
    });

    var topoSortList = graphModel.getTopoSort();
    graphView.centerForNode(graphModel.getNode(topoSortList[topoSortList.length -1]));

  };

  // fetch some graph data (multiple fetches since demo_kmap is not stored in repo yet
  $.getJSON("../data/khan_formatted.json", handleDataFun);

});
