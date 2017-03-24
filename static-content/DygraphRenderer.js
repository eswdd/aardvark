aardvark
    .factory('DygraphRenderer', ['GraphServices', '$http', '$uibModal', 'tsdbClient', 'tsdbUtils', function(graphServices, $http, $uibModal, tsdbClient, tsdbUtils) {
        // todo: specifying ratio and auto scale is going to look darn odd - need to decide what to do - add issue for this..
        var renderer = {
            create: function() {
                var ret = {
                    type: "dygraph",
                    supports_tsdb_export: true,
                    supports_grafana_export: false,
                    tsdb_export_link: "",
                    grafana_export_text: ""
                };
                ret.render = function(renderContext, config, global, graph, queries, datum) {
                    ret.tsdb_export_link = "";
                    var fromTimestamp = graphServices.tsdb_fromTimestampAsTsdbString(global);
                    // validation
                    if (fromTimestamp == null || fromTimestamp == "") {
                        renderContext.renderErrors[graph.id] = "No start date specified";
                        return;
                    }
                    if (queries == null || queries.length == 0) {
                        renderContext.renderErrors[graph.id] = "No queries specified";
                        return;
                    }

                    var dygraphOptions = graph.dygraph;
                    if (!dygraphOptions) {
                        dygraphOptions = {};
                    }

                    if (dygraphOptions.countFilter != null && dygraphOptions.countFilter.count + "" != "" && dygraphOptions.countFilter.count < 1) {
                        renderContext.renderErrors[graph.id] = "Minimum count for filtering is 1";
                        return;
                    }
                    if (dygraphOptions.valueFilter != null && dygraphOptions.valueFilter.lowerBound != "" && dygraphOptions.valueFilter.upperBound != "" && dygraphOptions.valueFilter.lowerBound > dygraphOptions.valueFilter.upperBound) {
                        renderContext.renderErrors[graph.id] = "Upper bound on value filter is less than lower bound";
                        return;
                    }
                    if (dygraphOptions.valueFilter != null && dygraphOptions.valueFilter.lowerBound != "" && dygraphOptions.valueFilter.upperBound != "" && dygraphOptions.valueFilter.lowerBound == dygraphOptions.valueFilter.upperBound) {
                        renderContext.renderWarnings[graph.id] = "Lower bound on value filter is same as upper bound";
                    }
                    var y1AxisRange = graphServices.parseDygraphAxisRange(renderContext, graph, dygraphOptions.y1AxisRange);
                    var y2AxisRange = graphServices.parseDygraphAxisRange(renderContext, graph, dygraphOptions.y2AxisRange);

                    renderContext.renderMessages[graph.id] = "Loading...";

                    // baseline approach
                    // 1. make both queries
                    // 2. link results together so that we have a way of mapping from main to baseline
                    // 3. perform filtering based on main, but remove matching baseline if exclude
                    // 4. initial label setting (both sets)
                    // 5. auto-scaling and label adjustment (both together)
                    // 6. baseline time adjustment
                    // 7. min/max time calculations (together)
                    // 8. seperate processing
                    //  a. ratio graphs
                    //  b. mean adjustment
                    //  c. negative squashing
                    // 9. gap filling / merge timeseries (together)
                    // 10. merge labels
                    // 11. render graph

                    var processJson = function(mainJson, baselineJson) {
                        if (!mainJson || mainJson.length == 0) {
                            renderContext.renderErrors[graph.id] = "Empty response from TSDB";
                            renderContext.renderMessages[graph.id] = "";
                            return;
                        }
                        var baselining = global.baselining;
                        if ((baselining && (!baselineJson || baselineJson.length == 0))) {
                            renderContext.renderWarnings[graph.id] = "Empty response from TSDB for baseline query";
                            baselining = false;
                        }

                        var width = Math.floor(graph.graphWidth);
                        var height = Math.floor(graph.graphHeight);

                        var graphData = [];

                        // 3. perform filtering based on main, but remove matching baseline if exclude 
                        var filteredOut = [];
                        var measured = null;
                        if (dygraphOptions.countFilter != null && dygraphOptions.countFilter.count != "" && dygraphOptions.countFilter.count < mainJson.length) {
                            measured = new Array(mainJson.length);
                            var sorted = new Array(mainJson.length);
                            for (var i=0; i<mainJson.length; i++) {
                                switch (dygraphOptions.countFilter.measure) {
                                    case "mean":
                                        measured[i] = 0;
                                        for (var p=0; p<mainJson[i].dps.length; p++) {
                                            measured[i] +=  mainJson[i].dps[p][1];
                                        }
                                        measured[i] /= mainJson[i].dps.length;
                                        break;
                                    case "min":
                                        measured[i] = Number.MAX_VALUE;
                                        for (var p=0; p<mainJson[i].dps.length; p++) {
                                            measured[i] = Math.min(measured[i], mainJson[i].dps[p][1]);
                                        }
                                        break;
                                    case "max":
                                        measured[i] = Number.MIN_VALUE;
                                        for (var p=0; p<mainJson[i].dps.length; p++) {
                                            measured[i] = Math.max(measured[i], mainJson[i].dps[p][1]);
                                        }
                                        break;
                                }
                                sorted[i] = measured[i];
                            }
                            // increasing order
                            sorted.sort(function(a,b){return a-b;}); // default sort is alphanumeric!
                            if (dygraphOptions.countFilter.end == "top") {
                                var thresholdIndex1 = (mainJson.length - dygraphOptions.countFilter.count);
                                var threshold1 = sorted[thresholdIndex1];
                                for (var i=mainJson.length-1; i>=0; i--) {
                                    if (measured[i] < threshold1) {
                                        filteredOut.push(mainJson[i]);
                                        mainJson.splice(i,1);
                                        measured.splice(i,1);
                                    }
                                }
                            }
                            else if (dygraphOptions.countFilter.end == "bottom") {
                                var thresholdIndex2 = dygraphOptions.countFilter.count - 1;
                                var threshold2 = sorted[thresholdIndex2];
                                for (var i=mainJson.length-1; i>=0; i--) {
                                    if (measured[i] > threshold2) {
                                        filteredOut.push(mainJson[i]);
                                        mainJson.splice(i,1);
                                        measured.splice(i,1);
                                    }
                                }
                            }
                        }
                        if (dygraphOptions.valueFilter != null && (dygraphOptions.valueFilter.lowerBound != "" || dygraphOptions.valueFilter.upperBound != "")) {
                            if ((dygraphOptions.countFilter && dygraphOptions.valueFilter.measure != dygraphOptions.countFilter.measure) || measured == null) {
                                measured = new Array(mainJson.length);
                                for (var i=0; i<mainJson.length; i++) {
                                    switch (dygraphOptions.valueFilter.measure) {
                                        case "mean":
                                            measured[i] = 0;
                                            for (var p=0; p<mainJson[i].dps.length; p++) {
                                                measured[i] +=  mainJson[i].dps[p][1];
                                            }
                                            measured[i] /= mainJson[i].dps.length;
                                            break;
                                        case "min":
                                            measured[i] = Number.MAX_VALUE;
                                            for (var p=0; p<mainJson[i].dps.length; p++) {
                                                measured[i] = Math.min(measured[i], mainJson[i].dps[p][1]);
                                            }
                                            break;
                                        case "max":
                                            measured[i] = Number.MIN_VALUE;
                                            for (var p=0; p<mainJson[i].dps.length; p++) {
                                                measured[i] = Math.max(measured[i], mainJson[i].dps[p][1]);
                                            }
                                            break;
                                    }
                                }
                            }
                            var include = new Array(mainJson.length);
                            for (var i=mainJson.length-1; i>=0; i--) {
                                include[i] = true;
                                switch (dygraphOptions.valueFilter.measure) {
                                    case "mean":
                                    case "min":
                                    case "max":
                                        if (dygraphOptions.valueFilter.lowerBound != "") {
                                            if (measured[i] < dygraphOptions.valueFilter.lowerBound) {
                                                include[i] = false;
                                            }
                                        }
                                        if (dygraphOptions.valueFilter.upperBound != "") {
                                            if (measured[i] > dygraphOptions.valueFilter.upperBound) {
                                                include[i] = false;
                                            }
                                        }
                                        break;
                                    case "any":
                                        include[i] = false;
                                        for (var p=0; p<mainJson[i].dps.length; p++) {
                                            var includePoint = true;
                                            if (dygraphOptions.valueFilter.lowerBound != "") {
                                                if (mainJson[i].dps[p][1] < dygraphOptions.valueFilter.lowerBound) {
                                                    includePoint = false;
                                                }
                                            }
                                            if (dygraphOptions.valueFilter.upperBound != "") {
                                                if (mainJson[i].dps[p][1] > dygraphOptions.valueFilter.upperBound) {
                                                    includePoint = false;
                                                }
                                            }
                                            if (includePoint) {
                                                include[i] = true;
                                                break;
                                            }

                                        }
                                }
                                if (!include[i]) {
                                    filteredOut.push(mainJson[i]);
                                    mainJson.splice(i,1);
                                    measured.splice(i,1);
                                }
                            }
                        }

                        if (mainJson.length == 0) {
                            renderContext.renderErrors[graph.id] = "Value filtering excluded all time series";
                            renderContext.renderMessages[graph.id] = "";
                            return;
                        }

                        // now filter out of baselineJson based on filteredOut
                        if (baselining && measured != null) {
                            var filteredOutByQuery = {};
                            for (var s=0; s<filteredOut.length; s++) {
                                var str = JSON.stringify(filteredOut[s].query);
                                if (!(str in filteredOutByQuery)) {
                                    filteredOutByQuery[str] = [];
                                }
                                filteredOutByQuery[str].push(filteredOut[s]);
                            }

                            var allTagsMatch = function(tags1, tags2) {
                                var tagsArray1 = [];
                                for (var k in tags1) {
                                    if (tags1.hasOwnProperty(k)) {
                                        tagsArray1.push(k);
                                    }
                                }
                                var tagsArray2 = [];
                                for (var k in tags2) {
                                    if (tags2.hasOwnProperty(k)) {
                                        tagsArray2.push(k);
                                    }
                                }
                                if (tagsArray1.length != tagsArray2.length) {
                                    return false;
                                }
                                for (var i=0; i<tagsArray1.length; i++) {
                                    var k = tagsArray1[i];
                                    if (tags2.hasOwnProperty(k)) {
                                        if (tags1[k] != tags2[k]) {
                                            return false;
                                        }
                                    }
                                    else {
                                        return false;
                                    }
                                }
                                return true;
                            }

                            for (var s=baselineJson.length-1; s>=0; s--) {
                                var str = JSON.stringify(baselineJson[s].query);
                                // ok, we have definitely removed some results from this query
                                if (str in filteredOutByQuery) {
                                    for (var i=0; i<filteredOutByQuery[str].length; i++) {
                                        if (allTagsMatch(baselineJson[s].tags, filteredOutByQuery[str][i].tags)) {
                                            baselineJson.splice(s,1);
                                            filteredOutByQuery[str].splice(i,1);
                                            if (filteredOutByQuery[str].length == 0) {
                                                delete filteredOutByQuery[str];
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }


                        // indices, used to track progress through dps arrays
                        var mainIndices1 = new Array(mainJson.length);
                        var mainIndices2 = new Array(mainJson.length);
                        var mainIndices3 = new Array(mainJson.length);
                        for (var s=0; s<mainJson.length; s++) {
                            mainIndices1[s] = 0;
                            mainIndices2[s] = 0;
                            mainIndices3[s] = 0;
                        }
                        var baselineIndices1;
                        var baselineIndices2;
                        var baselineIndices3;
                        if (baselining) {
                            baselineIndices1 = new Array(baselineJson.length);
                            baselineIndices2 = new Array(baselineJson.length);
                            baselineIndices3 = new Array(baselineJson.length);
                            for (var s=0; s<baselineJson.length; s++) {
                                baselineIndices1[s] = 0;
                                baselineIndices2[s] = 0;
                                baselineIndices3[s] = 0;
                            }
                        }

                        // now we've filtered we can work out the set of annotations which need rendering
                        var annotations = [];
                        var discoverAnnotations = function(json, indices, isBaseline) {
                            var globalAnnotations = [];
                            for (var s=0; s<json.length; s++) {
                                if (json[s].annotations != null) {
                                    json[s].annotations.sort(function(a,b){
                                        var ret = a.startTime - b.startTime;
                                        if (ret == 0) {
                                            if (a.endTime == null || b.endTime == null) {
                                                return 0;
                                            }
                                            return a.endTime - b.endTime;
                                        }
                                        return ret;
                                    });
                                    for (var p= 0, a=0; p<json[s].dps.length && a<json[s].annotations.length; ) {
                                        var t = json[s].dps[p][0];
                                        var annT = json[s].annotations[a].startTime; // todo: how do we represent endTime with dygraph?
                                        if (t < annT) {
                                            // annotation after last point
                                            if (p == json[s].dps.length - 1) {
                                                // add a point at the end
                                                // let dygraphs interpolate
                                                json[s].dps.push([annT,null]);
                                                // insert annotation
                                                annotations.push([json[s], json[s].annotations[a], isBaseline]);
                                                // next annotation
                                                a++;
                                            }
                                            // annotation after a mid point
                                            else {
                                                p++;
                                            }
                                        }
                                        else if (t == annT) {
                                            // we have a point at the correct time, this is good
                                            //                            console.log("inserting annotation at existing point")
                                            annotations.push([json[s], json[s].annotations[a], isBaseline]);
                                            a++;
                                        }
                                        else { // t > annT
                                            // annotation needs to go in here
                                            // let dygraphs interpolate
                                            json[s].dps.splice(p,0,[annT,null]);
                                            // insert annotation
                                            annotations.push([json[s], json[s].annotations[a], isBaseline]);
                                            // next annotation
                                            a++;
                                        }
                                    }
                                }
                                if (dygraphOptions.globalAnnotations && globalAnnotations.length == 0 && json[s].globalAnnotations.length > 0) {
                                    globalAnnotations = json[s].globalAnnotations;
                                    globalAnnotations.sort(function(a,b){
                                        var ret = a.startTime - b.startTime;
                                        if (ret == 0) {
                                            if (a.endTime == null || b.endTime == null) {
                                                return 0;
                                            }
                                            return a.endTime - b.endTime;
                                        }
                                        return ret;
                                    });
                                }
                            }
                            if (dygraphOptions.globalAnnotations && globalAnnotations.length > 0) {
                                for (var a=0; a<globalAnnotations.length; a++) {
                                    var annT = globalAnnotations[a].startTime;
                                    var hitAtTime = false;
                                    for (var s=0; s<json.length; s++) {
                                        while (indices[s] < json[s].dps.length && json[s].dps[indices[s]][0] < annT) {
                                            indices[s]++;
                                        }
                                        if (indices[s] < json[s].dps.length && json[s].dps[indices[s]][0] == annT) {
                                            hitAtTime = true;
                                        }
                                    }
                                    // now each index is either past the end of the points, or dps[index].time >= annotation.startTime
                                    var annotationAdded = false;
                                    for (var s=0; s<json.length; s++) {
                                        var p = indices[s];
                                        if (p < json[s].dps.length) {
                                            var t = json[s].dps[indices[s]][0];
                                            if (t == annT) {
                                                if (!annotationAdded) {
                                                    annotations.push([json[s], globalAnnotations[a], isBaseline]);
                                                    annotationAdded = true;
                                                }
                                            }
                                            else { // t > annT
                                                // ensure it gets added somewhere, so here is good enough
                                                if (!hitAtTime && !annotationAdded) {
                                                    annotations.push([json[s], globalAnnotations[a], isBaseline]);
                                                    // put in a null point here
                                                    json[s].dps.splice(p,0,[annT,null]);
                                                    annotationAdded = true;
                                                }
                                            }
                                        }
                                        // past end of dps
                                        else if (!annotationAdded) {
                                            annotations.push([json[s], globalAnnotations[a], isBaseline]);
                                            json[s].dps.push([annT, null]);
                                            annotationAdded = true;
                                        }
                                    }
                                }
                            }
                        }
                        if (dygraphOptions.annotations) {
                            discoverAnnotations(mainJson, mainIndices1, false);
                            if (baselining) {
                                discoverAnnotations(baselineJson, baselineIndices1, true);
                            }
                        }

                        var isY1Axis = function (axis) {
                            return axis==null || axis=="x1y1";
                        }

                        var isY2Axis = function (axis) {
                            return axis=="x1y2";
                        }

                        // 4. initial label setting (both sets) and axis allocation
                        var mainLabels = ["x"];
                        var baselineLabels = ["x"];
                        var seriesOptions = {};
                        for (var t=0; t<mainJson.length; t++) {
                            var name = graphServices.timeSeriesName(mainJson[t]);
                            mainLabels.push(name);
                            var axis = isY1Axis(mainJson[t].aardvark_query.graphOptions.axis) ? "y1" : "y2";
                            seriesOptions[name] = { axis: axis };
                            seriesOptions[name].strokeWidth = 0;
                            seriesOptions[name].drawPoints = false;
                            seriesOptions[name].pointSize = 2;
                            // must have one, if none then assume lines
                            if (!mainJson[t].aardvark_query.graphOptions.dygraph || mainJson[t].aardvark_query.graphOptions.dygraph.drawLines || !mainJson[t].aardvark_query.graphOptions.dygraph.drawPoints) {
                                seriesOptions[name].strokeWidth = 1;
                            }
                            if (mainJson[t].aardvark_query.graphOptions.dygraph && mainJson[t].aardvark_query.graphOptions.dygraph.drawPoints) {
                                seriesOptions[name].drawPoints = true;
                            }
                        }
                        if (baselining) {
                            for (var t=0; t<baselineJson.length; t++) {
                                var name = graphServices.timeSeriesName(baselineJson[t]) + "[BL]";
                                baselineLabels.push(name);
                                var axis = isY1Axis(baselineJson[t].aardvark_query.graphOptions.axis) ? "y1" : "y2";
                                seriesOptions[name] = { axis: axis };
                                seriesOptions[name].strokeWidth = 0;
                                seriesOptions[name].drawPoints = false;
                                seriesOptions[name].pointSize = 2;
                                // must have one, if none then assume lines
                                if (!mainJson[t].aardvark_query.graphOptions.dygraph || baselineJson[t].aardvark_query.graphOptions.drawLines || !baselineJson[t].aardvark_query.graphOptions.drawPoints) {
                                    seriesOptions[name].strokeWidth = 1;
                                }
                                if (baselineJson[t].aardvark_query.graphOptions.drawPoints) {
                                    seriesOptions[name].drawPoints = true;
                                }
                            }
                        }

                        var isNegativeSquashingEnabled = function(json) {
                            return (isY1Axis(json.aardvark_query.graphOptions.axis) && dygraphOptions.y1SquashNegative)
                                || (isY2Axis(json.aardvark_query.graphOptions.axis) && dygraphOptions.y2SquashNegative);
                        }

                        var scaleMultiplierByMetricNameY1 = {}; // default 1
                        var scaleMultiplierByMetricNameY2 = {}; // default 1
                        var autoScale = function(axisMatchFn, perAxisScaleMultipliers) {
                            // 5. auto-scaling and label adjustment (both together)

                            var initScaleMultipliers = function(json) {
                                for (var s=0; s<json.length; s++) {
                                    if (axisMatchFn(json[s].aardvark_query.graphOptions.axis)) {
                                        perAxisScaleMultipliers[json[s].metric] = 1;
                                    }
                                }
                            }
                            initScaleMultipliers(mainJson);
                            if (baselining) {
                                initScaleMultipliers(baselineJson);
                            }

                            var maxValueByMetricName = {};

                            var calcMaxValues = function(json) {
                                for (var s=0; s<json.length; s++) {
                                    if (axisMatchFn(json[s].aardvark_query.graphOptions.axis)) {
                                        perAxisScaleMultipliers[json[s].metric] = 1;
                                        var max = 0;
                                        var min = Number.MAX_VALUE;
                                        for (var p=0; p<json[s].dps.length; p++) {
                                            max = Math.max(max, json[s].dps[p][1]);
                                            min = Math.min(min, json[s].dps[p][1]);
                                        }
                                        if (!isNegativeSquashingEnabled(json[s]) && min < 0) {
                                            max = Math.max(max, Math.abs(min));
                                        }
                                        if (maxValueByMetricName[json[s].metric] == null)
                                        {
                                            maxValueByMetricName[json[s].metric] = max;
                                        }
                                        else {
                                            maxValueByMetricName[json[s].metric] = Math.max(maxValueByMetricName[json[s].metric], max);
                                        }
                                    }
                                }
                            }

                            calcMaxValues(mainJson);
                            if (baselining) {
                                calcMaxValues(baselineJson);
                            }

                            var maxl = 0;
                            for (var metric in maxValueByMetricName) {
                                var logMax = parseInt(Math.log(maxValueByMetricName[metric])/Math.log(10));
                                if (logMax>maxl) {
                                    maxl = logMax;
                                }
                            }

                            for (var metric in maxValueByMetricName) {
                                var pow = parseInt(Math.log(maxValueByMetricName[metric])/Math.log(10));
                                var l = maxl - pow;
                                if (l > 0) {
                                    perAxisScaleMultipliers[metric] = Math.pow(10, l);
                                }
                            }

                            var updateScaleFactors = function(json, labels) {
                                for (var s=0;s<json.length;s++) {
                                    if (axisMatchFn(json[s].aardvark_query.graphOptions.axis)) {
                                        var scale = perAxisScaleMultipliers[json[s].metric];
                                        if (scale > 1) {
                                            var oldLabel = labels[s+1];
                                            var newLabel = scale+"x "+labels[s+1];
                                            labels[s+1] = newLabel;
                                            seriesOptions[newLabel] = seriesOptions[oldLabel];
                                            delete seriesOptions[oldLabel];
                                        }
                                    }
                                }
                            }
                            updateScaleFactors(mainJson, mainLabels);
                            if (baselining) {
                                updateScaleFactors(baselineJson, baselineLabels);
                            }
                        }

                        if (dygraphOptions.y1AutoScale) {
                            autoScale(isY1Axis, scaleMultiplierByMetricNameY1);
                        }

                        if (dygraphOptions.y2AutoScale) {
                            autoScale(isY2Axis, scaleMultiplierByMetricNameY2);
                        }

                        // 6. baseline time adjustment
                        if (baselining) {
                            var baselineOffset = graphServices.baselineOffset(global, datum).asMilliseconds();
                            for (var s=0; s<baselineJson.length; s++) {
                                for (var p=0; p<baselineJson[s].dps.length; p++) {
                                    baselineJson[s].dps[p][0] += baselineOffset;
                                }
                            }
                        }

                        // 7. min/max time calculations (together)
                        var minTime = new Date().getTime() + 86400000; // now + 1 day so we don't hit tz issues
                        var maxTime = 0
                        for (var s=0; s<mainJson.length; s++) {
                            if (mainJson[s].dps.length > 0) {
                                minTime = Math.min(minTime, mainJson[s].dps[0][0]);
                                maxTime = Math.max(maxTime, mainJson[s].dps[mainJson[s].dps.length-1][0]);
                            }
                        }
                        if (baselineJson != null) {
                            for (var s=0; s<baselineJson.length; s++) {
                                if (baselineJson[s].dps.length > 0) {
                                    minTime = Math.min(minTime, baselineJson[s].dps[0][0]);
                                    maxTime = Math.max(maxTime, baselineJson[s].dps[baselineJson[s].dps.length-1][0]);
                                }
                            }
                        }
                        if (maxTime == 0) {
                            minTime == 0;
                        }

                        var ignoredOptions = [];
                        if (dygraphOptions.ratioGraph) {
                            if (dygraphOptions.meanAdjusted) {
                                ignoredOptions.push("mean adjustment");
                            }
                            if (dygraphOptions.y1AutoScale || dygraphOptions.y2AutoScale) {
                                ignoredOptions.push("auto scaling");
                            }
                        }
                        else if (dygraphOptions.meanAdjusted) {
                            if (dygraphOptions.y1AutoScale || dygraphOptions.y2AutoScale) {
                                ignoredOptions.push("auto scaling");
                            }
                        }
                        var ignoredBecause = null;

                        // 8. seperate processing
                        //  a. ratio graphs
                        //  b. mean adjustment
                        //  c. negative squashing
                        var seperateProcessing = function(json, indices) {
                            //                console.log("seperateProcessing:");
                            //                console.log("json = "+JSON.stringify(json));
                            for (var t=minTime; t<=maxTime; ) {
                                //                    console.log("t = "+t);
                                var nextTime = maxTime + 1; // break condition
                                var sum = 0; // for mean adjusted graphs
                                var hadValue = [];
                                for (var s=0; s<json.length; s++) {
                                    hadValue.push(false);
                                    if (indices[s] >= json[s].dps.length) {
                                        // skip this one
                                    }
                                    else if (json[s].dps[indices[s]][0] == t) {
                                        hadValue[s] = true;
                                        var val = json[s].dps[indices[s]][1];
                                        if (isNegativeSquashingEnabled(json[s]) && val < 0) {
                                            json[s].dps[indices[s]][1] = 0;
                                            val = 0;
                                        }
                                        indices[s]++;
                                        if (indices[s] < json[s].dps.length) {
                                            nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                                        }
                                        if (dygraphOptions.ratioGraph) {
                                            sum += Math.abs(val);
                                        }
                                        else if (dygraphOptions.meanAdjusted) {
                                            sum += val;
                                        }
                                    }
                                    else {
                                        nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                                    }
                                }
                                if (dygraphOptions.ratioGraph) {
                                    for (var s=0; s<json.length; s++) {
                                        if (hadValue[s] && json[s].dps[indices[s]-1][1]!=null && !isNaN(json[s].dps[indices[s]-1][1])) {
                                            json[s].dps[indices[s]-1][1] = (json[s].dps[indices[s]-1][1] * 100) / sum;
                                        }
                                    }
                                    ignoredBecause = "ratio graphs";
                                }
                                else if (dygraphOptions.meanAdjusted) {
                                    var mean = sum / json.length;
                                    for (var s=0; s<json.length; s++) {
                                        //                            console.log("s = "+s);
                                        //                            console.log("indices[s] = "+indices[s]);
                                        if (hadValue[s] && json[s].dps[indices[s]-1][1]!=null && !isNaN(json[s].dps[indices[s]-1][1])) {

                                            //                                console.log("val = "+json[s].dps[indices[s]-1][1]);
                                            //                                console.log("mean = "+mean);
                                            json[s].dps[indices[s]-1][1] -= mean;
                                        }
                                    }
                                    ignoredBecause = "mean adjustment";
                                }
                                else {
                                    if (dygraphOptions.y1AutoScale) {
                                        for (var s=0; s<json.length; s++) {
                                            if (isY1Axis(json[s].aardvark_query.graphOptions.axis)) {
                                                if (hadValue[s] && json[s].dps[indices[s]-1][1]!=null && !isNaN(json[s].dps[indices[s]-1][1])) {
                                                    json[s].dps[indices[s]-1][1] *= scaleMultiplierByMetricNameY1[json[s].metric];
                                                }
                                            }
                                        }
                                        ignoredBecause = "auto scaling";
                                    }
                                    if (dygraphOptions.y2AutoScale) {
                                        for (var s=0; s<json.length; s++) {
                                            if (isY2Axis(json[s].aardvark_query.graphOptions.axis)) {
                                                if (hadValue[s] && json[s].dps[indices[s]-1][1]!=null && !isNaN(json[s].dps[indices[s]-1][1])) {
                                                    json[s].dps[indices[s]-1][1] *= scaleMultiplierByMetricNameY2[json[s].metric];
                                                }
                                            }
                                        }
                                        ignoredBecause = "auto scaling";
                                    }
                                }
                                t = nextTime;
                            }
                        }

                        seperateProcessing(mainJson, mainIndices2);
                        if (baselining) {
                            seperateProcessing(baselineJson, baselineIndices2);
                        }

                        // ie we had some clashes and some data..
                        if (ignoredBecause != null && ignoredOptions.length > 0) {
                            var buff = "";
                            var sep = "Ignored ";
                            for (var i=0; i<ignoredOptions.length; i++) {
                                buff += sep + ignoredOptions[i];
                                sep = " and ";
                            }
                            buff += " as not compatible with " + ignoredBecause;

                            renderContext.renderWarnings[graph.id] = buff;
                        }

                        // 9. gap filling / merge timeseries (together)
                        for (var t=minTime; t<=maxTime; ) {
                            var row = [new Date(t)];
                            var nextTime = maxTime + 1; // break condition
                            var gapFillAndMergeJson = function(json, indices) {
                                for (var s=0; s<json.length; s++) {
                                    // gap filling
                                    if (indices[s] >= json[s].dps.length) {
                                        row.push(null);
                                    }
                                    else if (json[s].dps[indices[s]][0] == t) {
                                        var val = json[s].dps[indices[s]][1];
                                        row.push(val);
                                        indices[s]++;
                                        if (indices[s] < json[s].dps.length) {
                                            nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                                        }
                                    }
                                    else {
                                        row.push(null);
                                        nextTime = Math.min(nextTime, json[s].dps[indices[s]][0]);
                                    }
                                }
                            }
                            gapFillAndMergeJson(mainJson, mainIndices3);
                            if (baselining) {
                                gapFillAndMergeJson(baselineJson, baselineIndices3);
                            }
                            graphData.push(row);
                            t = nextTime;
                        }

                        // 10. merge labels
                        var labels = mainLabels;
                        if (baselining) {
                            for (var s=1; s<baselineLabels.length; s++) {
                                labels.push(baselineLabels[s]);
                            }
                        }


                        var originalXRangeInDygraph;
                        var originalY1RangeInDygraph;
                        var originalY2RangeInDygraph;
                        var originalXRangeInGraph = {
                            absoluteTimeSpecification: global.absoluteTimeSpecification,
                            relativePeriod: global.relativePeriod,
                            fromDate: global.fromDate,
                            fromTime: global.fromTime,
                            toDate: global.toDate,
                            toTime: global.toTime                            
                        };
                        var originalY1RangeInGraph = graph.dygraph ? graph.dygraph.y1AxisRange : "";
                        var originalY2RangeInGraph = graph.dygraph ? graph.dygraph.y2AxisRange : "";
                        var drawCallback = function(dygraph, is_initial) {
                            if (is_initial) {
                                originalXRangeInDygraph = dygraph.xAxisRange();
                                originalY1RangeInDygraph = dygraph.yAxisRange(0);
                                originalY2RangeInDygraph = dygraph.yAxisRange(1);
                            }
                        }
                        var zoomCallback = function(minX, maxX, yRanges) {
                            var newXRange;
                            var newY1Range;
                            if (minX == originalXRangeInDygraph[0] && maxX == originalXRangeInDygraph[1]) {
                                newXRange = originalXRangeInGraph;
                            }
                            else {
                                var fromMoment = moment.utc(minX);
                                var toMoment = moment.utc(maxX);
                                newXRange = {
                                    absoluteTimeSpecification: true,
                                    relativePeriod: originalXRangeInGraph.relativePeriod,
                                    fromDate: fromMoment.format("YYYY/MM/DD"),
                                    fromTime: fromMoment.format("HH:mm:ss"),
                                    toDate: toMoment.format("YYYY/MM/DD"),
                                    toTime: toMoment.format("HH:mm:ss")
                                }
                            }
                            var y1Range = yRanges[0];
                            if (y1Range[0] == originalY1RangeInDygraph[0] && y1Range[1] == originalY1RangeInDygraph[1]) {
                                newY1Range = originalY1RangeInGraph;
                            }
                            else {
                                newY1Range = graphServices.dygraphAxisRangeToString(y1Range);
                            }
                            var graphUpdate = {y1AxisRange:newY1Range};
                            if (yRanges.length > 1 && yRanges[1] != null) {
                                var newY2Range;
                                var y2Range = yRanges[1];
                                if (y2Range[1] == originalY2RangeInDygraph[0] && y2Range[1] == originalY2RangeInDygraph[1]) {
                                    newY2Range = originalY2RangeInGraph;
                                }
                                else {
                                    newY2Range = graphServices.dygraphAxisRangeToString(y2Range);
                                }
                                graphUpdate.y2AxisRange = newY2Range;
                            }
//                            renderContext.updateGraphModel(null, {scatter:{xRange:newXRange,yRange:newYRange}}, true);
                            renderContext.updateGlobalModel(null, newXRange, true);
                            renderContext.updateGraphModel(null, {dygraph:graphUpdate}, true);
                        }
                        
                        // default to no-op
                        var dygraphPointClickHandler = null;
                        var dygraphAnnotationClickHandler = null;


                        var dygraphConfig = {
                            labels: labels,
                            width: width,
                            height: height,
                            legend: "always",
                            pointClickCallback: function(event, p) {
                                if (dygraphPointClickHandler != null) {
                                    dygraphPointClickHandler(event,p);
                                }
                            },
                            annotationClickHandler: function(ann, point, dg, event) {
                                if (dygraphAnnotationClickHandler != null) {
                                    dygraphAnnotationClickHandler(ann, point, dg, event);
                                }
                            },
                            stackedGraph: dygraphOptions.stackedLines,
                            connectSeparatedPoints: dygraphOptions.interpolateGaps,
                            drawGapEdgePoints: true,
                            axisLabelFontSize: 9,
                            labelsDivStyles: { fontSize: 9, textAlign: 'left', left: '100px', width: (width-100)+'px', "background-color": 'rgba(255,255,255,0)', "padding-top": '20px' },
                            labelsDivWidth: (width-100),
                            labelsSeparateLines: true,
                            series: seriesOptions,
                            zoomCallback: zoomCallback,
                            drawCallback: drawCallback,
                            highlightCircleSize: 4,
                            axes: {
                                y: {
                                    valueFormatter: function(y) {
                                        if (isNaN(y) || y < 1000) {
                                            return "" + y;
                                        }
                                        return y.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")
                                    },
                                    axisLabelFormatter: function(y) {
                                        if (isNaN(y) || y < 1000) {
                                            return "" + Dygraph.round_(y, 3);
                                        }
                                        return y.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")
                                    },
                                    valueRange: y1AxisRange,
                                    logscale: dygraphOptions.y1Log
                                },
                                y2: {
                                    valueFormatter: function(y) {
                                        if (isNaN(y) || y < 1000) {
                                            return "" + y;
                                        }
                                        return y.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")
                                    },
                                    axisLabelFormatter: function(y) {
                                        if (isNaN(y) || y < 1000) {
                                            return "" + Dygraph.round_(y, 3);
                                        }
                                        return y.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")
                                    },
                                    valueRange: y2AxisRange,
                                    logscale: dygraphOptions.y2Log

                                }
                            }
                        };
                        if (dygraphOptions.highlightLines) {
                            dygraphConfig.highlightSeriesOpts = {
                                strokeWidth: 2,
                                strokeBorderWidth: 1,
                                highlightCircleSize: 6,
                                pointSize: 4
                            };
                            /*
                             dygraphConfig.highlightCallback = function(event, x, points, row, seriesName) {
                             if (labelsDiv) {
                             //find the y val
                             var yval = '';
                             for (var i=0;i<points.length;i++) {
                             if (points[i].name==seriesName) {
                             yval = points[i].yval;
                             break;
                             }
                             }
                             labelsDiv.innerHTML = "<span><b>" + seriesName + "</b>" + " "
                             + Dygraph.hmsString_(x) + ", " + yval + "</span>";
                             }
                             }*/

                        }

                        var dygraph = graphServices.dygraph_render("dygraphDiv_"+graph.id, graph.id, graphData, dygraphConfig);

                        var createDygraphAnnotation = function(g, seriesAndAnnotation) {
                            var series = seriesAndAnnotation[0];
                            var annotation = seriesAndAnnotation[1];
                            var icon = "unknown.jpg";
                            if (annotation.custom && annotation.custom.type) {
                                if (annotation.custom.type.toUpperCase() == "CONFIG") {
                                    icon = "config.jpg"
                                }
                                else if (annotation.custom.type.toUpperCase() == "DEPLOYMENT") {
                                    icon = "deployment.jpg"
                                }
                                else if (annotation.custom.type.toUpperCase() == "PROBLEM") {
                                    icon = "problem.jpg"
                                }
                            }

                            var label = graphServices.timeSeriesName(series);
                            var scale = isY1Axis(seriesAndAnnotation[0].aardvark_query.graphOptions.axis) ? scaleMultiplierByMetricNameY1[seriesAndAnnotation[0].metric] : scaleMultiplierByMetricNameY1[seriesAndAnnotation[0].metric];
                            if (scale > 1) {
                                label = scale+"x "+label;
                            }
                            var baseline = seriesAndAnnotation[2];
                            var offsetMs = 0;
                            if (baseline) {
                                label += "[BL]";
                                offsetMs = graphServices.baselineOffset(global, datum).asMilliseconds();
                            }

                            var ret = {
                                series: label,
                                xval: annotation.startTime + offsetMs,
                                height: 16,
                                width: 16,
                                icon: icon,
                                attachAtBottom: true,
                                tickHeight: g.height - 16,
                                text: annotation.description
                            };


                            return ret;
                        }

                        if (dygraphOptions.annotations) {
                            var syncDygraphWithAnnotations = function() {
                                var dygraphAnnotations = [];
                                for (var a=0; a<annotations.length; a++) {
                                    dygraphAnnotations.push(createDygraphAnnotation(dygraph, annotations[a]));
                                }
                                graphServices.dygraph_setAnnotations(dygraph, dygraphAnnotations);
                            }
                            syncDygraphWithAnnotations();

                            var showAnnotationDialog = function(annotationIndex, point) {
                                var adding = annotationIndex == -1;
                                var seriesAndQueries = {};
                                for (var i=0; i<mainJson.length; i++) {
                                    seriesAndQueries[graphServices.timeSeriesName(mainJson[i])] = mainJson[i].aardvark_query;
                                }
                                var modalInstance = $uibModal.open({
                                    animation: false,
                                    ariaLabelledBy: 'modal-title',
                                    ariaDescribedBy: 'modal-body',
                                    templateUrl: 'annotationsDialog.tmpl.html',
                                    controller: 'AnnotationsDialogCtrl',
                                    controllerAs: '$ctrl',
                                    size: 'lg',
                                    resolve: {
                                        adding: function() {
                                            return adding;
                                        },
                                        originalAnnotation: function() {
                                            return annotationIndex >= 0
                                                ? annotations[annotationIndex][1]
                                                : {
                                                startTime: point.xval
                                            };
                                        },
                                        readOnly: function() {
                                            return annotationIndex >= 0
                                                ? annotations[annotationIndex][2]
                                                : seriesAndQueries[point.name] == null;
                                        },
                                        time: function() {
                                            return point ? point.xval : 0;
                                        },
                                        rootConfig: function() {
                                            return config;
                                        },
                                        seriesAndQueries: function() {
                                            return seriesAndQueries;
                                        },
                                        clickedSeries: function() {
                                            return point ? point.name : null;
                                        },
                                        $tsdbClient: function() {
                                            return tsdbClient;
                                        },
                                        $tsdbUtils: function() {
                                            return tsdbUtils;
                                        }
                                    }
                                });
                                modalInstance.result.then(function (result) {
                                    var action = result.action;
                                    var selectedAnnotations = result.annotations;
                                    if (action == "add") {
                                        $tsdbClient.bulkSaveAnnotations(selectedAnnotations, function() {
                                            for (var a = 0; a<selectedAnnotations.length; a++) {
                                                var tsuid = selectedAnnotations[a].tsuid;
                                                for (var t=0; t<mainJson.length; t++) {
                                                    if (mainJson[t].tsuids.indexOf(tsuid) >= 0) {
                                                        // [json[s], json[s].annotations[a], isBaseline]
                                                        annotations.push([mainJson[t],selectedAnnotations[a],false]);
                                                        // don't break - same tsuid could be present in many visible timeseries
                                                    }
                                                }
                                            }
                                            syncDygraphWithAnnotations();
                                        }, function() {
                                            console.log("failed to add annotation(s)");
                                            // todo: errors?
                                        });
                                    }
                                    else if (action == "edit") {
                                        // use singular endpoint
                                        $tsdbClient.saveAnnotation(selectedAnnotations[0], function() {
                                            annotations[annotationIndex][1] = selectedAnnotations[0];
                                            syncDygraphWithAnnotations();
                                        }, function() {
                                            console.log("failed to save annotation");
                                            // todo: errors?
                                        });

                                    }
                                    else if (action == "delete") {
                                        // use singular endpoint
                                        $tsdbClient.deleteAnnotation(selectedAnnotations[0], function() {
                                            annotations.splice(annotationIndex, 1);
                                            syncDygraphWithAnnotations();
                                        }, function() {
                                            console.log("failed to delete annotation");
                                            // todo: errors?
                                        });
                                    }
                                    else {
                                        throw 'Unexpected annotation action: '+action;
                                    }
                                }, function () {
                                    // do nothing
                                });
                            }

                            if (config.annotations.allowAddEdit) {
                                dygraphPointClickHandler = function(event, p) {
                                    if ((!event.ctrlKey && !event.metaKey/*osx*/) || event.button != 0) {
                                        return;
                                    }

                                    showAnnotationDialog(-1, p);
                                };
                                dygraphAnnotationClickHandler = function(ann, point, dg, event) {
                                    var anns = dygraph.annotations();

                                    var annIndex = -1;
                                    for (var i=0; i<anns.length; i++) {
                                        if (anns[i].xval == ann.xval) {
                                            annIndex = i;
                                        }
                                    }

                                    if (annIndex == -1) {
                                        return;
                                    }

                                    showAnnotationDialog(annIndex, null);
                                };
                            }
                        }

                        var yAxisParams = {
                            range:dygraphOptions.y1AxisRange,
                            squashNegative:dygraphOptions.y1SquashNegative,
                            logscale:dygraphOptions.y1Log
                        };
                        var y2AxisParams = {
                            range:dygraphOptions.y2AxisRange,
                            squashNegative:dygraphOptions.y2SquashNegative,
                            logscale:dygraphOptions.y2Log
                        };
                        ret.tsdb_export_link = graphServices.tsdbGraphUrl("/#", renderContext, config, global, graph, queries, /*forceAxis*/null, /*downsampleOverrideFn*/null, yAxisParams, y2AxisParams, /*keyParams*/{}, /*lineSmoothing*/false, /*style*/null, dygraphOptions.globalAnnotations);
                        renderContext.renderMessages[graph.id] = "";
                        renderContext.graphRendered(graph.id);
                        return;

                    }
                    
                    var options = {
                        supports_annotations: true,
                        supports_baselining: true,
                        require_arrays: true,
                        annotations: dygraphOptions.annotations,
                        globalAnnotations: dygraphOptions.globalAnnotations,
                        processJson: processJson,
                        errorResponse: function(json) {},
                        downsampleOverrideFn: null
                    };
                    
                    graphServices.perform_queries(renderContext, config, global, graph, queries, options, datum);
                    
                }
                return ret;
            }
        };
        return renderer;
    }]);