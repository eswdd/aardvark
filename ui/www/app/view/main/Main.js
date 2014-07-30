/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('Otis.view.main.Main', {
    extend: 'Ext.container.Container',

    xtype: 'app-main',

    controller: 'main',
    viewModel: {
        type: 'main'
    },

    layout: {
        type: 'border'
    },

    items: [{
        region: 'north',
        xtype: 'panel',
        title: 'Otis - OpenTSDB Visualiser',
        titleAlign: 'center',
        collapsible: true
    },{
        xtype: 'graphcontrol',
        region: 'west',
        width: 220,
        collapsible: true
    },{
        region: 'center',
        xtype: 'panel'
    },{
        xtype: 'panel',
        region: 'east',
        html: '<ul><li>Metric tree etc</li></ul>',
        width: 250,
        tbar: [{
            text: 'Button',
            handler: 'onClickButton'
        }]
    }]
});
