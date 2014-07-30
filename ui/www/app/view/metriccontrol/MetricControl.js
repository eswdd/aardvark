/**
 *
 */
Ext.define('Otis.view.metriccontrol.MetricControl', {
    extend: 'Ext.form.Panel',
    alias: 'widget.metriccontrol',
    requires: ['Otis.ui.RelativeTimeTextField'],


    controller: 'metriccontrol',
    viewModel: {
        type: 'metriccontrol'
    },

    title: 'Metric control',
    frame: true,
    layout: 'column',
    style: {
        marginBottom: '5px'
    },



    items: [
        {
            xtype: 'textfield'
        },
        {
            xtype: 'panel',
            reference: 'metrictreeContainer',
            width: 200,
            height: 200
        },
        {
            xtype: 'treepanel',
            reference: 'metrictree',
            width: 200,
            height: 200,
            fields:['text'],
            useArrows: true,
            columns: [{
                xtype: 'treecolumn',
                text: 'Name',
                dataIndex: 'text',
                width: 150,
                sortable: false
            }],
            root: {
                text: 'Root',
                expanded: false
            }

//            store: 'metrictree'
//            store: {
//                model: 'Otis.model.metrictree.MetricTreeModel'
//            }
        },
        {
            xtype: 'textfield'
        }
    ],

    buttons: [
        {
            text: 'DebugTree',
            handler: 'onClickDebugTree'
        }
    ]

});
