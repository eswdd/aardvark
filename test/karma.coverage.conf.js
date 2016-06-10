module.exports = function (config) {
    config.set({

        basePath: '../',

        files: [
            'node_modules/angular/angular.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'node_modules/angular-ui-layout/src/ui-layout.js',
            'node_modules/angular-ui-bootstrap/ui-bootstrap-tpls.js',
            'node_modules/angular-tree-control/angular-tree-control.js',
            'node_modules/angular-sanitize/angular-sanitize.js',
            'node_modules/angular-mass-autocomplete/massautocomplete.js',
            'node_modules/d3/d3.js',
            'node_modules/moment/moment.js',
            'node_modules/long/dist/long.js',
            'node_modules/bytebuffer/dist/bytebuffer.js',
            'node_modules/protobufjs/dist/protobuf.js',
            'static-content/aardvark-client.js',
            'static-content/StringSerialisation.js',
            'static-content/IntermediateModel.js',
            'static-content/rawIntermediateModel.js',
            'static-content/AardvarkServices.js',
            'static-content/AardvarkCtrl.js',
            'static-content/GraphControlCtrl.js',
            'static-content/GraphCtrl.js',
            'static-content/MetricControlCtrl.js',
            'test/unit/**/*.js'
        ],

        autoWatch: true,

        reporters: ['mocha','coverage'],

        frameworks: ['jasmine'],

        browsers: ['Firefox'],

        plugins: [
            'karma-chrome-launcher',
            'karma-coverage',
            'karma-firefox-launcher',
            'karma-jasmine',
            'karma-mocha-reporter'
        ],

        preprocessors: { 'static-content/*Ctrl.js': ['coverage'] },

        junitReporter: {
            outputFile: 'test_out/unit.xml',
            suite: 'unit'
        },

        coverageReporter: {
            // specify a common output directory
            dir: 'coverage',
            reporters: [
                // reporters not supporting the `file` property
                { type: 'lcov', subdir: 'lcov' }
            ]
        }

    });
};
