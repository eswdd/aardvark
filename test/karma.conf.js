module.exports = function (config) {
    config.set({

        basePath: '../',

        files: [
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'bower_components/angular-ui-layout/ui-layout.js',
            'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
            'bower_components/angular-tree-control/angular-tree-control.js',
            'bower_components/angular-sanitize/angular-sanitize.js',
            'bower_components/angular-mass-autocomplete/massautocomplete.js',
            'bower_components/angular-loading-overlay/dist/angular-loading-overlay.js',
            'bower_components/moment/moment.js',
            'static-content/aardvark-client.js',
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
