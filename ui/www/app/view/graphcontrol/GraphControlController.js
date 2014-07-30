/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('Otis.view.graphcontrol.GraphControlController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.graphcontrol',

    onChangeUseRelativeTime: function(cb, checked) {
        if (checked) {
            this.lookupReference('relativeInterval').enable();
            this.lookupReference('fromDate').disable();
            this.lookupReference('fromTime').disable();
        } else {
            autoRefresh = false;
            this.lookupReference('relativeInterval').disable();
            this.lookupReference('fromDate').enable();
            this.lookupReference('fromTime').enable();
        }
    },

    onChangeToNow: function(cb, checked) {
        if (checked) {
//            autoRefresh = true;
            this.lookupReference('toDate').disable();
            this.lookupReference('toTime').disable();
        } else {
            autoRefresh = false;
            this.lookupReference('toDate').enable();
            this.lookupReference('toTime').enable();
        }
    },

    onClickUpdate: function () {

    }




//    ,doInit: Ext.emptyFn // takes an app in theory
//    ,onLaunch: Ext.emptyFn // takes an app in theory
});
