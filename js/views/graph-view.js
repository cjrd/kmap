/**
 * This view defines the graph view and is a mesh of d3 and backbone
 *
 * Developer notes:
 * This base graph view expects the following from all subviews:
 * - copy pvt using getBasePvt method
 * -- make sure to copy pvt.consts if you define your own consts,
 *    e.g. pvt.consts = _.extend(globalConsts, myconsts)
 *
 * - el should be a container element that will render the svg
 *
 * NOTE: You should not (!) override the render or initialize method
 *        -- use prerender and postrender and handleNewPaths and handleNewCircles
 *           and preinitialize and postinitialize
 *
 * After first render (even in prerender on first render)
 *   the following elements are available
 * - this.d3Svg
 * - this.gPaths: block g element for the paths
 *    (paths when dealing with svg and edges when dealing with data model)
 *    where you can append a new g with this.gPaths.data(someData).append("g")
 * - this.gCircles: block g element for the circles
 *    (circles when dealing with svg and nodes when dealing with data model)
 *    where you can append a new g with this.gCircles.data(someData).append("g")
 *
 * Some general notes:
 * + d3 should handle all svg-related events, while backbone should handle all other events
 * + use handleNewPaths and handleNewCircles to attach listeners during calls to render
 */

/*global define/*/
define(["backbone", "d3", "underscore", "dagre", "jquery"], function(Backbone, d3, _, dagre, $) {

  /**********************
   *    private vars    *
   **********************/
  var pvt = {};
  pvt.consts = {
    exPlusWidth: 5, // expand plus sign width in pixels
    minusRectW: 11,
    minusRectH: 5.5,
    exPlusWidth: 5,
    nodeRadius: 50,
    maxZoomScale: 5, // maximum zoom-in level for graph
    minZoomScale: 0.05, //maximum zoom-out level for graph
    reduceNodeTitleLength: 4,
    numWispPts: 10,
    wispLen: 80,
    edgeLenThresh: 285, // threshold length of edges to be shown by default
    scaleFactor: 1.5,
    scaleTransTime: 250,
    panTransTime: 250,
    panStep: 75,

    graphClass: "graph",
    viewId: "graph-view",
    zoomBoxId: "graph-zoom-div",
    zoomOutClass: "graph-zoom-out-button",
    zoomInClass: "graph-zoom-in-button",
    summaryElId: "graph-summary-el",
    hoveredClass: "hovered",
    titleTextClass: "title-text-class",
    pathWrapClass: "link-wrapper",
    pathClass: "link",
    expandCrossClass: "exp-cross",
    contractMinusClass: "contract-minus",
    circleGClass: "concept-g",
    circleGIdPrefix: "circlgG-",
    edgeGIdPrefix: "edgeG-",
    depIconGClass: "dep-icon-g",
    olIconGClass: "ol-icon-g",
    depCircleClass: "dep-circle",
    olCircleClass: "ol-circle",
    reduceNodeTitleClass: "reduce-node-title",
    defaultGraphDirection: "TB", // BT TB LR RL TODO consider making an option for the user
    wispGClass: "wispG",
    startWispPrefix: "startp-",
    endWispPrefix: "endp-",
    startWispClass: "start-wisp",
    endWispClass: "end-wisp",
    wispWrapperClass: "short-link-wrapper",
    linkWrapHoverClass: "link-wrapper-hover",
    depLinkWrapHoverClass: "ol-show",
    longEdgeClass: "long-edge",
    wispDashArray: "3,3",
    scopeClass: "scoped",
    scopeCircleGClass: "scoped-circle-g",
    focusCircleGClass: "focused-circle-g",
    summaryTransTime: 200
  };

  // "Plus" element when expand/contract is enabled
  pvt.consts.plusPts = "0,0 " +
    pvt.consts.exPlusWidth + ",0 " +
    pvt.consts.exPlusWidth + "," + pvt.consts.exPlusWidth + " " +
    (2 * pvt.consts.exPlusWidth) + "," + pvt.consts.exPlusWidth + " " +
    (2 * pvt.consts.exPlusWidth) + "," + (2 * pvt.consts.exPlusWidth) + " " +
    pvt.consts.exPlusWidth + "," + (2 * pvt.consts.exPlusWidth) + " " +
    pvt.consts.exPlusWidth + "," + (3 * pvt.consts.exPlusWidth) + " " +
    "0," + (3 * pvt.consts.exPlusWidth) + " " +
    "0," + (2 * pvt.consts.exPlusWidth) + " " +
    (-pvt.consts.exPlusWidth) + "," + (2 * pvt.consts.exPlusWidth) + " " +
    (-pvt.consts.exPlusWidth) + "," + pvt.consts.exPlusWidth + " " +
    "0," + pvt.consts.exPlusWidth + " " +
    "0,0";

  // reusable dragline when creating new edges
  pvt.d3Line = d3.svg.line()
    .x(function(d) {return d.x === undefined ? d.get("x") : d.x;})
    .y(function(d) {return d.y === undefined ? d.get("y") : d.y;})
    .interpolate('bundle')
    .tension(0.85);


  /*******************
   * private methods *
   *******************/

  /**
   * First render renders the svg and sets up all of the listeners
   */
  pvt.firstRenderBase = function(){
    var thisView = this,
        consts = pvt.consts;

    // append summary element
    thisView.$summaryEl = $(document.createElement("div"));
    thisView.$summaryEl.attr("id", consts.summaryElId);
    thisView.$el.append(thisView.$summaryEl);

    var d3Svg = d3.select(thisView.el).append("svg:svg");
    thisView.d3Svg = d3Svg;

    // define the arrow edges
    var defs = d3Svg.append('svg:defs');
    defs.append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('markerWidth', 5.5)
      .attr('markerHeight', 5.5)
      .attr('refX', 8)
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

    // main g element for the given svg
    thisView.d3SvgG = thisView.d3Svg.append("g")
      .classed(consts.graphClass, true);
    var d3SvgG = thisView.d3SvgG;

    // svg nodes and edges
    thisView.gPaths = d3SvgG.append("g").selectAll("g");
    thisView.gCircles = d3SvgG.append("g").selectAll("g");

    // listen for mouse events on svg
    thisView.d3Svg.on("mouseup", function(){
      thisView.svgMouseUp.apply(thisView, arguments);
    });

    // apply zoom (can be overridden in subclass)
    thisView.setupZoomTransListeners.call(thisView);

    // show zoom buttons
    var $zoomBoxDiv = $(document.createElement("div")),
        $zoomOutButton = $(document.createElement("button")),
        $zoomInButton = $(document.createElement("button"));
    $zoomBoxDiv.attr("id", consts.zoomBoxId);
    $zoomOutButton.addClass(consts.zoomOutClass);
    $zoomOutButton.html("-");
    $zoomInButton.addClass(consts.zoomInClass);
    $zoomInButton.html("+");

    // build the el
    $zoomBoxDiv.append($zoomInButton);
    $zoomBoxDiv.append($zoomOutButton);
    thisView.$el.append($zoomBoxDiv);
  };


  /**
   * Center the svgG element and then zoom
   * type: {"in", "out"}
   */
  pvt.centerZoomSvgG = function (type) {
    var thisView = this,
        consts = pvt.consts,
        zoomIn = type === "in",
        dzoom = thisView.dzoom,
        newTrans = dzoom.translate(),
        svgBCR = thisView.d3Svg.node().parentElement.getBoundingClientRect(),
        wx = svgBCR.width/2,
        wy = svgBCR.height/2,
        prevScale = dzoom.scale(),
        newScale = zoomIn ? prevScale*consts.scaleFactor
          : prevScale/consts.scaleFactor,
        scaleRatio = newScale/prevScale;
    dzoom.scale(newScale);

    newTrans[0] = wx - (wx - newTrans[0])*scaleRatio;
    newTrans[1] =  wy - (wy - newTrans[1])*scaleRatio;

    dzoom.translate(newTrans);
    thisView.d3SvgG.transition()
      .duration(consts.scaleTransTime)
      .ease("linear")
      .attr("transform", function () {
        return "translate(" + dzoom.translate() + ")"
          + "scale(" + dzoom.scale() + ")";
      });

    thisView.hideSummary();
  };


  /**
   * Change the scope node classes for the corresponding g elements
   *
   * prevD: previously classed node element data (class will be removed)
   * nextD: to-be classed node element data (class will be added)
   * classVal: the class to assign for the node class
   */
  pvt.changeNodeClasses = function (prevD, nextD, classVal) {
    var thisView = this,
        gId;
    if (prevD) {
      gId = thisView.getCircleGId(prevD);
      d3.select("#" + gId).classed(classVal, false);
    }
    if (nextD) {
      gId = thisView.getCircleGId(nextD);
      d3.select("#" + gId).classed(classVal, true);
    }
  };


  /**
   * Smooth path animation interpolation
   *
   *  from http://bl.ocks.org/mbostock/3916621
   */
  pvt.pathTween = function (d1, precision) {
    return function() {
      var path0 = this,
          path1 = path0.cloneNode(),
          n0 = path0.getTotalLength(),
          n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

      // firefox hack FIXME
      n0 = isNaN(n0) ? 250 : n0;
      n1 = isNaN(n1) ? 250 : n1;

      // Uniform sampling of distance based on specified precision.
      var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
      while ((i += dt) < 1) distances.push(i);
      distances.push(1);

      // Compute point-interpolators at each distance.
      var points = distances.map(function(t) {
        var p0 = path0.getPointAtLength(t * n0),
            p1 = path1.getPointAtLength(t * n1);
        return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
      });

      return function(t) {
        return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : d1;
      };
    };
  };


  /**
   * Get id of node element (d3, dom, or model)
   *
   * node: d3, dom, or model node element
   */
  pvt.getIdOfNodeType = function(node) {
    var nodeFun = node.attr || node.getAttribute || node.get;
    return nodeFun.call(node, "id");
  };


  /**
   * Helper function to obtain id of summary txt div for a given node in the exporation view
   */
  pvt.getSummaryIdForDivTxt = function(node) {
    return pvt.getIdOfNodeType.call(this, node) + pvt.consts.summaryDivSuffix;
  };


  /**
   * Helper function to obtain id of wrapper div of summary txt for a given node in the exporation view
   */
  pvt.getSummaryIdForDivWrap = function(node) {
    return pvt.getIdOfNodeType.call(this, node) + pvt.consts.summaryWrapDivSuffix;
  };


  /**
   * Get summary box placement (top left) given node placement
   */
  pvt.getSummaryBoxPlacement = function(nodeRect, placeLeft){
    var consts = pvt.consts,
        leftMultSign = placeLeft ? -1: 1,
        shiftDiff = (1 + leftMultSign*Math.SQRT1_2)*nodeRect.width/2 + leftMultSign*consts.summaryArrowWidth;
    if (placeLeft){shiftDiff -= consts.summaryWidth;}
    return {
      top:  (nodeRect.top + (1-Math.SQRT1_2)*nodeRect.height/2 - consts.summaryArrowTop) + "px",
      left:  (nodeRect.left + shiftDiff) + "px"
    };
  };


  /**
   * Add expand/contract icon to the nodes
   *
   * TODO this logic could probably be refactored a bit
   */
  pvt.addECIcon = function(d, d3el, isDeps){
    var thisView = this,
        consts = pvt.consts,
        iconGClass,
        hasExpOrContrName,
        expandFun,
        contractFun,
        placeAtBottom,
        d3Icon;

    if (isDeps) {
      iconGClass = consts.depIconGClass;
      hasExpOrContrName = "hasContractedDeps";
      expandFun = d.expandDeps;
      contractFun = d.contractDeps;
      placeAtBottom = false;
      d3Icon = d3el.selectAll("." + consts.depIconGClass);
    } else {
      iconGClass = consts.olIconGClass;
      hasExpOrContrName = "hasContractedOLs";
      expandFun = d.expandOLs;
      contractFun = d.contractOLs;
      placeAtBottom = true,
      d3Icon = d3el.selectAll("." + consts.olIconGClass);
    }

    if (d.get(hasExpOrContrName)
        && (!d3Icon.node() || !d3Icon.classed(consts.expandCrossClass))) {
      // place plus sign
      d3Icon.remove();
      d3Icon = d3el.append("g")
        .classed(iconGClass, true)
        .classed(consts.expandCrossClass, true);
      var yplace = placeAtBottom ? (consts.nodeRadius - consts.minusRectH*3 - 1) : (-consts.nodeRadius + consts.minusRectH*3 - 14);
      d3Icon.append("polygon")
        .attr("points", consts.plusPts)
        .attr("transform", "translate(" + (-consts.exPlusWidth/2) + ","
              + yplace + ")")
        .on("mouseup", function(){
          if (!thisView.state.justDragged) {
            thisView.state.expOrContrNode = true;
            expandFun.call(d);
            thisView.optimizeGraphPlacement(true, false, d.id);
          }
        });
    } else if (!d.get(hasExpOrContrName) && (!d3Icon.node() || !d3Icon.classed(consts.contractMinusClass))) {
      // place minus sign
      d3Icon.remove();
      d3Icon = d3el.append("g")
        .classed(iconGClass, true)
        .classed(consts.contractMinusClass, true);
      d3Icon.append("rect")
        .attr("x", -consts.minusRectW/2)
        .attr("y", placeAtBottom ? consts.nodeRadius - consts.minusRectH*3  + 7: -consts.nodeRadius + consts.minusRectH*3 - 10)
        .attr("width", consts.minusRectW)
        .attr("height", consts.minusRectH)
        .on("mouseup", function(){
          if (!thisView.state.justDragged) {
            thisView.state.expOrContrNode = true;
            contractFun.call(d);
            //thisView.optimizeGraphPlacement(false, d.id);
            thisView.render();
          }
        });
    }
  };


  /**
   * Hide long paths and show wisps
   */
  pvt.handleLongPaths = function (d, d3this) {
    var consts = pvt.consts,
        stPathD = pvt.getPathWispD(d3this.select("path").node(), true),
        endPathD,
        wispsG,
        longPaths;

    // Firefox problems
    try {
      endPathD = pvt.getPathWispD(d3this.select("path").node(), false);
    } catch(error) {
      return;
    }

    // hide long paths
    longPaths = d3this.selectAll("path");
    longPaths.on("mouseout", function(d){
      d3this.classed("link-wrapper-hover", false);
    });
    if (!d3this.classed(consts.linkWrapHoverClass)){
      longPaths.attr("opacity", 1)
        .transition()
        .attr("opacity", 0)
        .each("end", function(){
          longPaths.classed(consts.longEdgeClass, true)
            .attr("opacity", 1);
        });
    } else {
      longPaths.classed(consts.longEdgeClass, true);
    }

    wispsG = d3this.insert("g", ":first-child")
      .classed(consts.wispGClass, true);
    wispsG.append("path")
      .attr("id", consts.startWispPrefix + d3this.attr("id"))
      .attr("d", stPathD)
      .attr("stroke-dasharray", consts.wispDashArray)
      .classed(consts.startWispClass, true);
    wispsG.append("path")
      .attr("d", stPathD)
      .classed("short-link-wrapper", true);

    wispsG.append("path")
      .attr("id", consts.endWispPrefix + d3this.attr("id"))
      .attr("d", endPathD)
      .attr("stroke-dasharray", consts.wispDashArray)
      .style('marker-end','url(#end-arrow)')
      .classed(consts.endWispClass, true);

    wispsG.append("path")
      .attr("d", endPathD)
      .classed(consts.wispWrapperClass, true);

    wispsG.selectAll("path")
      .on("mouseover", function(){
        d3this.classed(consts.linkWrapHoverClass, true);
      });
  };


  /**
   * return <function> isEdgeVisible function with correct "this"
   * and transitivity not taken into account
   */
  pvt.getEdgeVisibleNoTransFun = function(){
    var thisView = this;
    return function(e){
      return thisView.isEdgeVisible.call(thisView,  e, false);
    };
  };


  /**
   * Returns the path of the starting wisp
   */
  pvt.getPathWispD = function (svgPath, isStart) {
    var consts = pvt.consts,
        distances = [],
        dt = consts.wispLen/consts.numWispPts,
        endDist = isStart ? consts.wispLen : svgPath.getTotalLength(),
        i = isStart ? 0 :  endDist - consts.wispLen + consts.nodeRadius; // TODO subtract node radius

    if (endDist > 50000) {
      throw Error("Firefox isn't very good with svg");
    }

    distances.push(i);
    while ((i += dt) < endDist) distances.push(i);
    var points = distances.map(function(dist){
      return svgPath.getPointAtLength(dist);
    });
    if (!isStart) points.push(svgPath.getPointAtLength(10000000)); // FIXME hack for firefox support (how to get the last point?)
    return "M" + points.map(function(p){ return p.x + "," + p.y;}).join("L");

  };


  /**
   * the the edge path element from the given data (d) input
   */
  pvt.getEdgePath = function(d){
    var pathPts = d.get("middlePts") ? [].concat(d.get("middlePts")) : [];

    // TODO only compute if node position changed
    var srcPt = d.get("source"),
        targetPt = d.get("target"),
        penUltPt = pathPts.length ? pathPts[pathPts.length - 1] : srcPt;
    var targetEndPt = pvt.computeEndPt(penUltPt, targetPt).target;
    pathPts.unshift(srcPt);
    pathPts.push(targetEndPt);
    return pvt.d3Line(pathPts);
  };


  /**
   * computes intersection points for two circular nodes (simple geometry)
   */
  pvt.computeEndPt = function (src, tgt){
    var srcX = src.x === undefined ? src.get("x") : src.x,
        srcY =  src.y === undefined ? src.get("y") : src.y,
        tgtX = tgt.x === undefined ? tgt.get("x") : tgt.x,
        tgtY =  tgt.y === undefined ? tgt.get("y") : tgt.y,
        ratio = Math.pow((srcY - tgtY)/(srcX - tgtX), 2),
        r = pvt.consts.nodeRadius,
        offX = r/Math.sqrt(1 + ratio) * (srcX > tgtX ? -1 : 1),
        offY = r/Math.sqrt(1 + 1/ratio) * (srcY > tgtY ? -1 : 1);

    // keep source at origin since we don't have an end marker
    return {source: {x: srcX + offX, y: srcY + offY}, target: {x: tgtX - offX, y: tgtY - offY}};
  };


  /***************
   Return the public backbone view
  ***************/
  return Backbone.View.extend({

    id: pvt.consts.viewId,

    events: {
      "click .graph-zoom-out-button": "zoomOutGraph",
      "click .graph-zoom-in-button": "zoomInGraph"
    },

    /**
     * Initialize function
     * This function should not be overwritten in subclasses
     * Use preinitialize and postinitialize to perform the desired actions
     * TODO throw error if in subclass version (how?)
     */
    initialize: function(inp){
      var thisView = this;
      thisView.preinitialize();
      thisView.isFirstRender = true;
      thisView.isRendered = false;
      thisView.state = {
        doCircleTrans: false,
        doPathsTrans: false
      };

      // onhover/click summary displays
      // TODO reimplement these with both edges and nodes
      thisView.summaryDisplays = {};
      thisView.summaryDisplays = {};
      thisView.summaryTOKillList = {};
      thisView.summaryTOStartList = {};

      // TODO find a better way to communicate between views w/out involving urls
      thisView.listenTo(thisView.model, "render", thisView.render);
      thisView.listenTo(thisView.model, "destroyNode", thisView.render);
      thisView.listenTo(thisView.model, "destroyEdge", thisView.render);

      // change/set focus node
      thisView.listenTo(thisView.model, "setFocusNode", function (id) {
        if (thisView.state.isFocusing || (thisView.focusNode && thisView.focusNode.id == id)) {
          return;
        }
        thisView.state.isFocusing = true;
        var inpNode = thisView.model.getNode(id);
        if (thisView.hasScope() && thisView.isNodeVisible(inpNode)){
          // if node is visible and in scope mode, simply simulate a click event on the node if it's not already scoped
          var el = document.getElementById(thisView.getCircleGId(inpNode));
              thisView.simulate(el, "mousedown");
              thisView.simulate(el, "mouseup");
        } else if (!thisView.focusNode ||  thisView.focusNode.id !== inpNode.id){
          // order matters - must set focus _after_ rendering
          thisView.centerForNode(inpNode);
          thisView.setFocusNode(inpNode);
        }
        thisView.state.isFocusing = false;
      });

      // change node scope
      thisView.listenTo(thisView.model, "toggleNodeScope", function (id) {
        // toggle node scope by simulating a mouse click on the node
        var inpNode = thisView.model.getNode(id),
            el = document.getElementById(thisView.getCircleGId(inpNode));
        thisView.simulate(el, "mousedown");
        thisView.simulate(el, "mouseup");
      });

      // set instance variables -- can overwrite in subclasses
      // transition time for moving paths when optimizing graph
      thisView.pathTransTime = 500;

      // transition delay for new paths (lets nodes appear first)
      thisView.newPathTransDelay = 350;

      // fade in time of new paths
      thisView.newPathTransTime =  1000;

      // fade out time of removed paths
      thisView.rmPathTransTime =  500;

      // fade out time of removed circles
      thisView.rmCircleTransTime =  500;

      // move transition time for circles
      thisView.moveCircleTransTime =  500;

      // trans delay for new circles
      thisView.newCircleTransDelay =  200;

      // trans fade-in time for new circles
      thisView.newCircleTransTime =  800;

      d3.select("#optimize").on("click", function(){thisView.optimizeGraphPlacement.call(thisView, true);});

      // TODO move to appropriate subclass since appRouter isn't used here
      var settings = {};
        thisView.appRouter = inp && inp.appRouter;
        settings.includeShortestDep = inp && inp.includeShortestDep;
        // TODO change pvt.consts.edgeLenThresh to settings
        pvt.consts.edgeLenThresh = (inp && inp.minWispLenPx) ? inp.minWispLenPx : pvt.consts.edgeLenThresh;
        settings.includeShortestOutlink = inp && inp.includeShortestOutlink;
        settings.useWisps = (inp && inp.useWisps) === undefined ? true : inp.useWisps;
        settings.showEdgeSummary = (inp && inp.showEdgeSummary) === undefined ? true : inp.showEdgeSummary;
        settings.showNodeSummary = (inp && inp.showNodeSummary) === undefined ? true : inp.showNodeSummary;
        settings.graphDirection =  (inp && inp.graphDirection) === undefined ? pvt.consts.defaultGraphDirection : inp.graphDirection;
      settings.showTransEdgesWisps = (inp && inp.showTransEdgesWisps) === undefined ? true : inp.showTransEdgesWisps;
      thisView.settings = settings;

      // setup d3 window listeners
      d3.select(window).on("keydown",  function(){
        thisView.windowKeyDown.call(thisView);
      });
      d3.select(window).on("keyup",  function(){
        thisView.windowKeyUp.call(thisView);
      });

      thisView.postinitialize();
    },

    /**
     * Base render function
     * This function should not be overwritten in subclasses
     * Use `prerender` and `postrender` to perform actions before/after the basic graph rendering
     * TODO throw error if in subclass version (how?)
     */
    render: function() {
      var thisView = this,
          consts = pvt.consts;

      thisView.isRendered = false;

      if (thisView.isFirstRender) {
        pvt.firstRenderBase.call(thisView);
        thisView.firstRender.call(thisView);
        thisView.isFirstRender = false;
      }

      //***********
      // PRERENDER
      //***********
      thisView.prerender();
      //***********

      //*************
      // Render Paths
      //*************

      // set the paths to only contain visible paths FIXME do edges always have ids?
      thisView.gPaths = thisView.gPaths
        .data(thisView.model.get("edges")
              .filter(function(mdl){
                return thisView.isEdgeVisible(mdl);
              }), function(d){
                return d.cid;
              });

      var gPaths = thisView.gPaths;

      if (thisView.state.doPathsTrans){

        d3.selectAll("." + consts.wispGClass).remove();
        gPaths.each(function(d){
          var d3el = d3.select(this),
              edgePath = pvt.getEdgePath(d),
              longEdgeClass = consts.longEdgeClass;

          d3el.selectAll("path")
            .transition()
            .duration(thisView.pathTransTime)
            .attrTween("d", pvt.pathTween(edgePath, 4))
            .each("start", function (d) {
              var d3this = d3.select(this);
              d3this.classed(longEdgeClass, false);
              if (d3this.classed(consts.wispGClass)) d3this.remove();
            })
            .each("end", function (d) {
              thisView.postRenderEdge.call(thisView, d, d3.select(this.parentElement));
            });
        });
        thisView.state.doPathsTrans = false;
      }
      else{
        gPaths.each(function(d){
          // FIXME: DRY with above conditional
          var d3el = d3.select(this),
              edgePath = pvt.getEdgePath(d);
          d3el.selectAll("path")
            .attr("d", edgePath)
            .each(function (d) {
              thisView.postRenderEdge.call(thisView, d, d3.select(this.parentNode));
            });
        });
      }

      // add new paths
      var newPathsG = gPaths.enter().append("g");
      newPathsG
        .attr("opacity", 0)
        .attr("id", function (d) { return  thisView.getPathGId(d); })
        .each(function(d){
          var d3el = d3.select(this),
              edgePath = pvt.getEdgePath(d);

          // append display path
          d3el.append("path")
            .style('marker-end','url(#end-arrow)')
            .classed(consts.pathClass, true)
            .attr("d", edgePath );
          // append onhover path
          d3el.append("path")
            .attr("d", edgePath )
            .classed(pvt.consts.pathWrapClass, true);
        });

      newPathsG.transition()
        .delay(thisView.newPathTransDelay)
        .duration(thisView.newPathTransTime)
        .attr("opacity", 1)
        .each("end", function (d) {
          // call post render function for edge
          thisView.postRenderEdge.call(thisView, d, d3.select(this));
        });

      newPathsG.on("mouseover", function(d) {
          thisView.pathMouseOver.call(thisView, d, this);
        })
        .on("mouseout", function(d) {
          thisView.pathMouseOut.call(thisView, d, this);
        })
        .on("mouseup", function (d) {
          thisView.pathMouseUp.call(thisView, d, this);
        });


      // call subview function
      thisView.handleNewPaths(newPathsG);

      // remove old links
      gPaths.exit()
        .transition()
        .duration(thisView.rmPathTransTime)
        .attr("opacity", 0)
        .remove(); // TODO add appropriate animation

      //***************
      // Render Circles
      //***************
      // update existing nodes
      thisView.gCircles = thisView.gCircles
        .data(thisView.model.getNodes().filter(function(mdl){return thisView.isNodeVisible(mdl);}),
              function(d){
                return d.cid;
              });

      thisView.gCircles.exit()
        .transition()
        .duration(thisView.rmCircleTransTime)
        .attr("opacity", 0)
        .remove(); // TODO add appropriate animation

      if (thisView.state.doCircleTrans){
        thisView.gCircles
          .transition()
          .duration(thisView.moveCircleTransTime)
          .attr("transform", function(d){
            return "translate(" + d.get("x") + "," + d.get("y") + ")";
          })
          .each("end", function (d) {
            thisView.postRenderNode.call(thisView, d, d3.select(this));
          });
        thisView.state.doCircleTrans = false;
      }
      else {
        thisView.gCircles
          .attr("transform", function(d){
            return "translate(" + d.get("x") + "," + d.get("y") + ")";
          });
      }

      // add new nodes
      var newGs = thisView.gCircles
            .enter()
            .append("g")
            .attr("opacity", 0);

      newGs.classed(consts.circleGClass, true)
        .attr("id", function (d) { return thisView.getCircleGId(d); })
        .attr("transform", function(d){return "translate(" + d.get("x") + "," + d.get("y") + ")";})
        .append("circle")
        .attr("r", consts.nodeRadius);

      newGs.each(function(d){
        var d3this = d3.select(this);
        thisView.insertTitleLinebreaks(d3this, d.get("title"), null, consts.reduceNodeTitleLength);
        if (d3this.selectAll("tspan")[0].length > consts.reduceNodeTitleLength) {
          d3this.classed(consts.reduceNodeTitleClass, true);
        }
      });

      newGs.transition()
        .delay(thisView.newCircleTransDelay)
        .duration(thisView.newCircleTransTime)
        .attr("opacity", 1)
        .each("end", function (d) {
          thisView.postRenderNode.call(thisView, d, d3.select(this));
        });

      // apply common event listeners (override in sub)
      newGs.on("mouseover", function(d) {
        thisView.circleMouseOver.call(thisView, d, this);
      })
        .on("mouseout", function(d) {
          thisView.circleMouseOut.call(thisView, d, this);
        })
        .on("mouseup", function (d) {
          thisView.circleMouseUp.call(thisView, d, this);
        });

      thisView.handleNewCircles(newGs);

      // // handle expand contract icons last
      thisView.gCircles.each(function(d){
        if (thisView.addECIcon || d.addECIcon) {
          thisView.addExpContIcons(d, d3.select(this), thisView);
        }
      });

      //***********
      // POSTRENDER
      //***********
      thisView.postrender();
      //***********
      thisView.isRendered = true;
    },

    /**
     * called for each edge after it has been rendered (all animations have been applied)
     */
    postRenderEdge: function (d, d3El) {
      var consts = pvt.consts;
      d3El.select("." + consts.wispGClass).remove();
      d3El.select("." + consts.longEdgeClass).classed(consts.longEdgeClass, false);
      var thisView = this;
      if (!thisView.scopeNode && thisView.settings.useWisps
          && thisView.doClipEdge(d)) {
        pvt.handleLongPaths(d, d3El);
      }
    },

    /**
     * called for each node after it has been rendered (all animations have been applied)
     */
    postRenderNode: function () {},

    /**
     * Optimize graph placement using dagre
     *
     * @param doRender <boolean>: render after optimization
     * @param <boolean> minSSDist: whether to miminize the squared distance of the
     * nodes moved in the graph by adding the mean distance moved in each direction -- defaults to true
     * @param <id> noMoveNodeId: node id of node that should not move during optimization
     * note: noMoveNodeId has precedent over minSSDist
     */
    optimizeGraphPlacement: function(doRender, minSSDist, noMoveNodeId, orderNodesByXY) {
      var thisView = this,
          thisGraph = thisView.model,
          dagreGraph = new dagre.Digraph(),
          nodeWidth = pvt.consts.nodeRadius,
          nodeHeight = pvt.consts.nodeRadius,
          nodes = thisGraph.get("nodes"),
          edges = thisGraph.get("edges"),
          lrOrder = thisView.settings.graphDirection.toLowerCase() === "lr",
          transX = 0,
          transY = 0;

      thisView.state.doCircleTrans = true;
      thisView.state.doPathsTrans = true;

      minSSDist = minSSDist === undefined ? true : minSSDist;

      // input graph into dagre
      nodes.sortBy(function (n) {
        return orderNodesByXY ? (lrOrder ? n.get("y") : n.get("x")) : -1;
      })
        .forEach(function(node){
          if (thisView.isNodeVisible(node)) {
            dagreGraph.addNode(node.id, {width: nodeWidth, height: nodeHeight});
          }
        });

      edges.each(function(edge){
        if (thisView.includeEdgeInOpt(edge)){
          dagreGraph.addEdge(edge.id, edge.get("source").id, edge.get("target").id);
        }
      });
      var layout = dagre.layout()
            .rankSep(80)
            .nodeSep(120) // TODO move defaults to consts
            .rankDir(thisView.settings.graphDirection).run(dagreGraph);

      // determine average x and y movement
      if (noMoveNodeId === undefined && minSSDist) {
        layout.eachNode(function(n, inp){
          var node = nodes.get(n);
          transX +=  node.get("x") - inp.x;
          transY += node.get("y") - inp.y;
        });
        transX /= nodes.length;
        transY /= nodes.length;
      }
      // else, don't move a given node
      else if (noMoveNodeId !== undefined) {
        var node = nodes.get(noMoveNodeId),
            inp = layout._strictGetNode(noMoveNodeId);
        transX = node.get("x") - inp.value.x;
        transY = node.get("y") - inp.value.y;
      }

      layout.eachEdge(function(e, u, v, value) {
        var addPts = [];
        value.points.forEach(function(pt){
          addPts.push({x: pt.x + transX, y: pt.y + transY});
        });
        edges.get(e).set("middlePts",  addPts);
      });

      layout.eachNode(function(n, inp){
        var node = nodes.get(n);
        node.set("x", inp.x + transX);
        node.set("y", inp.y + transY);
      });

      if (doRender) {
        thisView.render();
      }
    },

    /**
     * Centers the given node
     * Note: places root/leaves at 1/3 dist from respective edge
     */
    centerForNode:function (d) {
      var thisView = this;

      if (thisView.state.isTransitioning) return false;
      else thisView.state.isTransitioning = true;

      if (!thisView.isNodeVisible(d)){
        if (thisView.scopeNode) {
          thisView.nullScopeNode();
        }
        thisView.model.expandGraph();
        thisView.optimizeGraphPlacement(true, false, d.id);
      }

      // TODO remove hard coded scale and duration
      var hasScope = thisView.hasScope(),
          translateTrans = thisView.d3SvgG.transition()
            .duration(500)
            .attr("transform", function () {
              // TODO move this function to pvt
              var dzoom = thisView.dzoom,
                  dScale = dzoom.scale(),
                  svgBCR = thisView.d3Svg.node().parentElement.getBoundingClientRect(), // assumes the parent element wraps the intended width/height (firefox hack)
                  curScale = (hasScope || thisView.model.getNodes().length < 8) ? (dScale > 1 ? dScale : 1) : (dScale < 0.9 ? dScale : .6), //dzoom.scale(),
                  wx = svgBCR.width,
                  wy = svgBCR.height,
                  dispFract = d.get("dependencies").length ? (d.get("outlinks").length ? 0.5 : 3.8/5) : (1.2/5),
                  nextY = wy*dispFract - d.get("y")*curScale - pvt.consts.nodeRadius*curScale/2,
                  nextX = wx/2 - d.get("x")*curScale;
              dzoom.translate([nextX, nextY]);
              dzoom.scale(curScale);
              thisView.state.isTransitioning = false;
              return "translate(" + nextX + "," + nextY + ") scale(" + curScale + ")";
            });
      return translateTrans;
    },

    /**
     * Add expand/contract icon to graph
     * d: the data element
     * d3el: d3 selection for the data element
     * thisView: current view reference
     * isDeps: set to true if working with dependencies (otherwise working with outlinks)
     */
    addExpContIcons: function(d, d3this, thisView){
      if (!thisView.isNodeVisible(d)) return;

      var hasDeps = d.get("dependencies").length > 0,
          hasOLs =  d.get("outlinks").length > 0,
          consts = pvt.consts,
          state = thisView.state;

      // expand/contract dependencies icon
      if (hasDeps){
        pvt.addECIcon.call(thisView, d, d3this, true);
      } else {
        d3this.selectAll("." + consts.depIconGClass).remove();
      }
      // expand/contract outlinks icon
      if (hasOLs) {
        pvt.addECIcon.call(thisView, d, d3this, false);
      } else {
        d3this.selectAll("." + consts.olIconGClass).remove();
      }
    },

    /**
     * insert svg line breaks: taken from
     * TODO move to utils?
     * http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts
     * TODO this function has become far too large & needs to be refactored
     */
    insertTitleLinebreaks: function (gEl, title, splLen, reduceThresh) {
      var words = title.split(/[-\s]+/g),
          total = 0,
          result = [],
          resArr = [],
          i;
      splLen = splLen || 14;

      // determine break points for words TODO shrink font if necessary
      for (i = 0; i < words.length; i++) {
        if (total + words[i].length + 1 > splLen && total !== 0) {
          resArr.push(result.join(" "));
          result = [];
          total = 0;
        }
        result.push(words[i]);
        total += words[i].length + 1;
      }
      resArr.push(result.join(" "));

      var dy = resArr.length > reduceThresh ? '10' : '15';

      var el = gEl.append("text")
            .classed(pvt.consts.titleTextClass, true)
            .attr("text-anchor","middle")
            .attr("dy", "-" + (resArr.length-1)*dy*6.5/15);


      for (i = 0; i < resArr.length; i++) {
        var tspan = el.append('tspan').text(resArr[i]);
        if (i > 0)
          tspan.attr('x', 0).attr('dy', dy);
      }
    },

    /**
     * Apply the zoom/translate listeners (can be overwritten in sub)
     */
    setupZoomTransListeners: function () {
      var thisView = this,
          consts = pvt.consts;

      thisView.dzoom = d3.behavior.zoom()
                         .on("zoom", redraw)
                         .on("zoomstart", startZoom)
                         .on("zoomend", endZoom);
      var dzoom = thisView.dzoom;
      // make graph zoomable/translatable
      var vis = thisView.d3Svg
            .attr("pointer-events", "all")
            .attr("viewBox", null)
            .call(dzoom)
            .select("g");

      // set the zoom scale
      dzoom.scaleExtent([consts.minZoomScale, consts.maxZoomScale]);
      var summaryDisplays = thisView.summaryDisplays,
          nodeLoc,
          d3event,
          currentScale;

      function startZoom() {
        // add move cursor
        d3.select("body").style("cursor", "move");
      }
      function endZoom() {
        // change cursor back to normal
        d3.select("body").style("cursor", "auto");
      }

      // helper function to redraw svg graph with correct coordinates
      function redraw() {
        // transform the graph
        thisView.state.justDragged = true;
        d3event = d3.event;
        currentScale = d3event.scale;
        thisView.prevScale = currentScale;
        vis.attr("transform", "translate(" + d3event.translate + ")" + " scale(" + currentScale + ")");
        // move the summary divs if needed
        $.each(summaryDisplays, function(key, val){
          nodeLoc = pvt.getSummaryBoxPlacement(val.d3circle.node().getBoundingClientRect(), val.placeLeft);
          val.$wrapDiv.css(nodeLoc);
        });
      }
    },

    /**
     * Removevisual mouse over properties to the paths
     */
    pathMouseOver: function (d, pathEl) {
      var thisView = this;
      if (thisView.settings.showEdgeSummary) {
        thisView.showEdgeSummary(d);
      }
    },

    /**
     * Add visual mouse over properties to the paths
     */
    pathMouseOut: function (d, pathEl) {
      var thisView = this;
      thisView.hideSummary();
    },

    /**
     * Add visual mouse over properties to the explore nodes
     */
    circleMouseOver: function (d, nodeEl) {
      var thisView = this,
          consts = pvt.consts,
          hoveredClass = consts.hoveredClass,
          d3node = d3.select(nodeEl);

      thisView.preCircleMouseOver(d, nodeEl);

      if (d3node.classed(hoveredClass)){
        d3node.classed(hoveredClass, true);
        return false;
      }

      var nodeId = nodeEl.id;

      // add the appropriate class
      d3node.classed(hoveredClass, true);

      // show summary text
      if (thisView.settings.showNodeSummary) {
        thisView.showNodeSummary(d);
      }

      // show/emphasize connecting edges
      d.get("outlinks").each(function (ol) {
        d3.select("#" + consts.edgeGIdPrefix + ol.cid)
          .classed(consts.linkWrapHoverClass, true)
          .classed(consts.depLinkWrapHoverClass, true);
        if (thisView.isEdgeVisible(ol)){
          d3.select("#" + consts.circleGIdPrefix + ol.get("target").id)
            .select("circle")
            .classed(consts.olCircleClass, true);
        }
      });

      // set the appropriate classes
      d.get("dependencies").each(function (dep) {
        d3.select("#" + consts.edgeGIdPrefix + dep.cid)
          .classed(consts.linkWrapHoverClass, true);
        if (thisView.isEdgeVisible(dep)){
          d3.select("#" + consts.circleGIdPrefix + dep.get("source").id)
            .select("circle")
            .classed(consts.depCircleClass, true);
        }
      });

      thisView.postCircleMouseOver(d, nodeEl);
      return 0;
    },

    /**
     * Remove mouse over properties from the explore nodes
     */
    circleMouseOut:  function(d, nodeEl) {
      var thisView = this,
          relTarget = d3.event.relatedTarget;;
      thisView.preCircleMouseOut(d, nodeEl);

      // check if we're in a semantically related el
      if (!relTarget || $.contains(nodeEl, relTarget) || (relTarget.id && relTarget.id.match(nodeEl.id))){
        return;
      }

      thisView.hideSummary();

      var d3node = d3.select(nodeEl),
          summId = pvt.getSummaryIdForDivWrap.call(thisView, d3node),
          consts = pvt.consts,
          hoveredClass = consts.hoveredClass,
          nodeId = nodeEl.id;

      d3node.classed(hoveredClass, false); // FIXME align class options once summary display is figured out
      // show/emphasize connecting edges
      d.get("outlinks").each(function (ol) {
        d3.select("#" + consts.edgeGIdPrefix + ol.cid)
          .classed(consts.linkWrapHoverClass, false)
          .classed(consts.depLinkWrapHoverClass, false);
        d3.select("#" + consts.circleGIdPrefix + ol.get("target").id)
          .select("circle")
          .classed(consts.olCircleClass, false);
      });
      d.get("dependencies").each(function (dep) {
        d3.select("#" + consts.edgeGIdPrefix + dep.cid)
          .classed(consts.linkWrapHoverClass, false);
        d3.select("#" + consts.circleGIdPrefix + dep.get("source").id)
          .select("circle")
          .classed(consts.depCircleClass, false);
      });
      thisView.postCircleMouseOut(d, nodeEl);
    },

    /**
     * Mouseup on path elements
     */
    pathMouseUp: function (d, domEl) {
      var thisView = this;
      thisView.prePathMouseUp();
      thisView.state.pathMouseUp = true;
      thisView.postPathMouseUp();
    },


    /**
     * Mouse up on the concept circle
     */
    circleMouseUp: function (d, domEl) {
      var thisView = this;
      thisView.preCircleMouseUp();
      thisView.state.circleMouseUp = true;

      if (thisView.state.justDragged || thisView.state.iconClicked) {
        return false;
      }

      thisView.model.expandGraph();

      if (thisView.scopeNode && thisView.scopeNode.id === d.id) {
        thisView.nullScopeNode();
        thisView.centerForNode(d).each("end", function () {
          thisView.optimizeGraphPlacement(true, false, d.id);
        });
        return false;
      } else {
        thisView.setScopeNode(d);
      }

      // change noded TODO remove appRouter from base graph view
      if (thisView.appRouter) {
        thisView.appRouter.changeUrlParams({focus: d.get("tag")});
      }

      // contract the graph from the deps and ols
      var edgeShowList = [],
          nodeShowList = [d.id];

      var showOLs = d.get("outlinks").filter(function(ol){
        return thisView.isEdgeVisible(ol);
      });
      showOLs.forEach(function(ol){
        nodeShowList.push(ol.get("target").id);
      });
      edgeShowList = edgeShowList.concat(showOLs.map(function(ol){return ol.id;}));
      var showDeps = d.get("dependencies")
            .filter(function(dep){
              return thisView.isEdgeVisible(dep);
            });
      showDeps.forEach(function(dep){
        nodeShowList.push(dep.get("source").id);
      });
      edgeShowList = edgeShowList.concat(showDeps.map(function(dep){return dep.id;}));

      // contract edges
      var edges = thisView.model.getEdges();
      thisView.model.getEdges()
        .each(function (edge) {
          edge.set("isContracted", edgeShowList.indexOf(edge.id) === -1);
        });
      // contract nodes
      var nodes = thisView.model.getNodes();
      nodes
        .forEach(function (node) {
          node.set("isContracted", nodeShowList.indexOf(node.id) === -1);
        });

      // update data for the info box (# of hidden nodes/edges)
      thisView.numHiddenNodes = nodes.length - nodeShowList.length;
      thisView.numHiddenEdges = edges.length - edgeShowList.length;

      // transition the g so the node is centered
      thisView.centerForNode(d).each("end", function () {
        thisView.optimizeGraphPlacement(true, false, d.id, true);
      });

      thisView.postCircleMouseUp();
      return true;
    },

    /**
     * Handle mouseup event on svg
     */
    svgMouseUp: function () {
      var thisView = this,
          state = thisView.state;
      thisView.preSvgMouseUp();

      if (thisView.scopeNode && !state.circleMouseUp && !state.pathMouseUp && !state.justDragged && !state.iconClicked) {
        thisView.handleShowAllClick();
      }

      // reset the states
      state.justDragged = false;
      state.iconClicked = false;
      state.circleMouseUp = false;
      state.pathMouseUp = false;
      thisView.postSvgMouseUp();
    },

    /**
     * return {boolean} true if graph view is scoped
     */
    hasScope: function () {
      var thisView = this;
      return thisView.scopeNode !== undefined && thisView.scopeNode !== null;
    },

    /**
     * Return the g element of the path from the given model
     *
     * eModel: the edge model
     */
    getD3PathGFromModel: function(eModel){
      return this.d3Svg.select("#" + this.getPathGId(eModel));
    },

    /**
     * Return the g element for the circle from the given model
     *
     * nModel: the node model
     */
    getD3CircleGFromModel: function(nModel){
      return this.d3Svg.select("#" + this.getCircleGId(nModel));
    },

    /**
     * Return the circleG id for a a nodeModel
     *
     * @return <string> the id of circleG
     */
    getCircleGId: function  (nodeModelOrId) {
      if (nodeModelOrId.id !== undefined){
        nodeModelOrId = nodeModelOrId.id;
      }
      return pvt.consts.circleGIdPrefix + nodeModelOrId;
    },

    /**
     * Return the edgeG id for a nodeModel
     *
     * @return <string> the id of edgeG
     */
    getPathGId: function  (edgeModel) {
      return pvt.consts.edgeGIdPrefix + edgeModel.cid;
    },

    /**
     * Returns a clone of the base private object
     *
     * @return {object} the base private object
     */
    getConstsClone: function() {
      return _.clone(pvt.consts);
    },

    /**
     * Return true if the view has been rendered
     */
    isViewRendered: function(){
      return this.isRendered;
    },

    /**
     * return the specified view constant
     */
    getViewConst: function(vc){
      return pvt.consts[vc];
    },

    /**
     * Close and unbind views to avoid memory leaks TODO make sure to unbind any listeners
     */
    close: function() {
      this.remove();
      this.unbind();
    },

    /**
     * @return {boolean} true if the node circle is visible
     */
    isNodeVisible: function(node){
      return !node.get("isContracted");
    },

    /**
     * Return true if the edge should be visible
     * @param edge
     * @param <boolean> useTrans: take into account transitivity? {default: true}
     * @return <boolean> true if the edge path is visible
     */
    isEdgeVisible: function(edge, useVisTrans){
      var thisView = this;
      useVisTrans = useVisTrans === undefined ? true : useVisTrans;
      return (!useVisTrans || !thisView.isEdgeVisiblyTransitive(edge))
        && !edge.get("isContracted")
        && (thisView.isNodeVisible(edge.get("source")) && thisView.isNodeVisible(edge.get("target")));
    },

    /**
     * Determines if the edge should be clipped
     */
    doClipEdge: function(edge) {
      var thisView = this,
          clipEdge = true,
          settings = thisView.settings;
      if ((settings.includeShortestOutlink && thisView.isEdgeShortest(edge, "outlink")) || thisView.isEdgeLengthBelowThresh(edge) || (settings.includeShortestDep && thisView.isEdgeShortest(edge, "dep"))) {
        clipEdge = false;
      }
      return clipEdge;
    },

    /**
     * include the given edge in the optimization placement?
     */
    includeEdgeInOpt: function (edge) {
      var thisView = this;
      return thisView.isEdgeVisible(edge);
    },

    /**
     * Determines if an edge is transitive given that other edges may be hidden
     */
    isEdgeVisiblyTransitive: function (edge) {
      var thisView = this;
      return !thisView.settings.showTransEdgesWisps && edge.get("isTransitive")
        && thisView.model.checkIfTransitive(edge, pvt.getEdgeVisibleNoTransFun.call(thisView));
    },

    /**
     * Detect if the given edge is shorter than the threshold specified in pvt.consts
     * TODO use getTotalLength on svg path
     */
    isEdgeLengthBelowThresh: function (edge) {
      var src = edge.get("source"),
          tar = edge.get("target");
      return Math.sqrt(Math.pow(src.get("x") - tar.get("x"), 2)  + Math.pow(src.get("y") - tar.get("y"), 2)) <= pvt.consts.edgeLenThresh;
    },

    /**
     * Detect if the given edge is the shortest outlink/dep
     *
     * @param edge - the input edge
     * @param type - {"outlink", "dep"} (is edge shortest outlink/dep?)
     * @return {boolean} - true if the edge is the shortest type (outlink/dep)
     */
    isEdgeShortest: function (edge, type) {
      var thisView = this,
          isTypeOutlink = type === "outlink",
          getNodeType = isTypeOutlink ? "source" : "target",
          otherNodeType = isTypeOutlink ? "target" : "source",
          node = edge.get(getNodeType),
          nodeX = node.get("x"),
          nodeY = node.get("y"),
          curMinSqDist = Number.MAX_VALUE,
          distSq,
          relNode,
          minId;
      node.get(isTypeOutlink ? "outlinks" : "dependencies").each(function (edge) {
        relNode = edge.get(otherNodeType),
        distSq = Math.pow(relNode.get("x") - nodeX, 2) + Math.pow(relNode.get("y") - nodeY, 2);
        if (distSq <= curMinSqDist && !thisView.isEdgeVisiblyTransitive(edge)){
          minId = relNode.id;
          curMinSqDist = distSq;
        }
      });
      return minId === edge.get(otherNodeType).id;
    },

    showEdgeSummary: function (d) {
      var thisView = this;
      thisView.$summaryEl.html("<h1>" + d.get("source").get("title") + " &rarr; " +  d.get("target").get("title") + "</h1>\n" +  (d.get("reason") || "-no reason given-"));
      thisView.$summaryEl.show();//fadeIn(pvt.consts.summaryTransTime);
    },

    showNodeSummary: function (d) {
      var thisView = this;
      thisView.$summaryEl.html("<h1>" + d.get("title") + "</h1>\n" + (d.get("summary") || "-no summary-"));
      thisView.$summaryEl.show();
    },

    hideSummary: function (d) {
      var thisView = this;
      thisView.$summaryEl.hide();
    },

    /**
     * Handles the click event from the "show all" [concepts] buttons
     */
    handleShowAllClick: function (evt) {
      var thisView = this;
      thisView.simulate(document.getElementById(thisView.getCircleGId(thisView.focusNode)), "mouseup");
    },

    /**
     * Set the scope node -- automatically changes the focus node
     */
    setScopeNode: function (d) {
      var thisView = this;
      thisView.setFocusNode(d, true);
      pvt.changeNodeClasses.call(thisView, thisView.scopeNode, d, pvt.consts.scopeCircleGClass);
      thisView.scopeNode = d;
      // delay info box so that animations finish TODO hardcoding
      window.setTimeout(function () {
        thisView.$el.addClass(pvt.consts.scopeClass);
      }, 800);
    },

    /**
     * Remove the current scope node
     */
    nullScopeNode: function (d) {
      var thisView = this;
      pvt.changeNodeClasses.call(thisView, thisView.scopeNode, null, pvt.consts.scopeCircleGClass);
      thisView.scopeNode = null;
      thisView.$el.removeClass(pvt.consts.scopeClass);
    },

    /**
     * Set's the focus (highlighted) node on the graph
     */
    setFocusNode: function (d, triggerSFN) {
      var thisView = this;
      pvt.changeNodeClasses.call(thisView, thisView.focusNode, d, pvt.consts.focusCircleGClass);
      thisView.focusNode = d;
      if (triggerSFN) {
        thisView.model.trigger("setFocusNode", d.id);
      }
    },

    /**
     * Simulate html/mouse events
     * modified code from http://stackoverflow.com/questions/6157929/how-to-simulate-mouse-click-using-javascript
     * TODO this belongs in a utils class
     */
    simulate: (function(){
      var pvt = {};
      pvt.eventMatchers = {
        'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
        'MouseEvents': /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/
      };
      pvt.defaultOptions = {
        pointerX: 0,
        pointerY: 0,
        button: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        bubbles: true,
        cancelable: true,
        relatedTarget: null
      };

      return function(element, eventName) {
        var options = extend(pvt.defaultOptions, arguments[2] || {});
        var oEvent, eventType = null;

        for (var name in pvt.eventMatchers) {
          if (pvt.eventMatchers[name].test(eventName)) {
            eventType = name;
            break;
          }
        }

        if (!eventType)
          throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');

        if (document.createEvent) {
          oEvent = document.createEvent(eventType);
          if (eventType == 'HTMLEvents') {
            oEvent.initEvent(eventName, options.bubbles, options.cancelable);
          } else {
            oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
                                  options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
                                  options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, options.relatedTarget);
          }
          element.dispatchEvent(oEvent);
        } else {
          options.clientX = options.pointerX;
          options.clientY = options.pointerY;
          var evt = document.createEventObject();
          oEvent = extend(evt, options);
          element.fireEvent('on' + eventName, oEvent);
        }
        return element;

        function extend(destination, source) {
          for (var property in source)
            destination[property] = source[property];
          return destination;
        }
      };
    })(),

    zoomOutGraph: function () {
      pvt.centerZoomSvgG.call(this, "out");
    },

    zoomInGraph: function () {
      pvt.centerZoomSvgG.call(this, "in");
    },

    panGraph: function(dir) {
      var thisView = this,
          consts = pvt.consts,
          dzoom = thisView.dzoom,
          newTrans = dzoom.translate(),
          curScale = dzoom.scale(),
          step = consts.panStep,
          trans = {
            "up": [0, step],
            "down": [0, -step],
            "left": [step, 0],
            "right": [-step, 0]
            }[dir];

      // internally change the translation
      newTrans[0] = trans[0] + newTrans[0];
      newTrans[1] = trans[1] + newTrans[1];
      dzoom.translate(newTrans);

      // externally change the tranlation
      thisView.d3SvgG.transition()
        .ease("linear")
        .duration(consts.panTransTime)
        .attr("transform", function () {
          return "translate(" + dzoom.translate() + ")"
            + "scale(" + dzoom.scale() + ")";
        });
    },

    //********************
    // "ABSTRACT" METHODS
    //*******************

    /**
     * Function called before render actions
     * This function should be overwritten in subclasses if desired
     */
    prerender: function() {},

    /**
     * Function called after render actions
     * This function should be overwritten in subclasses if desired
     */
    postrender: function() {},

    /**
     * Function called before initialize actions
     * This function should be overwritten in subclasses if desired
     */
    preinitialize: function() {},

    /**
     * Function called after initialize actions
     * This function should be overwritten in subclasses if desired
     */
    postinitialize: function() {},

    // override in subclass
    windowKeyDown: function(evt) {
      if (document.activeElement !== document.body) return;

      var thisView = this,
          keyCode = d3.event.keyCode;
      switch (keyCode) {
      case 187:
      case 61:
        // plus sign: zoom in
        thisView.zoomInGraph();
        break;
      case 189:
      case 173:
        // minus sign: zoom out
        thisView.zoomOutGraph();
        break;
      case 37:
        // left arrow: pan left
        thisView.panGraph("left");
        break;
      case 39:
        // right arrow: pan right
        thisView.panGraph("right");
        break;
      case 38:
        // up arrow: pan up
        thisView.panGraph("up");
        break;
      case 40:
        // down arrow: pan down
        thisView.panGraph("down");
        break;

      }
    },
    windowKeyUp: function(evt) {},
    handleNewPaths: function() {},
    handleNewCircles: function () {},
    firstRender: function (){},
    preCircleMouseOut: function () {},
    postCircleMouseOut: function () {},
    preCircleMouseOver: function () {},
    postCircleMouseOver: function () {},
    preCircleMouseUp: function () {},
    postCircleMouseUp: function () {},
    prePathMouseUp: function () {},
    postPathMouseUp: function () {},
    postSvgMouseUp: function () {},
    preSvgMouseUp: function () {}
  });
});
