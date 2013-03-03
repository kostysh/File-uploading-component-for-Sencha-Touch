/**
 * @class Ext.chart.interactions.ItemCompare
 * @extends Ext.chart.interactions.Abstract
 *
 * The ItemCompare interaction allows the user to select two data points in a series and
 * see a trend comparison between the two. An arrowed line will be drawn between the two points.
 *
 * You can attach this interaction to a chart by including an entry in the chart's
 * {@link Ext.chart.AbstractChart#interactions interactions} config with the `itemcompare` type:
 *
 *     new Ext.chart.AbstractChart({
 *         renderTo: Ext.getBody(),
 *         width: 800,
 *         height: 600,
 *         store: store1,
 *         axes: [ ...some axes options... ],
 *         series: [ ...some series options... ],
 *         interactions: [{
 *             type: 'itemcompare'
 *         }]
 *     });
 *
 * The display of the arrowed line {@link Ext.draw.sprite.Sprite sprites} can be customized via the
 * {@link #circle}, {@link #line}, and {@link #arrow} configs. It can also be given a global
 * {@link #offset position offset}.
 *
 * Use the {@link #show} and {@link #hide} events to perform additional actions when the trend
 * is displayed or hidden, such as displaying the trend change percentage to the user. Handlers
 * for these events are passed a reference to the ItemCompare interaction instance, so you
 * can access data from the {@link #item1} and {@link #item2} properties.
 *
 * @author Nicolas Garcia Belmonte <nicolas@sencha.com>
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.chart.interactions.ItemCompare', {
    extend: 'Ext.chart.interactions.Abstract',

    type: 'itemcompare',
    alias: 'interaction.itemcompare',
    config: {
        /**
         * @cfg {Object} circle
         * Custom {@link Ext.draw.sprite.Sprite} configuration to be applied to the sprite for the trend
         * line's starting circle.
         */
        /**
         * @cfg {Object} line
         * Custom {@link Ext.draw.sprite.Sprite} configuration to be applied to the sprite for the trend
         * line's connecting line.
         */
        /**
         * @cfg {Object} arrow
         * Custom {@link Ext.draw.sprite.Sprite} configuration to be applied to the sprite for the trend
         * line's ending arrow.
         */
        /**
         * @cfg {Object} offset
         * An optional x and y offset for the trend line's sprites in relation to the series items'
         * target points.
         */
        offset: {"x": 0, "y": 0}
    },

    /**
     * @property item1
     * @type {Object}
     * An object containing information about the first selected data point item if any.
     */

    /**
     * @property item2
     * @type {Object}
     * An object containing information about the second selected data point item if any.
     */

    /**
     * @event show
     * Fired when the point-to-point comparison is displayed
     * @param {Ext.chart.interactions.ItemCompare} this interaction instance
     */

    /**
     * @event hide
     * Fired when the point-to-point comparison is hidden
     * @param {Ext.chart.interactions.ItemCompare} this interaction instance
     */

    constructor: function (config) {
        var me = this;
        me.circleStyle = new (Ext.extend(Ext.chart.theme.Style, {isXType: function (xtype) {return xtype === 'circle';}}))(config.circle);
        me.lineStyle = new (Ext.extend(Ext.chart.theme.Style, {isXType: function (xtype) {return xtype === 'line';}}))(config.line);
        me.arrowStyle = new (Ext.extend(Ext.chart.theme.Style, {isXType: function (xtype) {return xtype === 'arrow';}}))(config.arrow);

        delete config.line;
        delete config.circle;
        delete config.arrow;

        me.callParent(arguments);
    },

    updateChart: function (newChart, oldChart) {
        var me = this;
        oldChart && oldChart.un('refresh', me.reset, me);
        newChart && newChart.on('refresh', me.reset, me);
        me.callParent([newChart, oldChart]);
    },

    onGesture: function (e) {
        var me = this,
            item = me.getItemForEvent(e);
        if (item) {
            //if we were already showing the overlay for previous items, then reset
            if (me.item1 && me.item2) {
                me.reset();
            }

            if (me.item1) {
                if (me.item1.series != item.series) {
                    me.reset();
                }
                else if (item !== me.item1) {
                    me.item2 = item;
                    item.series.highlightItem(item);
                    me.showOverlay();
                }
            } else {
                me.item1 = item;
                item.series.highlightItem(item);
            }
        } else {
            me.reset();
        }
    },

    /**
     * Resets any selected comparison items, removes the overlay arrow if present, and fires
     * the 'hide' event.
     */
    reset: function () {
        var me = this,
            series = me.activeSeries;

        if (series) {
            me.line.remove();
            me.circle.remove();
            me.arrow.remove();
            series.unHighlightItem();
            series.un('transform', me.onSeriesTransform, me);
            series.getOverlaySurface().renderFrame();
            delete me.activeSeries;
        }
        if (me.item1) {
            me.item1.series.unHighlightItem(me.item1);
        }
        if (me.item2) {
            me.item2.series.unHighlightItem(me.item2);
        }
        me.item1 = me.item2 = null;
        me.fireEvent('hide', me);
    },

    onSeriesTransform: function (obj, fast) {
        if (!fast) {
            this.renderSprites();
        }
    },

    showOverlay: function () {
        var me = this,
            series = me.item1.series; //both items are always from the same series
        me.activeSeries = series;
        series.on('transform', me.onSeriesTransform, me);

        me.renderSprites();
        me.fireEvent('show', me);
    },

    renderSprites: function () {
        var me = this,
            item1 = me.item1,
            item2 = me.item2,
            series = item1.series, //both items are always from the same series
            arrowStyle = me.arrowStyle.style,
            overlaySurface, arrowRadius,
            p1, p2, offset, offsetX, offsetY, x1, y1, x2, y2, line, circle, arrow;

        if (series) {

            overlaySurface = series.getOverlaySurface();
            me.line = overlaySurface.add(
                Ext.apply({
                    type: 'path',
                    path: ['M', 0, 0]
                }, me.lineStyle.style)
            );

            me.circle = overlaySurface.add(
                Ext.apply({
                    type: 'circle',
                    radius: 3
                }, me.circleStyle.style)
            );

            arrowRadius = arrowStyle.radius || 3;
            me.arrow = overlaySurface.add(
                Ext.apply({
                    type: 'path',
                    path: "M,0,0,m,0,-" + arrowRadius * 0.58 + ",l" + arrowRadius * 0.5 + "," + arrowRadius * 0.87 + ",-" + arrowRadius + ",0,z",
                }, arrowStyle)
            );

            p1 = item1.point;
            p2 = item2.point;
            offset = me.getOffset() || {};
            offsetX = offset.x || 0;
            offsetY = offset.y || 0;
            x1 = (p1[0] + offsetX);
            y1 = (p1[1] + offsetY);
            x2 = (p2[0] + offsetX);
            y2 = (p2[1] + offsetY);
            line = me.line;
            circle = me.circle;
            arrow = me.arrow;

            line.setAttributes({
                path: ['M', x1, y1, 'L', x2, y2]
            });

            circle.setAttributes({
                translation: {
                    x: x1,
                    y: y1
                }
            });

            arrow.setAttributes({
                translation: {
                    x: x2,
                    y: y2
                },
                rotation: {
                    x: 0,
                    y: 0,
                    degrees: (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI - 90) + 180
                }
            });

            overlaySurface.add(line, circle, arrow);
            overlaySurface.renderFrame();
        }
    },

    /* ---------------------------------
     Methods needed for ComponentQuery
     ----------------------------------*/

    getRefItems: function (deep) {
        var me = this;
        return [me.arrowStyle, me.lineStyle, me.circleStyle];
    }
});


