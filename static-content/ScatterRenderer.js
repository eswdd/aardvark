aardvark
    .factory('ScatterRenderer', ['GraphServices', '$http', function(graphServices, $http) {
        var renderer = {
            create: function() {
                return {
                    type: "scatter",
                    supports_tsdb_export: false,
                    supports_grafana_export: false,
                    render: function(renderContext, config, global, graph, metrics) {
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

                        var scatterOptions = graph.scatter;
                        if (!scatterOptions) {
                            scatterOptions = {};
                        }

                        renderContext.renderMessages[graph.id] = "Loading...";

                        // url construction
                        var url = config.tsdbBaseReadUrl+"/api/query";

                        url += "?" + graphServices.tsdb_queryString(renderContext, global, graph, metrics);

                        url += "&no_annotations=true&ms=true&show_query=true";

                        // now we have the url, so call it!
                        $http.get(url).success(function (json) {
                            if (json.length != 2) {
                                renderContext.renderErrors[graph.id] = "TSDB results doesn't contain exactly 2 metrics, was "+json.length;
                                renderContext.renderMessages[graph.id] = "";
                                return;
                            }

                            var xSeries;
                            var ySeries;
                            if (metrics[0].graphOptions.scatter == null) {
                                xSeries = json[0];
                                ySeries = json[1];
                            }
                            else if (metrics[0].graphOptions.scatter.axis == "y" || metrics[1].graphOptions.scatter.axis == "x") {
                                xSeries = json[1];
                                ySeries = json[0];
                            }
                            else if (metrics[0].graphOptions.scatter.axis == "x" || metrics[1].graphOptions.scatter.axis == "y") {
                                xSeries = json[0];
                                ySeries = json[1];
                            }
                            // by default first metric is x
                            else {
                                xSeries = json[0];
                                ySeries = json[1];
                            }
                            if (scatterOptions.swapAxes) {
                                var tmp = xSeries;
                                xSeries = ySeries;
                                ySeries = tmp;
                            }

                            var timesByValues = {};
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
                                    var timesKey = xval + "_" + yval;
                                    if (!timesByValues.hasOwnProperty(timesKey)) {
                                        timesByValues[timesKey] = [];
                                    }
                                    timesByValues[timesKey].push(t);
                                }
                            }
                            data.sort(function (a,b) {
                                return a[0] - b[0];
                            });

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

                            var labels = ["x", graphServices.timeSeriesName(xSeries) + " (x) vs " + graphServices.timeSeriesName(ySeries) + " (y)"];
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
                                axes: {
                                    y: {
                                        valueFormatter: function(num, opts, seriesName, g, row, col) {
                                            var xval = g.getValue(row, 0);
                                            var yval = g.getValue(row, 1);
                                            return xval + " vs " + yval;
                                        },
                                        valueRange: graphServices.parseDygraphAxisRange(scatterOptions.yRange)
                                    },
                                    x: {
                                        valueFormatter: function(num, opts, seriesName, g, row, col) {
                                            var xval = g.getValue(row, 0);
                                            var yval = g.getValue(row, 1);
                                            var times = timesByValues[xval+"_"+yval];
                                            var timesText = "";
                                            var sep = "";
                                            for (var t=0; t<times.length; t++) {
                                                try {
                                                    timesText += sep + moment.utc(parseInt(times[t])).format("YYYY/MM/DD HH:mm:ss");
                                                }
                                                catch (e) {
                                                    timesText += sep + times[t];
                                                }
                                                sep = ", "
                                            }
                                            return timesText;
                                        },
                                        logscale: scatterOptions.xlog,
                                        valueRange: graphServices.parseDygraphAxisRange(scatterOptions.xRange)
                                    }
                                }
                            };

                            graphServices.dygraph_render("scatterDiv_"+graph.id, graph.id, data, config);

                            renderContext.renderMessages[graph.id] = "";
                            renderContext.graphRendered(graph.id);
                            return;
                        })
                            .error(function (arg) {
                                renderContext.renderMessages[graph.id] = "Error loading data: "+arg;
                                return;
                            });
                    }
                }
            }
        };
        return renderer;
    }]);