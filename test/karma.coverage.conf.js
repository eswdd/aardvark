module.exports = function (config) {
    config.set({

        basePath: '../',

        files: [
            'node_modules/angular/angular.js',
            'node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
            'node_modules/angular-tree-control/angular-tree-control.js',
            'node_modules/angular-sanitize/angular-sanitize.js',
            'node_modules/angular-mass-autocomplete/massautocomplete.js',
            'node_modules/d3/d3.js',
            'node_modules/cubism/cubism.v1.js',
            'node_modules/moment/moment.js',
            'node_modules/long/dist/long.js',
            'node_modules/bytebuffer/dist/bytebuffer.js',
            'node_modules/protobufjs/dist/protobuf.js',
            'node_modules/angular-local-storage/dist/angular-local-storage.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'node_modules/clipboard/dist/clipboard.js',
            'node_modules/ngclipboard/dist/ngclipboard.js',
            'node_modules/angular-resizable/src/angular-resizable.js',
            'test/mocks/**/*.js',
            'static-content/aardvark-client.js',
            'static-content/DeepUtils.js',
            'static-content/StringSerialisation.js',
            'static-content/IntermediateModel.js',
            'static-content/rawIntermediateModel.js',
            'static-content/AardvarkServices.js',
            'static-content/TsdbClient.js',
            'static-content/AardvarkCtrl.js',
            'static-content/GraphControlCtrl.js',
            'static-content/TsdbUtils.js',
            'static-content/AnnotationsDialogCtrl.js',
            'static-content/GraphServices.js',
            'static-content/DygraphRenderer.js',
            'static-content/GnuplotRenderer.js',
            'static-content/HeatmapRenderer.js',
            'static-content/HorizonRenderer.js',
            'static-content/ScatterRenderer.js',
            'static-content/GraphCtrl.js',
            'static-content/QueryEditorDialogCtrl.js',
            'static-content/QueryControlCtrl.js',
            'static-content/UserPrefsDialogCtrl.js',
            'test/unit/**/*.js'
        ],

        autoWatch: true,

        reporters: ['mocha','coverage'],

        frameworks: ['jasmine'],

        browsers: ['Firefox','Chrome'],

        plugins: [
            'karma-chrome-launcher',
            'karma-coverage',
            'karma-firefox-launcher',
            'karma-jasmine',
            'karma-mocha-reporter'
        ],

        preprocessors: { 
            'static-content/*Ctrl.js': ['coverage'], 
            'static-content/*Services.js': ['coverage'], 
            'static-content/*Renderer.js': ['coverage'], 
            'static-content/TsdbClient.js': ['coverage'], 
            'static-content/TsdbUtils.js': ['coverage'], 
            'static-content/DeepUtils.js': ['coverage'] 
        },

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
