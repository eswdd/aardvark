aardvark
    .factory('ScatterRenderer', ['GraphServices', '$http', function(graphServices, $http) {
        var renderer = {
            create: function() {
                var instance = {
                    type: "scatter",
                    supports_tsdb_export: false,
                    supports_grafana_export: false
                };
                instance.findAndCheckMultiTagQueries = function(metrics) {
                    // should compare tag queries in the (exactly) 2 metrics in the array
                    // looking for the multi-queries (grouped only)
                    // if the set is the same then all good and return the list of tags
                    // else throw error
                    
                    // should never happen as should be checked by render method which calls this
                    if (metrics.length != 2) {
                        throw 'Expected exactly 2 metric queries';
                    }
                    
                    var findMultiTags = function(metric) {
                        var wildcarded = {};
                        
                        for (var t=0; t<metric.tags.length; t++) {
                            var tag = metric.tags[t];
                            if (tag.groupBy) {
                                var isMultiValue = false;
                                if (tag.value.indexOf("*") >= 0 || tag.value.indexOf("|") >= 0) {
                                    isMultiValue = true;
                                }
                                if (tag.value.indexOf("wildcard(") >= 0) {
                                    isMultiValue = true;
                                }
                                if (tag.value.indexOf("regexp(") == 0) {
                                    isMultiValue = true;
                                }
                                if (tag.value.indexOf("literal_or(") >= 0) {
                                    isMultiValue = true;
                                }
                                // queries are anded together
                                if (isMultiValue) {
                                    if (!wildcarded.hasOwnProperty(tag.name)) {
                                        wildcarded[tag.name] = true;
                                    }
                                }
                                else {
                                    wildcarded[tag.name] = false;
                                }
                            }
                        }
                        
                        var ret = [];
                        for (var k in wildcarded) {
                            if (wildcarded.hasOwnProperty(k) && wildcarded[k]) {
                                ret.push(k);
                            }
                        }
                        return ret;
                    }
                    
                    var first = findMultiTags(metrics[0]);
                    first.sort();
                    var second = findMultiTags(metrics[1]);
                    second.sort();
                    
                    if (first.length != second.length) {
                        throw 'Mismatched multi-tag queries: ['+first+"] vs ["+second+"]";
                    }
                    
                    for (var i=0; i<first.length; i++) {
                        if (first[i] != second[i]) {
                            throw 'Mismatched multi-tag queries: ['+first+"] vs ["+second+"]";
                        }
                    }
                    
                    return first;
                }
                instance.render = function(renderContext, config, global, graph, metrics) {
                    var fromTimestamp = graphServices.tsdb_fromTimestampAsTsdbString(global);
                    // validation
                    if (fromTimestamp == null || fromTimestamp == "") {
                        renderContext.renderErrors[graph.id] = "No start date specified";
                        return;
                    }
                    if (metrics == null || metrics.length == 0) {
                        renderContext.renderErrors[graph.id] = "No metrics specified";
                        return;
                    }
                    if (metrics.length != 2) {
                        renderContext.renderErrors[graph.id] = "Require exactly 2 metrics, currently have "+metrics.length;
                        return;
                    }
                    
                    var multiTags;
                    try {
                        multiTags = instance.findAndCheckMultiTagQueries(metrics);
                    }
                    catch (e) {
                        renderContext.renderErrors[graph.id] = e;
                        return;
                    }

                    var scatterOptions = graph.scatter;
                    if (!scatterOptions) {
                        scatterOptions = {};
                    }

                    renderContext.renderMessages[graph.id] = "Loading...";

                    // url construction - one per metric query
                    var url1 = config.tsdbBaseReadUrl+"/api/query";
                    var url2 = config.tsdbBaseReadUrl+"/api/query";
                    url1 += "?" + graphServices.tsdb_queryString(renderContext, global, graph, [metrics[0]], null/*perLineFn*/, null/*datum*/);
                    url2 += "?" + graphServices.tsdb_queryString(renderContext, global, graph, [metrics[1]], null/*perLineFn*/, null/*datum*/);
                    url1 += "&no_annotations=true&ms=true&show_query=true";
                    url2 += "&no_annotations=true&ms=true&show_query=true";
                    
                    var results = [null,null];
                    var errors = [null,null];

                    var processResults = function() {
                        if (multiTags.length == 0 && (results[0].length != 1 || results[1].length != 1)) {
                            renderContext.renderErrors[graph.id] = "TSDB response doesn't contain exactly 2 timeseries, was "+(results[0].length+results[1].length);
                            renderContext.renderMessages[graph.id] = "";
                            return;
                        }
                        
                        var keyResults = function(json) {
                            var ret = {};
                            for (var j=0; j<json.length; j++) {
                                var sep = "{";
                                var str = "";
                                for (var t=0; t<multiTags.length; t++) {
                                    str += sep + multiTags[t] + "=" + json[j].tags[multiTags[t]];
                                    sep = ",";
                                }
                                if (str != "") {
                                    str += "}";
                                }
                                ret[str] = json[j];
                            }
                            return ret;
                        }
                        
                        var keyedResults1 = keyResults(results[0]);
                        var keyedResults2 = keyResults(results[1]);
                        

                        var xSeries;
                        var ySeries;
                        // by default first metric is x
                        if (scatterOptions.swapAxes) {
                            xSeries = keyedResults2;
                            ySeries = keyedResults1;
                        }
                        else {
                            xSeries = keyedResults1;
                            ySeries = keyedResults2;
                        }
                        
                        // remove non-matches
                        for (var k in keyedResults1) {
                            if (keyedResults1.hasOwnProperty(k) && !keyedResults2.hasOwnProperty(k)) {
                                delete keyedResults1[k];
                            }
                        }
                        for (var k in keyedResults2) {
                            if (keyedResults2.hasOwnProperty(k) && !keyedResults1.hasOwnProperty(k)) {
                                delete keyedResults2[k];
                            }
                        }
                        
                        // so now we have a set of keys.
                        // for each key we need:
                        //   a set of points (x vs y)
                        //   a series name
                        //   a series index

                        var timesBySeriesAndValues = {};
                        var createDataForTagSet = function(seriesKey, xSeries, ySeries) {
                            var data = [];
                            for (var t in xSeries.dps) {
                                if (xSeries.dps.hasOwnProperty(t) && ySeries.dps.hasOwnProperty(t)) {
                                    if ((scatterOptions.xSquashNegative && xSeries.dps[t] < 0)
                                        || (scatterOptions.ySquashNegative && ySeries.dps[t] < 0)) {
                                        continue;
                                    }
                                    var xval = xSeries.dps[t];
                                    var yval = ySeries.dps[t];
                                    data.push([xval, yval]);
                                    var timesKey = seriesKey + "_" + xval + "_" + yval;
                                    if (!timesBySeriesAndValues.hasOwnProperty(timesKey)) {
                                        timesBySeriesAndValues[timesKey] = [];
                                    }
                                    timesBySeriesAndValues[timesKey].push(t);
                                }
                            }
                            data.sort(function (a,b) {
                                return a[0] - b[0];
                            });
                            return data;
                        }
                        
                        // should both be sorted already
                        var merge = function(into, data) {
                            var existingDataLen = into.length == 0 ? 0 : into[0].length - 1;
                            var i = 0;
                            var j = 0;
                            for (; i<into.length && j<data.length; ) {
                                if (into[i][0] == data[j][0]) {
                                    into[i].push(data[j][1]);
                                    i++;
                                    j++;
                                }
                                else if (into[i][0] < data[j][0]) {
                                    into[i].push(null);
                                    i++;
                                }
                                else {
                                    var arr = [data[j][0]];
                                    for (var k=1; k<into[i].length; k++) {
                                        arr.push(null);
                                    }
                                    arr.push(data[j][1]);
                                    into.splice(i,0,arr);
                                    i++;
                                    j++;
                                }
                            }
                            while (j<data.length) {
                                var arr = [data[j][0]];
                                for (var k=0; k<existingDataLen; k++) {
                                    arr.push(null);
                                }
                                arr.push(data[j][1]);
                                into.push(arr);
                                j++;
                            }
                        }
                        
                        var seriesIndexes = {};
                        var seriesKeys = [null];
                        var labels = [];
                        var mergedData = [];
                        for (var k in keyedResults1) {
                            var data = createDataForTagSet(k, xSeries[k], ySeries[k]);
                            labels.push(xSeries[k].metric + k + " (x) vs "+ySeries[k].metric + k + " (y)");
                            seriesKeys.push(k);
                            seriesIndexes[k] = labels.length;
                            merge(mergedData, data);
                        }
                        labels.splice(0, 0, "x");

                        var positionLegend = function() {
                            var graphBoxNode = d3.select("#scatterDiv_"+graph.id).node();
                            // null in unt tests
                            if (graphBoxNode != null) {
                                var graphBox = graphBoxNode.getBoundingClientRect();
                                // top needs to be relative to the whole window
                                var legendTop = graphBox.top;
                                var legendLeft = graphBox.left + 80;
                                // and now we just go find the rule we added and set the top/height
                                d3.select("#scatterLegend_"+graph.id)
                                    .style("top", legendTop+"px")
                                    .style("left", legendLeft+"px");
                            }
                        }

                        positionLegend();

//                        var originalXRangeInDygraph;
                        var originalYRangeInDygraph;
//                        var originalXRangeInGraph = graph.scatter.xRange;
                        var originalYRangeInGraph = graph.scatter ? graph.scatter.yRange : "";
                        var drawCallback = function(dygraph, is_initial) {
                            if (is_initial) {
//                                originalXRangeInDygraph = dygraph.xAxisRange();
                                originalYRangeInDygraph = dygraph.yAxisRange(0);
                            }
                        }
                        var zoomCallback = function(minX, maxX, yRanges) {
//                            var newXRange;
                            var newYRange;
//                            if (minX == originalXRangeInDygraph[0] && maxX == originalXRangeInDygraph[1]) {
//                                newXRange = originalXRangeInGraph;
//                            }
//                            else {
//                                newXRange = graphServices.dygraphAxisRangeToString([minX, maxX]);
//                            }
                            var yRange = yRanges[0];
                            if (yRange[0] == originalYRangeInDygraph[0] && yRange[1] == originalYRangeInDygraph[1]) {
                                newYRange = originalYRangeInGraph;
                            }
                            else {
                                newYRange = graphServices.dygraphAxisRangeToString(yRange);
                            }
//                            renderContext.updateGraphModel(null, {scatter:{xRange:newXRange,yRange:newYRange}}, true);
                            renderContext.updateGraphModel(null, {scatter:{yRange:newYRange}}, true);
                        }

                        var labelsDiv = document.getElementById("scatterLegend_"+graph.id);

                        var width = Math.floor(graph.graphWidth);
                        var height = Math.floor(graph.graphHeight);
                        var config = {
                            labels: labels,
                            width: width,
                            height: height,
                            legend: "always",
                            drawPoints: true,
                            strokeWidth: 0.0,
                            axisLabelFontSize: 9,
                            labelsDivStyles: { fontSize: 9, textAlign: 'right' },
                            labelsSeparateLines: true,
                            labelsDiv: labelsDiv,
                            labelsDivWidth: 1000,
                            logscale: scatterOptions.ylog,
                            zoomCallback: zoomCallback,
                            drawCallback: drawCallback,
                            axes: {
                                y: {
                                    valueFormatter: function(num, opts, seriesName, g, row, col) {
                                        var xval = g.getValue(row, 0);
                                        var yval = g.getValue(row, col);
                                        return xval + " vs " + yval;
                                    },
                                    valueRange: graphServices.parseDygraphAxisRange(renderContext, graph, scatterOptions.yRange)
                                },
                                x: {
                                    valueFormatter: function(num, opts, seriesName, g, row, col) {
                                        var xval = g.getValue(row, 0);
                                        var timesText = "";
                                        var sep = "";
                                        for (var c=1; c<labels.length; c++)
                                        {
                                            var yval = g.getValue(row, c);
                                            var times = timesBySeriesAndValues[seriesKeys[col]+"_"+xval+"_"+yval];
                                            if (times != null) {
                                                for (var t=0; t<times.length; t++) {
                                                    try {
                                                        timesText += sep + moment.utc(parseInt(times[t])).format("YYYY/MM/DD HH:mm:ss");
                                                    }
                                                    catch (e) {
                                                        timesText += sep + times[t];
                                                    }
                                                    sep = ", "
                                                }
                                            }
                                        }
                                        
                                        return timesText;
                                    },
                                    logscale: scatterOptions.xlog,
                                    valueRange: graphServices.parseDygraphAxisRange(renderContext, graph, scatterOptions.xRange)
                                }
                            }
                        };

                        graphServices.dygraph_render("scatterDiv_"+graph.id, graph.id, mergedData, config);

                        renderContext.renderMessages[graph.id] = "";
                        renderContext.graphRendered(graph.id);
                    }

                    $http
                        .get(url1).success(function (json) {
                            results[0] = json;
                            if (results[1] != null) {
                                processResults();
                            }
                        })
                        .error(function (arg) {
                            errors[0] = arg;
                            renderContext.renderMessages[graph.id] = "Error loading data: "+arg;
                        });
                    $http
                        .get(url2).success(function (json) {
                            results[1] = json;
                            if (results[0] != null) {
                                processResults();
                            }
                        })
                        .error(function (arg) {
                            errors[1] = arg;
                            renderContext.renderMessages[graph.id] = "Error loading data: "+arg;
                        });
                }
                return instance;
            }
        };
        return renderer;
    }]);