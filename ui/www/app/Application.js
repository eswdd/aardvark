/**
 * The main application class. An instance of this class is created by app.js when it calls
 * Ext.application(). This is the ideal place to handle application launch and initialization
 * details.
 */
Ext.define('Otis.Application', {
    extend: 'Ext.app.Application',

    name: 'Otis',

    views: [
        'graphcontrol.GraphControl',
        'graphcontrol.GraphControlController',
        'metriccontrol.MetricControl',
        'metriccontrol.MetricControlController'
        // TODO: add views & view controllers here
    ],

    controllers: [
        'Root'
        // TODO: add controllers here
    ],

    stores: [
        'metrictree.MetricTreeStore'
        // TODO: add stores here
    ],



    launch: function () {
        // TODO - Launch the application
    }


});
