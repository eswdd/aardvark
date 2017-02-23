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

    describe('deepUtils', function () {
        var $deepUtils;

        beforeEach(inject(function (deepUtils) {
            $deepUtils = deepUtils;
        }));
    
        it('expects the deep utils to exist', function() {
            expect($deepUtils).toBeDefined();
        });
        
        it('expects deep clone to work', function() {
            var original = {
                a: "b",
                c: 1.5,
                d: 40,
                e: [
                    {
                        f: [3],
                        g: [true],
                        h: "i"
                    },
                    {
                        j: ["k",'l']
                    }
                ],
                m: {
                    n: [4.5]
                }
            };
            expect($deepUtils.deepClone(original)).toEqualData(original);
            expect($deepUtils.deepClone(original) === original).toEqualData(false);
        });
        
        it('expects deep check against null to succeed', function() {
            var against = null;
            var check = {a:"b"};
            expect($deepUtils.deepCheck(against, check)).toEqualData(true);
        });
        
        it('expects deep check against mismatch to fail', function() {
            var against = {a:"b"};
            var check = {a:"c"};
            expect($deepUtils.deepCheck(against, check)).toEqualData(false);
        });
        
        it('expects deep check against a complex match to succeed', function() {
            var against = {
                a: "b",
                c: 1.5,
                d: 40,
                e: [
                    {
                        f: [3],
                        g: [true],
                        h: "i"
                    },
                    {
                        j: ["k",'l']
                    }
                ],
                m: {
                    n: [4.5]
                }
            };
            var check = {
                a: "b",
                c: 1.5,
                d: 40,
                e: [
                    {
                        f: [3],
                        g: [true],
                        h: "i"
                    },
                    {
                        j: ["k",'l']
                    }
                ],
                m: {
                    n: [4.5]
                }
            };
            expect($deepUtils.deepCheck(against, check)).toEqualData(true);
        });
        
        it('expects deep check against a complex mismatch to fail', function() {
            var against = {
                a: "b",
                c: 1.5,
                d: 40,
                e: [
                    {
                        f: [3],
                        g: [true],
                        h: "i"
                    },
                    {
                        j: ["k",'l']
                    }
                ],
                m: {
                    n: [4.5]
                }
            };
            var check = {
                a: "b",
                c: 1.5,
                d: 40,
                e: [
                    {
                        f: [3],
                        g: [false],
                        h: "i"
                    },
                    {
                        j: ["k",'l']
                    }
                ],
                m: {
                    n: [4.5]
                }
            };
            expect($deepUtils.deepCheck(against, check)).toEqualData(false);
        });
        
        it('expects deep apply to add changes to a complex graph', function() {
            var against = {
                a: "b",
                c: 1.5,
                d: 40,
                e: [
                    {
                        f: [3],
                        g: [true],
                        h: "i"
                    },
                    {
                        j: ["k",'l']
                    }
                ],
                m: {
                    n: [4.5]
                }
            };
            var change = {
                e: [
                    {
                        g: [false]
                    },
                    {
                        j: ["k",'ll']
                    }
                ]
            }
            var expected = {
                a: "b",
                c: 1.5,
                d: 40,
                e: [
                    {
                        f: [3],
                        g: [false],
                        h: "i"
                    },
                    {
                        j: ["k",'ll']
                    }
                ],
                m: {
                    n: [4.5]
                }
            };
            expect($deepUtils.deepApply(against, change)).toEqualData(true);
            expect(against).toEqualData(expected);
        })

    });
    
    

});