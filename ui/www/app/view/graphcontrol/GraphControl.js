/**
 *
 */
Ext.define('Otis.view.graphcontrol.GraphControl', {
    extend: 'Ext.form.Panel',
    alias: 'widget.graphcontrol',
    requires: ['Otis.ui.RelativeTimeTextField'],


    controller: 'graphcontrol',
    viewModel: {
        type: 'graphcontrol'
    },

    title: 'Graph control',
    frame: true,
    layout: 'column',
    style: {
        marginBottom: '5px'
    },



    items: [
        {
            xtype: 'panel',
            layout: 'column',
            title: 'From',
            items: [
                {
                    reference: 'relativeInterval',
                    xtype: 'xrelative',
                    width: 50
                },
                {
                    reference: "useRelativeTime",
                    xtype: 'checkbox',
                    style: {marginLeft: "5px"},
                    hideLabel: true,
                    boxLabel: "Relative to now",
                    inputValue: true,
                    checked: true,
                    listeners: {
                        change: 'onChangeUseRelativeTime'
                    }
                },
                {
                    xtype: 'panel',
                    layout: 'hbox',
                    items: [
                        {
                            reference: 'fromDate',
                            hideLabel: true,
                            xtype: 'datefield',
                            format : "d/m/Y",
                            //altFormats : "d/m/Y|n/j/Y|n/j/y|m/j/y|n/d/y|m/j/Y|n/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d|n-j|n/j",
                            width: 100,
                            disabled: true
                        },
                        {
                            reference: 'fromTime',
                            hideLabel: true,
                            xtype: 'timefield',
                            format: 'H:i',
//                    altFormats : "g:ia|g:iA|g:i a|g:i A|h:i|g:i|H:i|ga|ha|gA|h a|g a|g A|gi|hi|gia|hia|g|H|gi a|hi a|giA|hiA|gi A|hi A",
                            width: 70,
                            disabled: true
                        }
                    ]
                }
            ]
        },
        {
            // todo: validator to ensure to is after from
            xtype: 'panel',
            layout: 'column',
            title: 'To',
            items: [
                {
                    reference: "toNow",
                    xtype: 'checkbox',
                    style: {
                        marginLeft: '5px',
                        marginRight: "50px"
                    },
                    hideLabel: true,
                    boxLabel: "Now",
                    inputValue: true,
                    checked: true,
                    listeners: {
                        change: 'onChangeToNow'
                    }
                },
                {
                    xtype: 'panel',
                    layout: 'hbox',
                    items: [
                        {
                            reference: 'toDate',
                            hideLabel: true,
                            xtype: 'datefield',
                            format : "d/m/Y",
                            width: 100,
                            disabled: true
                        },
                        {
                            reference: 'toTime',
                            hideLabel: true,
                            xtype: 'timefield',
                            format: 'H:i',
                            width: 70,
                            disabled: true
                        }
                    ]
                }
            ]
        }
    ],

    buttons: [
        {
            text: 'Update',
            handler: 'onClickUpdate'
        }
    ]

});
