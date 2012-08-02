/**
 * The Ext.chart package provides the capability to visualize data.
 * Each chart binds directly to an Ext.data.Store enabling automatic updates of the chart.
 * A chart configuration object has some overall styling options as well as an array of axes
 * and series. A chart instance example could look like:
 *
 *     new Ext.chart.AbstractChart({
 *         renderTo: Ext.getBody(),
 *         width: 800,
 *         height: 600,
 *         animate: true,
 *         store: store1,
 *         shadow: true,
 *         theme: 'Category1',
 *         legend: {
 *             position: 'right'
 *         },
 *         axes: [ ...some axes options... ],
 *         series: [ ...some series options... ]
 *     });
 *
 * In this example we set the `width` and `height` of the chart, we decide whether our series are
 * animated or not and we select a store to be bound to the chart. We also turn on shadows for all series,
 * select a color theme `Category1` for coloring the series, set the legend to the right part of the chart and
 * then tell the chart to render itself in the body element of the document. For more information about the axes and
 * series configurations please check the documentation of each series (Line, Bar, Pie, etc).
 *
 * @xtype chart
 */

Ext.define('Ext.chart.AbstractChart', {

    extend: 'Ext.draw.Component',

    mixins: {
        theme: 'Ext.chart.theme.Theme'
    },

    requires: [
        'Ext.chart.series.Series',
        'Ext.chart.interactions.Abstract',
        'Ext.chart.axis.Axis'
    ],
    /**
     * @event beforerefresh
     * Fires before a refresh to the chart data is called.  If the beforerefresh handler returns
     * <tt>false</tt> the {@link #refresh} action will be cancelled.
     * @param {Ext.chart.AbstractChart} this
     */

    /**
     * @event refresh
     * Fires after the chart data has been refreshed.
     * @param {Ext.chart.AbstractChart} this
     */

    /**
     * @event redraw
     * Fires after the chart is redrawn
     * @param {Ext.chart.AbstractChart} this
     */

    /**
     * @event itemmousemove
     * Fires when the mouse is moved on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemmouseup
     * Fires when a mouseup event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemmousedown
     * Fires when a mousedown event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemmouseover
     * Fires when the mouse enters a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemmouseout
     * Fires when the mouse exits a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemclick
     * Fires when a click event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemdoubleclick
     * Fires when a doubleclick event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtap
     * Fires when a tap event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtapstart
     * Fires when a tapstart event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtapend
     * Fires when a tapend event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtapcancel
     * Fires when a tapcancel event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtaphold
     * Fires when a taphold event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemdoubletap
     * Fires when a doubletap event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemsingletap
     * Fires when a singletap event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtouchstart
     * Fires when a touchstart event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtouchmove
     * Fires when a touchmove event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemtouchend
     * Fires when a touchend event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemdragstart
     * Fires when a dragstart event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemdrag
     * Fires when a drag event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemdragend
     * Fires when a dragend event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itempinchstart
     * Fires when a pinchstart event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itempinch
     * Fires when a pinch event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itempinchend
     * Fires when a pinchend event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */
    /**
     * @event itemswipe
     * Fires when a swipe event occurs on a series item.
     * @param {Ext.chart.series.Series} series
     * @param {Object} item
     * @param {Event} event
     */

    /**
     * @property version Current Version of Touch Charts
     * @type {String}
     */
    version: '2.0.0',

    // @private
    viewBox: false,

    config: {

        /**
         * @cfg {Ext.data.Store} store
         * The store that supplies data to this chart.
         */
        store: null,

        /**
         * @cfg {Boolean/Object} shadow (optional) true for the default shadow configuration (shadowOffsetX: 2, shadowOffsetY: 2, shadowBlur: 3, shadowColor: '#444')
         * or a standard shadow config object to be used for default chart shadows.
         */
        shadow: false,

        /**
         * @cfg {Boolean/Object} animate (optional) true for the default animation (easing: 'ease' and duration: 500)
         * or a standard animation config object to be used for default chart animations.
         */
        animate: true,

        /**
         * @cfg {Ext.chart.series.Series} series
         * Array of {@link Ext.chart.series.Series Series} instances or config objects. For example:
         *
         * series: [{
         *      type: 'column',
         *      axis: 'left',
         *      listeners: {
         *          'afterrender': function() {
         *              console('afterrender');
         *          }
         *      },
         *      xField: 'category',
         *      yField: 'data1'
         * }]
         */
        series: [],

        /**
         * @cfg {Ext.chart.axis.Axis} axes
         * Array of {@link Ext.chart.axis.Axis Axis} instances or config objects. For example:
         *
         * axes: [{
         *      type: 'Numeric',
         *      position: 'left',
         *      fields: ['data1'],
         *      title: 'Number of Hits',
         *      minimum: 0,
         *      //one minor tick between two major ticks
         *      minorTickSteps: 1
         * }, {
         *      type: 'Category',
         *      position: 'bottom',
         *      fields: ['name'],
         *      title: 'Month of the Year'
         * }]
         */
        axes: [],

        /**
         * @cfg {String} theme (optional) The name of the theme to be used. A theme defines the colors and
         * other visual displays of tick marks on axis, text, title text, line colors, marker colors and styles, etc.
         * Possible theme values are 'Base', 'Green', 'Sky', 'Red', 'Purple', 'Blue', 'Yellow' and also six category themes
         * 'Category1' to 'Category6'. Default value is 'Base'.
         */
        theme: 'Base',

        /**
         * @cfg {String}
         * The class name used only in theming system.
         */
        themeCls: '',
        /**
         * @cfg {Boolean/Array} colors Array of colors/gradients to override the color of items and legends.
         */
        colors: null,

        /**
         * @cfg {Object} insetPadding Set the amount of inset padding in pixels for the chart.
         */
        insetPadding: {
            top: 10,
            left: 10,
            right: 10,
            bottom: 10
        },

        /**
         * @cfg {Object} innerPadding
         */
        innerPadding: {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        },

        /**
         * @cfg {Object|Boolean} background (optional) Set the chart background. This can be a gradient object, image, or color.
         *
         * For example, if `background` were to be a color we could set the object as
         *
         *     background: {
         *         //color string
         *         fill: '#ccc'
         *     }
         *
         * You can specify an image by using:
         *
         *     background: {
         *         image: 'http://path.to.image/'
         *     }
         *
         * Also you can specify a gradient by using the gradient object syntax:
         *
         *     background: {
         *         gradient: {
         *             id: 'gradientId',
         *             angle: 45,
         *             stops: {
         *                 0: {
         *                     color: '#555'
         *                 },
         *                 100: {
         *                     color: '#ddd'
         *                 }
         *             }
         *         }
         *     }
         */
        background: null,

        /**
         * @cfg {Array} interactions
         * Interactions are optional modules that can be plugged in to a chart to allow the user to interact
         * with the chart and its data in special ways. The `interactions` config takes an Array of Object
         * configurations, each one corresponding to a particular interaction class identified by a `type` property:
         *
         *     new Ext.chart.AbstractChart({
         *         renderTo: Ext.getBody(),
         *         width: 800,
         *         height: 600,
         *         store: store1,
         *         axes: [ ...some axes options... ],
         *         series: [ ...some series options... ],
         *         interactions: [{
         *             type: 'interactiontype'
         *             // ...additional configs for the interaction...
         *         }]
         *     });
         *
         * When adding an interaction which uses only its default configuration (no extra properties other than `type`),
         * you can alternately specify only the type as a String rather than the full Object:
         *
         *     interactions: ['reset', 'rotate']
         *
         * The current supported interaction types include:
         *
         * - {@link Ext.chart.interactions.PanZoom panzoom} - allows pan and zoom of axes
         * - {@link Ext.chart.interactions.ItemCompare itemcompare} - allows selection and comparison of two data points
         * - {@link Ext.chart.interactions.ItemHighlight itemhighlight} - allows highlighting of series data points
         * - {@link Ext.chart.interactions.ItemInfo iteminfo} - allows displaying details of a data point in a popup panel
         * - {@link Ext.chart.interactions.PieGrouping piegrouping} - allows selection of multiple consecutive pie slices
         * - {@link Ext.chart.interactions.Rotate rotate} - allows rotation of pie and radar series
         * - {@link Ext.chart.interactions.Reset reset} - allows resetting of all user interactions to the default state
         * - {@link Ext.chart.interactions.ToggleStacked togglestacked} - allows toggling a multi-yField bar/column chart between stacked and grouped
         *
         * See the documentation for each of those interaction classes to see how they can be configured.
         *
         * Additional custom interactions can be registered with the {@link Ext.chart.interactions.Manager interaction manager}.
         */
        interactions: [],

        mainRegion: null,

        autoSize: false,

        viewBox: false,

        fitSurface: false
    },

    delayThicknessChanged: false,
    thicknessChanged: false,
    animatingSprites: 0,


    scheduleLayout: function () {
        Ext.draw.fx.Frame.cancel(this.scheduleRedrawId);
        Ext.draw.fx.Frame.cancel(this.scheduleLayoutId);
        this.scheduleLayoutId = Ext.draw.fx.Frame.schedule(function () {
            delete this.scheduleLayoutId;
            delete this.scheduleRedrawId;
            this.layout();
        }, this);
    },

    scheduleRedraw: function () {
        if (!this.scheduleLayoutId) {
            Ext.draw.fx.Frame.cancel(this.scheduleRedrawId);
            this.scheduleRedrawId = Ext.draw.fx.Frame.schedule(function () {
                delete this.scheduleRedrawId;
                this.redraw();
            }, this);
        }
    },

    /**
     * @private The z-indexes to use for the various surfaces
     */
    surfaceZIndexes: {
        main: 0,
        series: 1,
        axis: 2,
        overlay: 3,
        events: 4
    },

    applyAnimate: function (newAnimate, oldAnimate) {
        if (!newAnimate) {
            newAnimate = {
                duration: 0
            };
        } else if (newAnimate === true) {
            newAnimate = {
                easing: 'easeInOut',
                duration: 500
            };
        }
        if (!oldAnimate) {
            return newAnimate;
        } else {
            oldAnimate = Ext.apply({}, newAnimate, oldAnimate);
        }
        return oldAnimate;
    },

    applyInsetPadding: function (padding) {
        if (Ext.isNumber(padding)) {
            return {
                top: padding,
                left: padding,
                right: padding,
                bottom: padding
            };
        }
        return padding;
    },

    applyInnerPadding: function (padding) {
        if (Ext.isNumber(padding)) {
            return {
                top: padding,
                left: padding,
                right: padding,
                bottom: padding
            };
        }
        return padding;
    },

    initialize: function () {
        var me = this;
        me.on('resize', 'onResize', me);
        me.callParent();
    },

    getAnimate: function () {
        if (this.resizing) {
            return {
                duration: 0
            };
        } else {
            return this._animate;
        }
    },

    onPainted: function () {
        var me = this;
        me.getSurface('main');
        me.getSurface('overlay');
        me.applyStyles();
        me.onResize();
        this.callParent();
    },


    onResize: function () {
        this.callParent();
        return this.scheduleLayout();
    },

    applyMainRegion: function (newRegion, region) {
        if (!region) {
            return newRegion;
        }
        this.getSeries();
        this.getAxes();
        if (newRegion[0] == region[0] &&
            newRegion[1] == region[1] &&
            newRegion[2] == region[2] &&
            newRegion[3] == region[3]) {
            return region;
        } else {
            return newRegion;
        }
    },

    onSpriteAnimationStart: function () {
        this.animatingSprites++;
        this.delayThicknessChanged = true;
    },

    onSpriteAnimationEnd: function () {
        this.animatingSprites--;
        if (this.animatingSprites == 0) {
            this.delayThicknessChanged = false;
            if (this.thicknessChanged) {
                this.onThicknessChange();
            }
        }
    },

    getSurface: function (name, type) {
        name = name || 'main';
        type = type || name;
        var me = this,
            surface = this.callParent([name]),
            zIndexes = me.surfaceZIndexes;
        if (type in zIndexes) {
            surface.element.setStyle('zIndex', zIndexes[type]);
        }
        return surface;
    },

    applyColors: function (colors) {
        if (Ext.isArray(colors)) {
            var me = this, colorArrayStyle = colors.slice(0),
                i, l, color;
            for (i = 0, l = colors.length; i < l; ++i) {
                color = colors[i];
                if (Ext.isObject(color)) {
                    me.getViewports().each(function (surface) {
                        surface.addGradient(color);
                    });
                    colorArrayStyle.push('url(#' + color.id + ')');
                } else {
                    colorArrayStyle.push(color);
                }
            }
            return colorArrayStyle;
        }
        return colors;
    },

    updateColors: function (colors) {
        var series = this.getSeries(),
            seriesItem;
        for (var i = 0; i < series.length; i++) {
            seriesItem = series[i];
            if (!seriesItem.getColors()) {
                seriesItem.updateColors(colors);
            }
        }
    },

    updateTheme: function (n, o) {
        this.applyStyles();
    },

    applyAxes: function (newAxes, oldAxes) {
        if (!oldAxes) {
            oldAxes = [];
            oldAxes.map = {};
        }
        var result = [], i, ln, axis, oldMap = oldAxes.map;
        result.map = {};
        newAxes = Ext.Array.from(newAxes, true);
        for (i = 0, ln = newAxes.length; i < ln; i++) {
            axis = newAxes[i];
            if (!axis) {
                return;
            }
            axis = Ext.factory(axis, null, oldMap[axis.getId && axis.getId() || axis.id], 'axis');
            axis.setChart(this);
            if (axis) {
                result.push(axis);
                result.map[axis.getId()] = axis;
            }
        }

        for (i in oldMap) {
            if (!result.map[oldMap[i]]) {
                oldMap[i].destroy();
            }
        }
        return result;
    },

    updateAxes: function (n, o) {
        var i, ln, j, ln2, axis, sprites;
        for (i = 0, ln = n.length; i < ln; i++) {
            axis = n[i];
            axis.setChart(this);
            sprites = axis.getSprites();
            for (j = 0, ln2 = sprites.length; j < ln2; j++) {
                sprites[j].fx.on('animationstart', 'onSpriteAnimationStart', this);
                sprites[j].fx.on('animationend', 'onSpriteAnimationEnd', this);
            }
        }
    },

    applySeries: function (newSeries, oldSeries) {
        this.getSurface('main');
        if (!oldSeries) {
            oldSeries = [];
            oldSeries.map = {};
        }
        var me = this,
            result = [],
            i, ln, series, oldMap = oldSeries.map;
        result.map = {};
        newSeries = Ext.Array.from(newSeries, true);
        for (i = 0, ln = newSeries.length; i < ln; i++) {
            series = newSeries[i];
            if (!series) {
                return;
            }
            series = Ext.factory(series, null, oldSeries.map[series.getId && series.getId() || series.id], 'series');
            if (series) {
                result.push(series);
                result.map[series.getId()] = series;
            }
        }
        
        for (i in oldMap) {
            if (!result.map[oldMap[i]]) {
                oldMap[i].destroy();
            }
        }
        return result;
    },

    updateSeries: function (newSeries, oldSeries) {
        this.applyStyles();
        var i, ln, j, ln2, series, sprites;
        for (i = 0, ln = newSeries.length; i < ln; i++) {
            series = newSeries[i];
            series.setChart(this);
            series.on('animationstart', 'onSpriteAnimationStart', this);
            series.on('animationend', 'onSpriteAnimationEnd', this);
        }
        this.fireEvent('serieschanged', this, newSeries, oldSeries);
    },

    applyInteractions: function (interations, oldInterations) {
        if (!oldInterations) {
            oldInterations = [];
            oldInterations.map = {};
        }
        var me = this,
            result = [], oldMap = oldInterations.map;
        result.map = {};
        interations = Ext.Array.from(interations, true);
        for (var i = 0, ln = interations.length; i < ln; i++) {
            var interation = interations[i];
            if (!interation) {
                continue;
            }
            interation = Ext.factory(interation, null, oldMap[interation.getId && interation.getId() || interation.id], 'interaction');
            interation.setChart(me);
            if (interation) {
                result.push(interation);
                result.map[interation.getId()] = interation;
            }
        }

        for (i in oldMap) {
            if (!result.map[oldMap[i]]) {
                oldMap[i].destroy();
            }
        }
        return result;
    },

    applyLegend: function (legend, oldLegend) {
        var me = this;
        if (legend === oldLegend) {
            return legend;
        }
        legend = Ext.factory(legend, Ext.chart.Legend, oldLegend);
        if (oldLegend && oldLegend !== legend) {
            oldLegend.un({
                scope: me,
                combine: me.redraw,
                split: me.redraw
            });
        }
        return legend;
    },

    updateLegend: function (legend) {
        var me = this;
        if (legend) {
            legend.setChart(this);
            legend.un({
                scope: me,
                combine: me.redraw,
                split: me.redraw
            });
        }
        return legend;
    },

    applyStore: function (store) {
        return Ext.StoreManager.lookup(store);
    },

    updateStore: function (newStore, oldStore) {
        var me = this;
        if (oldStore) {
            oldStore.un('updaterecord', me.onUpdateRecord, me);
            oldStore.un('refresh', me.onRefresh, me);
            if (oldStore.autoDestroy) {
                oldStore.destroy();
            }
        }
        if (newStore) {
            newStore.on('updaterecord', me.onUpdateRecord, me);
            newStore.on('refresh', me.onRefresh, me);
            me.onRefresh();
        }
    },

    /**
     * Redraw the chart. If animations are set this will animate the chart too.
     * @param {Boolean} [resize] flag which changes the default origin points of the chart for animations.
     */
    redraw: function () {

    },

    getEventXY: function (e) {
        e = (e.changedTouches && e.changedTouches[0]) || e.event || e.browserEvent || e;
        var me = this, xy = me.element.getXY();
        xy = [e.pageX - xy[0], e.pageY - xy[1]]
        return [xy[0], xy[1]];
    },

    /**
     * Given an x/y point relative to the chart, find and return the first series item that
     * matches that point.
     * @param {Number} x
     * @param {Number} y
     * @return {Object} an object with `series` and `item` properties, or `false` if no item found
     */
    getItemForPoint: function (x, y) {
        var me = this,
            i = 0,
            items = me.getSeries().items,
            l = items.length,
            series, item;

        for (; i < l; i++) {
            series = items[i];
            item = series.getItemForPoint(x, y);
            if (item) {
                return item;
            }
        }

        return false;
    },

    /**
     * Given an x/y point relative to the chart, find and return all series items that match that point.
     * @param {Number} x
     * @param {Number} y
     * @return {Array} an array of objects with `series` and `item` properties
     */
    getItemsForPoint: function (x, y) {
        var me = this,
            series = me.getSeries(),
            seriesItem,
            items = [];

        for (var i = 0; i < series.length; i++) {
            seriesItem = series[i];
            var item = seriesItem.getItemForPoint(x, y);
            if (item) {
                items.push(item);
            }
        }

        return items;
    },

    /**
     * @private
     * Invoked when a record of bound store is changed
     * @param store
     * @param record
     * @param index
     */
    onUpdateRecord: function (store, record, index) {
        var axes = this.getAxes(),
            series = this.getSeries(), i, ln;
        for (i = 0, ln = axes.length; i < ln; i++) {
            if (axes[i].onUpdateRecord(store, record, index) === false) {
                // If the change causes a refresh on the series.
                this.refreshSeries(store);
                return;
            }
        }
        for (i = 0, ln = series.length; i < ln; i++) {
            if (series[i].alterSprites(record, index) === false) {
                this.refreshSeries(store);
                return;
            }
        }
    },

    // @private
    onRefresh: function () {
        var region = this.getMainRegion(),
            axes = this.getAxes(),
            store = this.getStore(),
            series = this.getSeries(),
            i;
        if (!store || !axes || !series || !region) {
            return;
        }
        this.redraw();
    },

    /**
     * Changes the data store bound to this chart and refreshes it.
     * @param {Ext.data.Store} store The store to bind to this chart
     */
    bindStore: function (store) {
        this.setStore(store);
    },

    /**
     * Used to save a chart.
     *
     * The following config object properties affect the saving process:
     * - **type** - string - The intended export type. Supported types: 'svg': returns the chart's Svg-String, 'image/png': returns the chart as png, 'image/jpeg': returns the chart as jpeg. Default: 'image/png'
     *
     * <h2>Example usage:</h2>
     *   <code><pre>
     *   chartInstance.save({
     *       type: 'image/png'
     *   });
     * </pre></code>
     *
     * @param {Object} config The config object for the export generation
     */
    save: function (config) {
        // width and height config properties don't affect export right now
        // TODO(patrick): take width/height into account at export generation
        return Ext.draw.Surface.save(config, this.surfaces);
    },

    /**
     * Reset the chart back to its initial state, before any user interaction.
     * @param {Boolean} skipRedraw if `true`, redrawing of the chart will be skipped.
     */
    reset: function (skipRedraw) {
        var me = this;

        me.getAxes().each(function (axis) {
            if (axis.reset) {
                axis.reset();
            }
        });

        me.getSeries().each(function (series) {
            if (series.reset) {
                series.reset();
            }
        });

        if (!skipRedraw) {
            me.redraw();
        }
    },

    // @private remove gently.
    destroy: function () {
        var me = this;
        Ext.draw.fx.Frame.cancel(this.scheduleRedrawId);
        Ext.draw.fx.Frame.cancel(this.scheduleLayoutId);
        me.setSeries([]);
        me.setAxes([]);
        me.setInteractions([]);
        me.setStore(null);
        Ext.Viewport.un('orientationchange', me.redraw, me);
        this.callParent(arguments);
    },

    /* ---------------------------------
     Methods needed for ComponentQuery
     ----------------------------------*/

    getRefItems: function (deep) {
        var me = this,
            series = me.getSeries(),
            axes = me.getAxes(),
            interaction = me.getInteractions(),
            ans = [], i, ln;

        for (i = 0, ln = series.length; i < ln; i++) {
            ans.push(series[i]);
            if (series[i].getRefItems) {
                ans.push.apply(ans, series[i].getRefItems(deep));
            }
        }

        for (i = 0, ln = axes.length; i < ln; i++) {
            ans.push(axes[i]);
            if (axes[i].getRefItems) {
                ans.push.apply(ans, axes[i].getRefItems(deep));
            }
        }

        for (i = 0, ln = interaction.length; i < ln; i++) {
            ans.push(interaction[i]);
            if (interaction[i].getRefItems) {
                ans.push.apply(ans, interaction[i].getRefItems(deep));
            }
        }

        return ans;
    }
});