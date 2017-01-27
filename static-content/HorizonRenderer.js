aardvark
    .factory('HorizonRenderer', ['GraphServices', '$http', '$uibModal', 'tsdbClient', 'tsdbUtils', function(graphServices, $http, $uibModal, tsdbClient, tsdbUtils) {
        var renderer = {
            create: function() {
                var ret = {
                    type: "horizon",
                    supports_tsdb_export: true,
                    supports_grafana_export: false,
                    tsdb_export_link: "",
                    grafana_export_text: ""
                };
                ret.render = function(renderContext, config, global, graph, metrics) {
                    renderContext.renderMessages[graph.id] = "Loading...";
                    ret.tsdb_export_link = "";
                    var divSelector = "#horizonDiv_"+graph.id;

                    var s = 1000;
                    var m = s * 60;
                    var h = m * 60;
                    var d = h * 24;
                    var w = d * 7;

                    var steps = [s,10*s,20*s,30*s,m,1*m,2*m,5*m,10*m,15*m,20*m,30*m,h,2*h,3*h,4*h,6*h,12*h,d,2*d,w];
                    for (var i=2; i<=52; i++) {
                        steps.push(i*w);
                    }

                    // cubism plots a pixel per step, so we need to calculate step size (we ignore downsampling time measure)
                    var width = Math.floor(graph.graphWidth);
                    var height = Math.floor(graph.graphHeight);
                    var start = graphServices.tsdb_fromTimestampAsMoment(global);
                    var stop = graphServices.tsdb_toTimestampAsMoment(global);
                    var diff = moment.utc().diff(start);
                    var timeWidthMillis = stop.diff(start);
                    var rawStepSize = timeWidthMillis / width;
                    var stepSize = steps[0];
                    for (var i=0; i<steps.length-1; i++) {
                        //console.log("considering "+steps[i]+" < " + rawStepSize + " <= "+steps[i+1]);
                        if (steps[i] < rawStepSize && rawStepSize <= steps[i+1]) {
                            stepSize = steps[i+1];
                            break;
                        }
                    }

                    var downsampleTo = !(stepSize % 86400000) ? stepSize / 86400000 + "d" :
                        !(stepSize % 3600000) ? stepSize / 3600000 + "h" :
                            !(stepSize % 60000) ? stepSize / 60000 + "m" :
                                stepSize / 1000 + "s";

                    // now recalculate width so we get the time range requested
                    width = Math.ceil(timeWidthMillis / stepSize);

                    // construct the query string for these metrics, when we have a response, then use that to construct
                    //    constant metrics (data already loaded) for time series which are returned.

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

                    // url construction
                    var downsampleOverrideFn = function(by) {return downsampleTo+"-"+(by?by:"avg")};

                    var url = config.tsdbBaseReadUrl+"/api/query";

                    url += "?" + graphServices.tsdb_queryString(renderContext, global, graph, metrics, null, downsampleOverrideFn);

                    url += "&ms=true&arrays=true&show_query=true";

                    // now we have the url, so call it!
                    $http.get(url, {withCredentials:config.authenticatedReads}).success(function (json) {
                        // now we have an array of lines, so let's convert them to metrics

                        var interpolate = graph.horizon && graph.horizon.interpolateGaps;
                        var squash = graph.horizon && graph.horizon.squashNegative;

                        var parsed = graphServices.cubism_parser(json, start, stepSize, stop, interpolate, squash); // array response
                        // construct cMetrics
                        var cMetrics = [];

                        var context = cubism.context()
                            .serverDelay(diff)
                            .step(stepSize)
                            .size(width)
                            .stop();

                        var addMetric = function(cMetrics, metricData, name)
                        {
                            cMetrics.push(context.metric(function (start, stop, step, callback) {
                                callback(null, metricData);
                            }, name));
                        }



                        for (var i=0; i<parsed.length; i++) {
                            var name = graphServices.timeSeriesName(json[i]);
                            addMetric(cMetrics, parsed[i], name);
                        }

                        // remove old horizon charts
                        d3.select(divSelector)
                            .selectAll(".horizon")
                            .remove();
                        // remove everything else
                        d3.select(divSelector)
                            .selectAll(".axis")
                            .remove();
                        d3.select(divSelector)
                            .selectAll(".rule")
                            .remove();
                        d3.select(divSelector)
                            .selectAll(".value")
                            .remove();

                        var cubism_axisFormatSeconds = d3.time.format("%H:%M:%S"),
                            cubism_axisFormatMinutes = d3.time.format("%H:%M"),
                            cubism_axisFormatDays = d3.time.format("%B %d");

                        var axisFormat = context.step() < 6e4 ? cubism_axisFormatSeconds
                            : context.step() < 864e5 ? cubism_axisFormatMinutes
                            : cubism_axisFormatDays;

                        d3.select(divSelector)
                            .selectAll(".axis")
                            .data(["top", "bottom"])
                            .enter()
                            .append("div")
                            .attr("id", function(d) {
                                return "horizonAxis_" + d + "_" + graph.id;
                            })
                            .attr("class", function(d) {
                                return d + " axis";
                            })
                            .each(function(d) {
                                d3.select(this).call(context.axis().focusFormat(axisFormat).ticks(12).orient(d));
                            });

                        context.on("focus", function(i) {
                            d3.selectAll(".value").style("right", "10px");
                        });

                        var topAxisBox = d3.select("#horizonAxis_top_"+graph.id).node().getBoundingClientRect();
                        var bottomAxisBox = d3.select("#horizonAxis_bottom_"+graph.id).node().getBoundingClientRect();

                        var topAxisHeight = topAxisBox.height;
                        var bottomAxisHeight = bottomAxisBox.height;
                        var totalAxesHeight = topAxisHeight + bottomAxisHeight;

                        var minLineHeight = 25;
                        var maxLineHeight = 60;

                        var perLineHeight = ((height - totalAxesHeight)/cMetrics.length)-2;
                        perLineHeight = Math.min(Math.max(perLineHeight,minLineHeight),maxLineHeight);
                        d3.select(divSelector).selectAll(".horizon")
                            .data(cMetrics)
                            .enter().insert("div", ".bottom")
                            .attr("class", "horizon")
                            .call(context.horizon().height(perLineHeight).format(d3.format(".2f")));

                        var leftOffsetContainer = {
                            leftOffset: 0
                        }

                        // rendering of graphs doesn't change horizontal location
                        // NOTE: resizing of window does, but we don't try and handle that (yet)
                        var graphContentPanel = d3.select("#graph-content-panel").node().getBoundingClientRect();
                        var ruleLeft = graphContentPanel.left;
                        leftOffsetContainer.leftOffset = ruleLeft;
                        // now we can add rule safely as we know height as well
                        d3.select(divSelector).append("div")
                            .attr("class", "rule")
                            .attr("id","horizonRule_"+graph.id)
                            .call(graphServices.cubism_rule(context, leftOffsetContainer));
                        //                .call(context.rule());


                        var resizeFocusRule = function() {
                            //var graphPanelBox = d3.select("#graph-content-panel").node().getBoundingClientRect();
                            // top needs to be relative to the whole window
                            var ruleTop = topAxisBox.top;
                            var ruleHeight = totalAxesHeight + (perLineHeight * cMetrics.length);
                            // and now we just go find the rule we added and set the top/height
                            d3.select("#horizonRule_"+graph.id)
                                .select(".line")
                                .style("top", ruleTop+"px")
                                .style("height",ruleHeight+"px")
                                .style("bottom",null);
                        }

                        resizeFocusRule();

                        renderContext.addGraphRenderListener(function (graphId) {
                            if (graphId != graph.id) {
                                resizeFocusRule();
                            }
                        });

                        var yAxisParams = {
                            squashNegative: squash
                        };
                        ret.tsdb_export_link = graphServices.tsdbGraphUrl("/#", renderContext, config, global, graph, metrics, "x1y1", downsampleOverrideFn, yAxisParams, /*y2AxisParams*/null, /*keyParams*/{}, /*lineSmoothing*/false, /*style*/null, /*globalAnnotations*/false);
                        renderContext.renderMessages[graph.id] = "";
                        renderContext.graphRendered(graph.id);
                        return;
                    })
                        .error(function (arg) {
                            renderContext.renderMessages[graph.id] = "Error loading data: "+arg;
                            return;
                        });
                }
                return ret;
            }
        };
        return renderer;
    }]);