aardvark
    .factory('deepUtils', function() {
        var deepCheck = function(target, toCheck) {
            var ret;
            if (toCheck == null) {
                return true;
            }
            if (typeof toCheck != typeof target) {
                return false;
            }
            switch (typeof toCheck)
            {
                case 'string':
                case 'number':
                case 'boolean':
                    return target == toCheck;
                case 'object':
                    if (toCheck instanceof Array)
                    {
                        if (target.length != toCheck.length) {
                            return false;
                        }
                        for (var i=0; i<toCheck.length; i++) {
                            if (!deepCheck(target[i], toCheck[i])) {
                                return false;
                            }
                        }
                    }
                    else {
                        for (var k in target) {
                            if (toCheck.hasOwnProperty(k)) {
                                if (!target.hasOwnProperty(k)) {
                                    return false;
                                }
                                if (!deepCheck(target[k], toCheck[k])) {
                                    return false;
                                }
                            }
                        }
                    }
                    break;
                default:
                    throw 'Unrecognized type: '+(typeof toCheck);
            }
            return true;
        };
        /**
         * Deep applies a skeleton change to the target object
         */
        var deepApply = function(target, skeleton) {
//            console.log("Applying change: "+JSON.stringify(skeleton));
            if (skeleton == null) {
                return false;
            }
            if (typeof skeleton != typeof target) {
                return false;
            }
            switch (typeof skeleton)
            {
                case 'string':
                case 'number':
                case 'boolean':
                    // gone too far
                    return false;
                case 'object':
                    if (skeleton instanceof Array)
                    {
                        // for now only support direct replacement/mutation of elements, skeleton is insufficient to describe splicing
                        if (target.length != skeleton.length) {
                            return false;
                        }
                        var changed = false;
                        for (var i=0; i<skeleton.length; i++) {
                            if (skeleton[i] == null) {
                                continue;
                            }
                            switch (typeof skeleton[i]) {
                                case 'string':
                                case 'number':
                                case 'boolean':
                                    changed = (target[i] != skeleton[i]) || changed;
                                    target[i] = skeleton[i];
                                    break;
                                case 'object':
                                    changed = deepApply(target[i], skeleton[i]) || changed;
                                    break;
                                default:
                                    throw 'Unrecognized type: '+(typeof skeleton[i]);
                            }
                        }
                        return changed;
                    }
                    else {
                        var changed = false;
                        for (var k in skeleton) {
                            if (skeleton.hasOwnProperty(k)) {
                                if (target.hasOwnProperty(k)) {
                                    if (skeleton[k] == null) {
                                        continue;
                                    }
                                    switch (typeof skeleton[k]) {
                                        case 'string':
                                        case 'number':
                                        case 'boolean':
                                            changed = target[k] != skeleton[k] || changed;
                                            target[k] = skeleton[k];
                                            break;
                                        case 'object':
                                            changed = deepApply(target[k], skeleton[k]) || changed;
                                            break;
                                        default:
                                            throw 'Unrecognized type: '+(typeof skeleton[k]);
                                    }
                                }
                                else {
                                    target[k] = skeleton[k];
                                }
                            }
                        }
                        return changed;
                    }
                    break;
                default:
                    throw 'Unrecognized type: '+(typeof incoming);
            }
        };
        var deepClone = function(incoming) {
            var ret;
            if (incoming == null) {
                return null;
            }
            switch (typeof incoming)
            {
                case 'string':
                case 'number':
                case 'boolean':
                    return incoming;
                case 'object':
                    if (incoming instanceof Array)
                    {
                        ret = [];
                        for (var i=0; i<incoming.length; i++) {
                            ret[i] = deepClone(incoming[i]);
                        }
                    }
                    else {
                        ret = {};
                        for (var k in incoming) {
                            if (incoming.hasOwnProperty(k)) {
                                ret[k] = deepClone(incoming[k]);
                            }
                        }
                    }
                    break;
                default:
                    throw 'Unrecognized type: '+(typeof incoming);
            }


            return ret;
        };
        return {
            deepClone: deepClone,
            deepCheck: deepCheck,
            deepApply: deepApply
        };
    });