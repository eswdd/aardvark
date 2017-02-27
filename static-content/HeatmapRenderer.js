aardvark
    .factory('HeatmapRenderer', ['GraphServices', '$http', '$uibModal', 'tsdbClient', 'tsdbUtils', function(graphServices, $http, $uibModal, tsdbClient, tsdbUtils) {

        var renderer = {};
        renderer.heatmap = function() {

            var ret = {};

            ret._dps = [];
            ret._scale = d3.scale.quantize();
            ret._cellSize = 5;
            ret._width = null;
            ret._height = null;
            ret._colourScheme = "RdYlGn";

            ret._color = function(dps, isFilteredOutFn) {
                var minValue = null, maxValue = null;
                for (var p=0; p<dps.length; p++) {
//                if (dps[p][1] < 0) {
//                    dps[p][1] = 0;
//                }
                    if (!isFilteredOutFn(dps[p][1])) {
                        if (minValue == null) {
                            minValue = dps[p][1];
                            maxValue = dps[p][1];
                        }
                        else {
                            minValue = Math.min(minValue, dps[p][1]);
                            maxValue = Math.max(maxValue, dps[p][1]);
                        }
                    }
                }

                return ret._scale
                    .domain([minValue, maxValue])
                    .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));
            }

            ret.dps = function(_) {
                if (!arguments.length) {
                    return ret._dps;
                }
                ret._dps = _;
                return ret;
            };

            ret.scale = function(_) {
                if (!arguments.length) {
                    return ret._scale;
                }
                ret._scale = _;
                return ret;
            };

            ret.cellSize = function(_) {
                if (!arguments.length) {
                    return ret._cellSize;
                }
                ret._cellSize = _;
                return ret;
            }

            ret.width = function(_) {
                if (!arguments.length) {
                    return ret._width;
                }
                ret._width = _;
                return ret;
            }

            ret.height = function(_) {
                if (!arguments.length) {
                    return ret._height;
                }
                ret._height = _;
                return ret;
            }

            ret.colourScheme = function(_) {
                if (!arguments.length) {
                    return ret._colourScheme;
                }
                ret._colourScheme = _;
                return ret;
            }

            ret.weekDayRender = function(divSelector, fromYear, toYear, isFilteredOutFn) {

                // render away
                var format = d3.time.format("%Y-%m-%d");

                var numYears = (toYear - fromYear) + 1;
                var yearHeight = ret._height / numYears;

                var translateX = ((ret._width - ret._cellSize * 53) / 2);
                if (translateX < 0) {
                    translateX = 0;
                }
                var translateY = (yearHeight - ret._cellSize * 7 - 1);
                if (translateY < 0) {
                    translateY = 0;
                }

                var color = ret._color(ret._dps, isFilteredOutFn);

                var svg = d3.select(divSelector).selectAll("svg")
                    .data(d3.range(fromYear, toYear+1))
                    .enter().append("svg")
                    .attr("width", ret._width)
                    .attr("height", yearHeight)
                    .attr("class", ret._colourScheme)
                    .append("g")
                    .attr("transform", "translate(" + translateX + "," + translateY + ")");

                svg.append("text")
                    .attr("transform", "translate(-6," + ret._cellSize * 3.5 + ")rotate(-90)")
                    .style("text-anchor", "middle")
                    .text(function(d) { return d; });

                var rect = svg.selectAll(".cell")
                    .data(function(d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
                    .enter().append("rect")
                    .attr("class", "cell")
                    .attr("width", ret._cellSize)
                    .attr("height", ret._cellSize)
                    .attr("x", function(d) { return d3.time.weekOfYear(d) * ret._cellSize; })
                    .attr("y", function(d) { return d.getDay() * ret._cellSize; })
                    .datum(format);

                rect.append("title")
                    .text(function(d) { return d; });

                svg.selectAll(".path")
                    .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
                    .enter().append("path")
                    .attr("class", "path")
                    .attr("d", monthPath);

                var data = d3.nest()
                    .key(function(d) {
                        return format(new Date(d[0]));
                    })
                    .rollup(function(d) {
                        return d[0][1];
                    })
                    .map(ret._dps);

                rect.filter(function(d) {
                    return d in data;
                })
                    .attr("class", function(d) {
                        return "cell " + (isFilteredOutFn(data[d]) ? "filteredOut" : color(data[d]));
                    })
                    .select("title")
                    .text(function(d) {
                        return d + ": " + data[d];
                    });

                function monthPath(t0) {
                    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                        d0 = t0.getDay(), w0 = d3.time.weekOfYear(t0),
                        d1 = t1.getDay(), w1 = d3.time.weekOfYear(t1);
                    return "M" + (w0 + 1) * ret._cellSize + "," + d0 * ret._cellSize
                        + "H" + w0 * ret._cellSize + "V" + 7 * ret._cellSize
                        + "H" + w1 * ret._cellSize + "V" + (d1 + 1) * ret._cellSize
                        + "H" + (w1 + 1) * ret._cellSize + "V" + 0
                        + "H" + (w0 + 1) * ret._cellSize + "Z";
                }
            }

            ret.dayHourRender = function(divSelector, fromMonth, toMonth, isFilteredOutFn) {

                var color = ret._color(ret._dps, isFilteredOutFn);

                // render away
                var format = d3.time.format("%Y-%m-%d @ %H");

                var monthHeight = ret._cellSize * 25;
                var monthWidth = (ret._cellSize * 31) + 20;

//                console.log("monthWidth = "+monthWidth);
//                console.log("monthHeight = "+monthHeight);

                var svg = d3.select(divSelector).selectAll("svg")
                    .data(d3.range(fromMonth, toMonth+1))
                    .enter().append("svg")
                    .attr("width", monthWidth)
                    .attr("height", monthHeight)
                    .attr("class", ret._colourScheme)
                    .append("g")
                    .attr("transform", "translate(19," + (ret._cellSize / 2) + ")");

                svg.append("text")
                    .attr("transform", "translate(-6," + ret._cellSize * 12 + ")rotate(-90)")
                    .style("text-anchor", "middle")
                    .text(function(d) {
                        var month = d%12;
                        var year = (d-month)/12;
                        return (month+1)+"/"+year;
                    });

                var rect = svg.selectAll(".cell")
                    .data(function(d) {
                        var month1 = d%12;
                        var year1 = (d-month1)/12;
                        var month2 = (d+1)%12;
                        var year2 = ((d+1)-month2)/12;
                        var ret = d3.time.hours(new Date(year1, month1, 1), new Date(year2, month2, 1));
                        return ret;
                    })
                    .enter().append("rect")
                    .attr("class", "cell")
                    .attr("width", ret._cellSize)
                    .attr("height", ret._cellSize)
                    .attr("x", function(d) { return (d.getDate()-1) * ret._cellSize; })
                    .attr("y", function(d) { return d.getHours() * ret._cellSize; })
                    .datum(format);

                rect.append("title")
                    .text(function(d) {
                        return d;
                    });

                var data = d3.nest()
                    .key(function(d) {
                        return format(new Date(d[0]));
                    })
                    .rollup(function(d) {
                        return d[0][1];
                    })
                    .map(ret._dps);

                rect.filter(function(d) {
                    return d in data;
                })
                    .attr("class", function(d) {
                        return "cell " + (isFilteredOutFn(data[d]) ? "filteredOut" : color(data[d]));
                    })
                    .select("title")
                    .text(function(d) {
                        return d + ": " + data[d];
                    });
            }


            return ret;
        };
        renderer.create = function() {
                var ret = {
                    type: "heatmap",
                    supports_tsdb_export: true,
                    supports_grafana_export: false,
                    tsdb_export_link: "",
                    grafana_export_text: ""
                };
                ret.render = function(renderContext, config, global, graph, metrics) {
                    ret.tsdb_export_link = "";

                    // validation
                    var fromTimestamp = graphServices.tsdb_fromTimestampAsTsdbString(global);
                    if (fromTimestamp == null || fromTimestamp == "") {
                        renderContext.renderErrors[graph.id] = "No start date specified";
                        return;
                    }
                    if (metrics == null || metrics.length == 0) {
                        renderContext.renderErrors[graph.id] = "No metrics specified";
                        return;
                    }
                    if (metrics.length != 1) {
                        renderContext.renderErrors[graph.id] = "Require exactly 1 metric, currently have "+metrics.length;
                        return;
                    }

                    renderContext.renderMessages[graph.id] = "Loading...";
                    var divSelector = "#heatmapDiv_"+graph.id;

                    var heatmapOptions = graph.heatmap;
                    if (!heatmapOptions) {
                        heatmapOptions = {};
                    }

                    var width = Math.floor(graph.graphWidth);
                    var height = Math.floor(graph.graphHeight);

                    var fromDateTime = graphServices.tsdb_fromTimestampAsMoment(global);
                    var toDateTime = graphServices.tsdb_toTimestampAsMoment(global);

                    var fromYear = fromDateTime.year();
                    var toYear = toDateTime.year();
                    var numYears = (toYear - fromYear) + 1;

                    var fromMonth = fromYear*12 + fromDateTime.month();
                    var toMonth = toYear*12 + toDateTime.month();
                    var numMonths = (toMonth - fromMonth) + 1;

                    // depending on the heatmap style, the number of squares per row/column will vary, these 
                    // need to be integer values so we will calculate appropriate values for the
                    // size of the graph
                    var style = heatmapOptions.style ? heatmapOptions.style : "auto";
                    if (style == "auto") {
                        // if style is auto, we guess passed on toTimestamp-fromTimestamp
                        var diff = toDateTime.diff(fromDateTime, 'years', true);
                        style = diff > 1 ? "week_day" : "day_hour";
                    }
                    switch (style) {
                        case 'week_day':
                        case 'day_hour':
                            break;
                        default:
                            renderContext.renderErrors[graph.id] = "Unsupported graph style: "+style;
                            return;
                    }

                    // calculate max cell size that fits data in width and height
                    var minCellSize = 5;
                    var cellSize = minCellSize;
                    var cols = 0;
                    var rows = 0;
                    var downsampleTo = null;
                    if (style == "week_day") {
                        var cellSizeFromWidth = (width - 20) / 53; // weeks in a year, after space for year text
                        var cellSizeFromHeight = height / (numYears * 8); // min height of a year view is 8 cells, 7 for days, plus 1 padding
                        cellSize = Math.min(cellSizeFromWidth, cellSizeFromHeight);
                        downsampleTo = "1d";
                    }
                    else if (style == "day_hour") {
                        downsampleTo = "1h";
                        cellSize = minCellSize;
                        //            console.log("width = "+width);
                        //            console.log("height = "+height);
                        for (rows=1; ; rows++) {
                            //                console.log("Processing ROWS = "+rows)

                            var maxMonthHeight = height / rows;
                            var candidateCellSizeFromHeight = Math.floor(maxMonthHeight / 25);
                            //                console.log("maxMonthHeight = "+maxMonthHeight+", candidateCellSizeFromHeight="+candidateCellSizeFromHeight);

                            var maxMonthsInRow = Math.ceil(numMonths / rows);
                            var numRowsWithCells = Math.ceil(numMonths / maxMonthsInRow);
                            //                console.log("maxMonthsInRow = "+maxMonthsInRow+", numRowsWithCells="+numRowsWithCells);

                            var candidateMonthWidthFromWidth = Math.floor(width / maxMonthsInRow)
                            var candidateCellSizeFromWidth = (candidateMonthWidthFromWidth - 20) / 31;
                            //                console.log("candidateMonthWidthFromWidth = "+candidateMonthWidthFromWidth+", candidateCellSizeFromWidth="+candidateCellSizeFromWidth);
                            for ( ; ; candidateCellSizeFromWidth--) {
                                var totalHeightFromCellSizeFromWidth = numRowsWithCells * candidateCellSizeFromWidth * 25;
                                if (totalHeightFromCellSizeFromWidth <= height) {
                                    //                        console.log("totalHeightFromCellSizeFromWidth = "+totalHeightFromCellSizeFromWidth+", candidateCellSizeFromWidth="+candidateCellSizeFromWidth);
                                    break;
                                }
                            }
                            var candidateCellSize = Math.min(candidateCellSizeFromHeight, candidateCellSizeFromWidth);

                            if (candidateCellSize > cellSize || rows == 1) {
                                cellSize = candidateCellSize;
                                //                    console.log("Appears we're better off with "+rows+" rows: "+cellSize);
                                var monthHeight = cellSize * 25;
                                var monthWidth = (cellSize * 31) + 20;
                                //                    console.log("Gives us w x h of "+monthWidth+"x"+monthHeight);
                            }
                            else {
                                //                    console.log("Appears we were better off with "+(rows-1)+" rows: "+candidateCellSize);
                                rows--;
                                cols = Math.ceil(numMonths/rows);
                                break;
                            }
                        }
                        // that gives us a single column, but perhaps if we go to 2 columns we can have larger cells
                    }


                    // min value
                    if (cellSize < minCellSize) {
                        cellSize = minCellSize;
                        if (style == "week_day") {
                            height = cellSize * (numYears * 8);
                        }
                        else if (style == "day_hour") {
                            height = cellSize * (numMonths * 25);
                        }
                    }

                    // url construction
                    var downsampleOverrideFn = function(by) {return downsampleTo+"-"+(by?by:"avg")};
                    var url = config.tsdbBaseReadUrl+"/api/query";

                    url += "?" + graphServices.tsdb_queryString(renderContext, global, graph, metrics, null/*perLineFn*/, null/*datum*/, downsampleOverrideFn);

                    url += "&ms=true&arrays=true";

                    // now we have the url, so call it!
                    $http.get(url, {withCredentials:config.authenticatedReads}).success(function (json) {
                        if (json.length != 1) {
                            renderContext.renderErrors[graph.id] = "TSDB results doesn't contain exactly 1 metric, was "+json.length;
                            renderContext.renderMessages[graph.id] = "";
                            return;
                        }

                        var series = json[0];

                        if (heatmapOptions.excludeNegative) {
                            for (var i=0; i<series.dps.length; i++) {
                                if (series.dps[i][1] < 0) {
                                    series.dps[i][1] = 0;
                                }
                            }
                        }

                        var isFilteredOutFn = function(value) {
                            return false;
                        }
                        var tsdbLinkRangeLower = "";
                        var tsdbLinkRangeUpper = "";
                        if ((heatmapOptions.filterLowerBound != null && heatmapOptions.filterLowerBound != "") || (heatmapOptions.filterUpperBound != null && heatmapOptions.filterUpperBound != "")) {
                            if (heatmapOptions.filterUpperBound == null || heatmapOptions.filterUpperBound == "") {
                                try {
                                    var lower = parseInt(heatmapOptions.filterLowerBound);
                                    tsdbLinkRangeLower = lower;
                                    isFilteredOutFn = function(value) {
                                        return value < lower
                                    };
                                }
                                catch (e) {
                                    // ignore
                                }
                            }
                            else if (heatmapOptions.filterLowerBound == null || heatmapOptions.filterLowerBound == "") {
                                try {
                                    var upper = parseInt(heatmapOptions.filterUpperBound);
                                    tsdbLinkRangeUpper = upper;
                                    isFilteredOutFn = function(value) {
                                        return value > upper
                                    };
                                }
                                catch (e) {
                                    // ignore
                                }
                            }
                            else {
                                try {
                                    var lower = parseInt(heatmapOptions.filterLowerBound);
                                    var upper = parseInt(heatmapOptions.filterUpperBound);
                                    tsdbLinkRangeLower = lower;
                                    tsdbLinkRangeUpper = upper;
                                    isFilteredOutFn = function(value) {
                                        return value < lower || value > upper
                                    };
                                }
                                catch (e) {
                                    // ignore
                                }
                            }
                        }

                        // remove old heatmaps..
                        d3.select(divSelector)
                            .selectAll("svg")
                            .remove();

                        var heatmap = renderer.heatmap()
                            .cellSize(cellSize)
                            .scale(d3.scale.quantize())
                            .dps(series.dps)
                            .width(width)
                            .height(height)
                            .colourScheme(heatmapOptions.colourScheme);

                        if (style == "week_day") {
                            heatmap.weekDayRender(divSelector, fromYear, toYear, isFilteredOutFn);
                        }
                        else if (style == "day_hour") {
                            heatmap.dayHourRender(divSelector, fromMonth, toMonth, isFilteredOutFn);
                        }

                        if (heatmapOptions.excludeNegative && true && (tsdbLinkRangeLower == "" || tsdbLinkRangeLower < 0)) {
                            tsdbLinkRangeLower = 0;
                        }
                        var yAxisParams = {
                            range: "[" + tsdbLinkRangeLower + ":" + tsdbLinkRangeUpper + "]"
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
            };
        return renderer;
    }]);