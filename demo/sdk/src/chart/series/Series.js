/**
 * Series is the abstract class containing the common logic to all chart series. Series includes
 * methods from Labels, Highlights, Tips and Callouts mixins. This class implements the logic of
 * animating, hiding, showing all elements and returning the color of the series to be used as a legend item.
 *
 * ## Listeners
 *
 * The series class supports listeners via the Observable syntax. Some of these listeners are:
 *
 *  - `itemmouseup` When the user interacts with a marker.
 *  - `itemmousedown` When the user interacts with a marker.
 *  - `itemmousemove` When the user iteracts with a marker.
 *  - (similar `item*` events occur for many raw mouse and touch events)
 *  - `afterrender` Will be triggered when the animation ends or when the series has been rendered completely.
 *
 * For example:
 *
 *     series: [{
 *             type: 'column',
 *             axis: 'left',
 *             listeners: {
 *                     'afterrender': function() {
 *                             console('afterrender');
 *                     }
 *             },
 *             xField: 'category',
 *             yField: 'data1'
 *     }]
 *
 */
Ext.define('Ext.chart.series.Series', {
    mixins: {
        identifiable: 'Ext.mixin.Identifiable',
        observable: 'Ext.mixin.Observable',
        callout: 'Ext.chart.Callout',
        itemEvents: 'Ext.chart.series.ItemEvents'
    },

    /**
     * @property {String} type
     * The type of series. Set in subclasses.
     * @protected
     */
    type: null,

    identifiablePrefix: 'ext-line-',

    requires: ['Ext.chart.series.sprite.Markers'],

    config: {
        chart: null,

        /**
         * @cfg {String} title
         * The human-readable name of the series.
         */
        title: null,

        /**
         * @cfg {Array} excludes
         * Indicates whether a fragment is to be ignored.
         */
        excludes: [],

        /**
         * @cfg {Function} renderer
         * A function that can be overridden to set custom styling properties to each rendered element.
         * Passes in (sprite, record, attributes, index, store) to the function.
         */
        renderer: function (sprite, record, attributes, index, store) {
            return attributes;
        },

        /**
         * @cfg {Boolean} showInLegend
         * Whether to show this series in the legend.
         */
        showInLegend: true,


        //@private triggerdrawlistener flag
        triggerAfterDraw: false,

        style: {},

        /**
         * This is cyclic used if series have multiple sprites.
         */
        subStyle: {},

        /**
         * @cfg {Array} colors
         * An array of color values which will be used, in order, as the pie slice fill colors.
         */
        colors: null,

        store: null,

        marker: null,

        background: null
    },

    sprites: [],


    updateColors: function (colorSet) {
        var subStyle = this.getSubStyle();
        if (!subStyle) {
            this.setSubStyle({});
            subStyle = this.getSubStyle();
        }
        subStyle.fillStyle = colorSet;
    },

    /**
     * @event titlechange
     * Fires when the series title is changed via {@link #setFieldTitle}.
     * @param {String} title The new title value
     * @param {Number} index The index in the collection of titles
     */

    /**
     * @event beforedraw
     */

    /**
     * @event draw
     */

    /**
     * @event afterdraw
     */

    constructor: function (config) {
        var me = this;
        me.getId();
        me.sprites = [];
        me.dataRange = [0, 0, 1, 1];
        me.mixins.identifiable.constructor.apply(me, arguments);
        me.mixins.callout.constructor.apply(me, arguments);
        me.mixins.itemEvents.constructor.apply(me, arguments);
        me.mixins.observable.constructor.apply(me, arguments);
        Ext.ComponentManager.register(me);
    },

    applyExcludes: function (excludes) {
        return [].concat(excludes);
    },

    applyStore: function (store) {
        var actualStore = Ext.StoreManager.lookup(store);
        if (!actualStore) {
            Ext.Logger.warn('Store "' + store + '" not found.');
        }
        return actualStore;
    },

    updateStore: function (newStore, oldStore) {
        var me = this;
        if (oldStore) {
            oldStore.un('refresh', 'refresh', me);
        }
        if (newStore) {
            newStore.on('refresh', 'refresh', me);
        }
    },

    applyBackground: function (background) {
        if (this.getChart()) {
            this.getSurface().setBackground(background);
            return this.getSurface().getBackground();
        } else {
            return background;
        }
    },

    applyStyle: function (style, oldStyle) {
        return Ext.apply(oldStyle || {}, style);
    },
    
    updateChart: function (newChart, oldChart) {
        if (oldChart) {
            oldChart.un("axeschanged", this.onAxesChanged, this);
            if (oldChart.getStore()) {
                oldChart.getStore().un('refresh', 'refresh', this);
            }
            this.sprites = [];
        }
        if (newChart) {
            newChart.on("axeschanged", this.onAxesChanged, this);
            if (!this.getStore() && newChart.getStore()) {
                newChart.getStore().on('refresh', 'refresh', this);
            }
            if (newChart.getAxes()) {
                this.onAxesChanged(newChart);
            }
            this.setBackground(this.getBackground());
            this.refresh();
        }
    },

    onAxesChanged: Ext.emptyFn,

    /**
     * @private get the surface for drawing the series sprites
     */
    getSurface: function () {
        if (this.getChart() && !this.surface) {
            this.surface = this.getChart().getSurface(this.getId() + '-surface', 'series');
        }
        return this.surface;
    },

    getOverlaySurface: function () {
        if (this.getChart() && !this.overlaySurface) {
            this.overlaySurface = this.getChart().getSurface(this.getId() + '-overlay-surface', 'overlay');
            if (this.getMarker()) {
                this.overlaySurface.add(this.getMarker());
            }
        }
        return this.overlaySurface;
    },

    applyMarker: function (marker, oldMarker) {
        if (!marker) {
            if (oldMarker) {
                oldMarker.destroy();
            }
            return null;
        } else {
            if (!oldMarker) {
                oldMarker = Ext.create('Ext.chart.series.sprite.Markers');
            }
            oldMarker.setTemplate(marker);
            return oldMarker;
        }
    },

    /**
     * For a given x/y point relative to the Surface, find a corresponding item from this
     * series, if any.
     * @param {Number} x
     * @param {Number} y
     * @return {Object} An object describing the item, or null if there is no matching item. The exact contents of
     *                  this object will vary by series type, but should always contain at least the following:
     *                  <ul>
     *                    <li>{Ext.chart.series.Series} series - the Series object to which the item belongs</li>
     *                    <li>{Object} value - the value(s) of the item's data point</li>
     *                    <li>{Array} point - the x/y coordinates relative to the chart box of a single point
     *                        for this data item, which can be used as e.g. a tooltip anchor point.</li>
     *                    <li>{Ext.draw.sprite.Sprite} sprite - the item's rendering Sprite.
     *                  </ul>
     */
    getItemForPoint: function (x, y) {

    },

    isItemInPoint: function () {
        return false;
    },

    /**
     * Hides all the elements in the series.
     */
    hideAll: Ext.emptyFn,

    /**
     * Shows all the elements in the series.
     */
    showAll: Ext.emptyFn,

    /**
     * Performs drawing of this series.
     */
    getSprites: Ext.emptyFn,

    refresh: function () {
        this.processData();
    },

    isXType: function (xtype) {
        return xtype == 'series';
    },

    getStyleByIndex: function (i) {
        var subStyle = this.getSubStyle(),
            result = Ext.apply({}, this.getStyle());
        for (var name in subStyle) {
            if (Ext.isArray(subStyle[name])) {
                result[name] = subStyle[name][i % subStyle[name].length];
            } else {
                result[name] = subStyle[name];
            }
        }
        return result;
    },

    destroy: function () {
        Ext.ComponentManager.unregister(this);
        this.callParent();
    }
});

