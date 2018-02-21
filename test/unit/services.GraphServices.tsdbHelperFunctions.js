'use strict';

/* jasmine specs for controllers go here */
describe('Aardvark services', function () {

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

    describe('GraphServices.tsdbHelperFunctions', function() {
        var tsdbClient;
        var graphServices;
        var renderContext;

        beforeEach(module(function ($provide) {
            tsdbClient = {
                TSDB_2_0: 2000,
                TSDB_2_1: 2001,
                TSDB_2_2: 2002,
                TSDB_2_3: 2003
            };
            $provide.value('tsdbClient', tsdbClient)
        }));

        beforeEach(inject(function (GraphServices) {
            // hmm
            graphServices = GraphServices;

            renderContext = {};
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
            renderContext.renderMessages = {};
        }));
        
        // ---------- tsdb helper functions ------
        

        it('should return an empty tsdb string for the from field when time is relative and no time specified', function() {
            var result = graphServices.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": ""
            });
            expect(result).toEqualData("");
        });

        it('should return a valid tsdb string for the to field when time is relative', function() {
            var result = graphServices.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData(null);
        });

        it('should return a valid tsdb string for the from field when time is relative', function() {
            var result = graphServices.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            });
            expect(result).toEqualData("2h-ago");
        });

        it('should return a valid date object for the from field when time is relative', function() {
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");

            var result = graphServices.tsdb_fromTimestampAsMoment({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result).toEqualData(datum.subtract(moment.duration(2, "hours")));
        });

        it('should return a valid date object for the to field when time is relative', function() {
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");

            var result = graphServices.tsdb_toTimestampAsMoment({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h"
            }, datum);
            expect(result.format("YYYY/MM/DD HH:mm:ss")).toEqualData(datum.format("YYYY/MM/DD HH:mm:ss"));
        });

        it('should return a valid tsdb string for the from field when time is absolute and date/time inputs are not supported', function() {
            var result = graphServices.tsdb_fromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });

        it('should return a valid tsdb string for the to field when time is absolute and date/time inputs are not supported', function() {
            var result = graphServices.tsdb_toTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            });
            expect(result).toEqualData("2016/02/24 12:23:22");
        });
        
        it('should return a valid date object for the from field when time is absolute and date/time inputs are not supported', function() {
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");

            var result = graphServices.tsdb_fromTimestampAsMoment({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });

        it('should return a valid date object for the to field when time is absolute and date/time inputs are not supported', function() {
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");

            var result = graphServices.tsdb_toTimestampAsMoment({
                "absoluteTimeSpecification": true,
                "toDate": "2016/02/24",
                "toTime": "12:23:22"
            }, datum);
            expect(result).toEqualData(datum);
        });
        
        it('should return the correct tsdb string for the "from" field for baseline queries when using "relative" baseline datum', function() {
            // absolute from date/time - subtract relative period from "from" field
            var result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData("2016/02/23 12:23:22");

            // absolute from and to date/time - subtract relative period from "from" field (same as prev)
            result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData("2016/02/23 12:23:22");
            
            // relative time specification
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");
            result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, datum);
            expect(result).toEqualData("2016/02/23 10:23:22");
        });
        
        it('should return the correct tsdb string for the "from" field for baseline queries when using "from" date/time baseline datum', function() {
            // absolute from date/time - use baseline from
            var result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/23 10:10:10");
            
            // absolute from and to date/time - use baseline from (same as prev)
            result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/23 10:10:10");

            // relative time specification - use baseline from (same as prev)
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");
            result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, datum);
            expect(result).toEqualData("2016/01/23 10:10:10");
        });
        
        it('should return the correct tsdb string for the "from" field for baseline queries when using "to" date/time baseline datum', function() {
            var datum = moment.utc("2016/02/26 12:23:22", "YYYY/MM/DD HH:mm:ss");
            // absolute from date/time - null "to" means now, so diff time between "from" and datum and subtract from baseline "to" date/time
            var result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                "baselineToDate": "2016/02/23",
                "baselineToTime": "13:13:13"
            }, datum);
            expect(result).toEqualData("2016/02/21 13:13:13");
            
            // absolute from and to date/time - diff time between from and to and subtract from baseline "to"
            result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                "baselineToDate": "2016/02/23",
                "baselineToTime": "13:13:13"
            }, null);
            expect(result).toEqualData("2016/02/21 13:13:13");
            
            // relative time specification - relative to datum. subtract relative time from baseline "to"
            result = graphServices.tsdb_baselineFromTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "to",
                "baselineToDate": "2016/02/23",
                "baselineToTime": "13:13:13"
            }, null);
            expect(result).toEqualData("2016/02/23 11:13:13");
        });
        
        it('should return the correct tsdb string for the "to" field for baseline queries when using "relative" baseline datum', function() {
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");
            // absolute from date/time - null means now so will be baselineRelativePeriod prior to datum
            var result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/23",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, datum);
            expect(result).toEqualData("2016/02/23 12:23:22");
            
            // absolute from and to date/time - subtract period from to date/time
            result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/03/23",
                "toTime": "13:13:13",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData("2016/03/22 13:13:13");
            
            // relative time specification - will be baselineRelativePeriod prior to datum
            result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, datum);
            expect(result).toEqualData("2016/02/23 12:23:22");
        });
        
        it('should return the correct tsdb string for the "to" field for baseline queries when using "from" date/time baseline datum', function() {
            var datum = moment.utc("2016/02/24 12:23:22", "YYYY/MM/DD HH:mm:ss");
            // absolute from date/time - "to" means now, so calc datum - from and add this to baseline "from"
            var result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/21",
                baselineFromTime: "10:10:10"
            }, datum);
            expect(result).toEqualData("2016/02/23 10:10:10");
            
            // absolute from and to date/time - calc to - from and add this to baseline "from"
            result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                "toDate": "2016/01/23",
                "toTime": "13:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/21",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/22 11:10:10");
            
            // relative time specification - add relative time to baseline "from"
            result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/21",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 12:10:10");
        });
        
        it('should return the correct tsdb string for the "to" field for baseline queries when using "to" date/time baseline datum', function() {
            // absolute from date/time - null "to" means now, so just use baseline "to" date/time
            var result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 10:10:10");
            
            // absolute from and to date/time - will just be absolute "to", so just use baseline "to" date/time
            result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                "toDate": "2016/01/23",
                "toTime": "13:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 10:10:10");
            
            // relative time specification - relative to now, so just use baseline "to" date/time
            result = graphServices.tsdb_baselineToTimestampAsTsdbString({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData("2016/01/21 10:10:10");
        });
        
        it('should return the correct duration when using the "from" baseline datum style', function() {
            // absolute from date/time - use baseline from
            var result = graphServices.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/24",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:23:10"
            }, null);
            expect(result).toEqualData(moment.duration(26,'h').add(moment.duration(12,'s')));

            // absolute from and to date/time - use baseline from (same as prev)
            result = graphServices.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/24",
                "fromTime": "12:23:22",
                "toDate": "2016/02/26",
                "toTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, null);
            expect(result).toEqualData(moment.duration(26,'h').add(moment.duration(13,'m').add(moment.duration(12,'s'))));

            // relative time specification - use baseline from (same as prev)
            var datum = moment.utc("2016/01/24 12:23:22", "YYYY/MM/DD HH:mm:ss");
            result = graphServices.baselineOffset({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "from",
                baselineFromDate: "2016/01/23",
                baselineFromTime: "10:10:10"
            }, datum);
            expect(result).toEqualData(moment.duration(24,'h').add(moment.duration(13,'m').add(moment.duration(12,'s'))));
        });
        
        it('should return the correct duration when using the "to" baseline datum style', function() {
            var datum = moment.utc("2016/01/22 14:10:10", "YYYY/MM/DD HH:mm:ss");
            // absolute from date/time - null "to" means now
            var result = graphServices.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, datum);
            expect(result).toEqualData(moment.duration(28,'h'));

            // absolute from and to date/time
            result = graphServices.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/22",
                "fromTime": "12:23:22",
                "toDate": "2016/01/23",
                "toTime": "10:10:10",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, null);
            expect(result).toEqualData(moment.duration(48,'h'));

            // relative time specification, to is null == datum
            result = graphServices.baselineOffset({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "to",
                baselineToDate: "2016/01/21",
                baselineToTime: "10:10:10"
            }, datum);
            expect(result).toEqualData(moment.duration(28,'h'));
        });
        
        it('should return the correct duration when using the "relative" baseline datum style', function() {
            // absolute from date/time - null means now so will be baselineRelativePeriod prior to datum
            var result = graphServices.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/01/23",
                "fromTime": "12:23:22",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData(moment.duration(1,'d'));

            // absolute from and to date/time - subtract period from to date/time
            result = graphServices.baselineOffset({
                "absoluteTimeSpecification": true,
                "fromDate": "2016/02/24",
                "fromTime": "12:23:22",
                "toDate": "2016/03/23",
                "toTime": "13:13:13",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData(moment.duration(1,'d'));

            // relative time specification - will be baselineRelativePeriod prior to datum
            result = graphServices.baselineOffset({
                "absoluteTimeSpecification": false,
                "relativePeriod": "2h",
                baselining: true,
                baselineDatumStyle: "relative",
                baselineRelativePeriod: "1d"
            }, null);
            expect(result).toEqualData(moment.duration(1,'d'));
        });
        
        it('expects the url generation to record a warning if there is no fromTimestamp', function() {
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, null,"1h",false, true, false, null, {id:"abc"}, [], null)).toEqualData("");
            expect(renderContext.renderErrors.abc).toEqualData("No start date specified");

            delete renderContext.renderErrors["abc"];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "","1h",false, true, false, null, {id:"abc"}, [], null)).toEqualData("");
            expect(renderContext.renderErrors.abc).toEqualData("No start date specified");
        });
        
        it('expects the url generation to record a warning if there are no queries', function() {
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, null, null)).toEqualData("");
            expect(renderContext.renderErrors.abc).toEqualData("No queries specified");

            delete renderContext.renderErrors["abc"];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, [], null)).toEqualData("");
            expect(renderContext.renderErrors.abc).toEqualData("No queries specified");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with no tags', function() {
            
            var metrics = [{type: "metric", name: "metric1", tags: [], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with tags with empty values', function() {
            
            var metrics = [{type: "metric", name: "metric1", tags: [{name: "key", value: ""}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with some tags with values', function() {
            
            var metrics = [{type: "metric", name: "metric1", tags: [{name: "key", value: ""},{name:"host", value: "host1"}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1{host=host1}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with some tags with values with group by false on v2.0.0', function() {
            
            var metrics = [{type: "metric", name: "metric1", tags: [{name: "key", value: "value", groupBy: true},{name:"host", value: "host1", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1{key=value}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with a tag with 2 values with group by false and true on v2.2.0', function() {
            
            tsdbClient.versionNumber = 2002;
            var metrics = [{type: "metric", name: "metric1", tags: [{name: "key", value: "wildcard(a*)", groupBy: true},{name:"key", value: "wildcard(*a)", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1{key=wildcard(a*)}{key=wildcard(*a)}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with a tag with 2 values with group by true on v2.2.0', function() {
            
            tsdbClient.versionNumber = 2002;
            var metrics = [{type: "metric", name: "metric1", tags: [{name: "key", value: "wildcard(a*)", groupBy: true},{name:"key", value: "wildcard(*a)", groupBy: true}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1{key=wildcard(a*),key=wildcard(*a)}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with a tag with 2 values with group by false on v2.2.0', function() {
            
            tsdbClient.versionNumber = 2002;
            var metrics = [{type: "metric", name: "metric1", tags: [{name: "key", value: "wildcard(a*)", groupBy: false},{name:"key", value: "wildcard(*a)", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1{}{key=wildcard(a*),key=wildcard(*a)}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with some tags with values with group by false on v2.2.0', function() {
            
            tsdbClient.versionNumber = 2002;
            var metrics = [{type: "metric", name: "metric1", tags: [{name: "key", value: "value", groupBy: true},{name:"host", value: "host1", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1{key=value}{host=host1}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with tags with values only with group by false on v2.2.0', function() {
            
            tsdbClient.versionNumber = 2002;
            var metrics = [{type: "metric", name: "metric1", tags: [{name:"host", value: "host1", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1{}{host=host1}");
        });
        
        it('expects the url to be generated correctly with no graph options and 1 metric with tags with filter values of all', function() {
            
            tsdbClient.versionNumber = 2002;
            var metrics = [{type: "metric", name: "metric1", tags: [{name:"host", value: "*", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1");

            metrics = [{type: "metric", name: "metric1", tags: [{name:"host", value: "wildcard(*)", groupBy: false}], graphOptions: { aggregator: "sum" }}];
            expect(graphServices.tsdb_queryStringInternal(renderContext, null, "1d","1h",false, true, false, null, {id:"abc"}, metrics, null)).toEqualData("start=1d&end=1h&m=sum:metric1");
        });
        
        it('should generate a legacy time series name when no query is provided', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"]
            };
            expect(graphServices.timeSeriesName(ts)).toEqualData("fred{tag1=value1,tag2=value2,tag3=value3,tag4=value4}");
        })
        
        it('should generate a reduced time series name when the query is provided', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [],
                    rateOptions: null
                }
            };
            expect(graphServices.timeSeriesName(ts)).toEqualData("fred");
        });
        
        it('should generate a reduced time series name when the query is provided using filters', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [
                        {tagk:"tag2",type:"wildcard",filter:"value*",group_by:true},
                        {tagk:"tag4",type:"literal_or",filter:"value4",group_by:true}
                    ],
                    rateOptions: null
                }
            };
            expect(graphServices.timeSeriesName(ts)).toEqualData("fred{tag2=value2,tag4=value4}");
        });
        
        it('should generate a reduced time series name when the query is provided using ungrouped filters', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [
                        {tagk:"tag2",type:"wildcard",filter:"value*",group_by:false},
                        {tagk:"tag4",type:"regexp",filter:"value4",group_by:false}
                    ],
                    rateOptions: null
                }
            };
            expect(graphServices.timeSeriesName(ts)).toEqualData("fred{}{tag2=wildcard(value*),tag4=regexp(value4)}");
        });
        
        it('should generate a reduced time series name when the query is provided using mixed grouped filters', function() {
            var ts = {
                metric: "fred",
                tags: {
                    tag1: "value1",
                    tag2: "value2",
                    tag3: "value3",
                    tag4: "value4"
                },
                aggregatedTags: ["tag5","tag6"],
                query: {
                    aggregator: "sum",
                    tsuids: null,
                    downsample: null,
                    rate: true,
                    explicitTags: false,
                    filters: [
                        {tagk:"tag2",type:"wildcard",filter:"value*",group_by:true},
                        {tagk:"tag2",type:"regexp",filter:"value4",group_by:false}
                    ],
                    rateOptions: null
                }
            };
            expect(graphServices.timeSeriesName(ts)).toEqualData("fred{tag2=value2}");
        });
        
        it('should generate the correct time series names when the query specified in issue #156 is supplied', function() {
            var ts = [
                {
                    "metric": "tsd.rpc.received",
                    "tags": {
                        "host": "hadoopdata2"
                    },
                    "aggregateTags": [
                        "type"
                    ],
                    "query": {
                        "aggregator": "sum",
                        "metric": "tsd.rpc.received",
                        "tsuids": null,
                        "downsample": null,
                        "rate": false,
                        "filters": [
                            {
                                "tagk": "host",
                                "filter": "*",
                                "group_by": true,
                                "type": "wildcard"
                            }
                        ],
                        "rateOptions": null,
                        "tags": {
                            "host": "wildcard(*)"
                        }
                    },
                    "tsuids": [
                        "6D8DA1000001000000940000040000009C",
                        "6D8DA1000001000000940000040000009D",
                        "6D8DA1000001000000940000040000009E",
                        "6D8DA100000100000094000004000000A4"
                    ],
                    "dps": [
                    ]
                },
                {
                    "metric": "tsd.rpc.received",
                    "tags": {
                        "host": "hadoopdata4"
                    },
                    "aggregateTags": [
                        "type"
                    ],
                    "query": {
                        "aggregator": "sum",
                        "metric": "tsd.rpc.received",
                        "tsuids": null,
                        "downsample": null,
                        "rate": false,
                        "filters": [
                            {
                                "tagk": "host",
                                "filter": "*",
                                "group_by": true,
                                "type": "wildcard"
                            }
                        ],
                        "rateOptions": null,
                        "tags": {
                            "host": "wildcard(*)"
                        }
                    },
                    "tsuids": [
                        "6D8DA1000001000000950000040000009C",
                        "6D8DA1000001000000950000040000009D",
                        "6D8DA1000001000000950000040000009E",
                        "6D8DA100000100000095000004000000A4"
                    ],
                    "dps": [
                    ]
                },
                {
                    "metric": "tsd.rpc.received",
                    "tags": {
                        "host": "hadoopdata1"
                    },
                    "aggregateTags": [
                        "type"
                    ],
                    "query": {
                        "aggregator": "sum",
                        "metric": "tsd.rpc.received",
                        "tsuids": null,
                        "downsample": null,
                        "rate": false,
                        "filters": [
                            {
                                "tagk": "host",
                                "filter": "*",
                                "group_by": true,
                                "type": "wildcard"
                            }
                        ],
                        "rateOptions": null,
                        "tags": {
                            "host": "wildcard(*)"
                        }
                    },
                    "tsuids": [
                        "6D8DA1000001000000960000040000009C",
                        "6D8DA1000001000000960000040000009D",
                        "6D8DA1000001000000960000040000009E",
                        "6D8DA100000100000096000004000000A4"
                    ],
                    "dps": [
                    ]
                },
                {
                    "metric": "tsd.rpc.received",
                    "tags": {
                        "host": "hadoopdata3"
                    },
                    "aggregateTags": [
                        "type"
                    ],
                    "query": {
                        "aggregator": "sum",
                        "metric": "tsd.rpc.received",
                        "tsuids": null,
                        "downsample": null,
                        "rate": false,
                        "filters": [
                            {
                                "tagk": "host",
                                "filter": "*",
                                "group_by": true,
                                "type": "wildcard"
                            }
                        ],
                        "rateOptions": null,
                        "tags": {
                            "host": "wildcard(*)"
                        }
                    },
                    "tsuids": [
                        "6D8DA1000001000000970000040000009C",
                        "6D8DA1000001000000970000040000009D",
                        "6D8DA1000001000000970000040000009E",
                        "6D8DA100000100000097000004000000A4"
                    ],
                    "dps": [
                    ]
                },
                {
                    "metric": "tsd.rpc.received",
                    "tags": {
                        "host": "hadoopdata5"
                    },
                    "aggregateTags": [
                        "type"
                    ],
                    "query": {
                        "aggregator": "sum",
                        "metric": "tsd.rpc.received",
                        "tsuids": null,
                        "downsample": null,
                        "rate": false,
                        "filters": [
                            {
                                "tagk": "host",
                                "filter": "*",
                                "group_by": true,
                                "type": "wildcard"
                            }
                        ],
                        "rateOptions": null,
                        "tags": {
                            "host": "wildcard(*)"
                        }
                    },
                    "tsuids": [
                        "6D8DA1000001000001D30000040000009C",
                        "6D8DA1000001000001D30000040000009D",
                        "6D8DA1000001000001D30000040000009E",
                        "6D8DA1000001000001D3000004000000A4"
                    ],
                    "dps": [
                    ]
                }
            ];
            expect(graphServices.timeSeriesName(ts[0])).toEqualData("tsd.rpc.received{host=hadoopdata2}");
            expect(graphServices.timeSeriesName(ts[1])).toEqualData("tsd.rpc.received{host=hadoopdata4}");
            expect(graphServices.timeSeriesName(ts[2])).toEqualData("tsd.rpc.received{host=hadoopdata1}");
            expect(graphServices.timeSeriesName(ts[3])).toEqualData("tsd.rpc.received{host=hadoopdata3}");
            expect(graphServices.timeSeriesName(ts[4])).toEqualData("tsd.rpc.received{host=hadoopdata5}");
        });
        
        // todo: finish url generation
        // todo: validate baseline is before standard when using absolute datums
    });
});

