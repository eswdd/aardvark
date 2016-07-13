'use strict';

describe('AardvarkServices.serialisation', function() {
    
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
                        yAxisLabel: "",
                        y2AxisLabel: "",
                        yAxisFormat: "lines",
                        y2AxisFormat: "linespoints",
                        yAxisRange: "[0:]",
                        y2AxisRange: "[1:]",
                        yAxisLogScale: true,
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
                        squashNegative: true,
                        autoScale: true,
                        ylog: false,
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
                        }
                    }
                },
                {
                    id: "1462986273915",
                    type: "scatter",
                    title: "Graph 5",
                    scatter: {
                        excludeNegative: true
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
                        rightAxis: true,
                        aggregator: "sum",
                        downsample: true,
                        downsampleBy: "avg",
                        downsampleTo: "2m",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: {
                            axis: "y"
                        }
                    }
                }
            ]
        };
        // tag had value "" which won't be serialised
        checkRoundTrips(serialisation, model, 460, function(model){model.metrics[4].tags = [];});  // http://aardvark/# = 23 bytes - allow 17 for fqdn suffix
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
                        yAxisLabel: "",
                        y2AxisLabel: "",
                        yAxisFormat: "lines",
                        y2AxisFormat: "linespoints",
                        yAxisRange: "[0:]",
                        y2AxisRange: "[1:]",
                        yAxisLogScale: true,
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
                        squashNegative: true,
                        autoScale: true,
                        ylog: false,
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
                        }
                    }
                },
                {
                    id: "1462986273915",
                    type: "scatter",
                    title: "Graph 5",
                    scatter: {
                        excludeNegative: true
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
                        rightAxis: true,
                        aggregator: "sum",
                        downsample: true,
                        downsampleBy: "avg",
                        downsampleTo: "2m",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
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
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: {
                            axis: "y"
                        }
                    }
                }
            ]
        };
        // todo: need to get this down to 460
        // tag had value "" which won't be serialised
        checkRoundTrips(serialisation, model, 475, function(model){model.metrics[4].tags = [];});  // http://aardvark/# = 23 bytes - allow 17 for fqdn suffix
    }));
    
    var checkRoundTrips = function(serialisation, model, maxLength, modelFixPostSerialisation) {
        var serialised = serialisation.serialise(model);
        expect(serialised.length).toBeLessThan(maxLength); 
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

    it('expects the serialisation module to be able to round trip a model using absolute time - strings', inject(function(serialisation) {
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
        });
    }));

    it('expects the serialisation module to be able to round trip a model using absolute time - strings', inject(function(serialisation) {
        var fromDate = "2016/01/01";
        var fromTime = "12:34:22";
        var model = {
            global: {
                absoluteTimeSpecification: true,
                autoReload: true,
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
        });
    }));
    

});