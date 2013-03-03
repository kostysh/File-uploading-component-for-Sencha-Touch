/**
 * @class Ext.chart.series.Sunburst
 * @extends Ext.chart.series.AbstractSpaceFilling
 *
 * Creates a Sunburst visualization. The Sunburst is a radial space filling visualization that renders hierarchies.
 * Hierarchy visualizations use TreeStores.
 *
 * {@img Ext.chart.series.Sunburst/Ext.chart.series.Sunburst.png Ext.chart.series.Sunburst Sunburst visualization}
 *
 *  For example:

 Ext.define('User', {
 extend: 'Ext.data.Model',
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
 type: 'json'
 }
 }
 })

 treeStore.load({
 callback: callback
 });

 function callback() {

 var chart = new Ext.chart.AbstractChart({
 store: treeStore,
 animate: true,
 series: [{
 type: 'sunburst',
 highlight: true,
 titleField: 'name',
 spanField: function(node) {
 return node && node.storeItem ? node.storeItem.get('data').area : 1;
 },
 areaField: function(node) {
 return node ? node.get('data').area : 1;
 },
 colorField: function(node) {
 return '#333';
 }
 }]
 });


 * In this example we load a TreeStore via an http request from a json file, and once loaded we create a chart
 * with a sunburst series. We also set a function `spanField` that returns
 * the angle span allocated for the node to be placed in the Sunburst visualization.

 * @xtype sunburst
 */


Ext.define('Ext.chart.series.Sunburst', {

    extend: 'Ext.chart.series.AbstractSpaceFilling',

    mixins: {
        'radial': 'Ext.chart.series.AbstractRadial'
    },

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
     * @cfg {String/Function} spanField
     *  A function that returns a value relative to which angle the node should take in th main layout.
     */

    /**
     * @cfg {String/Function} colorField
     * A function that returns a color string given a node.
     */

    config: {
        levelDistance: null
    },

    type: 'sunburst',

    constructor: function (config) {
        var me = this;
        me.callParent(arguments);
        me.dimField = me.spanField;
    },

    createLevelDistanceFunc: function () {
        var me = this,
            chart = me.getChart(),
            surface = me.getSurface(),
            width = surface.getWidth(),
            height = surface.getHeight(),
            root = chart.getStore().getRoot(),
            ld = (Math.min(width, height) >> 1) / (me.getTreeDepth(root) + 1);

        me.setLevelDistance(ld);

        return function (elem) {
            return (elem.depth + 1) * ld;
        };
    },

    getTreeDepth: function (root) {
        return (function depth(n, d) {
            if (!n) {
                return d;
            }
            var i = 0,
                childNodes = n.childNodes,
                l = childNodes.length,
                ch = Array(l);

            if (!l) {
                return d;
            }

            for (; i < l; ++i) {
                ch[i] = depth(childNodes[i], d + 1);
            }

            return Math.max.apply(Math, ch);
        })(root, 0);
    },

    //render inner nodes the same way as leaves.
    renderInner: function () {
        this.renderLeaf.apply(this, arguments);
    },

    getOrCreateSprite: function (item, index) {
        var me = this,
            group = me.group,
            sprite = group.getAt(index),
            bbox = me.bbox;

        if (sprite) {
            sprite.show(true);
        }

        return sprite || me.getSurface().add({
            type: 'path',
            path: ['M', 0, 0],
            x: 0,
            y: 0,
            group: group
        });
    },

    getOrCreateLabel: function (item, index) {
        var me = this,
            label = me.labelsGroup,
            sprite = label.getAt(index),
            titleHeight = me.titleHeight || 0,
            offset = me.offset || 0,
            levelDistance = me.getLevelDistance(),
            bbox = me.bbox,
            node = item.storeItem,
            text = node.get(me.titleField) || me.rootName,
            theta = item.theta,
            cond = (theta > Math.PI / 2 && theta < 3 * Math.PI / 2),
            thetap = cond ? theta + Math.PI : theta,
            ans, textBBox;

        item.labelRotation = thetap;

        ans = sprite || me.getSurface().add({
            type: 'text',
            text: text,
            font: Math.max(12, 0) + 'px Arial',
            'textAlign': 'center',
            fill: '#fff',
            group: label
        });

        ans.setAttributes({
            text: text,
            hidden: false
        }, true);

        textBBox = ans.getBBox();

        while (ans.getBBox(true).width > levelDistance && text.length >= 7) {
            text = text.slice(0, text.length / 2) + '...';
            ans.setAttributes({
                text: text
            }, true);
        }

        return ans;
    },


    renderLeaf: function (item, spriteIndex, labelIndex) {
        if (!item.parent) {
            item.sprite = {
                getBBox: function () {
                    return {
                        x: 0,
                        y: 0,
                        width: 0,
                        height: 0
                    }
                }
            };
            return;
        }

        //Skip the root node index which isn't rendered.
        spriteIndex -= 1;
        labelIndex -= 1;


        var me = this,
            math = Math,
            cos = math.cos,
            sin = math.sin,
            abs = math.abs,
            chart = me.getChart(),
            animate = chart.getAnimate(),
            sprite = me.getOrCreateSprite(item, spriteIndex),
            label = me.getOrCreateLabel(item, labelIndex),
            levelDistance = me.getLevelDistance() || 30,
            depth = item.depth,
            fromLen = depth * levelDistance,
            toLen = fromLen + levelDistance,
            span = item.span / 2,
            theta = item.theta,
            x = item.x,
            y = item.y,
            twoPI = 2 * math.PI,
            angleSpan = item.angleSpan,
            isSingleSlice = (twoPI % angleSpan.end == 0 && twoPI % span == 0),
            a1 = theta - span,
            a2 = theta + span,
            centerX = me.centerX,
            centerY = me.centerY,
            x1 = item.rho * cos(a1),
            y1 = item.rho * sin(a1),
            x2 = (item.rho + levelDistance) * cos(a1),
            y2 = (item.rho + levelDistance) * sin(a1),
            x3 = item.rho * cos(a2),
            y3 = item.rho * sin(a2),
            x4 = (item.rho + levelDistance) * cos(a2),
            y4 = (item.rho + levelDistance) * sin(a2),
            flag = abs(a2 - a1) > math.PI,
            getColor = typeof me.colorField == 'function' ? me.colorField : function (item) {
                return item.storeItem.get(me.colorField);
            },
            descriptorSprite = {
                path: [
                    ["M", x1, y1],
                    ["L", x2, y2],
                    ["A", toLen, toLen, 0, +flag, 1, x4, y4],
                    ["L", x4, y4],
                    ["L", x3, y3],
                    ["A", fromLen, fromLen, 0, +flag, 0, x1, y1],
                    ["Z"]
                ],
                fill: getColor(item),
                translation: {
                    x: centerX,
                    y: centerY
                }
            },
            descriptorLabel = {
                fill: me.label.fill || '#fff',
                textAlign: 'center',
                zIndex: 10000,
                translation: {
                    x: item.x + (levelDistance / 2 * cos(item.theta)),
                    y: item.y + (levelDistance / 2 * sin(item.theta))
                }
            };

        if (isSingleSlice) {
            // TODO: correct path for single slice
            descriptorSprite.path = [
                ["M", x1, y1],
                ["L", x2, y2],
                ["A", toLen, toLen, 0, +flag, 1, x4, y4 - 0.1],
                ["L", x4, y4],
                ["L", x3, y3],
                ["A", fromLen, fromLen, 0, +flag, 0, x1, y1],
                ["Z"]
            ];
        }

        label.setAttributes({
            rotation: {
                degrees: item.labelRotation * 180 / Math.PI,
                x: 0,
                y: 0
            }
        }, true);

        item.sprite = sprite;
        //animate or render.
        if (animate && !chart.resizing) {
            me.onAnimate(sprite, {
                to: descriptorSprite
            });
            if (!label.attr.hidden) {
                delete descriptorLabel['textAlign'];

                me.onAnimate(label, {
                    to: descriptorLabel
                });
            }
        } else {
            sprite.setAttributes(descriptorSprite, true);
            label.setAttributes(descriptorLabel, true);
        }
    },
    hideExtraElements: function (itemsLength, labelsCount) {
        var me = this,
            labelsCount = labelsCount - 1,
            labelsGroup = me.labelsGroup,
            group = me.group,
            i, ln;

        ln = group.length;
        for (i = itemsLength - 1; i < ln; i++) {
            group.getAt(i).hide(true);
        }

        ln = labelsGroup.length;
        for (i = labelsCount; i < ln; i++) {
            labelsGroup.getAt(i).hide(true);
        }
    },
    isItemInPoint: function (x, y, item) {
        var me = this,
            diffX = x - me.centerX,
            diffY = y - me.centerY,
            rho = Math.sqrt(diffX * diffX + diffY * diffY),
            theta = Math.atan2(diffY, diffX),
            ldist = me.getLevelDistance();

        theta = theta < 0 ? (theta + Math.PI * 2) : theta;

        if (item.parent) {
            return rho >= item.rho && rho <= item.rho + ldist &&
                theta >= item.angleSpan.begin && theta <= item.angleSpan.end;
        }
    }
});

