aardvark.controller('AnnotationsDialogCtrl', function ($uibModalInstance, $http, rootConfig, adding, originalAnnotation, time, seriesAndQueries, clickedSeries, $tsdbClient, $tsdbUtils, readOnly) {
    var $ctrl = this;
    $ctrl.adding = adding;
    $ctrl.time = time;
    $ctrl.readOnly = readOnly;
    $ctrl.existingSeriesLabel = "";

    $ctrl.loadingMessage = "";

    $ctrl.startTime = "";
    $ctrl.endTime = "";
    $ctrl.description = "";
    $ctrl.notes = "";

    $ctrl.metricSourceClick = true;

    $ctrl.clickTimeseries = [];
    $ctrl.allTimeseries = [];
    $ctrl.tsuidsFromClick = [];
    $ctrl.tsuidsFromAll = [];

    // todo: more custom flexibility
    $ctrl.custom = {
        type: ""
    }

    $ctrl.allowEditTimeAndSeries = function() {
        return adding && $ctrl.allowEdit();
    }

    $ctrl.allowEdit = function() {
        return !readOnly;
    }

    $ctrl.allowAnnotationDelete = function() {
        return !$ctrl.adding && rootConfig.annotations.allowDelete;
    }

    $ctrl.metricSourceUpdated = function() {
        if ($ctrl.adding && $ctrl.allTimeseries.length == 0 && !$ctrl.metricSourceClick) {
            var queries = [];
            for (var k in seriesAndQueries) {
                var query = seriesAndQueries[k];
                queries.push(query);
            }

            $ctrl.loadPotentialMetrics($ctrl.allTimeseries, queries);
        }

    }
    $ctrl.formatLabel = function(metric, tags) {
        return metric + " " + JSON.stringify(tags);
    };
    
    $ctrl.loadPotentialMetrics = function(target, queries) {

        $ctrl.loadingMessage = "Loading candidate time series";

        if (target.length > 0) {
            target.splice(0, target.length);
        }
        var seenTsuids = {};
        var perResultFn = function(query,data) {
            for (var i=0; i<data.results.length; i++) {
                var dup = seenTsuids[data.results[i].tsuid] != null;
                if (!dup) {
                    seenTsuids[data.results[i].tsuid] = data.results[i].tsuid;
                    target.push({
                        tsuid: data.results[i].tsuid,
                        label: $ctrl.formatLabel(data.results[i].metric, data.results[i].tags)
                    });
                }
            }
            return null; // don't care, got our data
        }
        var successFn = function(results) {
            // results is array of nulls
            $ctrl.loadingMessage = "";
        }
        var errorFn = function(errors, results) {
            // results is array of nulls
            var s = "Errors loading potential time series";
            for (var e=0; e<errors.length; e++) {
                s += "<br/>" + errors[e];
            }
            $ctrl.loadingMessage = s;
        }

        $tsdbClient.searchLookupBulk(queries, perResultFn, successFn, errorFn);
    }

    $ctrl.loadExistingSeriesLabel = function()
    {
        $ctrl.loadingMessage = "Resolving source timeseries...";
        // todo: would need to call tsmeta, or if not enabled, many calls to uid meta
        $tsdbUtils.tsuidToMetricAndTags(originalAnnotation.tsuid, function(metricAndTags) {
            $ctrl.loadingMessage = "";
            $ctrl.existingSeriesLabel = $ctrl.formatLabel(metricAndTags.metric, metricAndTags.tags);
        }, function(error) {
            $ctrl.loadingMessage = error;
            $ctrl.existingSeriesLabel = "Could not resolve source timeseries"
        })
        
    }

    $ctrl.loadView = function() {
        $ctrl.startTime = moment.utc(originalAnnotation.startTime).format("YYYY-MM-DD HH:mm:ss");
        if (originalAnnotation.endTime != null && originalAnnotation.endTime != 0) {
            $ctrl.endTime = moment.utc(originalAnnotation.endTime).format("YYYY-MM-DD HH:mm:ss");
        }
        $ctrl.description = originalAnnotation.description;
        $ctrl.notes = originalAnnotation.notes;
        $ctrl.custom.type = originalAnnotation.custom != null ? originalAnnotation.custom.type : "";

        if ($ctrl.adding) {
            var query = seriesAndQueries[clickedSeries];
            if (query != null) {
                $ctrl.loadPotentialMetrics($ctrl.clickTimeseries, [ query ]);
            }
        }
        else {
            $ctrl.loadExistingSeriesLabel();
            
        }
    }

    $ctrl.createResultsArray = function(editing) {
        var tsuids = $ctrl.metricSourceClick ? $ctrl.tsuidsFromClick : $ctrl.tsuidsFromAll;
        var anns = editing ? [{tsuid: originalAnnotation.tsuid}] : new Array(tsuids.length);
        for (var a=0; a<anns.length; a++) {
            var ann = anns[a];
            if (editing) {
                ann.startTime = originalAnnotation.startTime;
                ann.endTime = originalAnnotation.endTime;
            }
            else {
                ann = {};
                anns[a] = ann;
                ann.tsuid = tsuids[a];

                ann.startTime = moment.utc($ctrl.startTime, "YYYY-MM-DD HH:mm:ss").valueOf();
                if ($ctrl.endTime != null && $ctrl.endTime != "") {
                    ann.endTime = moment.utc($ctrl.endTime, "YYYY-MM-DD HH:mm:ss").valueOf();
                }
                else {
                    ann.endTime = 0;
                }
            }
            ann.description = $ctrl.description;
            ann.notes = $ctrl.notes;
            ann.custom = $ctrl.custom;
        }
        return anns;
    }

    $ctrl.ok = function () {
        var action = adding ? "add" : "edit";
        $uibModalInstance.close({action:action, annotations:$ctrl.createResultsArray(!adding)});
    };

    $ctrl.delete = function() {
        $uibModalInstance.close({action:"delete", annotations:$ctrl.createResultsArray(false)});
    }

    $ctrl.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $ctrl.loadView();
});
