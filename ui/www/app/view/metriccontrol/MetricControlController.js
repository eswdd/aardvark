/**
 * This class is the main view for the application. It is specified in app.js as the
 * "autoCreateViewport" property. That setting automatically applies the "viewport"
 * plugin to promote that instance of this class to the body element.
 *
 * TODO - Replace this content of this view to suite the needs of your application.
 */
Ext.define('Otis.view.metriccontrol.MetricControlController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.metriccontrol',

    init: function(app) {
//        alert('a');

        var treeContainer = this.lookupReference("metrictreeContainer");
        var tree2 = Ext.create('Ext.tree.Panel', {
            title: 'Simple tree',
            root: {
                text: 'Root',
                expanded: true,
                useArrows: true,
                children: [
                    {
                        text: 'child 1',
                        leaf: true
                    },
                    {
                        text: 'child 2',
                        leaf: true
                    }
                ]
            }
        });
        treeContainer.add(tree2);

        var tree = this.lookupReference("metrictree");
        var rootNode = tree.getRootNode();
        rootNode.appendChild(
            {
                text: 'Child 1',
                leaf: true
            });
        rootNode.appendChild(
            {
                text: 'Child 2',
                leaf: true
            });
        rootNode.expand();
//        alert('b');

//        tree.sync();
//        alert('c');
    },

    onClickDebugTree: function() {
        var tree = this.lookupReference("metrictree");
        alert(tree);
        var rootNode = tree.getRootNode();
        alert(rootNode);
        alert(rootNode.text);
        rootNode.expand();
        rootNode.appendChild(
            {
                text: 'Child 3',
                leaf: true
            });
//        rootNode.expand();
    }



//    ,doInit: Ext.emptyFn // takes an app in theory
//    ,onLaunch: Ext.emptyFn // takes an app in theory
});
