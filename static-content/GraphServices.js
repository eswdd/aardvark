aardvark
    .factory('GraphServices', [ 'tsdbClient', function($tsdbClient) {

        var ret = {};

        ret.imageRenderCount = 0;
        ret.dygraphs = {};

        ret.formEncode = function(val) {
            var newVal = val.replace(" ","+");
            if (newVal != val) {
                return ret.formEncode(newVal);
            }
            return newVal;
        }

        ret.periodToDiff = function(period) {
            var numberComponent1 = period.match(/^[0-9]+/);
            var stringComponent1 = period.match(/[a-zA-Z]+$/);
            if (numberComponent1.length == 1 && stringComponent1.length == 1) {
                return moment.duration(parseInt(numberComponent1[0]), stringComponent1[0]);
            }
            else {
                return null;
            }
        }

        ret.baselineOffset = function(global, datum) {
            switch (global.baselineDatumStyle) {
                case "from":
                    var mainFromDateTime = ret.tsdb_fromTimestampAsMoment(global, datum);
                    var fromDate = moment.utc(global.baselineFromDate, "YYYY/MM/DD");
                    var fromTime = moment.utc(global.baselineFromTime, "HH:mm:ss");
                    var baselineFromDateTime = moment.utc(fromDate.format("YYYY/MM/DD") + " " + fromTime.format("HH:mm:ss"), "YYYY/MM/DD HH:mm:ss");
                    return moment.duration(mainFromDateTime.diff(baselineFromDateTime));
                case "to":
                    var mainToDateTime = ret.tsdb_toTimestampAsMoment(global, datum);
                    var toDate = moment.utc(global.baselineToDate, "YYYY/MM/DD");
                    var toTime = moment.utc(global.baselineToTime, "HH:mm:ss");
                    var baselineToDateTime = moment.utc(toDate.format("YYYY/MM/DD") + " " + toTime.format("HH:mm:ss"), "YYYY/MM/DD HH:mm:ss");
                    return moment.duration(mainToDateTime.diff(baselineToDateTime));
                case "relative":
                    return ret.periodToDiff(global.baselineRelativePeriod);
                default:
                    throw "Unrecognized baseline datum style: "+global.baselineDatumStyle;
            }
        }

        // helper functions for dealing with tsdb data
        ret.tsdb_rateString = function(metricOptions) {
            var ret = "rate";
            if (metricOptions.rateCounter) {
                ret += "{counter";
                var rctrSep = ",";
                if (metricOptions.rateCounterMax != null && metricOptions.rateCounterMax != "") {
                    ret += "," + metricOptions.rateCounterMax;
                }
                else {
                    rctrSep = ",,";
                }
                if (metricOptions.rateCounterReset != null && metricOptions.rateCounterReset != "") {
                    ret += rctrSep + metricOptions.rateCounterReset;
                }
                ret += "}";
            }
            return ret;
        }

        ret.tsdb_fromTimestampAsTsdbString = function(global) {
            if (global.absoluteTimeSpecification) {
                var date = moment.utc(global.fromDate, "YYYY/MM/DD");
                var time = moment.utc(global.fromTime, "HH:mm:ss");
                return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            }
            else {
                if (global.relativePeriod == null || global.relativePeriod == "") {
                    return "";
                }
                return global.relativePeriod+"-ago";
            }
        }

        ret.tsdb_toTimestampAsTsdbString = function(global) {
            if (!global.absoluteTimeSpecification
                || global.toDate == null || global.toDate == ""
                || global.toTime == null || global.toTime == "") {
                return null;
            }
            else {
                var date = moment.utc(global.toDate, "YYYY/MM/DD");
                var time = moment.utc(global.toTime, "HH:mm:ss");
                return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
            }
        }

        ret.tsdb_fromTimestampAsMoment = function(global, datum) {
            var now = datum ? datum.clone() : moment.utc();
            if (global.absoluteTimeSpecification) {
                var date = moment.utc(global.fromDate, "YYYY/MM/DD");
                var time = moment.utc(global.fromTime, "HH:mm:ss");
                var dateTime = date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                return moment.utc(dateTime, "YYYY/MM/DD HH:mm:ss");
            }
            else {
                if (global.relativePeriod == null || global.relativePeriod == "") {
                    return now;
                }
                var numberComponent = global.relativePeriod.match(/^[0-9]+/);
                var stringComponent = global.relativePeriod.match(/[a-zA-Z]+$/);
                if (numberComponent.length == 1 && stringComponent.length == 1) {
                    return now.subtract(numberComponent[0], stringComponent[0]);
                }
                return now;
            }
        }

        ret.tsdb_toTimestampAsMoment = function(global, datum) {
            var now = datum ? datum.clone() : moment.utc();
            if (!global.absoluteTimeSpecification
                || global.toDate == null || global.toDate == ""
                || global.toTime == null || global.toTime == "") {
                return now;
            }
            else {
                var date = moment.utc(global.toDate, "YYYY/MM/DD");
                var time = moment.utc(global.toTime, "HH:mm:ss");
                var dateTime = date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                return moment.utc(dateTime, "YYYY/MM/DD HH:mm:ss");
            }
        }

        ret.tsdb_baselineFromTimestampAsTsdbString = function(global, datum) {
            switch (global.baselineDatumStyle) {
                case "from":
                    var date = moment.utc(global.baselineFromDate, "YYYY/MM/DD");
                    var time = moment.utc(global.baselineFromTime, "HH:mm:ss");
                    return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                case "to":
                    var diff;
                    if (global.absoluteTimeSpecification) {
                        var mainFromDateTime1 = ret.tsdb_fromTimestampAsMoment(global, datum);
                        var mainToDateTime1 = ret.tsdb_toTimestampAsMoment(global, datum);
                        diff = moment.duration(mainToDateTime1.diff(mainFromDateTime1));
                    }
                    else {
                        diff = ret.periodToDiff(global.relativePeriod);
                        if (diff == null) {
                            return null;
                        }
                    }
                    //0, 2d, 2h
                    var toDate = moment.utc(global.baselineToDate, "YYYY/MM/DD");
                    var toTime = moment.utc(global.baselineToTime, "HH:mm:ss");
                    var toDateTimeString = toDate.format("YYYY/MM/DD") + " " + toTime.format("HH:mm:ss");
                    var toDateTime = moment.utc(toDateTimeString, "YYYY/MM/DD HH:mm:ss");
                    var fromDateTime = toDateTime.subtract(diff);
                    return fromDateTime.format("YYYY/MM/DD HH:mm:ss");
                case "relative":
                    var mainFromDateTime2 = ret.tsdb_fromTimestampAsMoment(global, datum);
                    var diff1 = ret.periodToDiff(global.baselineRelativePeriod);
                    if (diff1 != null) {
                        var dateTime = mainFromDateTime2.subtract(diff1);
                        return dateTime.format("YYYY/MM/DD HH:mm:ss");
                    }
                    return null;
            }
        }

        ret.tsdb_baselineToTimestampAsTsdbString = function(global, datum) {
            switch (global.baselineDatumStyle) {
                case "from":
                    var diff;
                    if (global.absoluteTimeSpecification) {
                        var mainFromDateTime1 = ret.tsdb_fromTimestampAsMoment(global, datum);
                        var mainToDateTime1 = ret.tsdb_toTimestampAsMoment(global, datum);
                        diff = moment.duration(mainToDateTime1.diff(mainFromDateTime1));
                    }
                    else {
                        diff = ret.periodToDiff(global.relativePeriod);
                        if (diff == null) {
                            return null;
                        }
                    }
                    var fromDate = moment.utc(global.baselineFromDate, "YYYY/MM/DD");
                    var fromTime = moment.utc(global.baselineFromTime, "HH:mm:ss");
                    var fromDateTimeString = fromDate.format("YYYY/MM/DD") + " " + fromTime.format("HH:mm:ss");
                    var fromDateTime = moment.utc(fromDateTimeString, "YYYY/MM/DD HH:mm:ss");
                    var toDateTime = fromDateTime.add(diff);
                    return toDateTime.format("YYYY/MM/DD HH:mm:ss");
                case "to":
                    var date = moment.utc(global.baselineToDate, "YYYY/MM/DD");
                    var time = moment.utc(global.baselineToTime, "HH:mm:ss");
                    return date.format("YYYY/MM/DD") + " " + time.format("HH:mm:ss");
                case "relative":
                    var mainToDateTime = ret.tsdb_toTimestampAsMoment(global, datum);
                    var diff1 = ret.periodToDiff(global.baselineRelativePeriod);
                    if (diff1 != null) {
                        var dateTime = mainToDateTime.subtract(diff1);
                        return dateTime.format("YYYY/MM/DD HH:mm:ss");
                    }
                    return null;
            }
        }

        ret.tsdb_queryStringForBaseline = function(renderContext, global, graph, metrics, perLineFn, datum, downsampleOverrideFn) {
            var fromTimestamp = ret.tsdb_baselineFromTimestampAsTsdbString(global, datum);
            var toTimestamp = ret.tsdb_baselineToTimestampAsTsdbString(global, datum);
            return ret.tsdb_queryStringInternal(renderContext, fromTimestamp, toTimestamp, global.autoReload, global.globalDownsampling, global.globalDownsampleTo, graph, metrics, perLineFn, downsampleOverrideFn);
        }

        ret.tsdb_queryString = function(renderContext, global, graph, metrics, perLineFn, downsampleOverrideFn, noIgnore) {
            var fromTimestamp = ret.tsdb_fromTimestampAsTsdbString(global);
            var toTimestamp = ret.tsdb_toTimestampAsTsdbString(global);
            return ret.tsdb_queryStringInternal(renderContext, fromTimestamp, toTimestamp, global.autoReload, global.globalDownsampling, global.globalDownsampleTo, graph, metrics, perLineFn, downsampleOverrideFn, noIgnore);
        }

        ret.tsdb_queryStringInternal = function(renderContext, fromTimestamp, toTimestamp, autoReload, globalDownsampling, globalDownsampleTo, graph, metrics, perLineFn, downsampleOverrideFn, noIgnore) {
            // validation
            if (fromTimestamp == null || fromTimestamp == "") {
                renderContext.renderErrors[graph.id] = "No start date specified";
                return "";
            }
            if (metrics == null || metrics.length == 0) {
                renderContext.renderErrors[graph.id] = "No metrics specified";
                return "";
            }

            // url construction
            var url = "";

            url += "start=" + fromTimestamp;
            if (autoReload) {
                url += "&end="+moment.utc().format("YYYY/MM/DD-HH:mm:ss");
            }
            else {
                if (toTimestamp != null) {
                    url += "&end=" + toTimestamp;
                }
                else if (!(noIgnore && true)) {
                    url += "&ignore="+(++ret.imageRenderCount);
                }
            }


            for (var i=0; i<metrics.length; i++) {
                // agg:[interval-agg:][rate[{counter[,max[,reset]]}:]metric[{tag=value,...}]
                var metric = metrics[i];
                var options = metric.graphOptions;
                url += "&m=" + options.aggregator + ":";
                if (downsampleOverrideFn) {
                    url += downsampleOverrideFn(options.downsampleBy) + ":";
                }
                else if (globalDownsampling) {
                    url += globalDownsampleTo + "-" + options.downsampleBy + ":";
                }
                else if (options.downsample) {
                    url += options.downsampleTo + "-" + options.downsampleBy + ":";
                }
                if (options.rate) {
                    url += ret.tsdb_rateString(options) + ":";
                }
                else if (options.rateCounter) {
                    // todo: warnings should be appended..
                    renderContext.renderWarnings[graph.id] = "You have specified a rate counter without a rate, ignoring";
                }
                url += metric.name;
                var sep = "{";
                for (var t=0; t<metric.tags.length; t++) {
                    var tag = metric.tags[t];
                    if (tag.value != "" && (tag.groupBy == null || tag.groupBy)) {
                        url += sep + tag.name + "=" + tag.value;
                        sep = ",";
                    }
                }
                if (sep == ",") {
                    url += "}";
                }
                // tsdb 2.2+ supports filters
                if ($tsdbClient.versionNumber >= $tsdbClient.TSDB_2_2) {
                    // filters section requires the group by section to have been written out, even if empty
                    if (sep == ",") {
                        sep = "{";
                    }
                    else {
                        sep = "{}{";
                    }
                    for (var t=0; t<metric.tags.length; t++) {
                        var tag = metric.tags[t];
                        if (tag.value != "" && tag.value != "*" && tag.value != "wildcard(*)" && tag.groupBy != null && !tag.groupBy) {
                            url += sep + tag.name + "=" + tag.value;
                            sep = ",";
                        }
                    }
                    if (sep == ",") {
                        url += "}";
                    }
                }

                if (perLineFn) {
                    url += perLineFn(metric);
                }

                // ready for next metric
            }

            return url;
        }

        ret.tsdbGraphUrl = function(path, renderContext, config, global, graph, metrics, forceAxis, downsampleOverrideFn, yAxisParams, y2AxisParams, keyParams, lineSmoothing, style, globalAnnotations, addIgnore) {
            if (path == null) {
                // gui
                path = "/#";
            }
            var url = config.tsdbBaseReadUrl+path;
            var qs = ret.tsdb_queryString(renderContext, global, graph, metrics, function(metric) {
                if (forceAxis != null) {
                    return "&o=axis+"+forceAxis;
                }
                if (metric.graphOptions.axis == null) {
                    return "&o=axis+x1y1";
                }
                return "&o=axis+"+metric.graphOptions.axis;
            }, downsampleOverrideFn, !addIgnore);

            if (qs == "") {
                return;
            }

            url += qs;

            var usingLeftAxis = false;
            var usingRightAxis = false;
            for (var i=0; i<metrics.length; i++) {
                if (metrics[i].graphOptions.axis == null || metrics[i].graphOptions.axis == "x1y1" || forceAxis == "x1y1") {
                    usingLeftAxis = true;
                }
                else if (metrics[i].graphOptions.axis == "x1y2" || forceAxis == "x1y2") {
                    usingRightAxis = true;
                }
                else {
                    renderContext.renderErrors[graph.id] = "Invalid axis specified";
                    return;
                }
            }

            if (usingLeftAxis && yAxisParams != null) {
                if (yAxisParams.label != null) {
                    url += "&ylabel=" + ret.formEncode(yAxisParams.label);
                }
                if (yAxisParams.format != null) {
                    url += "&yformat=" + ret.formEncode(yAxisParams.format);
                }
                if (yAxisParams.range != null) {
                    url += "&yrange=" + ret.formEncode(yAxisParams.range);
                }
                else if (yAxisParams.squashNegative != null && yAxisParams.squashNegative) {
                    url += "&yrange=" + ret.formEncode("[0:]");
                }
                if (yAxisParams.logscale != null && yAxisParams.logscale) {
                    url += "&ylog";
                }
            }

            if (usingRightAxis && y2AxisParams != null) {
                if (y2AxisParams.label != null) {
                    url += "&y2label=" + ret.formEncode(y2AxisParams.label);
                }
                if (y2AxisParams.format != null) {
                    url += "&y2format=" + ret.formEncode(y2AxisParams.format);
                }
                if (y2AxisParams.range != null) {
                    url += "&y2range=" + ret.formEncode(y2AxisParams.range);
                }
                else if (y2AxisParams.squashNegative != null && y2AxisParams.squashNegative) {
                    url += "&y2range=" + ret.formEncode("[0:]");
                }
                if (y2AxisParams.logscale != null && y2AxisParams.logscale) {
                    url += "&y2log";
                }
            }

            if (keyParams != null) {
                var keyPos = keyParams.keyLocation;
                if (keyPos == null || keyPos == "") {
                    keyPos = "top left";
                }
                if (keyParams.keyAlignment == "horizontal") {
                    keyPos += " horiz";
                }
                if (keyParams.keyBox) {
                    keyPos += " box";
                }
                url += "&key=" + ret.formEncode(keyPos);
            }
            else {
                url += "&nokey";
            }

            if (lineSmoothing) {
                url += "&smooth=csplines";
            }


            if (style != null) {
                url += "&style="+style;
            }

            if (globalAnnotations) {
                url += "&global_annotations";
            }
            return url;

        }

        ret.timeSeriesName = function(metric) {
            var name = metric.metric;
            var ungroupedString = "";
            var ungroupedSep = "";
            var tagNames = [];
            if (metric.query != null) {
                // metric.query.tags is deprecated
                if (metric.query.filters != null) {
                    var filtersByTagk = {};
                    for (var f=0; f<metric.query.filters.length; f++) {
                        if (!filtersByTagk.hasOwnProperty(metric.query.filters[f].tagk)) {
                            filtersByTagk[metric.query.filters[f].tagk] = [];
                        }
                        filtersByTagk[metric.query.filters[f].tagk].push(metric.query.filters[f]);
                    }
                    // type/tagk/filter/group_by
                    for (var tagk in filtersByTagk) {
                        var exclude = false;
                        var groupBy = false;
                        var tagkUngroupedString = "";
                        var tagkUngroupedSep = "";
                        for (var f=0; f<filtersByTagk[tagk].length; f++) {
                            if (filtersByTagk[tagk][f].group_by) {
                                groupBy = true;
                            }
                            tagkUngroupedString += tagkUngroupedSep + tagk + "=" + filtersByTagk[tagk][f].type + "(" + filtersByTagk[tagk][f].filter + ")";
                            tagkUngroupedSep = ",";
                        }
                        if (!groupBy) {
                            exclude = true;
                            ungroupedString += ungroupedSep + tagkUngroupedString;
                            ungroupedSep = ",";
                        }
                        if (!exclude) {
                            tagNames.push(tagk);
                        }
                    }
                }
            }
            else {
                for (var tk in metric.tags) {
                    if (metric.tags.hasOwnProperty(tk)) {
                        tagNames.push(tk);
                    }
                }
            }
            tagNames.sort();
            if (tagNames.length > 0 || ungroupedString != "") {
                name += "{";
                tagNames.sort();
                var sep = "";
                for (var tk = 0; tk < tagNames.length; tk++) {
                    name += sep + tagNames[tk] + "=" + metric.tags[tagNames[tk]];
                    sep = ",";
                }
                name += "}";
                if (ungroupedString != "") {
                    name += "{" + ungroupedString + "}";
                }
            }
            return name;
        }

        ret.dygraph_render = function(divId, graphId, data, config) {
            var div = document.getElementById(divId);
            // dygraph uses these as gospel, unfortunately it also sets them, so making it impossible to change size later
            div.style.width = '';
            div.style.height = '';
            var g = new Dygraph(
                // containing div
                div,
                data,
                config
            );

            ret.dygraphs[graphId] = g;

            return g;
        }

        ret.dygraph_setAnnotations = function(g, annotations) {
            //annotations.sort(function(a,b){return a.xval - b.xval;})
            g.setAnnotations(annotations);
        }
        
        return ret;
    }]);