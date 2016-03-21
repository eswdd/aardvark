'use strict';

/* jasmine specs for controllers go here */
describe('Aardvark controllers', function () {

    beforeEach(function () {
        jasmine.addMatchers({
            toEqualData: function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var passed = angular.equals(actual, expected);
                        return {
                            pass: passed,
                            message: 'Expected ' + JSON.stringify(actual) + ' to equal ' + JSON.stringify(expected)
                        };
                    }
                };
            }
        });
    });

    beforeEach(module('Aardvark'));

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

            $httpBackend.expectGET('/aardvark/tags?metric=name.baldrick').respond(response);

            scope.nodeSelectedForAddition(node, true);
            $httpBackend.flush();

            // simple results
            expect(scope.addButtonVisible()).toEqualData(true);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.deleteButtonVisible()).toEqualData(false);
            expect(scope.selectedMetric).toEqualData("name.baldrick");
            expect(scope.tagNames).toEqualData(["key1","key2"]);
            expect(scope.tagValues).toEqualData(response);
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
            expect(scope.tagOptions).toEqualData({});
            expect(scope.nodeSelectionDisabled).toEqualData(false);
        })

        it('should suggest correct tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

            var ret_value1 = {label:"value1",value:"value1"};
            var ret_something2 = {label:"something2",value:"something2"};
            var ret_value2 = {label:"value2",value:"value2"};

            expect(scope.suggestTagValues('','key1')).toEqualData([ret_value1,ret_something2,ret_value2]);
            expect(scope.suggestTagValues('value','key1')).toEqualData([ret_value1,ret_value2]);
            expect(scope.suggestTagValues('value1','key1')).toEqualData([ret_value1]);
            expect(scope.suggestTagValues('value12','key1')).toEqualData([]);
            expect(scope.suggestTagValues('*','key1')).toEqualData([]);
        });

        it('should correctly count matching tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

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
        });

        it('should add the metric to the model when addMetric() is called', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
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
                            value: ""
                        },
                        {
                            name: "tag2",
                            value: "*"
                        },
                        {
                            name: "tag3",
                            value: "value"
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
                        downsampleTo: '10m',
                        scatter: {
                            axis: ''
                        }
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
                        downsampleTo: '',
                        scatter: {
                            axis: ''
                        }
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
                        title: "Title1"
                    }
                ],
                metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: ""
                            },
                            {
                                name: "tag2",
                                value: "*"
                            },
                            {
                                name: "tag3",
                                value: "value"
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: true,
                            downsampleBy: '10m',
                            scatter: {
                                axis: ''
                            }
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

            $httpBackend.expectGET('/aardvark/tags?metric=some.metric.name').respond(response);

            scope.nodeSelectedForEditing();
            $httpBackend.flush();

            expect(scope.tagNames).toEqualData(["tag1","tag2","tag3"]);
            expect(scope.tag).toEqualData({tag1:"",tag2:"*",tag3:"value"});
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
                                value: "abc"
                            },
                            {
                                name: "tag2",
                                value: "zab"
                            },
                            {
                                name: "tag3",
                                value: ""
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: '',
                            scatter: {
                                axis: ''
                            }
                        }
                    }
                ]
                };

            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
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
                                    value: ""
                                },
                                {
                                    name: "tag2",
                                    value: "*"
                                },
                                {
                                    name: "tag3",
                                    value: "value"
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
                                downsampleTo: '10m',
                                scatter: {
                                    axis: ''
                                }
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
                                value: "abc"
                            },
                            {
                                name: "tag2",
                                value: "zab"
                            },
                            {
                                name: "tag3",
                                value: ""
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

