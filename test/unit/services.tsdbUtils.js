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

    describe('tsdbUtils', function () {
        var $httpBackend, $tsdbClient, $tsdbUtils;

        beforeEach(inject(function (_$httpBackend_, tsdbClient, tsdbUtils) {
            $httpBackend = _$httpBackend_;

            // hmm
            $httpBackend.expectGET('http://tsdb:4242/api/config').respond({});
            $httpBackend.expectGET('http://tsdb:4242/api/version').respond({version: "2.0.0"});
            tsdbClient.init({
                tsdbBaseReadUrl: "http://tsdb:4242",
                tsdbBaseWriteUrl: "http://tsdb:4242"
            });
            $httpBackend.flush();
            $tsdbUtils = tsdbUtils;
            $tsdbClient = tsdbClient;
        }));
    
        it('expects the tsdb utils to exist', function() {
            expect($tsdbUtils).toBeDefined();
        });
        
        var getMetricAndTagsViaTsMeta = function(configKey) {
            $tsdbClient.config = {};
            $tsdbClient.config[configKey] = "true";
            $tsdbClient.getTSMetaByTsuid = function(tsuid, successFn, errorFn) {
                expect(tsuid).toEqualData("000001000001000001000002000002");
                successFn({metric:"abc", tags: {a:"b", c:"d"}});
            }
            $tsdbUtils.tsuidToMetricAndTags("000001000001000001000002000002", function(metricAndTags) {
                expect(metricAndTags.metric).toEqualData("abc");
                expect(metricAndTags.tags).toEqualData({a:"b", c:"d"});
            }, function(error) {
                fail("didn't expect error: "+error);
            });
        };
        
        it('expects to get the metric and tags directly from tsdb if tsd.core.meta.enable_tsuid_tracking is enabled', function() {
            getMetricAndTagsViaTsMeta("tsd.core.meta.enable_tsuid_tracking");
        });
        
        it('expects to get the metric and tags directly from tsdb if tsd.core.meta.enable_tsuid_incrementing is enabled', function() {
            getMetricAndTagsViaTsMeta("tsd.core.meta.enable_tsuid_incrementing");
        });
        
        it('expects to get the metric and tags directly from tsdb if tsd.core.meta.enable_realtime_ts is enabled', function() {
            getMetricAndTagsViaTsMeta("tsd.core.meta.enable_realtime_ts");
        });
        
        it('expects to get the metric and tags via multiple uidmeta calls if no tsmeta option is enabled in TSDB config', function() {
            $tsdbClient.getUidMeta = function(uid, type, successFn, errorFn) {
                if (type == "metric") {
                    expect(uid).toEqualData("000001");
                    successFn({name:"abc"});
                }    
                else if (type == "tagk") {
                    if (uid == "000001") {
                        successFn({name:"a"});
                    }
                    else if (uid == "000002") {
                        successFn({name:"c"});
                    } 
                    else {
                        fail("Expected tagk uid to be either 000001 or 000002, not "+uid);
                    }
                }  
                else if (type == "tagv") {
                    if (uid == "000001") {
                        successFn({name:"b"});
                    }
                    else if (uid == "000002") {
                        successFn({name:"d"});
                    } 
                    else {
                        fail("Expected tagv uid to be either 000001 or 000002, not "+uid);
                    }
                }
                else {
                    fail("Invalid type: "+type);
                }
            }
            $tsdbUtils.tsuidToMetricAndTags("000001000001000001000002000002", function(metricAndTags) {
                expect(metricAndTags.metric).toEqualData("abc");
                expect(metricAndTags.tags).toEqualData({a:"b", c:"d"});
            }, function(error) {
                fail("didn't expect error: "+error);
            });
        });
        
        it('expects to get the metric and tags via multiple uidmeta calls if no tsmeta option is enabled in TSDB config but non-standard uid widths are', function() {
            $tsdbClient.config = {
                "tsd.storage.uid.width.metric": "4",
                "tsd.storage.uid.width.tagk": "2",
                "tsd.storage.uid.width.tagv": "5"
            };
            $tsdbClient.getUidMeta = function(uid, type, successFn, errorFn) {
                if (type == "metric") {
                    expect(uid).toEqualData("00000001");
                    successFn({name:"abc"});
                }    
                else if (type == "tagk") {
                    if (uid == "0001") {
                        successFn({name:"a"});
                    }
                    else if (uid == "0002") {
                        successFn({name:"c"});
                    } 
                    else {
                        fail("Expected tagk uid to be either 0001 or 0002, not "+uid);
                    }
                }  
                else if (type == "tagv") {
                    if (uid == "0000000001") {
                        successFn({name:"b"});
                    }
                    else if (uid == "0000000002") {
                        successFn({name:"d"});
                    } 
                    else {
                        fail("Expected tagv uid to be either 000001 or 000002, not "+uid);
                    }
                }
                else {
                    fail("Invalid type: "+type);
                }
            }
            $tsdbUtils.tsuidToMetricAndTags("000000010001000000000100020000000002", function(metricAndTags) {
                expect(metricAndTags.metric).toEqualData("abc");
                expect(metricAndTags.tags).toEqualData({a:"b", c:"d"});
            }, function(error) {
                fail("didn't expect error: "+error);
            });
        });

    });
    
    

});