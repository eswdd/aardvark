'use strict';

describe('Aardvark services', function() {
    
    beforeEach(function () {
        jasmine.addMatchers({
            toEqualData: function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var passed = angular.equals(actual, expected);
                        return {
                            pass: passed,
                            message: 'Expected ' + JSON.stringify(actual) + '\nto equal ' + JSON.stringify(expected)
                        };
                    }
                };
            }
        });
    });

    beforeEach(module('Aardvark'));

    describe('serialisation', function () {
    
        it('expects the serialisation factory to exist', inject(function(serialisation) {
            expect(serialisation).toBeDefined();
        }));
        
        it('expects the string paths to be correct', inject(function(serialisation) {
            expect(serialisation.stringPaths).toEqualData([
                {path:"graphs.title.",sep:" "},
                {path:"graphs.gnuplot.yAxisLabel.",sep:" "},
                {path:"graphs.gnuplot.y2AxisLabel.",sep:" "},
                {path:"graphs.gnuplot.yAxisFormat.",sep:" "},
                {path:"graphs.gnuplot.y2AxisFormat.",sep:" "},
                {path:"graphs.gnuplot.yAxisRange.",sep:":"},
                {path:"graphs.gnuplot.y2AxisRange.",sep:":"},
                {path:"graphs.dygraph.yAxisRange.",sep:":"},
                {path:"graphs.dygraph.y2AxisRange.",sep:":"},
                {path:"graphs.scatter.xAxisRange.",sep:":"},
                {path:"graphs.scatter.yAxisRange.",sep:":"},
                {path:"metrics.name.",sep:"."},
                {path:"metrics.tags.name.",sep:"."},
                {path:"metrics.tags.value.",sep:"."}
            ]);
        }));
        
        it('expects the serialisation module to be able to round trip a fully populated model with 5 metrics on 5 graphs in a small amount of space', inject(function(serialisation) {
            var model = {
                global: {
                    absoluteTimeSpecification: false,
                    autoReload: false,
                    autoGraphHeight: true,
                    relativePeriod: "2h",
                    minGraphHeight: 300
                },
                graphs: [
                    {
                        id: "1462986273911",
                        type: "debug",
                        title: "Graph 1"
                    },
                    {
                        id: "1462986273912",
                        type: "gnuplot",
                        title: "Graph 2",
                        gnuplot: {
                            y1AxisLabel: "",
                            y2AxisLabel: "",
                            y1AxisFormat: "lines",
                            y2AxisFormat: "linespoints",
                            y1AxisRange: "[0:]",
                            y2AxisRange: "[1:]",
                            y1AxisLogScale: true,
                            y2AxisLogScale: false,
                            showKey: true,
                            keyBox: false,
                            lineSmoothing: true,
                            keyAlignment: "horizontal",
                            keyLocation: "bottom right"
                        }
                    },
                    {
                        id: "1462986273913",
                        type: "horizon",
                        title: "Graph 3",
                        horizon: {
                            interpolateGaps: true,
                            squashNegative: true
                        }
                    },
                    {
                        id: "1462986273914",
                        type: "dygraph",
                        title: "Graph 4",
                        dygraph: {
                            interpolateGaps: true,
                            highlightLines: true,
                            stackedLines: true,
                            y1SquashNegative: true,
                            y1AutoScale: true,
                            y1Log: false,
                            meanAdjusted: true,
                            ratioGraph: false,
                            countFilter: {
                                end: "top",
                                count: "5",
                                measure: "max"
                            },
                            valueFilter: {
                                lowerBound: "200",
                                upperBound: "500",
                                measure: "any"
                            },
                            annotations: true
                        }
                    },
                    {
                        id: "1462986273915",
                        type: "scatter",
                        title: "Graph 5",
                        scatter: {
                        }
                    }
                    
                ],
                metrics: [
                    {
                        id: "1462986273911",
                        name: "cpu.percent",
                        tags: [],
                        graphOptions: {
                            graphId: "1462986273911",
                            rate: true,
                            rateCounter: false,
                            rateCounterReset: "",
                            rateCounterMax: "",
                            axis: "x1y2",
                            aggregator: "sum",
                            downsample: true,
                            downsampleBy: "avg",
                            downsampleTo: "2m"
                        }
                    },
                    {
                        id: "1462986273912",
                        name: "cpu.interrupts",
                        tags: [{name:"host",value:"*"}],
                        graphOptions: {
                            graphId: "1462986273912",
                            rate: true,
                            rateCounter: true,
                            rateCounterReset: 1234,
                            rateCounterMax: 12345,
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: ""
                        }
                    },
                    {
                        id: "1462986273913",
                        name: "some.app.metric1",
                        tags: [{name:"host",value:"host1|host2"}],
                        graphOptions: {
                            graphId: "1462986273913",
                            rate: false,
                            rateCounter: false,
                            rateCounterReset: "",
                            rateCounterMax: "",
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: ""
                        }
                    },
                    {
                        id: "1462986273914",
                        name: "some.app.metric2",
                        tags: [{name:"host",value:"host1"},{name:"type",value:"in|out"}],
                        graphOptions: {
                            graphId: "1462986273914",
                            rate: false,
                            rateCounter: false,
                            rateCounterReset: "",
                            rateCounterMax: "",
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: "",
                            dygraph:{drawLines:false,drawPoints:false}
                        }
                    },
                    {
                        id: "1462986273915",
                        name: "some.app.metric3",
                        tags: [{name:"host",value:""}],
                        graphOptions: {
                            graphId: "1462986273915",
                            rate: true,
                            rateCounter: true,
                            rateCounterReset: 1234,
                            rateCounterMax: 12345,
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: ""
                        }
                    }
                ]
            };
            // tag had value "" which won't be serialised
            // todo: need to get this down to 460
            checkRoundTrips(serialisation, model, 477, function(model) {
                model.metrics[4].tags = [];
                // defaults
                for (var m=0; m<model.metrics.length; m++) {
                    for (var t=0; t<model.metrics[m].tags.length; t++) {
                        if (model.metrics[m].tags[t].groupBy == null) {
                            model.metrics[m].tags[t].groupBy = true;
                        }
                    }
                }
                model.global.globalDownsampling = false;
                model.global.baselining = false;
    //            model.graphs[1].gnuplot.style = "linespoint";
                model.graphs[1].gnuplot.globalAnnotations = false;
                model.graphs[3].dygraph.annotations = true;
                model.graphs[3].dygraph.globalAnnotations = false;
                model.graphs[3].dygraph.y1AxisRange = "[:]";
                model.graphs[3].dygraph.y2AxisRange = "[:]";
                model.graphs[3].dygraph.y2SquashNegative = false;
                model.graphs[3].dygraph.y2AutoScale = false;
                model.graphs[3].dygraph.y2Log = false;
                model.graphs[4].scatter.swapAxes = false;
                model.graphs[4].scatter.xlog = false;
                model.graphs[4].scatter.ylog = false;
                model.graphs[4].scatter.xSquashNegative = false;
                model.graphs[4].scatter.ySquashNegative = false;
                model.graphs[4].scatter.xRange = "[:]";
                model.graphs[4].scatter.yRange = "[:]";
            });  // http://aardvark/# = 23 bytes - allow 17 for fqdn suffix
        }));
        
        it('expects the serialisation module to be able to round an absolute time specification with an open end - issue #158', inject(function(serialisation) {
            var model = {
                global: {
                    absoluteTimeSpecification: true,
                    fromDate:"2016/10/11",
                    fromTime:"10:11:12",
                    toDate:"",
                    toTime:"",
                    autoReload: false,
                    autoGraphHeight: true,
                    minGraphHeight: 300
                },
                graphs: [],
                metrics: []
            };
            checkRoundTrips(serialisation, model, 460, function(model) {
                model.global.globalDownsampling = false;
                model.global.baselining = false;
            });  // http://aardvark/# = 23 bytes - allow 17 for fqdn suffix
        }));
        
        it('expects the serialisation module to be able to round trip a fully populated model with 5 metrics on 2 graphs in a small amount of space', inject(function(serialisation) {
            var model = {
                global: {
                    absoluteTimeSpecification: false,
                    autoReload: false,
                    autoGraphHeight: true,
                    relativePeriod: "2h",
                    minGraphHeight: 300
                },
                graphs: [
                    {
                        id: "1462986273912",
                        type: "gnuplot",
                        title: "Graph 2",
                        gnuplot: {
                            y1AxisLabel: "",
                            y2AxisLabel: "",
                            y1AxisFormat: "lines",
                            y2AxisFormat: "linespoints",
                            y1AxisRange: "[0:]",
                            y2AxisRange: "[1:]",
                            y1AxisLogScale: true,
                            y2AxisLogScale: false,
                            showKey: true,
                            keyBox: false,
                            lineSmoothing: true,
                            keyAlignment: "horizontal",
                            keyLocation: "bottom right"
                        }
                    },
                    {
                        id: "1462986273914",
                        type: "dygraph",
                        title: "Graph 4",
                        dygraph: {
                            interpolateGaps: true,
                            highlightLines: true,
                            stackedLines: true,
                            y1SquashNegative: true,
                            y1AutoScale: true,
                            y1Log: false,
                            y1AxisRange: "[1:2]",
                            y2SquashNegative: false,
                            y2AutoScale: false,
                            y2Log: true,
                            y2AxisRange: "[2:3]",
                            meanAdjusted: true,
                            ratioGraph: false,
                            countFilter: {
                                end: "top",
                                count: "5",
                                measure: "max"
                            },
                            valueFilter: {
                                lowerBound: "200",
                                upperBound: "500",
                                measure: "any"
                            },
                            annotations: true
                        }
                    },
                    {
                        id: "1462986273915",
                        type: "scatter",
                        title: "Graph 5",
                        scatter: {
                        }
                    }
                    
                ],
                metrics: [
                    {
                        id: "1462986273911",
                        name: "cpu.percent",
                        tags: [],
                        graphOptions: {
                            graphId: "1462986273912",
                            rate: true,
                            rateCounter: false,
                            rateCounterReset: "",
                            rateCounterMax: "",
                            axis: "x1y2",
                            aggregator: "sum",
                            downsample: true,
                            downsampleBy: "avg",
                            downsampleTo: "2m"
                        }
                    },
                    {
                        id: "1462986273912",
                        name: "cpu.interrupts",
                        tags: [{name:"host",value:"*"}],
                        graphOptions: {
                            graphId: "1462986273912",
                            rate: true,
                            rateCounter: true,
                            rateCounterReset: 1234,
                            rateCounterMax: 12345,
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: ""
                        }
                    },
                    {
                        id: "1462986273913",
                        name: "some.app.metric1",
                        tags: [{name:"host",value:"host1|host2"}],
                        graphOptions: {
                            graphId: "1462986273912",
                            rate: false,
                            rateCounter: false,
                            rateCounterReset: "",
                            rateCounterMax: "",
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: ""
                        }
                    },
                    {
                        id: "1462986273914",
                        name: "some.app.metric2",
                        tags: [{name:"host",value:"host1"},{name:"type",value:"in|out"}],
                        graphOptions: {
                            graphId: "1462986273914",
                            rate: false,
                            rateCounter: false,
                            rateCounterReset: "",
                            rateCounterMax: "",
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: "",
                            dygraph:{drawLines:true,drawPoints:false}
                        }
                    },
                    {
                        id: "1462986273915",
                        name: "some.app.metric3",
                        tags: [{name:"host",value:""}],
                        graphOptions: {
                            graphId: "1462986273914",
                            rate: true,
                            rateCounter: true,
                            rateCounterReset: 1234,
                            rateCounterMax: 12345,
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "",
                            downsampleTo: "",
                            dygraph:{drawLines:true,drawPoints:false}
                        }
                    }
                ]
            };
            // todo: need to get this down to 460
            // tag had value "" which won't be serialised
            checkRoundTrips(serialisation, model, 521, function(model) {
                model.metrics[4].tags = [];
                // defaults
                for (var m=0; m<model.metrics.length; m++) {
                    for (var t=0; t<model.metrics[m].tags.length; t++) {
                        if (model.metrics[m].tags[t].groupBy == null) {
                            model.metrics[m].tags[t].groupBy = true;
                        }
                    }
                }
                model.global.globalDownsampling = false;
                model.global.baselining = false;
                model.graphs[0].gnuplot.globalAnnotations = false;
                model.graphs[1].dygraph.globalAnnotations = false;
                model.graphs[1].dygraph.y1Log = false;
                model.graphs[2].scatter.swapAxes = false;
                model.graphs[2].scatter.xlog = false;
                model.graphs[2].scatter.ylog = false;
                model.graphs[2].scatter.xSquashNegative = false;
                model.graphs[2].scatter.ySquashNegative = false;
                model.graphs[2].scatter.xRange = "[:]";
                model.graphs[2].scatter.yRange = "[:]";
            });  // http://aardvark/# = 23 bytes - allow 17 for fqdn suffix
        }));
        
        var checkRoundTrips = function(serialisation, model, maxLength, modelFixPostSerialisation) {
            var serialised = serialisation.serialise(model);
            // less than or equals
            expect(serialised.length).toBeLessThan(maxLength+1); 
            var deserialised = serialisation.deserialise(serialised);
    
            // fix the model to what we expect
            serialisation.compactIds(model);
            if (modelFixPostSerialisation != null) {
                modelFixPostSerialisation(model);
            }
    
            // don't care about any other component, plus it's easier to debug individual bits
            expect(deserialised.global).toEqualData(model.global);
            expect(deserialised.graphs.length).toEqualData(model.graphs.length);
            for (var g=0; g<model.graphs.length; g++) {
                expect(deserialised.graphs[g]).toEqualData(model.graphs[g]);
            }
            expect(deserialised.metrics.length).toEqualData(model.metrics.length);
            for (var m=0; m<model.metrics.length; m++) {
                expect(deserialised.metrics[m]).toEqualData(model.metrics[m]);
            }
        }
    
        it('expects the serialisation module to be able to round trip a model using absolute from and to time - strings', inject(function(serialisation) {
            var fromDate = "2016/01/01";
            var fromTime = "12:34:22";
            var toDate = "2016/06/10";
            var toTime = "09:10:55";
            var model = {
                global: {
                    absoluteTimeSpecification: true,
                    autoReload: false,
                    fromDate: "2016/01/01",
                    fromTime: "12:34:22",
                    toDate: "2016/06/10",
                    toTime: "09:10:55"
                },
                graphs: [],
                metrics: []
            };
            checkRoundTrips(serialisation, model, 470, function(model) { 
                model.global.fromDate = fromDate;  
                model.global.fromTime = fromTime;  
                model.global.toDate = toDate;  
                model.global.toTime = toTime;
                // defaults
                model.global.autoGraphHeight = false;
                model.global.graphHeight = null;
                model.global.globalDownsampling = false;
                model.global.baselining = false;
            });
        }));
    
        it('expects the serialisation module to be able to round trip a model using absolute from time - strings', inject(function(serialisation) {
            var fromDate = "2016/01/01";
            var fromTime = "12:34:22";
            var model = {
                global: {
                    absoluteTimeSpecification: true,
                    autoReload: true,
                    autoReloadPeriod: 10,
                    fromDate: "2016/01/01",
                    fromTime: "12:34:22"
                },
                graphs: [],
                metrics: []
            };
            checkRoundTrips(serialisation, model, 470, function(model) {
                model.global.fromDate = fromDate;
                model.global.fromTime = fromTime;
                // defaults
                model.global.autoGraphHeight = false;
                model.global.graphHeight = null;
                model.global.globalDownsampling = false;
                model.global.baselining = false;
            });
        }));
    
        it('expects the serialisation module to be able to round trip a model using baselining with relative datum', inject(function(serialisation) {
            var model = {
                global: {
                    absoluteTimeSpecification: false,
                    relativePeriod: "2h",
                    baselining: true,
                    baselineDatumStyle: "relative",
                    baselineRelativePeriod: "2d"
                },
                graphs: [],
                metrics: []
            };
            checkRoundTrips(serialisation, model, 470, function(model) {
                // defaults
                model.global.autoReload = false;
                model.global.autoGraphHeight = false;
                model.global.graphHeight = null;
                model.global.globalDownsampling = false;
            });
        }));
    
        it('expects the serialisation module to be able to round trip a model using baselining with from datetime datum', inject(function(serialisation) {
            var fromDate = "2016/01/01";
            var fromTime = "12:34:22";
            var model = {
                global: {
                    absoluteTimeSpecification: false,
                    relativePeriod: "2h",
                    baselining: true,
                    baselineDatumStyle: "from",
                    baselineFromDate: fromDate,
                    baselineFromTime: fromTime
                },
                graphs: [],
                metrics: []
            };
            checkRoundTrips(serialisation, model, 470, function(model) {
                model.global.baselineFromDate = fromDate;
                model.global.baselineFromTime = fromTime;
                // defaults
                model.global.autoReload = false;
                model.global.autoGraphHeight = false;
                model.global.graphHeight = null;
                model.global.globalDownsampling = false;
            });
        }));
    
        it('expects the serialisation module to be able to round trip a model using baselining with to datetime datum', inject(function(serialisation) {
            var toDate = "2016/01/01";
            var toTime = "12:34:22";
            var model = {
                global: {
                    absoluteTimeSpecification: false,
                    relativePeriod: "2h",
                    baselining: true,
                    baselineDatumStyle: "to",
                    baselineToDate: toDate,
                    baselineToTime: toTime
                },
                graphs: [],
                metrics: []
            };
            checkRoundTrips(serialisation, model, 470, function(model) {
                model.global.baselineToDate = toDate;
                model.global.baselineToTime = toTime;
                // defaults
                model.global.autoReload = false;
                model.global.autoGraphHeight = false;
                model.global.graphHeight = null;
                model.global.globalDownsampling = false;
            });
        }));
    
        it('expects the serialisation module to be able to round trip a model using global downsampling and metric downsample functions', inject(function(serialisation) {
            var toDate = "2016/01/01";
            var toTime = "12:34:22";
            var model = {
                global: {
                    absoluteTimeSpecification: false,
                    relativePeriod: "2h",
                    baselining: false,
                    globalDownsampling: true,
                    globalDownsampleTo: "1h"
                    
                },
                graphs: [
                    {
                        id: "1462986273915",
                        type: "scatter",
                        title: "Graph 5",
                        scatter: {
                        }
                    }
                ],
                metrics: [
                    {
                        id: "1462986273912",
                        name: "cpu.interrupts",
                        tags: [{name:"host",value:"*",groupBy:true}],
                        graphOptions: {
                            graphId: "1462986273915",
                            rate: true,
                            rateCounter: true,
                            rateCounterReset: 1234,
                            rateCounterMax: 12345,
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "avg"
                        }
                    },
                    {
                        id: "1462986273913",
                        name: "some.app.metric1",
                        tags: [{name:"host",value:"host1|host2",groupBy:true}],
                        graphOptions: {
                            graphId: "1462986273915",
                            rate: false,
                            rateCounter: false,
                            rateCounterReset: "",
                            rateCounterMax: "",
                            aggregator: "sum",
                            downsample: false,
                            downsampleBy: "sum"
                        }
                    }
                ]
            };
            checkRoundTrips(serialisation, model, 470, function(model) {
                // defaults
                model.global.autoReload = false;
                model.global.autoGraphHeight = false;
                model.global.graphHeight = null;
                model.graphs[0].scatter.swapAxes = false;
                model.graphs[0].scatter.xlog = false;
                model.graphs[0].scatter.ylog = false;
                model.graphs[0].scatter.xSquashNegative = false;
                model.graphs[0].scatter.ySquashNegative = false;
                model.graphs[0].scatter.xRange = "[:]";
                model.graphs[0].scatter.yRange = "[:]";
                model.metrics[0].graphOptions.downsample = false;
                model.metrics[1].graphOptions.downsample = false;
            });
        }));
    

    });
});