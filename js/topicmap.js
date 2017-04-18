/**
 * Created by Conor on 18/04/2017.
 */
var zoom = d3.behavior.zoom()
    .scaleExtent([0.3, 3])
    .on("zoom", zoomed);

var svgGraph, svgViewbox;
var graphSize = {width: 960, height: 600};
var viewSize = {width: 960, height: 600};

var fontSize = 10, offset = 10, baseScale = 120;
var radius = 12, strokeWidth = 3;
var baseDelay = 300;
var headerPixels;

var topicURL = String(window.location.search).substr(7,100);
var thisTopic;

//Load list of topics, with their data
d3.json("topics.json", function(error, topicData) {
    if (error) { console.log(error); } else {
        topicData.topics.forEach(function(t,i) {
            if (t.TopicGUID==topicURL) {
                thisTopic = t;
            }
        });
        if (typeof thisTopic != 'undefined') {
            var topicIconURL = "url(icons/" + thisTopic.TopicIcon + ")";
            d3.selectAll("#strandNameText").style("color", thisTopic.Color);
            d3.selectAll("#strandNameText").text(thisTopic.StrandName);
            d3.selectAll(".topicIcon").style("background-color", thisTopic.Color);
            d3.selectAll(".topicIcon").style("-webkit-mask-image", topicIconURL);
            d3.selectAll(".topicIcon").style("mask-image", topicIconURL);
            d3.selectAll(".topicColor").style("background-color", thisTopic.Color);
            d3.selectAll(".topicName").text(thisTopic.TopicName);
        } else {
            console.log("TopicURL not in Topic List");
            d3.selectAll(".topicName").text("Topic Not Found");
        }
        //Load data for this topic
        d3.json(topicURL + ".JSON", function(error, graph) {
            if (error) {
                window.location.href = "topiclist.html";
            } else {
                //Process the nodes data
                var minX=0,minY=0,maxX=0,maxY=0;
                graph.nodes.forEach(function(d,i) {
                    if (d.x<minX) { minX=d.x; }
                    if (d.x>maxX) { maxX=d.x; }
                    if (d.y<minY) { minY=d.y; }
                    if (d.y>maxY) { maxY=d.y; }
                });
                graph.nodes.forEach(function(d,i) {
                    d.rankX = d.x;
                    d.rankY = d.y;
                    d.x = baseScale * (0.5 + d.x - minX);
                    d.y = baseScale * (0.5 + maxY - d.y);
                    d.delay = 1000 + baseDelay * (d.rankX + 0.3 * Math.abs(d.rankY/maxY));
                    d.labelLines = getLines(d.ConceptName);
                    d.topicData = topicData.topics.filter(function(t) {
                        return t.TopicGUID === d.TopicGUID;
                    })[0];
                    if (d.NodeType=="Concept") {
                        d.radius = radius;
                        if (d.topicData.TopicGUID==topicURL) {
                            d.class = "node concept intopic";
                            d.color = d.topicData.Color;
                        } else {
                            d.class = "node concept topic";
                            d.color = "#cccccc";
                        }
                    } else {
                        d.class = "node elbow";
                        d.radius = strokeWidth/2;
                        d.color = "#cccccc";
                    }
                    //console.log(d);
                });
                //Calculate the size of the graph svg
                graphSize.width = baseScale * (1.2 + maxX - minX);
                graphSize.height = baseScale * (1 + maxY - minY);
                headerPixels = d3.select(".titleBar").node().getBoundingClientRect().height;
                //Set up the dimensions for rendering
                viewSize.width = window.innerWidth;
                viewSize.height = window.innerHeight;
                d3.select(".actionBar").style("top",viewSize.height-60);
                svgViewbox = d3.select('#topicMapCanvas').append("svg")
                    .attr("width", viewSize.width)
                    .attr("height", viewSize.height)
                    .append("g")
                    .call(zoom);
                var rect = svgViewbox.append("rect")
                    .attr("width", viewSize.width)
                    .attr("height", viewSize.height)
                    .style("fill", "none")
                    .style("pointer-events", "all");
                svgGraph = svgViewbox.append("g");

                //Process the links data
                var edges = [];
                graph.links.forEach(function(e) {
                    var sourceNode = graph.nodes.filter(function(n) { return n.id === e.source;})[0],
                        targetNode = graph.nodes.filter(function(n) { return n.id === e.target;})[0];
                    edges.push({source: sourceNode, target: targetNode, value: 1});
                });
                edges.forEach(function(e) {
                    var points = "" + e.source.x + "," + e.source.y
                    points = points + " " + (e.source.x + 0.5*(e.target.x-e.source.x)) + "," + (e.source.y + 0.5*(e.target.y-e.source.y));
                    points = points + " " + e.target.x + "," + e.target.y;
                    e.path = points;
                    e.delay = e.target.delay;
                    e.length = Math.sqrt(Math.pow(e.target.x - e.source.x,2) + Math.pow(e.target.y - e.source.y,2));
                    //console.log(e);
                });

                //Render the data to the SVG element

                //Define the mid-link marker
                svgGraph.append("svg:defs").append("marker")
                    .attr("id", "arrow")
                    .attr("refX", 10)
                    .attr("refY", 10)
                    .attr("markerWidth", 20)
                    .attr("markerHeight", 20)
                    .attr("markerUnits", "userSpaceOnUse")
                    .attr("orient", "auto")
                    .append("svg:g")
                    .attr("class","markergroup");
                svgGraph.selectAll(".markergroup")
                    .append("svg:rect")
                    .attr("x",0).attr("y",0)
                    .attr("width",20).attr("height",20)
                    .attr("fill","white");
                svgGraph.selectAll(".markergroup")
                    .append("svg:polyline")
                    .attr("points", "10,3 19,10 10,17")
                    .attr("fill", "none")
                    .attr("stroke-linecap", "round")
                    .attr("stroke", "#cccccc")
                    .attr("stroke-width", strokeWidth);
                svgGraph.selectAll(".markergroup")
                    .append("svg:polyline")
                    .attr("points", "0,10 20,10")
                    .attr("fill", "none")
                    .attr("stroke", "#cccccc")
                    .attr("stroke-width", strokeWidth);

                //Lines between nodes, coloured grey
                var link = svgGraph.selectAll(".link")
                    .data(edges).enter()
                    .append("polyline")
                    .attr("class", "link")
                    .attr("points", function(d) { return d.path; })
                    //.attr("marker-mid", "url(#arrow)")
                    .style("stroke-width", strokeWidth)
                    .attr("stroke-dasharray", function(d) { return d.length + " " + d.length; })
                    .attr("stroke-dashoffset", function(d) { return d.length; });

                //Circles for each node
                //Connectors/elbows need to be treated separately
                //Out-of-topic nodes are coloured grey
                var node = svgGraph.selectAll(".node")
                    .data(graph.nodes)
                    .enter().append("circle")
                    .attr("class", function(d) { return d.class; })
                    //Move all conditional logic to node setup, just write here
                    .attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })
                    .attr("r", 0)
                    .style("fill", function(d) { return d.color; });

                //Text label for each node, includes background
                //Allows label to wrap to up-to 3 lines
                var lbl_rect = svgGraph.selectAll(".lblr")
                    .data(graph.nodes)
                    .enter().append("rect")
                    .attr("class", "lblr")
                    .attr("x", function(d) { return d.x - 55; })
                    .attr("y", function(d) {
                        if (d.LabelPosition=="Top") {
                            return d.y - radius - 1 - offset*d.labelLines.length;
                        } else {
                            return d.y + radius + 1;
                        }
                    })
                    .attr("width", function(d) {
                        if (d.NodeType=="Concept") {
                            return 110;
                        } else {
                            return 0;
                        }
                    })
                    .attr("height", function(d) { return (offset*d.labelLines.length); })
                    .attr("opacity", 0);
                var lbl1 = svgGraph.selectAll(".lbl1")
                    .data(graph.nodes)
                    .enter().append("text")
                    .attr("class", "lbl lbl1")
                    .text(function(d) {
                        if (d.NodeType=="Concept") {
                            return d.labelLines[0];
                        } else {
                            return "";
                        }
                    })
                    .attr("x", function(d) { return d.x; })
                    .attr("y", function(d) {
                        if (d.LabelPosition=="Top") {
                            return d.y - radius -2- offset*(d.labelLines.length-1);
                        } else {
                            return d.y + radius -1+ offset;;
                        }
                    })
                    .attr("font-size", fontSize)
                    .attr("opacity",0);
                var lbl2 = svgGraph.selectAll(".lbl2")
                    .data(graph.nodes)
                    .enter().append("text")
                    .attr("class", "lbl lbl2")
                    .text(function(d) {
                        if (d.NodeType=="Concept") {
                            return d.labelLines[1];
                        } else {
                            return "";
                        }
                    })
                    .attr("x", function(d) { return d.x; })
                    .attr("y", function(d) {
                        if (d.LabelPosition=="Top") {
                            return d.y - radius -2- offset*(d.labelLines.length-2);
                        } else {
                            return d.y + radius -1+ offset*2;;
                        }
                    })
                    .attr("font-size", fontSize)
                    .attr("opacity",0);
                var lbl3 = svgGraph.selectAll(".lbl3")
                    .data(graph.nodes)
                    .enter().append("text")
                    .attr("class", "lbl lbl3")
                    .text(function(d) {
                        if (d.NodeType=="Concept") {
                            return d.labelLines[2];
                        } else {
                            return "";
                        }
                    })
                    .attr("x", function(d) { return d.x; })
                    .attr("y", function(d) {
                        if (d.LabelPosition=="Top") {
                            return d.y - radius -2- offset*(d.labelLines.length-3);
                        } else {
                            return d.y + radius -1+ offset*3;;
                        }
                    })
                    .attr("font-size", fontSize)
                    .attr("opacity",0);
                //Label in each node to indicate variant/level
                var lblHL = svgGraph.selectAll(".lblhl")
                    .data(graph.nodes)
                    .enter().append("text")
                    .attr("class", "lbl lblhl")
                    .text(function(d) { return d.HLlevel; })
                    .attr("x", function(d) { return d.x; })
                    .attr("y", function(d) { return d.y + fontSize/3; })
                    .attr("font-size", fontSize)
                    .attr("opacity",0);
                //Invisible clickable area above each node
                var ui = svgGraph.selectAll(".ui")
                    .data(graph.nodes.filter(function(d){ return d.NodeType=="Concept"; }))
                    .enter().append("circle")
                    .attr("class", "ui")
                    .attr("r", 24)
                    .attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })
                    .style("fill", function(d) { return d.color; })
                    .style("fill-opacity", 0)
                    .on("click", click);

                zoomwidth();
                reveal();
            }
        });}
});

//On click an out-of-topic concept, navigate to that topic map
function click(d) {
    svgGraph.selectAll(".ui").classed("nodeSelected", false).transition().style("fill-opacity", 0);
    d3.select(this).classed("nodeSelected", true).transition().duration(200).style("fill-opacity", 0.25);
    svgGraph.selectAll(".concept").filter(function(n) { return n.GUID === d.GUID; })
        .transition().duration(100).attr("r",radius*1.2)
        .transition().duration(100).attr("r", function(d) { return d.radius; });
    zoomFocus();
    if (d.topicData.TopicGUID!==topicURL) {
        window.location.href = "topicmap.html?topic=" + d.topicData.TopicGUID;
    }
}

//Initial map animation
function reveal() {
    svgGraph.selectAll(".lblr").transition()
        .delay(function(d) { return d.delay; }).duration(baseDelay).attr("opacity", 0.5);
    svgGraph.selectAll(".lbl").transition()
        .delay(function(d) { return d.delay; }).duration(baseDelay*3).attr("opacity", 1);
    svgGraph.selectAll(".node").transition()
        .delay(function(d) { return d.delay; }).duration(baseDelay*3).ease("elastic")
        .attr("r", function(d) { return d.radius; });
    svgGraph.selectAll(".link").transition().ease("linear")
        .delay(function(d) { return d.delay - baseDelay; }).duration(baseDelay)
        .attr("stroke-dashoffset", 0);
    svgGraph.selectAll(".link").transition()
        .delay(function(d) { return d.delay; }).duration(baseDelay/3)
        .attr("marker-mid", "url(#arrow)");
}

//Main map zoom function, called by d3.behaviour.zoom
function zoomed() {
    svgGraph.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

//Functions to programmatically set the map zoom
function zoomset(x_pos,y_pos,size) {
    zoom.translate([x_pos,y_pos]).scale(size);
    zoom.event(svgViewbox);
}
function zoomreset() {
    zoomset(0,headerPixels,1.25);
}
function zoomwidth() {
    var sc = viewSize.width/graphSize.width;
    if (sc > 1.5) { sc = 1.5; }
    if (sc < 0.75) { sc = 0.75; }
    zoomset(0,headerPixels,sc);
    //console.log("Zoom: scale=" + sc + ", top-margin=" + headerPixels);
}
//Focus node: in this order:
//1. Selected node; 2. Recommended node; 3. First in-topic node.
function findFocusNode() {
    var focusNode;
    //console.log(svgGraph.selectAll(".nodeSelected").attr("cx"));
    //console.log(svgGraph.selectAll(".nodeSelected"));
    return focusNode;
}

function zoomFocus() {
    var focusNode = findFocusNode();
    // find current pan offset
    // find in-graph cx,cy of focus node, and transform back to cx1, cy1 (scale, pan)
    // define bounds based on viewSize and some margin
    // check if cx1 is in bounds: if lower move to min, if higher move to max
    // same for cy1
    //
}

//iPads need to relayout on orientation change
window.onorientationchange = updateForOrientationChange;
function updateForOrientationChange() {
    location.reload();
}
//iPads pinch-zoom conflicts with zoom-pan on map, and user-scalable no longer supported, so this.
document.documentElement.addEventListener('touchmove', function (event) {
    event.preventDefault();
}, false);

//Helper function to split ConceptNames over 3 lines
function getLines(fullname) {
    var lines = new Array;
    var minNewline = 16;
    var text = String(fullname);
    lines[0] = text;
    if (text.length < 23) {
        return lines;
    } else {
        for (var i=minNewline; i < text.length; i++) {
            if (text.charAt(i)==" ") {
                lines[1] = lines[0].substr(i+1,lines[0].length-i);
                lines[0] = lines[0].substr(0,i);
                if (lines[1].length < 23) {
                    return lines;
                } else {
                    for (var j=minNewline; j < lines[1].length; j++) {
                        if (lines[1].charAt(j)==" ") {
                            lines[2] = lines[1].substr(j+1,lines[1].length-j);
                            lines[1] = lines[1].substr(0,j);
                            return lines;
                        }
                    }
                }
                return lines;
            }
        }
    }
    lines[0] = new Array;
    lines[0] = text;
    return lines;
}