aardvark
    .factory('GnuplotRenderer', ['GraphServices', '$http', '$uibModal', 'tsdbClient', 'tsdbUtils', function(graphServices, $http, $uibModal, tsdbClient, tsdbUtils) {
        var renderer = {
            create: function() {
                var tsdbRendererLink = function(renderContext, path, config, global, graph, metrics, addIgnore) {

                    var yAxisParams = {};
                    var y2AxisParams = {};
                    var keyParams = null;
                    var lineSmoothing = false;
                    var style = null;
                    var globalAnnotations = null;

                    if (graph.gnuplot != null) {
                        // yAxisParams
                        if (graph.gnuplot.y1AxisLabel != null && graph.gnuplot.y1AxisLabel != "") {
                            yAxisParams.label = graph.gnuplot.y1AxisLabel;
                        }
                        if (graph.gnuplot.y1AxisFormat != null && graph.gnuplot.y1AxisFormat != "") {
                            yAxisParams.format = graph.gnuplot.y1AxisFormat;
                        }
                        if (graph.gnuplot.y1AxisRange != null && graph.gnuplot.y1AxisRange != "") {
                            yAxisParams.range = graph.gnuplot.y1AxisRange;
                        }
                        yAxisParams.logscale = graph.gnuplot.y1AxisLogScale != null && graph.gnuplot.y1AxisLogScale;

                        // y2AxisParams
                        if (graph.gnuplot.y2AxisLabel != null && graph.gnuplot.y2AxisLabel != "") {
                            y2AxisParams.label = graph.gnuplot.y2AxisLabel;
                        }
                        if (graph.gnuplot.y2AxisFormat != null && graph.gnuplot.y2AxisFormat != "") {
                            y2AxisParams.format = graph.gnuplot.y2AxisFormat;
                        }
                        if (graph.gnuplot.y2AxisRange != null && graph.gnuplot.y2AxisRange != "") {
                            y2AxisParams.range = graph.gnuplot.y2AxisRange;
                        }
                        y2AxisParams.logscale = graph.gnuplot.y2AxisLogScale != null && graph.gnuplot.y2AxisLogScale;

                        // keyParams
                        if (graph.gnuplot.showKey != null && (graph.gnuplot.showKey == true)) {
                            var keyLocation = graph.gnuplot.keyLocation;
                            switch (keyLocation) {
                                case 'out top left':
                                case 'out top center':
                                case 'out top right':
                                case 'top left':
                                case 'top center':
                                case 'top right':
                                case 'out center left':
                                case 'center left':
                                case 'center':
                                case 'center right':
                                case 'out center right':
                                case 'bottom left':
                                case 'bottom center':
                                case 'bottom right':
                                case 'bottom top left':
                                case 'bottom top center':
                                case 'bottom top right':
                                    break;
                                default:
                                    renderContext.renderWarnings[graph.id] = "Invalid key location specified '"+keyLocation+"', defaulting to top left";
                                    keyLocation = 'top left';
                            }
                            keyParams = {
                                keyLocation: keyLocation,
                                keyAlignment: graph.gnuplot.keyAlignment,
                                keyBox: graph.gnuplot.keyBox != null && graph.gnuplot.keyBox
                            }
                        }

                        // smoothing
                        lineSmoothing = graph.gnuplot.lineSmoothing != null && graph.gnuplot.lineSmoothing;

                        // style
                        if (graph.gnuplot.style != null && graph.gnuplot.style != "") {
                            style = graph.gnuplot.style;
                        }

                        // global annotations
                        globalAnnotations = graph.gnuplot.globalAnnotations;
                    }

                    return graphServices.tsdbGraphUrl(path, renderContext, config, global, graph, metrics, /*forceAxis*/null, /*downsampleOverrideFn*/null, yAxisParams, y2AxisParams, keyParams, lineSmoothing, style, globalAnnotations, addIgnore);
                };
                var ret = {
                    type: "gnuplot",
                    supports_tsdb_export: true,
                    supports_grafana_export: false,
                    tsdb_export_link: "",
                    grafana_export_text: ""
                };
                ret.render = function(renderContext, config, global, graph, metrics) {
                    if (renderContext.renderedContent[graph.id] == null) {
                        renderContext.renderedContent[graph.id] = { src: "", width: 0, height: 0 };
                    }
                    renderContext.renderMessages[graph.id] = "Loading...";
                    ret.tsdb_export_link = "";

                    var url = tsdbRendererLink(renderContext, "/q?", config, global, graph, metrics, true);

                    if (url != null) {
                        url += "&png";

                        var width = Math.floor(graph.graphWidth);
                        var height = Math.floor(graph.graphHeight);

                        url += "&wxh="+width+"x"+height;

                        renderContext.renderedContent[graph.id] = { src: url, width: width, height: height };
                        ret.tsdb_export_link = tsdbRendererLink(renderContext, "/#", config, global, graph, metrics, false);
                    }
                }
                return ret;
            }
        };
        return renderer;
    }]);