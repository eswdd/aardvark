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
            'static-content/otis-client.js',
            'static-content/OtisCtrl.js',
            'static-content/GraphControlCtrl.js',
            'static-content/GraphCtrl.js',
            'static-content/MetricControlCtrl.js',
            'test/unit/**/*.js'
        ],

        autoWatch: true,

        reporters: ['mocha'],

        frameworks: ['jasmine'],

        browsers: ['Firefox'],

        plugins: [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-jasmine',
            'karma-mocha-reporter'
        ],

        junitReporter: {
            outputFile: 'test_out/unit.xml',
            suite: 'unit'
        }

    });
};
