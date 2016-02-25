'use strict';

/* jasmine specs for controllers go here */
describe('Otis controllers', function () {

    beforeEach(function () {
        this.addMatchers({
            toEqualData: function (expected) {
                return angular.equals(this.actual, expected);
            }
        });
    });

    beforeEach(module('Otis'));

    describe('OtisCtrl', function () {
        var rootScope, scope, ctrl, $httpBackend, browser, location, controllerCreator;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $browser, $location, $controller) {
            $httpBackend = _$httpBackend_;
            $httpBackend.expectGET('/otis/config').respond({key: "value"});
            browser = $browser;
            location = $location;
            controllerCreator = $controller;

            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();
            ctrl = $controller('OtisCtrl', {$scope: scope, $rootScope: rootScope});
        }));


        it('should create a default model and initialise the config on initialisation', function () {
            expect(rootScope.model).toEqualData({
                graphs: [],
                metrics: []
            });
            $httpBackend.flush();

            expect(rootScope.config).toEqualData({
                key: "value"
            });
        });


        it('should create re-request the config and call listeners when config update is requested', function () {
            $httpBackend.flush();

            expect(rootScope.config).toEqualData({
                key: "value"
            });

            var configReceived = false;
            rootScope.onConfigUpdate(function () {
                configReceived = true;
            });

            // we should get a second get call when we ask the config to update
            $httpBackend.expectGET('/otis/config').respond({key: "value"});
            rootScope.updateConfig();
            $httpBackend.flush();
            expect(configReceived).toEqualData(true);
        });


        it('should save the model to the location hash when requested', function () {

            expect(rootScope.model).toEqualData({
                graphs: [],
                metrics: []
            });

            rootScope.model = {
                graphs: [],
                metrics: [
                    {
                        id: "1",
                        name: "fred"
                    }
                ]
            };
            rootScope.saveModel();

//            browser.poll();
            expect(location.url()).toEqualData('#'+encodeURI('{"graphs":[],"metrics":[{"id":"1","name":"fred"}]}'));
        });


        it('should should correctly rehydrate the model from the hash', function () {
            // recreate the controller now we've changed the hash
            location.hash(encodeURI('{"metrics":[{"id":"1","name": "fred"}]}'));
//            browser.poll();
            ctrl = controllerCreator('OtisCtrl', {$scope: scope, $rootScope: rootScope});

            expect(rootScope.model).toEqualData(
                { metrics : [ { id : '1', name : 'fred' } ] }
            );
        });


    });

    describe('GraphControlCtrl', function() {
        var rootScope, scope;
        var configUpdateFunc;
        var saveModelCalled, saveModelRenderArg;

        beforeEach(inject(function ($rootScope, $controller) {
            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }
            rootScope.saveModel = function(render) {
                saveModelCalled = true;
                saveModelRenderArg = render;
            }
            saveModelCalled = false;
            saveModelRenderArg = false;
            rootScope.model = { graphs: [], metrics: [] };
            rootScope.graphTypes = [ "unittest1", "unittest2" ];

            $controller('GraphControlCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        it('should deep clone correctly', function() {
            var orig = [
                {
                    a: ["a","b","c"],
                    e: {
                        f: "g"
                    }
                },
                [
                    "h"
                ],
                [
                    {
                        i: "j",
                        k: []
                    }
                ],
                3
            ];
            var clone = scope.deepClone(orig);
            expect(clone).toEqualData(orig);
            expect(clone == orig).toEqualData(false);
        });

        it('should create a single graph on initialisation if none exist', function () {
            configUpdateFunc();

            expect(scope.graphs).toEqualData([
                {
                    id: scope.lastGraphId+"",
                    title: "Graph 1",
                    type: null,
                    showTitle: true,
                    graphWidth: 0,
                    graphHeight: 0,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
            expect(rootScope.model.graphs).toEqualData(scope.graphs);
        });

        it('should set the graph type when creating a graph on initialisation if only one type is defined', function () {
            rootScope.graphTypes = [ "unittest1" ];

            configUpdateFunc();

            expect(scope.graphs).toEqualData([
                {
                    id: scope.lastGraphId+"",
                    title: "Graph 1",
                    type: "unittest1",
                    showTitle: true,
                    graphWidth: 0,
                    graphHeight: 0,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
            expect(rootScope.model.graphs).toEqualData(scope.graphs);
        });

        it('should load the existing model on initialisation', function () {

            //todo: m2: we should 'fix' model with new defaults?
            rootScope.model.graphs = [
                {
                    id: "1234",
                    title: "Graph 1",
                    type: null,
                    showTitle: true
                }
            ];

            configUpdateFunc();

            expect(scope.lastGraphId).toEqualData(1234);
            expect(scope.graphs).toEqualData(rootScope.model.graphs);
        });

        it('should add a new graph to the model with a default title when the addGraph() function is called', function () {

            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    showTitle: true,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);

            scope.addGraph();

            var secondId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    showTitle: true,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: null,
                    showTitle: true,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
        });

        it('should set the graph type on new graphs if there is only one type defined', function () {
            rootScope.graphTypes = [ "unittest1" ];

            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "unittest1",
                    showTitle: true,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);

            scope.addGraph();

            var secondId = scope.lastGraphId+"";
            expect(scope.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "unittest1",
                    showTitle: true,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: "unittest1",
                    showTitle: true,
                    gnuplot: {
                        yAxisRange: "[0:]",
                        y2AxisRange: "[0:]",
                        showKey: true,
                        keyAlignment: "columnar",
                        keyLocation: "top left",
                        keyBox: true
                    }
                }
            ]);
        });

        it('should request rendering when saving changes', function () {
            scope.renderGraphs();
            expect(saveModelCalled).toEqualData(true);
            expect(saveModelRenderArg).toEqualData(true);
        });

        it('should persist internal graphs to the model when saving changes', function () {
            expect(rootScope.model.graphs).toEqualData([]);
            scope.addGraph();
            scope.renderGraphs();
            expect(saveModelCalled).toEqualData(true);
            expect(rootScope.model.graphs.length).toEqualData(1);
        });

        it('should remove a graph from the model when requested', function () {
            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(scope.graphs.length).toEqualData(1);

            scope.deleteGraph(firstId);

            expect(scope.graphs).toEqualData([]);
        });

        it("should not remove a graph if it can't be found", function () {
            scope.addGraph();

            expect(scope.graphs.length).toEqualData(1);

            scope.deleteGraph("0");
            expect(scope.graphs.length).toEqualData(1);
        });

        it('should not create new graphs with an existing id', function () {
            scope.addGraph();

            var firstId = scope.lastGraphId+"";

            scope.addGraph();

            var secondId = scope.lastGraphId+"";

            expect(firstId == secondId).toEqualData(false);
        });

        //todo: m2: move id generation to a service
        it('should generate unique ids', function () {
            scope.timeInMillis = function() {
                return 0;
            }

            var firstId = scope.nextId();
            var secondId = scope.nextId();
            expect(firstId == secondId).toEqualData(false);
        });

        it('should control the accordion appropriately when adding / removing graphs', function() {
            expect(scope.isOpen).toEqualData({});
            scope.addGraph();
            var id1 = scope.lastGraphId + "";

            expect(scope.isOpen[id1]).toEqualData(true);

            scope.addGraph();
            var id2 = scope.lastGraphId + "";

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(true);

            scope.addGraph();
            var id3 = scope.lastGraphId + "";

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(false);
            expect(scope.isOpen[id3]).toEqualData(true);

            scope.deleteGraph(id3);

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(true);
            expect(scope.isOpen[id3]).toEqualData(false);

            scope.deleteGraph(id1);

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(true);
            expect(scope.isOpen[id3]).toEqualData(false);

            scope.deleteGraph(id2);

            expect(scope.isOpen[id1]).toEqualData(false);
            expect(scope.isOpen[id2]).toEqualData(false);
            expect(scope.isOpen[id3]).toEqualData(false);
        });


    });

    describe('GraphCtrl', function() {
        var rootScope, $httpBackend, scope;
        var globals, graphs, metricss;
        var configUpdateFunc;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $controller) {
            // hmm
            rootScope = $rootScope;
            $httpBackend = _$httpBackend_;
            scope = $rootScope.$new();
            globals = [];
            graphs = [];
            metricss = [];

            scope.renderers = {};
            scope.renderers["unittest"] = function(global,graph,metrics) {
                globals.push(global);
                graphs.push(graph);
                metricss.push(metrics);
            }

            rootScope.model = {
                graphs: [],
                metrics: []
            }

            rootScope.formEncode = function(val) {
                var ret = val.replace(" ","+");
                if (ret != val) {
                    return rootScope.formEncode(ret);
                }
                return ret;
            }

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }

            $controller('GraphCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        it('should define the renderGraphs function on the rootScope', function() {
            var defined = false;
            if (rootScope.renderGraphs) {
                defined = true;
            }
            expect(defined).toEqualData(true);
        });

        it('should call the correct renderer when a graph with the correct type is defined', function() {
            var graph = { id: "abc", type: "unittest" };
            var notGraph = { id: "def", type: "something" };
            var incMetric = { id: "123", graphOptions: { graphId: "abc" }};
            var excMetric = { id: "456", graphOptions: { graphId: "def" }};
            rootScope.model.graphs = [ graph, notGraph ];
            rootScope.model.metrics = [ incMetric, excMetric ];

            rootScope.renderGraphs();

            expect(graphs).toEqualData([graph]);
            expect(metricss).toEqualData([[incMetric]]);
        });

        // ---------- tsdb helper functions ------

        var objectLength = function(obj) {
            var count = 0;
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    count++;
                }
            }
            return count;
        }

        var test_tsdb_distinctGraphLines = function(metric, expectHttpRequests, expectationsFn) {
            var callBackComplete = false;
            var graphLines = {};
            scope.tsdb_distinctGraphLines(metric, function(m) {
                graphLines = m;
                callBackComplete = true;
            });
            if (expectHttpRequests) {
                $httpBackend.flush();
            }
            waitsFor(function () {
                return callBackComplete;
            }, "callback completed", 1000);
            runs(function() {
                expectationsFn(graphLines);
            });
        }

        it('should callback with a single entry when getting lines for a metric with no tags', function () {
            test_tsdb_distinctGraphLines({name:"some.metric", tags: [], graphOptions: {}}, false, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(1);
            });
        });

        it('should callback with two entries when getting lines for a metric with a single tag with two possible values', function () {
            $httpBackend.expectGET('/otis/tags?metric=some.metric').respond({host: ["host1", "host2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(2);
                expect(graphLines["some.metric{host=host1}"]).toEqualData({host: "host1"});
                expect(graphLines["some.metric{host=host2}"]).toEqualData({host: "host2"});
            });
        });

        it('should callback with four entries when getting lines for a metric with a two tags each with two possible values', function () {
            $httpBackend.expectGET('/otis/tags?metric=some.metric').respond({host: ["host1", "host2"], type: ["type1", "type2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}, {name: "type", value: "*"}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(4);
                expect(graphLines["some.metric{host=host1,type=type1}"]).toEqualData({host: "host1", type: "type1"});
                expect(graphLines["some.metric{host=host1,type=type2}"]).toEqualData({host: "host1", type: "type2"});
                expect(graphLines["some.metric{host=host2,type=type1}"]).toEqualData({host: "host2", type: "type1"});
                expect(graphLines["some.metric{host=host2,type=type2}"]).toEqualData({host: "host2", type: "type2"});
            });
        });

        it('should callback with four entries when getting lines for a metric with one tag with two possible values and the other with three, but only two selected', function () {
            $httpBackend.expectGET('/otis/tags?metric=some.metric').respond({host: ["host1", "host2"], type: ["type1", "type2", "type2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}, {name: "type", value: "type1|type2"}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(4);
                expect(graphLines["some.metric{type=type1,host=host1}"]).toEqualData({host: "host1", type: "type1"});
                expect(graphLines["some.metric{type=type2,host=host1}"]).toEqualData({host: "host1", type: "type2"});
                expect(graphLines["some.metric{type=type1,host=host2}"]).toEqualData({host: "host2", type: "type1"});
                expect(graphLines["some.metric{type=type2,host=host2}"]).toEqualData({host: "host2", type: "type2"});
            });
        });

        it('should callback with four entries when getting lines for a metric with a two tags each with two possible values, one tag with a fixed single value and one tag with no value', function () {
            $httpBackend.expectGET('/otis/tags?metric=some.metric').respond({host: ["host1", "host2"], type: ["type1", "type2"], direction: ["in","out"], application: ["app1","app2"]});

            test_tsdb_distinctGraphLines({name:"some.metric", tags: [{name: "host", value: "*"}, {name: "type", value: "*"}, {name: "direction", value: "in"}, {name: "application", value: ""}], graphOptions: {}}, true, function(graphLines) {
                expect(objectLength(graphLines)).toEqualData(4);
                expect(graphLines["some.metric{direction=in,host=host1,type=type1}"]).toEqualData({host: "host1", type: "type1", direction: "in"});
                expect(graphLines["some.metric{direction=in,host=host1,type=type2}"]).toEqualData({host: "host1", type: "type2", direction: "in"});
                expect(graphLines["some.metric{direction=in,host=host2,type=type1}"]).toEqualData({host: "host2", type: "type1", direction: "in"});
                expect(graphLines["some.metric{direction=in,host=host2,type=type2}"]).toEqualData({host: "host2", type: "type2", direction: "in"});
            });
        });

        // ---------- gnuplot rendering ----------

        it('should report an error when trying to render with gnuplot and no start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 0, graphHeight: 0 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc: { src : '', width : 0, height : 0 }});
            expect(scope.renderErrors).toEqualData({abc:"No start date specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with gnuplot and no metrics', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{ src : '', width : 0, height : 0 }});
            expect(scope.renderErrors).toEqualData({abc:"No metrics specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should report an error when trying to render with gnuplot and an unsupported axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, graphOptions: { axis: "fred" }};
            var metrics = [ { id: "123", graphOptions: {} } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{ src : '', width : 0, height : 0 }});
            expect(scope.renderErrors).toEqualData({abc:"Invalid axis specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a relative start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        // todo: absolute times and parsing errors

        it('should render with gnuplot with a rate', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: false, rate: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a downsample', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: true, downsampleBy: "avg", downsampleTo: "1m" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:1m-avg:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a rate and a downsample', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", downsample: true, downsampleBy: "avg", downsampleTo: "1m", rate: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:1m-avg:rate:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter with no rate (with a warning)', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false, rateCounter: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({abc:"You have specified a rate counter without a rate, ignoring"});
        });

        it('should render with gnuplot with a ratecounter', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a max', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "123" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter,123}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a reset', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "", rateCounterReset: "456" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter,,456}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a ratecounter and a max and a reset', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: true, rateCounter: true, rateCounterMax: "123", rateCounterReset: "456" } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:rate{counter,123,456}:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "value1" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1{tag1=value1}&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a multi-value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "value1|value2" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1{tag1=value1|value2}&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a wildcard value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "*" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1{tag1=*}&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a tag with a blank value', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0};
            var metrics = [ { id: "123", name: "metric1", tags: [ { name: "tag1", value: "" } ], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ];

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore="+scope.imageRenderCount+"&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a label when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLabel: "Label 1", y2AxisLabel: "Label 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&ylabel=Label+1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a label when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLabel: "Label 1", y2AxisLabel: "Label 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2label=Label+2&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a format when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisFormat: "Format 1", y2AxisFormat: "Format 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&yformat=Format+1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a format when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisFormat: "Format 1", y2AxisFormat: "Format 2" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2format=Format+2&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a yrange when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisRange: "[0:1]", y2AxisRange: "[0:2]" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&yrange=[0:1]&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with a yrange when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisRange: "[0:1]", y2AxisRange: "[0:2]" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2range=[0:2]&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with logscale when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: true, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&ylog&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with logscale when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: true, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&y2log&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot without logscale when there is a metric on the left axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: false, y2AxisLogScale: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot without logscale when there is a metric on the right axis', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { yAxisLogScale: true, y2AxisLogScale: false }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y2", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y2&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with line smoothing when selected', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { lineSmoothing: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&smooth=csplines&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with no key', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: false }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&nokey&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with key top left', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with unspecified key location', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({abc: "Invalid key location specified '', defaulting to top left"});
        });

        it('should render with gnuplot with key bottom right', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "bottom right", keyAlignment: "vertical" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=bottom+right&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with horizontal key', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "horizontal" }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+horiz&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with top left key with a box', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "vertical", keyBox: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+box&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render with gnuplot with horizontal key with a box', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
            rootScope.config = {tsdbHost: "tsdb", tsdbPort: 4242};

            var global = { relativePeriod: "1d", autoReload: false };
            var graph = {id:"abc", graphWidth: 0, graphHeight: 0, gnuplot: { showKey: true, keyLocation: "top left", keyAlignment: "horizontal", keyBox: true }};
            var metrics = [ { id: "1", name: "metric1", tags: [], graphOptions: { aggregator: "sum", axis: "x1y1", rate: false } } ]

            scope.renderers.gnuplot(global, graph, metrics);

            expect(scope.renderedContent).toEqualData({abc:{src:"http://tsdb:4242/q?start=1d-ago&ignore=1&m=sum:metric1&o=axis+x1y1&key=top+left+horiz+box&png&wxh=0x0",width:0,height:0}});
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        // ---------- tsdb helper functions ----------

        it('should return an empty tsdb string for the from field when time is relative and no time specified', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": ""
            });
            expect(result).toEqualData("");
        });

        it('should return a valid tsdb string for the from field when time is absolute', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });

        it('should return a valid tsdb string for the from field when time is relative', function() {
            var result = scope.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData("2h-ago");
        });

        it('should return a valid tsdb string for the to field when time is absolute', function() {
            var result = scope.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });

        it('should return a valid tsdb string for the to field when time is relative', function() {
            var result = scope.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData(null);
        });
        it('should return a valid date object for the from field when time is absolute', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_fromTimestampAsDate({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid date object for the from field when time is relative', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_fromTimestampAsDate({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result).toEqualData(new Date(datum.getTime()-7200000));
        });

        it('should return a valid date object for the to field when time is absolute', function() {
            var datum = new Date(2016,1,24,12,23,22);

            var result = scope.tsdb_toTimestampAsDate({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid date object for the to field when time is relative', function() {
            var datum = new Date(116,1,24,12,23,22);

            var result = scope.tsdb_toTimestampAsDate({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result).toEqualData(datum);
        });

        // ---------- rendering helper functions -----

        it('should return an empty array when parsing for cubsim and an empty reponse is received', function() {
            var json = [];

            var parsed = scope.cubism_parser(json, 1365966000, 1, 1365966010, false, false);

            expect(parsed).toEqualData([[]]);
        });

        it('should return an empty array when parsing for cubsim and no datapoints are received', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": []

                }
            ];

            var parsed = scope.cubism_parser(json, 1365966000, 1, 1365966010, false, false);

            expect(parsed).toEqualData([[]]);
        });

        it('should parse for cubism fine when response is exactly as expected', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, 5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, 10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ]
                    ]

                }
            ];

            var parsed = scope.cubism_parser(json, 1365966000, 1, 1365966010, false, false);

            expect(parsed).toEqualData([[1,1,2,5,3,2,1,4,10,9,4]]);
        });

        it('should squash negatives when parsing for cubism when requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, -5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, -10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ]
                    ]

                }
            ];

            var parsed = scope.cubism_parser(json, 1365966000, 1, 1365966010, false, true);

            expect(parsed).toEqualData([[1,1,2,0,3,2,1,4,0,9,4]]);
        });

        it('should leave gaps when parsing for cubism when interpolation not requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 3 ],
                        [ 1365966060, 2 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]

                }
            ];

            var parsed = scope.cubism_parser(json, 1365966000, 10, 1365966100, false, false);

            expect(parsed).toEqualData([[1,1,2,-5,null,3,2,null,-10,9,4]]);
        });

        it('should interpolate when parsing for cubism when requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 3 ],
                        [ 1365966060, 2 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]

                }
            ];

            var parsed = scope.cubism_parser(json, 1365966000, 10, 1365966100, true, false);

            expect(parsed).toEqualData([[1,1,2,-5,-1,3,2,-4,-10,9,4]]);
        });

        it('should interpolate & squash when parsing for cubism when requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 3 ],
                        [ 1365966060, 2 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]
                }
            ];

            var parsed = scope.cubism_parser(json, 1365966000, 10, 1365966100, true, true);

            expect(parsed).toEqualData([[1,1,2,0,0,3,2,0,0,9,4]]);

            var json2 = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 9 ],
                        [ 1365966060, 12 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]
                }
            ];

            var parsed2 = scope.cubism_parser(json2, 1365966000, 10, 1365966100, true, true);

            expect(parsed2).toEqualData([[1,1,2,0,2,9,12,1,0,9,4]]);
        });

        it('should return empty array when interpolating response for different time range', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, 5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, 10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ],
                        [ 1365966011, 3 ],
                        [ 1365966012, 7 ],
                        [ 1365966013, 1 ],
                        [ 1365966014, 8 ],
                        [ 1365966015, 6 ],
                        [ 1365966016, 7 ],
                        [ 1365966017, 9 ],
                        [ 1365966018, 2 ],
                        [ 1365966019, 3 ],
                        [ 1365966020, 4 ],
                        [ 1365966021, 3 ],
                        [ 1365966022, 7 ],
                        [ 1365966023, 1 ],
                        [ 1365966024, 8 ],
                        [ 1365966025, 6 ],
                        [ 1365966026, 7 ],
                        [ 1365966027, 9 ],
                        [ 1365966028, 2 ],
                        [ 1365966029, 3 ],
                        [ 1365966030, 4 ],
                        [ 1365966031, 3 ],
                        [ 1365966032, 7 ],
                        [ 1365966033, 1 ],
                        [ 1365966034, 8 ],
                        [ 1365966035, 6 ],
                        [ 1365966036, 7 ],
                        [ 1365966037, 9 ],
                        [ 1365966038, 2 ],
                        [ 1365966039, 3 ],
                        [ 1365966040, 4 ],
                        [ 1365966041, 3 ],
                        [ 1365966042, 7 ],
                        [ 1365966043, 1 ],
                        [ 1365966044, 8 ],
                        [ 1365966045, 6 ],
                        [ 1365966046, 7 ],
                        [ 1365966047, 9 ],
                        [ 1365966048, 2 ],
                        [ 1365966049, 3 ],
                        [ 1365966050, 4 ],
                        [ 1365966051, 3 ],
                        [ 1365966052, 7 ],
                        [ 1365966053, 1 ],
                        [ 1365966054, 8 ],
                        [ 1365966055, 6 ],
                        [ 1365966056, 7 ],
                        [ 1365966057, 9 ],
                        [ 1365966058, 2 ],
                        [ 1365966059, 3 ],
                        [ 1365966060, 4 ],
                        [ 1365966061, 3 ],
                        [ 1365966062, 7 ],
                        [ 1365966063, 1 ],
                        [ 1365966064, 8 ],
                        [ 1365966065, 6 ],
                        [ 1365966066, 7 ],
                        [ 1365966067, 9 ],
                        [ 1365966068, 2 ],
                        [ 1365966069, 3 ],
                        [ 1365966070, 4 ],
                        [ 1365966071, 3 ],
                        [ 1365966072, 7 ],
                        [ 1365966073, 1 ],
                        [ 1365966074, 8 ],
                        [ 1365966075, 6 ],
                        [ 1365966076, 7 ],
                        [ 1365966077, 9 ],
                        [ 1365966078, 2 ],
                        [ 1365966079, 3 ],
                        [ 1365966080, 4 ],
                        [ 1365966081, 3 ],
                        [ 1365966082, 7 ],
                        [ 1365966083, 1 ],
                        [ 1365966084, 8 ],
                        [ 1365966085, 6 ],
                        [ 1365966086, 7 ],
                        [ 1365966087, 9 ],
                        [ 1365966088, 2 ],
                        [ 1365966089, 3 ],
                        [ 1365966090, 4 ],
                        [ 1365966091, 3 ],
                        [ 1365966092, 7 ],
                        [ 1365966093, 1 ],
                        [ 1365966094, 8 ],
                        [ 1365966095, 6 ],
                        [ 1365966096, 7 ],
                        [ 1365966097, 9 ],
                        [ 1365966098, 2 ],
                        [ 1365966099, 3 ],
                        [ 1365966100, 1 ],
                        [ 1365966101, 1 ],
                        [ 1365966102, 2 ],
                        [ 1365966103, 5 ],
                        [ 1365966104, 3 ],
                        [ 1365966105, 2 ],
                        [ 1365966106, 1 ],
                        [ 1365966107, 4 ],
                        [ 1365966108, 10 ],
                        [ 1365966109, 9 ],
                        [ 1365966110, 4 ],
                        [ 1365966111, 3 ],
                        [ 1365966112, 7 ],
                        [ 1365966113, 1 ],
                        [ 1365966114, 8 ],
                        [ 1365966115, 6 ],
                        [ 1365966116, 7 ],
                        [ 1365966117, 9 ],
                        [ 1365966118, 2 ],
                        [ 1365966119, 3 ],
                        [ 1365966120, 4 ],
                        [ 1365966121, 3 ],
                        [ 1365966122, 7 ],
                        [ 1365966123, 1 ],
                        [ 1365966124, 8 ],
                        [ 1365966125, 6 ],
                        [ 1365966126, 7 ],
                        [ 1365966127, 9 ],
                        [ 1365966128, 2 ],
                        [ 1365966129, 3 ],
                        [ 1365966130, 4 ],
                        [ 1365966131, 3 ],
                        [ 1365966132, 7 ],
                        [ 1365966133, 1 ],
                        [ 1365966134, 8 ],
                        [ 1365966135, 6 ],
                        [ 1365966136, 7 ],
                        [ 1365966137, 9 ],
                        [ 1365966138, 2 ],
                        [ 1365966139, 3 ],
                        [ 1365966140, 4 ],
                        [ 1365966141, 3 ],
                        [ 1365966142, 7 ],
                        [ 1365966143, 1 ],
                        [ 1365966144, 8 ],
                        [ 1365966145, 6 ],
                        [ 1365966146, 7 ],
                        [ 1365966147, 9 ],
                        [ 1365966148, 2 ],
                        [ 1365966149, 3 ],
                        [ 1365966150, 4 ],
                        [ 1365966151, 3 ],
                        [ 1365966152, 7 ],
                        [ 1365966153, 1 ],
                        [ 1365966154, 8 ],
                        [ 1365966155, 6 ],
                        [ 1365966156, 7 ],
                        [ 1365966157, 9 ],
                        [ 1365966158, 2 ],
                        [ 1365966159, 3 ],
                        [ 1365966160, 4 ],
                        [ 1365966161, 3 ],
                        [ 1365966162, 7 ],
                        [ 1365966163, 1 ],
                        [ 1365966164, 8 ],
                        [ 1365966165, 6 ],
                        [ 1365966166, 7 ],
                        [ 1365966167, 9 ],
                        [ 1365966168, 2 ],
                        [ 1365966169, 3 ],
                        [ 1365966170, 4 ],
                        [ 1365966171, 3 ],
                        [ 1365966172, 7 ],
                        [ 1365966173, 1 ],
                        [ 1365966174, 8 ],
                        [ 1365966175, 6 ],
                        [ 1365966176, 7 ],
                        [ 1365966177, 9 ],
                        [ 1365966178, 2 ],
                        [ 1365966179, 3 ],
                        [ 1365966180, 4 ],
                        [ 1365966181, 3 ],
                        [ 1365966182, 7 ],
                        [ 1365966183, 1 ],
                        [ 1365966184, 8 ],
                        [ 1365966185, 6 ],
                        [ 1365966186, 7 ],
                        [ 1365966187, 9 ],
                        [ 1365966188, 2 ],
                        [ 1365966189, 3 ],
                        [ 1365966190, 4 ],
                        [ 1365966191, 3 ],
                        [ 1365966192, 7 ],
                        [ 1365966193, 1 ],
                        [ 1365966194, 8 ],
                        [ 1365966195, 6 ],
                        [ 1365966196, 7 ],
                        [ 1365966197, 9 ],
                        [ 1365966198, 2 ],
                        [ 1365966199, 3 ]
                            [ 1365966200, 1 ],
                        [ 1365966201, 1 ],
                        [ 1365966202, 2 ],
                        [ 1365966203, 5 ],
                        [ 1365966204, 3 ],
                        [ 1365966205, 2 ],
                        [ 1365966206, 1 ],
                        [ 1365966207, 4 ],
                        [ 1365966208, 10 ],
                        [ 1365966209, 9 ],
                        [ 1365966210, 4 ],
                        [ 1365966211, 3 ],
                        [ 1365966212, 7 ],
                        [ 1365966213, 1 ],
                        [ 1365966214, 8 ],
                        [ 1365966215, 6 ],
                        [ 1365966216, 7 ],
                        [ 1365966217, 9 ],
                        [ 1365966218, 2 ],
                        [ 1365966219, 3 ],
                        [ 1365966220, 4 ],
                        [ 1365966221, 3 ],
                        [ 1365966222, 7 ],
                        [ 1365966223, 1 ],
                        [ 1365966224, 8 ],
                        [ 1365966225, 6 ],
                        [ 1365966226, 7 ],
                        [ 1365966227, 9 ],
                        [ 1365966228, 2 ],
                        [ 1365966229, 3 ],
                        [ 1365966230, 4 ],
                        [ 1365966231, 3 ],
                        [ 1365966232, 7 ],
                        [ 1365966233, 1 ],
                        [ 1365966234, 8 ],
                        [ 1365966235, 6 ],
                        [ 1365966236, 7 ],
                        [ 1365966237, 9 ],
                        [ 1365966238, 2 ],
                        [ 1365966239, 3 ],
                        [ 1365966240, 4 ],
                        [ 1365966241, 3 ],
                        [ 1365966242, 7 ],
                        [ 1365966243, 1 ],
                        [ 1365966244, 8 ],
                        [ 1365966245, 6 ],
                        [ 1365966246, 7 ],
                        [ 1365966247, 9 ],
                        [ 1365966248, 2 ],
                        [ 1365966249, 3 ],
                        [ 1365966250, 4 ],
                        [ 1365966251, 3 ],
                        [ 1365966252, 7 ],
                        [ 1365966253, 1 ],
                        [ 1365966254, 8 ],
                        [ 1365966255, 6 ],
                        [ 1365966256, 7 ],
                        [ 1365966257, 9 ],
                        [ 1365966258, 2 ],
                        [ 1365966259, 3 ],
                        [ 1365966260, 4 ],
                        [ 1365966261, 3 ],
                        [ 1365966262, 7 ],
                        [ 1365966263, 1 ],
                        [ 1365966264, 8 ],
                        [ 1365966265, 6 ],
                        [ 1365966266, 7 ],
                        [ 1365966267, 9 ],
                        [ 1365966268, 2 ],
                        [ 1365966269, 3 ],
                        [ 1365966270, 4 ],
                        [ 1365966271, 3 ],
                        [ 1365966272, 7 ],
                        [ 1365966273, 1 ],
                        [ 1365966274, 8 ],
                        [ 1365966275, 6 ],
                        [ 1365966276, 7 ],
                        [ 1365966277, 9 ],
                        [ 1365966278, 2 ],
                        [ 1365966279, 3 ],
                        [ 1365966280, 4 ],
                        [ 1365966281, 3 ],
                        [ 1365966282, 7 ],
                        [ 1365966283, 1 ],
                        [ 1365966284, 8 ],
                        [ 1365966285, 6 ],
                        [ 1365966286, 7 ],
                        [ 1365966287, 9 ],
                        [ 1365966288, 2 ],
                        [ 1365966289, 3 ],
                        [ 1365966290, 4 ],
                        [ 1365966291, 3 ],
                        [ 1365966292, 7 ],
                        [ 1365966293, 1 ],
                        [ 1365966294, 8 ],
                        [ 1365966295, 6 ],
                        [ 1365966296, 7 ],
                        [ 1365966297, 9 ],
                        [ 1365966298, 2 ],
                        [ 1365966299, 3 ]
                            [ 1365966300, 1 ],
                        [ 1365966301, 1 ],
                        [ 1365966302, 2 ],
                        [ 1365966303, 5 ],
                        [ 1365966304, 3 ],
                        [ 1365966305, 2 ],
                        [ 1365966306, 1 ],
                        [ 1365966307, 4 ],
                        [ 1365966308, 10 ],
                        [ 1365966309, 9 ],
                        [ 1365966310, 4 ],
                        [ 1365966311, 3 ],
                        [ 1365966312, 7 ],
                        [ 1365966313, 1 ],
                        [ 1365966314, 8 ],
                        [ 1365966315, 6 ],
                        [ 1365966316, 7 ],
                        [ 1365966317, 9 ],
                        [ 1365966318, 2 ],
                        [ 1365966319, 3 ],
                        [ 1365966320, 4 ],
                        [ 1365966321, 3 ],
                        [ 1365966322, 7 ],
                        [ 1365966323, 1 ],
                        [ 1365966324, 8 ],
                        [ 1365966325, 6 ],
                        [ 1365966326, 7 ],
                        [ 1365966327, 9 ],
                        [ 1365966328, 2 ],
                        [ 1365966329, 3 ],
                        [ 1365966330, 4 ],
                        [ 1365966331, 3 ],
                        [ 1365966332, 7 ],
                        [ 1365966333, 1 ],
                        [ 1365966334, 8 ],
                        [ 1365966335, 6 ],
                        [ 1365966336, 7 ],
                        [ 1365966337, 9 ],
                        [ 1365966338, 2 ],
                        [ 1365966339, 3 ],
                        [ 1365966340, 4 ],
                        [ 1365966341, 3 ],
                        [ 1365966342, 7 ],
                        [ 1365966343, 1 ],
                        [ 1365966344, 8 ],
                        [ 1365966345, 6 ],
                        [ 1365966346, 7 ],
                        [ 1365966347, 9 ],
                        [ 1365966348, 2 ],
                        [ 1365966349, 3 ],
                        [ 1365966350, 4 ],
                        [ 1365966351, 3 ],
                        [ 1365966352, 7 ],
                        [ 1365966353, 1 ],
                        [ 1365966354, 8 ],
                        [ 1365966355, 6 ],
                        [ 1365966356, 7 ],
                        [ 1365966357, 9 ],
                        [ 1365966358, 2 ],
                        [ 1365966359, 3 ],
                        [ 1365966360, 4 ],
                        [ 1365966361, 3 ],
                        [ 1365966362, 7 ],
                        [ 1365966363, 1 ],
                        [ 1365966364, 8 ],
                        [ 1365966365, 6 ],
                        [ 1365966366, 7 ],
                        [ 1365966367, 9 ],
                        [ 1365966368, 2 ],
                        [ 1365966369, 3 ],
                        [ 1365966370, 4 ],
                        [ 1365966371, 3 ],
                        [ 1365966372, 7 ],
                        [ 1365966373, 1 ],
                        [ 1365966374, 8 ],
                        [ 1365966375, 6 ],
                        [ 1365966376, 7 ],
                        [ 1365966377, 9 ],
                        [ 1365966378, 2 ],
                        [ 1365966379, 3 ],
                        [ 1365966380, 4 ],
                        [ 1365966381, 3 ],
                        [ 1365966382, 7 ],
                        [ 1365966383, 1 ],
                        [ 1365966384, 8 ],
                        [ 1365966385, 6 ],
                        [ 1365966386, 7 ],
                        [ 1365966387, 9 ],
                        [ 1365966388, 2 ],
                        [ 1365966389, 3 ],
                        [ 1365966390, 4 ],
                        [ 1365966391, 3 ],
                        [ 1365966392, 7 ],
                        [ 1365966393, 1 ],
                        [ 1365966394, 8 ],
                        [ 1365966395, 6 ],
                        [ 1365966396, 7 ],
                        [ 1365966397, 9 ],
                        [ 1365966398, 2 ],
                        [ 1365966399, 3 ]
                            [ 1365966400, 1 ],
                        [ 1365966401, 1 ],
                        [ 1365966402, 2 ],
                        [ 1365966403, 5 ],
                        [ 1365966404, 3 ],
                        [ 1365966405, 2 ],
                        [ 1365966406, 1 ],
                        [ 1365966407, 4 ],
                        [ 1365966408, 10 ],
                        [ 1365966409, 9 ],
                        [ 1365966410, 4 ],
                        [ 1365966411, 3 ],
                        [ 1365966412, 7 ],
                        [ 1365966413, 1 ],
                        [ 1365966414, 8 ],
                        [ 1365966415, 6 ],
                        [ 1365966416, 7 ],
                        [ 1365966417, 9 ],
                        [ 1365966418, 2 ],
                        [ 1365966419, 3 ],
                        [ 1365966420, 4 ],
                        [ 1365966421, 3 ],
                        [ 1365966422, 7 ],
                        [ 1365966423, 1 ],
                        [ 1365966424, 8 ],
                        [ 1365966425, 6 ],
                        [ 1365966426, 7 ],
                        [ 1365966427, 9 ],
                        [ 1365966428, 2 ],
                        [ 1365966429, 3 ],
                        [ 1365966430, 4 ],
                        [ 1365966431, 3 ],
                        [ 1365966432, 7 ],
                        [ 1365966433, 1 ],
                        [ 1365966434, 8 ],
                        [ 1365966435, 6 ],
                        [ 1365966436, 7 ],
                        [ 1365966437, 9 ],
                        [ 1365966438, 2 ],
                        [ 1365966439, 3 ],
                        [ 1365966440, 4 ],
                        [ 1365966441, 3 ],
                        [ 1365966442, 7 ],
                        [ 1365966443, 1 ],
                        [ 1365966444, 8 ],
                        [ 1365966445, 6 ],
                        [ 1365966446, 7 ],
                        [ 1365966447, 9 ],
                        [ 1365966448, 2 ],
                        [ 1365966449, 3 ],
                        [ 1365966450, 4 ],
                        [ 1365966451, 3 ],
                        [ 1365966452, 7 ],
                        [ 1365966453, 1 ],
                        [ 1365966454, 8 ],
                        [ 1365966455, 6 ],
                        [ 1365966456, 7 ],
                        [ 1365966457, 9 ],
                        [ 1365966458, 2 ],
                        [ 1365966459, 3 ],
                        [ 1365966460, 4 ],
                        [ 1365966461, 3 ],
                        [ 1365966462, 7 ],
                        [ 1365966463, 1 ],
                        [ 1365966464, 8 ],
                        [ 1365966465, 6 ],
                        [ 1365966466, 7 ],
                        [ 1365966467, 9 ],
                        [ 1365966468, 2 ],
                        [ 1365966469, 3 ],
                        [ 1365966470, 4 ],
                        [ 1365966471, 3 ],
                        [ 1365966472, 7 ],
                        [ 1365966473, 1 ],
                        [ 1365966474, 8 ],
                        [ 1365966475, 6 ],
                        [ 1365966476, 7 ],
                        [ 1365966477, 9 ],
                        [ 1365966478, 2 ],
                        [ 1365966479, 3 ],
                        [ 1365966480, 4 ],
                        [ 1365966481, 3 ],
                        [ 1365966482, 7 ],
                        [ 1365966483, 1 ],
                        [ 1365966484, 8 ],
                        [ 1365966485, 6 ],
                        [ 1365966486, 7 ],
                        [ 1365966487, 9 ],
                        [ 1365966488, 2 ],
                        [ 1365966489, 3 ],
                        [ 1365966490, 4 ],
                        [ 1365966491, 3 ],
                        [ 1365966492, 7 ],
                        [ 1365966493, 1 ],
                        [ 1365966494, 8 ],
                        [ 1365966495, 6 ],
                        [ 1365966496, 7 ],
                        [ 1365966497, 9 ],
                        [ 1365966498, 2 ],
                        [ 1365966499, 3 ]
                            [ 1365966500, 1 ],
                        [ 1365966501, 1 ],
                        [ 1365966502, 2 ],
                        [ 1365966503, 5 ],
                        [ 1365966504, 3 ],
                        [ 1365966505, 2 ],
                        [ 1365966506, 1 ],
                        [ 1365966507, 4 ],
                        [ 1365966508, 10 ],
                        [ 1365966509, 9 ],
                        [ 1365966510, 4 ],
                        [ 1365966511, 3 ],
                        [ 1365966512, 7 ],
                        [ 1365966513, 1 ],
                        [ 1365966514, 8 ],
                        [ 1365966515, 6 ],
                        [ 1365966516, 7 ],
                        [ 1365966517, 9 ],
                        [ 1365966518, 2 ],
                        [ 1365966519, 3 ],
                        [ 1365966520, 4 ],
                        [ 1365966521, 3 ],
                        [ 1365966522, 7 ],
                        [ 1365966523, 1 ],
                        [ 1365966524, 8 ],
                        [ 1365966525, 6 ],
                        [ 1365966526, 7 ],
                        [ 1365966527, 9 ],
                        [ 1365966528, 2 ],
                        [ 1365966529, 3 ],
                        [ 1365966530, 4 ],
                        [ 1365966531, 3 ],
                        [ 1365966532, 7 ],
                        [ 1365966533, 1 ],
                        [ 1365966534, 8 ],
                        [ 1365966535, 6 ],
                        [ 1365966536, 7 ],
                        [ 1365966537, 9 ],
                        [ 1365966538, 2 ],
                        [ 1365966539, 3 ],
                        [ 1365966540, 4 ],
                        [ 1365966541, 3 ],
                        [ 1365966542, 7 ],
                        [ 1365966543, 1 ],
                        [ 1365966544, 8 ],
                        [ 1365966545, 6 ],
                        [ 1365966546, 7 ],
                        [ 1365966547, 9 ],
                        [ 1365966548, 2 ],
                        [ 1365966549, 3 ],
                        [ 1365966550, 4 ],
                        [ 1365966551, 3 ],
                        [ 1365966552, 7 ],
                        [ 1365966553, 1 ],
                        [ 1365966554, 8 ],
                        [ 1365966555, 6 ],
                        [ 1365966556, 7 ],
                        [ 1365966557, 9 ],
                        [ 1365966558, 2 ],
                        [ 1365966559, 3 ],
                        [ 1365966560, 4 ],
                        [ 1365966561, 3 ],
                        [ 1365966562, 7 ],
                        [ 1365966563, 1 ],
                        [ 1365966564, 8 ],
                        [ 1365966565, 6 ],
                        [ 1365966566, 7 ],
                        [ 1365966567, 9 ],
                        [ 1365966568, 2 ],
                        [ 1365966569, 3 ],
                        [ 1365966570, 4 ],
                        [ 1365966571, 3 ],
                        [ 1365966572, 7 ],
                        [ 1365966573, 1 ],
                        [ 1365966574, 8 ],
                        [ 1365966575, 6 ],
                        [ 1365966576, 7 ],
                        [ 1365966577, 9 ],
                        [ 1365966578, 2 ],
                        [ 1365966579, 3 ],
                        [ 1365966580, 4 ],
                        [ 1365966581, 3 ],
                        [ 1365966582, 7 ],
                        [ 1365966583, 1 ],
                        [ 1365966584, 8 ],
                        [ 1365966585, 6 ],
                        [ 1365966586, 7 ],
                        [ 1365966587, 9 ],
                        [ 1365966588, 2 ],
                        [ 1365966589, 3 ],
                        [ 1365966590, 4 ],
                        [ 1365966591, 3 ],
                        [ 1365966592, 7 ],
                        [ 1365966593, 1 ],
                        [ 1365966594, 8 ],
                        [ 1365966595, 6 ],
                        [ 1365966596, 7 ],
                        [ 1365966597, 9 ],
                        [ 1365966598, 2 ],
                        [ 1365966599, 3 ]
                            [ 1365966600, 1 ],
                        [ 1365966601, 1 ],
                        [ 1365966602, 2 ],
                        [ 1365966603, 5 ],
                        [ 1365966604, 3 ],
                        [ 1365966605, 2 ],
                        [ 1365966606, 1 ],
                        [ 1365966607, 4 ],
                        [ 1365966608, 10 ],
                        [ 1365966609, 9 ],
                        [ 1365966610, 4 ],
                        [ 1365966611, 3 ],
                        [ 1365966612, 7 ],
                        [ 1365966613, 1 ],
                        [ 1365966614, 8 ],
                        [ 1365966615, 6 ],
                        [ 1365966616, 7 ],
                        [ 1365966617, 9 ],
                        [ 1365966618, 2 ],
                        [ 1365966619, 3 ],
                        [ 1365966620, 4 ],
                        [ 1365966621, 3 ],
                        [ 1365966622, 7 ],
                        [ 1365966623, 1 ],
                        [ 1365966624, 8 ],
                        [ 1365966625, 6 ],
                        [ 1365966626, 7 ],
                        [ 1365966627, 9 ],
                        [ 1365966628, 2 ],
                        [ 1365966629, 3 ],
                        [ 1365966630, 4 ],
                        [ 1365966631, 3 ],
                        [ 1365966632, 7 ],
                        [ 1365966633, 1 ],
                        [ 1365966634, 8 ],
                        [ 1365966635, 6 ],
                        [ 1365966636, 7 ],
                        [ 1365966637, 9 ],
                        [ 1365966638, 2 ],
                        [ 1365966639, 3 ],
                        [ 1365966640, 4 ],
                        [ 1365966641, 3 ],
                        [ 1365966642, 7 ],
                        [ 1365966643, 1 ],
                        [ 1365966644, 8 ],
                        [ 1365966645, 6 ],
                        [ 1365966646, 7 ],
                        [ 1365966647, 9 ],
                        [ 1365966648, 2 ],
                        [ 1365966649, 3 ],
                        [ 1365966650, 4 ],
                        [ 1365966651, 3 ],
                        [ 1365966652, 7 ],
                        [ 1365966653, 1 ],
                        [ 1365966654, 8 ],
                        [ 1365966655, 6 ],
                        [ 1365966656, 7 ],
                        [ 1365966657, 9 ],
                        [ 1365966658, 2 ],
                        [ 1365966659, 3 ],
                        [ 1365966660, 4 ],
                        [ 1365966661, 3 ],
                        [ 1365966662, 7 ],
                        [ 1365966663, 1 ],
                        [ 1365966664, 8 ],
                        [ 1365966665, 6 ],
                        [ 1365966666, 7 ],
                        [ 1365966667, 9 ],
                        [ 1365966668, 2 ],
                        [ 1365966669, 3 ],
                        [ 1365966670, 4 ],
                        [ 1365966671, 3 ],
                        [ 1365966672, 7 ],
                        [ 1365966673, 1 ],
                        [ 1365966674, 8 ],
                        [ 1365966675, 6 ],
                        [ 1365966676, 7 ],
                        [ 1365966677, 9 ],
                        [ 1365966678, 2 ],
                        [ 1365966679, 3 ],
                        [ 1365966680, 4 ],
                        [ 1365966681, 3 ],
                        [ 1365966682, 7 ],
                        [ 1365966683, 1 ],
                        [ 1365966684, 8 ],
                        [ 1365966685, 6 ],
                        [ 1365966686, 7 ],
                        [ 1365966687, 9 ],
                        [ 1365966688, 2 ],
                        [ 1365966689, 3 ],
                        [ 1365966690, 4 ],
                        [ 1365966691, 3 ],
                        [ 1365966692, 7 ],
                        [ 1365966693, 1 ],
                        [ 1365966694, 8 ],
                        [ 1365966695, 6 ],
                        [ 1365966696, 7 ],
                        [ 1365966697, 9 ],
                        [ 1365966698, 2 ],
                        [ 1365966699, 3 ]
                            [ 1365966700, 1 ],
                        [ 1365966701, 1 ],
                        [ 1365966702, 2 ],
                        [ 1365966703, 5 ],
                        [ 1365966704, 3 ],
                        [ 1365966705, 2 ],
                        [ 1365966706, 1 ],
                        [ 1365966707, 4 ],
                        [ 1365966708, 10 ],
                        [ 1365966709, 9 ],
                        [ 1365966710, 4 ],
                        [ 1365966711, 3 ],
                        [ 1365966712, 7 ],
                        [ 1365966713, 1 ],
                        [ 1365966714, 8 ],
                        [ 1365966715, 6 ],
                        [ 1365966716, 7 ],
                        [ 1365966717, 9 ],
                        [ 1365966718, 2 ],
                        [ 1365966719, 3 ],
                        [ 1365966720, 4 ],
                        [ 1365966721, 3 ],
                        [ 1365966722, 7 ],
                        [ 1365966723, 1 ],
                        [ 1365966724, 8 ],
                        [ 1365966725, 6 ],
                        [ 1365966726, 7 ],
                        [ 1365966727, 9 ],
                        [ 1365966728, 2 ],
                        [ 1365966729, 3 ],
                        [ 1365966730, 4 ],
                        [ 1365966731, 3 ],
                        [ 1365966732, 7 ],
                        [ 1365966733, 1 ],
                        [ 1365966734, 8 ],
                        [ 1365966735, 6 ],
                        [ 1365966736, 7 ],
                        [ 1365966737, 9 ],
                        [ 1365966738, 2 ],
                        [ 1365966739, 3 ],
                        [ 1365966740, 4 ],
                        [ 1365966741, 3 ],
                        [ 1365966742, 7 ],
                        [ 1365966743, 1 ],
                        [ 1365966744, 8 ],
                        [ 1365966745, 6 ],
                        [ 1365966746, 7 ],
                        [ 1365966747, 9 ],
                        [ 1365966748, 2 ],
                        [ 1365966749, 3 ],
                        [ 1365966750, 4 ],
                        [ 1365966751, 3 ],
                        [ 1365966752, 7 ],
                        [ 1365966753, 1 ],
                        [ 1365966754, 8 ],
                        [ 1365966755, 6 ],
                        [ 1365966756, 7 ],
                        [ 1365966757, 9 ],
                        [ 1365966758, 2 ],
                        [ 1365966759, 3 ],
                        [ 1365966760, 4 ],
                        [ 1365966761, 3 ],
                        [ 1365966762, 7 ],
                        [ 1365966763, 1 ],
                        [ 1365966764, 8 ],
                        [ 1365966765, 6 ],
                        [ 1365966766, 7 ],
                        [ 1365966767, 9 ],
                        [ 1365966768, 2 ],
                        [ 1365966769, 3 ],
                        [ 1365966770, 4 ],
                        [ 1365966771, 3 ],
                        [ 1365966772, 7 ],
                        [ 1365966773, 1 ],
                        [ 1365966774, 8 ],
                        [ 1365966775, 6 ],
                        [ 1365966776, 7 ],
                        [ 1365966777, 9 ],
                        [ 1365966778, 2 ],
                        [ 1365966779, 3 ],
                        [ 1365966780, 4 ],
                        [ 1365966781, 3 ],
                        [ 1365966782, 7 ],
                        [ 1365966783, 1 ],
                        [ 1365966784, 8 ],
                        [ 1365966785, 6 ],
                        [ 1365966786, 7 ],
                        [ 1365966787, 9 ],
                        [ 1365966788, 2 ],
                        [ 1365966789, 3 ],
                        [ 1365966790, 4 ],
                        [ 1365966791, 3 ],
                        [ 1365966792, 7 ],
                        [ 1365966793, 1 ],
                        [ 1365966794, 8 ],
                        [ 1365966795, 6 ],
                        [ 1365966796, 7 ],
                        [ 1365966797, 9 ],
                        [ 1365966798, 2 ],
                        [ 1365966799, 3 ]
                            [ 1365966800, 1 ],
                        [ 1365966801, 1 ],
                        [ 1365966802, 2 ],
                        [ 1365966803, 5 ],
                        [ 1365966804, 3 ],
                        [ 1365966805, 2 ],
                        [ 1365966806, 1 ],
                        [ 1365966807, 4 ],
                        [ 1365966808, 10 ],
                        [ 1365966809, 9 ],
                        [ 1365966810, 4 ],
                        [ 1365966811, 3 ],
                        [ 1365966812, 7 ],
                        [ 1365966813, 1 ],
                        [ 1365966814, 8 ],
                        [ 1365966815, 6 ],
                        [ 1365966816, 7 ],
                        [ 1365966817, 9 ],
                        [ 1365966818, 2 ],
                        [ 1365966819, 3 ],
                        [ 1365966820, 4 ],
                        [ 1365966821, 3 ],
                        [ 1365966822, 7 ],
                        [ 1365966823, 1 ],
                        [ 1365966824, 8 ],
                        [ 1365966825, 6 ],
                        [ 1365966826, 7 ],
                        [ 1365966827, 9 ],
                        [ 1365966828, 2 ],
                        [ 1365966829, 3 ],
                        [ 1365966830, 4 ],
                        [ 1365966831, 3 ],
                        [ 1365966832, 7 ],
                        [ 1365966833, 1 ],
                        [ 1365966834, 8 ],
                        [ 1365966835, 6 ],
                        [ 1365966836, 7 ],
                        [ 1365966837, 9 ],
                        [ 1365966838, 2 ],
                        [ 1365966839, 3 ],
                        [ 1365966840, 4 ],
                        [ 1365966841, 3 ],
                        [ 1365966842, 7 ],
                        [ 1365966843, 1 ],
                        [ 1365966844, 8 ],
                        [ 1365966845, 6 ],
                        [ 1365966846, 7 ],
                        [ 1365966847, 9 ],
                        [ 1365966848, 2 ],
                        [ 1365966849, 3 ],
                        [ 1365966850, 4 ],
                        [ 1365966851, 3 ],
                        [ 1365966852, 7 ],
                        [ 1365966853, 1 ],
                        [ 1365966854, 8 ],
                        [ 1365966855, 6 ],
                        [ 1365966856, 7 ],
                        [ 1365966857, 9 ],
                        [ 1365966858, 2 ],
                        [ 1365966859, 3 ],
                        [ 1365966860, 4 ],
                        [ 1365966861, 3 ],
                        [ 1365966862, 7 ],
                        [ 1365966863, 1 ],
                        [ 1365966864, 8 ],
                        [ 1365966865, 6 ],
                        [ 1365966866, 7 ],
                        [ 1365966867, 9 ],
                        [ 1365966868, 2 ],
                        [ 1365966869, 3 ],
                        [ 1365966870, 4 ],
                        [ 1365966871, 3 ],
                        [ 1365966872, 7 ],
                        [ 1365966873, 1 ],
                        [ 1365966874, 8 ],
                        [ 1365966875, 6 ],
                        [ 1365966876, 7 ],
                        [ 1365966877, 9 ],
                        [ 1365966878, 2 ],
                        [ 1365966879, 3 ],
                        [ 1365966880, 4 ],
                        [ 1365966881, 3 ],
                        [ 1365966882, 7 ],
                        [ 1365966883, 1 ],
                        [ 1365966884, 8 ],
                        [ 1365966885, 6 ],
                        [ 1365966886, 7 ],
                        [ 1365966887, 9 ],
                        [ 1365966888, 2 ],
                        [ 1365966889, 3 ],
                        [ 1365966890, 4 ],
                        [ 1365966891, 3 ],
                        [ 1365966892, 7 ],
                        [ 1365966893, 1 ],
                        [ 1365966894, 8 ],
                        [ 1365966895, 6 ],
                        [ 1365966896, 7 ],
                        [ 1365966897, 9 ],
                        [ 1365966898, 2 ],
                        [ 1365966899, 3 ]
                    ]
                }
            ];

            var parsed = scope.cubism_parser(json, 1365967000, 1000, 1366067000, true, false);

            expect(parsed).toEqualData([[]]);
        });

        it('should skip datapoints not on step boundary when parsing for cubism', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, 5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, 10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ]
                    ]

                }
            ];

            var parsed = scope.cubism_parser(json, 1365966000, 10, 1365966010, false, false);

            expect(parsed).toEqualData([[1,4]]);
        });

        // todo: tests for specific renderers when we have them (not incl debug)
    });

    describe('MetricControlCtrl', function() {
        var rootScope, scope, ctrl, $httpBackend, controllerCreator;
        var configUpdateFunc;
        var saveModelCalled = false;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $browser, $location, $controller) {
            $httpBackend = _$httpBackend_;
            controllerCreator = $controller;

            // hmm
            rootScope = $rootScope;

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }
            rootScope.saveModel = function() {
                saveModelCalled = true;
            }
            saveModelCalled = false;
            rootScope.model = { graphs: [], metrics: [] };

            scope = $rootScope.$new();
            ctrl = $controller('MetricControlCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        it('should register for config loads on start', function () {
            expect(configUpdateFunc).not.toEqual(null);
        });

        it('should load data for the tree on config update', function() {
            rootScope.config = {tsdbHost: 'tsdb', tsdbPort: '4242'};
            $httpBackend.expectGET('http://tsdb:4242/api/suggest?type=metrics&max=1000000').respond(
                [
                    "flob",
                    "name.baldrick",
                    "name.blackadder",
                    "wibble",
                    "wibble.wobble"
                ]
            );

            configUpdateFunc();
            $httpBackend.flush();

            var expectedDataForTheTree = [
                {id: "flob", name: "flob", isMetric: true, children: []},
                {id: "name", name: "name", isMetric: false, children: [
                    {id: "name.baldrick", name: "baldrick", isMetric: true, children: []},
                    {id: "name.blackadder", name: "blackadder", isMetric: true, children: []}
                ]},
                {id: "wibble", name: "wibble", isMetric: true, children: [
                    {id: "wibble.wobble", name: "wobble", isMetric: true, children: []}
                ]}
            ];

            expect(scope.dataForTheTree).toEqualData(expectedDataForTheTree);
            expect(scope.allParentNodes).toEqualData([
                expectedDataForTheTree[1], expectedDataForTheTree[2]
            ]);
        });

        // todo: test should not load data for the tree if already loading
        it('should not load data for the tree if already loading', function() {
        });

        it('should not show the expand all button if it is disabled in config', function() {
            rootScope.config = {ui:{metrics:{enableExpandAll: false}}};
            expect(scope.expandAllVisible()).toEqual(false);
        });

        it('should show the expand all button if it is enabled in config', function() {
            rootScope.config = {ui:{metrics:{enableExpandAll: true}}};
            expect(scope.expandAllVisible()).toEqual(true);
        });

        it('should correctly process a selected node in the tree', function() {
            var node = {id: "name.baldrick", name: "baldrick", isMetric: true, children: []};

            var response = {
                key1: [ "value1", "value2" ],
                key2: [ "value3" ]
            };

            $httpBackend.expectGET('/otis/tags?metric=name.baldrick').respond(response);

            scope.nodeSelectedForAddition(node, true);
            $httpBackend.flush();

            // simple results
            expect(scope.addButtonVisible()).toEqualData(true);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.deleteButtonVisible()).toEqualData(false);
            expect(scope.selectedMetric).toEqualData("name.baldrick");
            expect(scope.tagNames).toEqualData(["key1","key2"]);
            expect(scope.tagValues).toEqualData(response);
            expect(scope.re).toEqualData({key1: true, key2: true});
            expect(scope.nodeSelectionDisabled).toEqualData(true);

            // tag options are a little more complex
            expect(scope.tagOptions.key1.suggest('')).toEqualData([{label:"value1",value:"value1"},{label:"value2",value:"value2"}]);
            expect(scope.tagOptions.key2.suggest('')).toEqualData([{label:"value3",value:"value3"}]);

        })

        it('should cleanup when a node is deselected and not try to get tag values', function() {
            var node = {id: "name.baldrick", name: "baldrick", isMetric: true, children: []};

            scope.nodeSelectedForAddition(node, false);
            // no calls should be made
            $httpBackend.verifyNoOutstandingRequest();

            // simple results
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.selectedMetricId).toEqualData("0");
            expect(scope.selectedMetric).toEqualData("");
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tagValues).toEqualData({});
            expect(scope.re).toEqualData({});
            expect(scope.tagOptions).toEqualData({});
            expect(scope.nodeSelectionDisabled).toEqualData(false);
        })

        it('should suggest correct tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

            var ret_value1 = {label:"value1",value:"value1"};
            var ret_something2 = {label:"something2",value:"something2"};
            var ret_value2 = {label:"value2",value:"value2"};

            scope.re = { key1: false };
            expect(scope.suggestTagValues('','key1')).toEqualData([ret_value1,ret_something2,ret_value2]);
            expect(scope.suggestTagValues('value','key1')).toEqualData([ret_value1,ret_value2]);
            expect(scope.suggestTagValues('value1','key1')).toEqualData([ret_value1]);
            expect(scope.suggestTagValues('value12','key1')).toEqualData([]);
            expect(scope.suggestTagValues('*','key1')).toEqualData([]);

            // q: would you expect suggested tag values to change because you ticked RE?
            // a: no
            scope.re = { key1: true };
            expect(scope.suggestTagValues('','key1')).toEqualData([ret_value1,ret_something2,ret_value2]);
            expect(scope.suggestTagValues('value','key1')).toEqualData([ret_value1,ret_value2]);
            expect(scope.suggestTagValues('value1','key1')).toEqualData([ret_value1]);
            expect(scope.suggestTagValues('value12','key1')).toEqualData([]);
            expect(scope.suggestTagValues('*','key1')).toEqualData([]);
            expect(scope.suggestTagValues('.*','key1')).toEqualData([]);
        });

        it('should correctly count matching tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

            scope.re = { key1: false };
            scope.tag = { key1: '' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("");
            scope.tag = { key1: 'value' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: 'value1' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(1)");
            scope.tag = { key1: 'value12' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: '*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(3)");
            scope.tag = { key1: '.*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: 'value1|value2' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(2)");

            scope.re = { key1: true };
            scope.tag = { key1: '' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("");
            scope.tag = { key1: 'value' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(2)");
            scope.tag = { key1: 'value1' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(1)");
            scope.tag = { key1: '2' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(2)");
            scope.tag = { key1: 'th' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(1)");
            scope.tag = { key1: '.*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(3)");
            scope.tag = { key1: '*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: 'value1|value2' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(2)");
        });

        it('should add the metric to the model when addMetric() is called', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetric = "some.metric.name";
            scope.rate = true;
            scope.rateCounter = true;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '1';
            scope.rightAxis = true;
            scope.downsample = true;
            scope.downsampleBy = "zimsum";
            scope.downsampleTo = "10m";
            scope.nodeSelectionDisabled = true; // set by nodeSelectedForAddition normally

            scope.addMetric();

            expect(saveModelCalled).toEqualData(true);
            var newMetricId = scope.lastId+"";
            expect(rootScope.model.metrics).toEqualData([
                {
                    id: newMetricId,
                    name: 'some.metric.name',
                    tags: [
                        {
                            name: "tag1",
                            value: "",
                            re: false
                        },
                        {
                            name: "tag2",
                            value: "*",
                            re: false
                        },
                        {
                            name: "tag3",
                            value: "value",
                            re: true
                        }
                    ],
                    graphOptions: {
                        graphId: '0',
                        axis: 'x1y2',
                        aggregator: 'sum',
                        rate: true,
                        rateCounter: true,
                        rateCounterMax: '123',
                        rateCounterReset: '1',
                        downsample: true,
                        downsampleBy: 'zimsum',
                        downsampleTo: '10m'
                    }
                }
            ]);
            expect(scope.selectedMetric).toEqualData("");
            expect(scope.selectedMetricId).toEqualData(newMetricId);
            expect(scope.nodeSelectionDisabled).toEqualData(true);
            expect(scope.saveButtonVisible()).toEqualData(true);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
        })

        it('should clear the form when a user cancels adding a new metric', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetric = "some.metric.name";
            scope.selectedTreeNode = "mock-node";
            scope.rightAxis = false;
            scope.rate = true;
            scope.rateCounter = true;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '1';
            scope.aggregator = "zimsum";
            scope.downsample = true;
            scope.downsampleBy = "sum";
            scope.downsampleTo = "10m";
            scope.nodeSelectionDisabled = true; // set by nodeSelectedForAddition normally

            scope.clearMetric();

            expect(saveModelCalled).toEqualData(false);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.re).toEqualData({});
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.aggregator).toEqualData('sum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterMax).toEqualData('');
            expect(scope.rateCounterReset).toEqualData('');
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('avg');
            expect(scope.downsampleTo).toEqualData('');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.selectedTreeNode).toEqualData(undefined);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);
        });

        it('should not generate new metrics with the ids of ones from an existing model', function() {
            rootScope.config = {tsdbHost: 'tsdb', tsdbPort: '4242'};
            rootScope.model = { metrics : [ { id : "1", name : 'fred' } ] };
            configUpdateFunc();
            expect(scope.lastId).toEqualData(1);

            scope.tagNames = [];
            scope.tag = {};
            scope.re = {};
            scope.selectedMetric = "some.metric.name";


            scope.addMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(rootScope.model.metrics).toEqualData([
                {
                    id: "1",
                    name: 'fred'
                },
                {
                    id: scope.lastId + "",
                    name: 'some.metric.name',
                    tags: [],
                    graphOptions: {
                        graphId: '0',
                        aggregator: 'sum',
                        axis: 'x1y1',
                        rate: false,
                        rateCounter: false,
                        rateCounterMax: '',
                        rateCounterReset: '',
                        downsample: false,
                        downsampleBy: 'avg',
                        downsampleTo: ''
                    }
                }
            ]);

            expect(rootScope.model.metrics[0].id == rootScope.model.metrics[1].id).toEqualData(false);
        });

        it('should populate the metric form when an existing metric is selected', function() {
            rootScope.model = {
                graphs: [
                    {
                        id: "abc",
                        type: "debug",
                        title: "Title1",
                        showTitle: true
                    }
                ],
                metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "",
                                re: false
                            },
                            {
                                name: "tag2",
                                value: "*",
                                re: false
                            },
                            {
                                name: "tag3",
                                value: "value",
                                re: true
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: true,
                            downsampleBy: '10m'
                        }
                    }
                ]
            }

            scope.selectedMetricId = "123";


            var response = {
                tag1: [ "value1", "value2" ],
                tag2: [ "value3" ],
                tag3: [ "value"]
            };

            $httpBackend.expectGET('/otis/tags?metric=some.metric.name').respond(response);

            scope.nodeSelectedForEditing();
            $httpBackend.flush();

            expect(scope.tagNames).toEqualData(["tag1","tag2","tag3"]);
            expect(scope.tag).toEqualData({tag1:"",tag2:"*",tag3:"value"});
            expect(scope.re).toEqualData({tag1:false,tag2:false,tag3:true});
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.rate).toEqualData(true);
            expect(scope.downsample).toEqualData(true);
            expect(scope.downsampleBy).toEqualData('10m');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(true);
            expect(scope.deleteButtonVisible()).toEqualData(true);
        });

        it('should update the model when a user clicks save from an existing metric being edited', function() {
            rootScope.model = {
                graphs: [],
                    metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "abc",
                                re: true
                            },
                            {
                                name: "tag2",
                                value: "zab",
                                re: true
                            },
                            {
                                name: "tag3",
                                value: "",
                                re: false
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: ''
                        }
                    }
                ]
                };

            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetricId = "123";
            scope.aggregator = 'zimsum';
            scope.rightAxis = false;
            scope.rate = false;
            scope.rateCounter = false;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '456';
            scope.downsample = true;
            scope.downsampleTo = "10m";
            scope.downsampleBy = "sum";

            scope.saveMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(scope.tagNames).toEqualData(["tag1","tag2","tag3"]);
            expect(scope.tag).toEqualData({tag1: '', tag2: '*', tag3: 'value'});
            expect(scope.re).toEqualData({tag1:false,tag2:false,tag3:true});
            expect(scope.selectedMetricId).toEqualData('123');
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.aggregator).toEqualData('zimsum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterMax).toEqualData('123');
            expect(scope.rateCounterReset).toEqualData('456');
            expect(scope.downsample).toEqualData(true);
            expect(scope.downsampleBy).toEqualData('sum');
            expect(scope.downsampleTo).toEqualData('10m');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(true);

            expect(rootScope.model).toEqualData(
                {
                    graphs: [],
                    metrics: [
                        {
                            id: "123",
                            name: 'some.metric.name',
                            tags: [
                                {
                                    name: "tag1",
                                    value: "",
                                    re: false
                                },
                                {
                                    name: "tag2",
                                    value: "*",
                                    re: false
                                },
                                {
                                    name: "tag3",
                                    value: "value",
                                    re: true
                                }
                            ],
                            graphOptions: {
                                graphId: '0',
                                aggregator: 'zimsum',
                                axis: 'x1y1',
                                rate: false,
                                rateCounter: false,
                                rateCounterMax: '123',
                                rateCounterReset: '456',
                                downsample: true,
                                downsampleBy: 'sum',
                                downsampleTo: '10m'
                            }
                        }
                    ]
                }
            );
        });

        it('should update the model when a user clicks delete from an existing metric being edited', function() {
            rootScope.model = {
                graphs: [],
                    metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "abc",
                                re: true
                            },
                            {
                                name: "tag2",
                                value: "zab",
                                re: true
                            },
                            {
                                name: "tag3",
                                value: "",
                                re: false
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: ''
                        }
                    }
                ]
                };

            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetricId = "123";
            scope.selectedTreeNode = "mock-node";
            scope.aggregator = 'zimsum';
            scope.rightAxis = false;
            scope.rate = false;
            scope.rateCounter = false;
            scope.rateCounterMax = '123';
            scope.rateCounterReset = '456';
            scope.downsample = true;
            scope.downsampleTo = "10m";
            scope.downsampleBy = "sum";

            scope.deleteMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.re).toEqualData({});
            expect(scope.selectedMetricId).toEqualData('0');
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.aggregator).toEqualData('sum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterMax).toEqualData('');
            expect(scope.rateCounterReset).toEqualData('');
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('avg');
            expect(scope.downsampleTo).toEqualData('');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.selectedTreeNode).toEqualData(undefined);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.deleteButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);

            expect(rootScope.model).toEqualData(
                {
                    graphs: [],
                    metrics: []
                }
            );
        });

        it('should clear the form when a user cancels editing an existing metric', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetricId = "123";
            scope.selectedTreeNode = "mock-node";
            scope.aggregator = "avg";
            scope.rightAxis = true;
            scope.rate = true;
            scope.rateCounter = true;
            scope.rateCounterReset = "123";
            scope.rateCounterMax = "123";
            scope.downsample = true;
            scope.downsampleTo = "10m";
            scope.downsampleBy = "sum";

            scope.clearMetric();

            expect(saveModelCalled).toEqualData(false);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.re).toEqualData({});
            expect(scope.selectedMetricId).toEqualData('0');
            expect(scope.aggregator).toEqualData('sum');
            expect(scope.rightAxis).toEqualData(false);
            expect(scope.rate).toEqualData(false);
            expect(scope.rateCounter).toEqualData(false);
            expect(scope.rateCounterReset).toEqualData('');
            expect(scope.rateCounterMax).toEqualData('');
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('avg');
            expect(scope.downsampleTo).toEqualData('');
            expect(scope.nodeSelectionDisabled).toEqualData(false);
            expect(scope.selectedTreeNode).toEqualData(undefined);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);
        });
    });
});

