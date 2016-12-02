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

    describe('tsdbClient', function () {
        var $httpBackend, $tsdbClient;

        beforeEach(inject(function (_$httpBackend_, tsdbClient) {
            $httpBackend = _$httpBackend_;

            // hmm
            $httpBackend.expectGET('http://tsdb:4242/api/config').respond({});
            $httpBackend.expectGET('http://tsdb:4242/api/version').respond({version: "2.0.0"});
            tsdbClient.init({
                tsdbBaseReadUrl: "http://tsdb:4242",
                tsdbBaseWriteUrl: "http://tsdb:4242"
            });
            $httpBackend.flush();
            $tsdbClient = tsdbClient;
        }));
    
        it('expects the tsdb client to exist', function() {
            expect($tsdbClient).toBeDefined();
        });
        
        it('expects a search/lookup call to default to not useMeta and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: false}).respond(expectedJson);
            $httpBackend.flush();
        });
        
        it('expects a search/lookup call to handle requests with no limit specified appropriately', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 2147483647,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,null,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 2147483647, useMeta: false}).respond(expectedJson);
            $httpBackend.flush();
        });
        
        it('expects a search/lookup call to useMeta if tsd.core.meta.enable_tsuid_tracking is enabled and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.config["tsd.core.meta.enable_tsuid_tracking"] = "true";
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: true}).respond(expectedJson);
            $httpBackend.flush();
        });
        
        it('expects a search/lookup call to useMeta if tsd.core.meta.enable_tsuid_incrementing is enabled and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.config["tsd.core.meta.enable_tsuid_incrementing"] = "true";
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: true}).respond(expectedJson);
            $httpBackend.flush();
        });
        
        it('expects a search/lookup call to useMeta if tsd.core.meta.enable_realtime_ts is enabled and return the correct json', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host1"
                        },
                        tsuid: '000001000001000001'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            host: "host2"
                        },
                        tsuid: '000001000001000002'
                    }
                ]
            };
            $tsdbClient.config["tsd.core.meta.enable_realtime_ts"] = "true";
            $tsdbClient.searchLookup({name:"a.b.c",tags:[]},false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"a.b.c", limit: 1000, useMeta: true}).respond(expectedJson);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as tags', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000001000002000003000003000005'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000002000002000003000003000005'
                    }
                ]
            };
            var metric = {
                name:"a.b.c", 
                tags: [
                    {name:"a",value:"value1|value2"},
                    {name:"b",value:"value3"},
                    {name:"c",value:"*"}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a",value:"value1|value2"},
                    {key:"b",value:"value3"},
                    {key:"c",value:"*"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,false,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(expectedJson);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as filters 1', function() {
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000001000002000003000003000005'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000002000002000003000003000005'
                    }
                ]
            };
            var metric = {
                name:"a.b.c",
                tags: [
                    {name:"a",value:"literal_or(value1|value2)",groupBy:true},
                    {name:"b",value:"literal_or(value3)",groupBy:true},
                    {name:"c",value:"wildcard(*)",groupBy:true}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a", value:"value1|value2"},
                    {key:"b", value:"value3"},
                    {key:"c", value:"*"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,true,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(expectedJson);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as filters 2', function() {
            var response = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 1,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    }
                ]
            };
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 1,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    }
                ]
            };
            var metric = {
                name:"a.b.c",
                tags: [
                    {name:"a",value:"literal_or(value1|value2)",groupBy:true},
                    {name:"a",value:"literal_or(value2|value3)",groupBy:true},
                    {name:"b",value:"literal_or(value3)",groupBy:true},
                    {name:"b",value:"wildcard(*)",groupBy:true},
                    {name:"c",value:"wildcard(*)",groupBy:true},
                    {name:"c",value:"literal_or(value4)",groupBy:true}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a", value:"value2"},
                    {key:"b", value:"value3"},
                    {key:"c", value:"value4"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,true,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(response);
            $httpBackend.flush();
        });

        it('expects a search/lookup call to request the correct tags when specified as filters 3', function() {
            var response = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000001000002000003000003000005'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000002000002000003000003000005'
                    }
                ]
            };
            var expectedJson = {
                type: "LOOKUP",
                metric: "a.b.c",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 4,
                results: [
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "a.b.c",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    }
                ]
            };
            var metric = {
                name:"a.b.c",
                tags: [
                    {name:"a",value:"iliteral_or(value1|value2)",groupBy:true},
                    {name:"b",value:"wildcard(value3*)",groupBy:true},
                    {name:"c",value:"regexp(.*4)",groupBy:true}
                ]
            };
            var postBody = {
                metric:"a.b.c",
                tags: [
                    {key:"a", value:"*"},
                    {key:"b", value:"*"},
                    {key:"c", value:"*"}
                ],
                limit: 1000,
                useMeta: false
            };
            $tsdbClient.searchLookup(metric,true,1000,function(data){
                expect(data).toEqualData(expectedJson);
            },function(){});
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', postBody).respond(response);
            $httpBackend.flush();
        });
        
        it('expects saveAnnotation to return the data tsdb returns', function() {
            var annotation = {
                tsuid: 123,
                startTime: 12344567890,
                description: "qibble"
            }
            $tsdbClient.saveAnnotation(annotation, function(response) {
                expect(response).toEqualData(annotation);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectPOST('http://tsdb:4242/api/annotation', annotation).respond(annotation);
            $httpBackend.flush();
        });
        
        it('expects deleteAnnotation to succeed', function() {
            $tsdbClient.deleteAnnotation("123", function() {
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectDELETE('http://tsdb:4242/api/annotation?tsuid=123').respond(204);
            $httpBackend.flush();
        });
        
        it('expects getTSMetaByTsuid to return the data tsdb returns', function() {
            var toReturn = {
                metric: "abc",
                tags: {
                    a: "b"
                }
            };
            $tsdbClient.getTSMetaByTsuid("123", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/tsmeta?tsuid=123').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for a metric to return the data tsdb returns', function() {
            var toReturn = {
                name: "abc"
            };
            $tsdbClient.getUidMeta("123", "metric", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/uidmeta?uid=123&type=metric').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for a tagk to return the data tsdb returns', function() {
            var toReturn = {
                name: "abc"
            };
            $tsdbClient.getUidMeta("123", "tagk", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/uidmeta?uid=123&type=tagk').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for a tagv to return the data tsdb returns', function() {
            var toReturn = {
                name: "abc"
            };
            $tsdbClient.getUidMeta("123", "tagv", function(response) {
                expect(response).toEqualData(toReturn);
            }, function(error) {
                fail("unexpected failure: "+error);
            });
            $httpBackend.expectGET('http://tsdb:4242/api/uid/uidmeta?uid=123&type=tagv').respond(toReturn);
            $httpBackend.flush();
        });
        
        it('expects getUidMeta for an invalid uid type to return the data tsdb returns', function() {
            $tsdbClient.getUidMeta("123", "wibble", function(response) {
                fail("expected failure");
            }, function(error) {
                expect(error).toEqualData("Unrecognised type: wibble");
            });
        });
        
        it('expects searchLookupBulk to make multiple queries and merge the results together', function() {
            var queries = [
                { id: "123", name: "metric1", tags: [] },
                { id: "124", name: "metric2", tags: [ { name: "tag1", value: "*" } ] }
            ];
            var perResultCalls = 0;
            var singleResults = {};

            var metricResponse1 = {
                type: "LOOKUP",
                metric: "metric1",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "metric1",
                        tags: {
                            a: "value1",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000001000002000003000003000004'
                    },
                    {
                        metric: "metric1",
                        tags: {
                            a: "value2",
                            b: "value3",
                            c: "value4"
                        },
                        tsuid: '000001000001000002000002000003000003000004'
                    }
                ]
            };
            var metricResponse2 = {
                type: "LOOKUP",
                metric: "metric2",
                limit: 1000,
                time: 1,
                startIndex: 0,
                totalResults: 2,
                results: [
                    {
                        metric: "metric2",
                        tags: {
                            tag1: "value1",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000001000002000003000003000005'
                    },
                    {
                        metric: "metric2",
                        tags: {
                            tag1: "value2",
                            b: "value3",
                            c: "value5"
                        },
                        tsuid: '000001000001000002000002000003000003000005'
                    }
                ]
            };

            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"metric1",limit:2147483647,useMeta:false}).respond(metricResponse1);
            $httpBackend.expectPOST('http://tsdb:4242/api/search/lookup', {metric:"metric2", tags: [{key:"tag1",value:"*"}],limit:2147483647,useMeta:false}).respond(metricResponse2);
            
            $tsdbClient.searchLookupBulk(queries, function(query,data) {
                singleResults[query.name] = data;
                perResultCalls++;
                return null;
            }, function(finalResult) {
                expect(perResultCalls).toEqualData(2);
                expect(singleResults.metric1).toEqualData(metricResponse1);
                expect(singleResults.metric2).toEqualData(metricResponse2);
            }, function(err) {
                fail("Didn't expect an error");
            });

            $httpBackend.flush();
        });
        
        var bulkSaveAnnotationsSyntheticTest = function(tsdbVersion, allowBulk) {
            $tsdbClient.versionNumber = tsdbVersion;
            $tsdbClient.allowBulkAnnotationsCall = allowBulk;
            var anns = [
                { tsuid: "123", startTime: 12344567800, description: "qibble" },
                { tsuid: "124", startTime: 12344567890, description: "wibble" }
            ];
            $httpBackend.expectPOST('http://tsdb:4242/api/annotation', anns[0]).respond(anns[0]);
            $httpBackend.expectPOST('http://tsdb:4242/api/annotation', anns[1]).respond(anns[1]);

            $tsdbClient.bulkSaveAnnotations(anns, function(finalResult) {
                expect(finalResult).toEqualData(anns);
            }, function(err) {
                fail("Didn't expect an error");
            });

            $httpBackend.flush();
            
        }
        
        it('expects bulkSaveAnnotations to make multiple saves and merge the results together when explicitly disabled', function() {
            bulkSaveAnnotationsSyntheticTest($tsdbClient.TSDB_2_2, false);
        });
        
        it('expects bulkSaveAnnotations to make multiple saves and merge the results together when running a version which does not support it', function() {
            bulkSaveAnnotationsSyntheticTest($tsdbClient.TSDB_2_0, true);
        });
        
        it('expects bulkSaveAnnotations to make a single bulk save when running a version which supports it and it is enabled', function() {
            $tsdbClient.versionNumber = $tsdbClient.TSDB_2_1;
            $tsdbClient.allowBulkAnnotationsCall = true;
            var anns = [
                { tsuid: "123", startTime: 12344567800, description: "qibble" },
                { tsuid: "124", startTime: 12344567890, description: "wibble" }
            ];
            $httpBackend.expectPOST('http://tsdb:4242/api/annotation/bulk', anns).respond(anns);

            $tsdbClient.bulkSaveAnnotations(anns, function(finalResult) {
                expect(finalResult).toEqualData(anns);
            }, function(err) {
                fail("Didn't expect an error");
            });

            $httpBackend.flush();
        });
        
        it('expects suggest to apply a default limit when none specified', function() {
            $tsdbClient.versionNumber = $tsdbClient.TSDB_2_1;
            $tsdbClient.allowBulkAnnotationsCall = true;
            var result = [
                "some.metric",
                "some.metric1",
                "some.metric2"
            ];
            $httpBackend.expectGET('http://tsdb:4242/api/suggest?type=metrics&max=2147483647').respond(result);

            $tsdbClient.suggest("metrics", "", null, function(finalResult) {
                expect(finalResult).toEqualData(result);
            }, function(err) {
                fail("Didn't expect an error");
            });

            $httpBackend.flush();
        });
        
        it('expects suggest to send all parameters when specified', function() {
            $tsdbClient.versionNumber = $tsdbClient.TSDB_2_1;
            $tsdbClient.allowBulkAnnotationsCall = true;
            var result = [
                "some.metric",
                "some.metric1",
                "some.metric2"
            ];
            $httpBackend.expectGET('http://tsdb:4242/api/suggest?type=metrics&max=3&q=some').respond(result);

            $tsdbClient.suggest("metrics", "some", 3, function(finalResult) {
                expect(finalResult).toEqualData(result);
            }, function(err) {
                fail("Didn't expect an error");
            });

            $httpBackend.flush();
        });

    });
    
    

});