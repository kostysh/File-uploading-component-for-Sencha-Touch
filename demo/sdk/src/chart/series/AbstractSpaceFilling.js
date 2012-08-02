/**
 * @class Ext.chart.series.AbstractSpaceFilling
 * @extends Ext.chart.series.Series
 *
 * Contains main layout and rendering operations for space filling visualizations like Icicle or TreeMap.
 *
 * {@img Ext.chart.series.Icicle/Ext.chart.series.Icicle.png Ext.chart.series.Icicle Icicle visualization}
 *
 */

Ext.define('Ext.chart.series.AbstractSpaceFilling', {

    extend: 'Ext.chart.series.Series',

    showInLegend: false,

    title: {},

    /**
     * @cfg {String/Function} areaField
     * The name of the numeric field to be used to set the area of the rectangles.
     * Can also be a function that gets a store item as first element and returns a number to be used
     * for calculating the area of the rectangles.
     * Default is `area`.
     */
    areaField: 'area',

    /**
     * @cfg {String/Function} colorField
     * The name of the color field to be used to set the area of the rectangles.
     * Can also be a function that gets a store item as first element and returns a number to be used
     * for calculating the area of the rectangles.
     * Default is `color`.
     */
    colorField: 'color',


    /**
     * @cfg {Object} style
     * Append styling properties to this object for it to override theme properties.
     */

    constructor: function (config) {
        this.callParent(arguments);
        var me = this,
            surface = me.getSurface();

        Ext.apply(me, config, {
            style: {}
        });

        me.group = surface.getGroup(me.seriesId);
    },

    // @private Get chart and data boundaries
    getBounds: function () {
        var me = this,
            chart = me.getChart(),
            store = chart.getStore(),
            root = store.getRoot(),
            minValue = Infinity,
            maxValue = -Infinity,
            areaField = me.areaField,
            getArea, bbox, maxArea;

        //convert to a function
        if (typeof areaField != 'function') {
            getArea = function (node) { return node.get(areaField); };
        } else {
            getArea = areaField;
        }
        me.areaField = getArea;

        //get bounding box
        me.setBBox();
        bbox = me.bbox;
        maxArea = bbox.width * bbox.height;

        //get max and min area values
        (function iterate(node) {
            var area = getArea(node),
                i, ch, len;
            if (node) {
                minValue = minValue > area ? area : minValue;
                maxValue = maxValue < area ? area : maxValue;
            }

            for (i = 0, ch = node.childNodes, len = ch.length; i < len; ++i) {
                iterate(ch[i]);
            }
        })(root);

        //set getArea to return the interpolated area values.
        me.getArea = function (node) {
            return (getArea(node) - minValue) / (maxValue - minValue) * maxArea;
        };

        return {
            bbox: bbox,
            minValue: minValue,
            maxValue: maxValue,
            area: bbox.width * bbox.height
        };
    },

    /**
     * Draws the visualization.
     */
    drawSeries: function () {
        var me = this,
            chart = me.getChart(),
            animate = chart.getAnimate(),
            store = chart.substore || chart.getStore(),
            group = me.group,
            titleHeight = me.titleHeight || 0,
            count = 0,
            leafCount = 0,
            labelsGroup = me.labelsGroup,
            leaf = function (item) {
                return !item.storeItem.childNodes.length;
            },
            descriptor, bbox, bounds, items, item, sprite, l, i, rendererAttributes;

        //somebody has prevented this series from drawing.
        if (me.fireEvent('beforedraw', me) === false) {
            return;
        }

        //if the store is empty then there's nothing to be rendered
        if (!store.getRoot().childNodes.length || me.seriesIsHidden) {
            me.getSurface().getItems().hide(true);
            return;
        }

        Ext.chart.series.AbstractSpaceFilling.superclass.drawSeries.call(this);

        //unhighlight all items before refreshing.
        me.unHighlightItem();
        me.cleanHighlights();

        //get bounds
        bounds = me.getBounds();
        bbox = bounds.bbox;

        //perform layout
        me.items = items = me.compute(bounds);

        //create sprites and render (or animate)
        for (i = 0, l = items.length; i < l; ++i) {
            item = items[i];
            item.series = me;

            if (leaf(item)) {
                me.renderLeaf(item, leafCount++, count++);
            } else {
                me.renderInner(item, leafCount++, count++);
            }
        }

        me.hideExtraElements(items.length, count);

        me.fireEvent('draw', me);
    },

    hideExtraElements: function (itemsLength, labelCount) {
        var me = this,
            labelsGroup = me.labelsGroup,
            group = me.group,
            i, ln;

        // Hide unused sprites
        ln = group.length;
        for (i = itemsLength; i < ln; i++) {
            group.getAt(i).hide(true);
        }
        ln = labelsGroup.length;
        for (i = labelCount; i < ln; i++) {
            labelsGroup.getAt(i).hide(true);
        }
    },

    //@private
    getOrCreateSprite: function (item, index) {
        var me = this,
            group = me.group,
            sprite = group.getAt(index),
            bbox = me.bbox;


        return sprite || me.getSurface().add({
            type: 'rect',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            group: group,
            translation: {
                x: (bbox.x + bbox.width) / 2,
                y: (bbox.y + bbox.height) / 2
            }
        });
    },

    //@private
    getOrCreateLabel: function (item, index) {
        var me = this,
            label = me.labelsGroup,
            sprite = label.getAt(index),
            titleHeight = me.titleHeight || 0,
            offset = me.offset || 0,
            bbox = me.bbox,
            node = item.storeItem,
            text = node.get(me.titleField) || me.rootName,
            ans;

        ans = sprite || me.getSurface().add({
            type: 'text',
            text: text,
            font: Math.max((titleHeight - offset), 0) + 'px Arial',
            textAlign: 'center',
            x: 0,
            y: titleHeight / 2,
            fill: '#fff',
            group: label,
            width: 0,
            translation: {
                x: (bbox.x + bbox.width) / 2,
                y: (bbox.y + bbox.height) / 2
            }
        });

        ans.setAttributes({
            text: text,
            hidden: false
        }, true);

        while (ans.getBBox().width > item.width && text.length >= 7) {
            text = text.slice(0, text.length / 2) + '...';
            ans.setAttributes({
                text: text
            }, true);
        }

        if ((/\.{3}$/.test(text) && text.length < 7) || ans.getBBox().height >= item.height) {
            ans.setAttributes({
                hidden: true
            }, true);
        }

        return ans;
    },

    /**
     * Renders the leaf node of the hierarchy.
     *
     * @param item {Object} An item containing information for the leaf node.
     * @param spriteIndex {Number} Uses this index to find the sprite to be used to render the leaf.
     * @param labelIndex {Number} Uses this index to find the label sprite to be used to render the leaf text.
     */
    renderLeaf: function (item, spriteIndex, labelIndex) {
        var me = this,
            animate = me.getChart().getAnimate(),
            sprite = me.getOrCreateSprite(item, spriteIndex),
            label = me.getOrCreateLabel(item, labelIndex),
            offset = (me.offset || 0) / 2,
            titleHeight = me.titleHeight || 0,
            getColor = typeof me.colorField == 'function' ? me.colorField : function (item) {
                return item.storeItem.get(me.colorField);
            },
            descriptorSprite = {
                fill: getColor(item),
                width: item.width - offset * 2,
                height: item.height - offset * 2,
                translation: {
                    x: item.x + offset,
                    y: item.y + offset
                }
            },
            descriptorLabel = {
                fill: me.label.fill || '#fff',
                width: item.width - offset * 2,
                textAlign: 'center',
                zIndex: 10000,
                translation: {
                    x: item.x + offset + item.width / 2,
                    y: item.y + offset + (item.height - Math.max(titleHeight, 0)) / 2
                }
            };

        item.sprite = sprite;

        //animate or render.
        if (animate) {
            me.onAnimate(sprite, {
                to: descriptorSprite
            });
            if (!label.attr.hidden) {
                me.onAnimate(label, {
                    to: descriptorLabel
                });
            }
        } else {
            sprite.setAttributes(descriptorSprite, true);
            label.setAttributes(descriptorLabel, true);
        }
    },

    /**
     * Renders an inner node of the hierarchy.
     *
     * @param item {Object} An item containing information for the leaf node.
     * @param spriteIndex {Number} Uses this index to find the sprite to be used to render the leaf.
     * @param labelIndex {Number} Uses this index to find the label sprite to be used to render the leaf text.
     */
    renderInner: function (item, spriteIndex, labelIndex) {
        if (!this.titleHeight) {
            return;
        }

        var me = this,
            animate = me.getChart().getAnimate(),
            sprite = me.getOrCreateSprite(item, spriteIndex),
            label = me.getOrCreateLabel(item, labelIndex),
            offset = (me.offset || 0) / 2,
            titleHeight = me.titleHeight || 0,
            descriptorSprite = {
                fill: me.title.fill || '#555',
                width: item.width - offset * 2,
                height: Math.max(titleHeight - offset, 0),
                translation: {
                    x: item.x + offset,
                    y: item.y + offset
                }
            },
            descriptorLabel = {
                fill: me.label.fill || '#fff',
                width: item.width - offset * 2,
                height: Math.max(titleHeight - offset, 0),
                textAlign: 'center',
                zIndex: 10000,
                translation: {
                    x: item.x + offset + item.width / 2,
                    y: item.y + offset
                }
            };

        item.sprite = sprite;

        //animate or render.
        if (animate) {
            me.onAnimate(sprite, {
                to: descriptorSprite
            });
            me.onAnimate(label, {
                to: descriptorLabel
            });
        } else {
            sprite.setAttributes(descriptorSprite, true);
            label.setAttributes(descriptorLabel, true);
        }
    },

    isItemInPoint: function (x, y, item) {
        if (!item.sprite) {
            return false;
        }
        var bbox = item.sprite.getBBox();
        return bbox.x <= x && bbox.y <= y
            && (bbox.x + bbox.width) >= x
            && (bbox.y + bbox.height) >= y;
    },

    // @private callback for when creating a label sprite.
    onCreateLabel: function (storeItem, item, i, display) {
    },

    // @private callback for when placing a label sprite.
    onPlaceLabel: function (label, storeItem, item, i, display, animate) {
    },

    // @private callback for when placing a callout sprite.
    onPlaceCallout: function (callout, storeItem, item, i, display, animate, index) {},

    // @private handles sprite animation for the series.
    onAnimate: function (sprite, attr) {
        sprite.show();
        Ext.chart.series.AbstractSpaceFilling.superclass.onAnimate.apply(this, arguments);
    }
});