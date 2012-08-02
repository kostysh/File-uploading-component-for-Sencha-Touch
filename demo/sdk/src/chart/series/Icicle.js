/**
 * @class Ext.chart.series.Icicle
 * @extends Ext.chart.series.AbstractSpaceFilling
 *
 * Creates a Icicle visualization. The Icicle is a space filling visualization that renders hierarchies.
 * Hierarchy visualizations use TreeStores.
 *
 * {@img Ext.chart.series.Icicle/Ext.chart.series.Icicle.png Ext.chart.series.Icicle Icicle visualization}
 *
 * For example:
 *

 Ext.define('User', {
 extend: "Ext.data.Model",
 config: {
 fields: ['children', 'leaf', 'data', 'id', 'name']
 }
 });

 treeStore = new Ext.data.TreeStore({
 model: 'User',
 batchUpdateMode: 'complete',
 proxy: {
 type: 'ajax',
 url: 'src/model.json',
 reader: {
 type: 'json',
 rootProperty: 'children'
 }
 }
 });

 treeStore.load({
 callback: callback
 });

 function callback() {
 var chart = new Ext.chart.AbstractChart({
 store: treeStore,
 animate: true,
 series: [{
 type: 'icicle',
 layout: 'icicle',
 orientation: 'horizontal',
 highlight: true,
 titleHeight: 13,
 offset: 0.5,
 rootName: 'Root node name',
 titleField: 'name',
 lengthField: function(node) {
 return node ? node.get('data').area : 1;
 },
 colorField: function(node) {
 return '#522';
 }
 }]
 });
 }

 *
 * In this example we load a TreeStore via an http request from a json file, and once loaded we create a chart
 * with an icicle series, icicle layout and horizontal orientation. We also set a function `lengthField` that returns
 * the height of the node to be placed in the Icicle visualization.
 *
 */

(function () {

//Contains the layout logic for an Icicle visualization.
    var Layout = {};

//Define layout mixin
    Layout.Icicle = {
        compute: function () {

            var me = this,
                store = me.getChart().getStore(),
                root = store.getRoot(),
                size = me.bbox,
                width = size.width,
                height = size.height,
                offset = me.offset,
                initialDepth = 0,
                treeDepth = 0,
                items = [];

            treeDepth = (function getDepth(node, depth) {
                var finalDepth = depth,
                    ch = node.childNodes,
                    l = ch.length,
                    i = 0,
                    depths = [];

                if (l) {
                    for (; i < l; i++) {
                        depths.push(getDepth(ch[i], depth + 1));
                    }
                    finalDepth = Math.max.apply(Math, depths);
                }

                return finalDepth;
            })(root, 0);

            if (me.orientation == 'horizontal') {
                me.computeSubtree(root, 0, 0, width / (treeDepth + 1), height, initialDepth, treeDepth, items);
            } else {
                me.computeSubtree(root, 0, 0, width, height / (treeDepth + 1), initialDepth, treeDepth, items);
            }

            return items;
        },

        computeSubtree: function (root, x, y, width, height, initialDepth, maxDepth, items) {
            var me = this,
                getRecord = function (n) { return n; },
                ch = root.childNodes,
                l = ch.length,
                i = 0,
                nodeLength = 0,
                prevNodeLength = 0,
                totalDim = 0,
                getLength = typeof me.lengthField == 'function' ? me.lengthField
                    : function (n) { return n.get(me.lengthField); },
                rootItem = {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    storeItem: root
                };

            items.push(rootItem);

            if (!l) {
                return;
            }

            for (; i < l; ++i) {
                totalDim += getLength(getRecord(ch[i]));
            }

            for (i = 0; i < l; ++i) {
                if (me.orientation == 'horizontal') {
                    nodeLength = height * getLength(getRecord(ch[i])) / totalDim;
                    me.computeSubtree(ch[i], x + width, y, width, nodeLength, initialDepth, maxDepth, items);
                    y += nodeLength;
                } else {
                    nodeLength = width * getLength(getRecord(ch[i])) / totalDim;
                    me.computeSubtree(ch[i], x, y + height, nodeLength, height, initialDepth, maxDepth, items);
                    x += nodeLength;
                }
            }
        }

    };


    Ext.define('Ext.chart.series.Icicle', {

        extend: 'Ext.chart.series.AbstractSpaceFilling',

        statics: {
            Layout: Layout
        },

        type: 'icicle',

        /**
         * @cfg {String} orientation
         * The orientation for the layout. Possible values are horizontal or vertical.
         */

        /**
         * @cfg {Number} offset
         * Margin between nodes in pixels.
         */

        /**
         * @cfg {String} rootName
         * A value for the root node name.
         */

        /**
         * @cfg {String} titleField
         * The field to be used to display text within each node's label.
         */

        /**
         * @cfg {String/Function} lengthField
         *  A function that returns a value relative to what amount of space the node should occupy in th main layout.
         */

        /**
         * @cfg {String/Function} colorField
         * A function that returns a color string given a node.
         */


        orientation: 'horizontal',

        constructor: function (config) {
            this.callParent(arguments);
            Ext.apply(this, Layout.Icicle);
        },

        //render inner nodes the same way as leaves.
        renderInner: function () {
            this.renderLeaf.apply(this, arguments);
        }
    });

})();

