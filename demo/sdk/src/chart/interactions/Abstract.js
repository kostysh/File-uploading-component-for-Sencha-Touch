/**
 * @class Ext.chart.interactions.Abstract
 *
 * Defines a common abstract parent class for all interactions.
 *
 * @author Jason Johnston <jason@sencha.com>
 * @docauthor Jason Johnston <jason@sencha.com>
 */


Ext.define('Ext.chart.interactions.Abstract', {

    xtype: 'interaction',

    mixins: {
        identifiable: "Ext.mixin.Identifiable",
        observable: "Ext.mixin.Observable"
    },

    requires: ['Ext.chart.theme.Style'],

    config: {
        /**
         * @cfg {String} gesture
         * Specifies which gesture type should be used for starting the interaction.
         */
        gesture: 'tap',

        /**
         * @cfg {Ext.chart.AbstractChart} chart
         */
        chart: null
    },

    constructor: function (config) {
        var me = this;
        me.initConfig(config);
        Ext.ComponentManager.register(this);
    },

    /**
     * @protected
     * A method to be implemented by subclasses where all event attachment should occur.
     */
    initialize: Ext.emptyFn,

    updateChart: function (newChart, oldChart) {
        var me = this, gestures = me.getGestures();
        if (oldChart === newChart) {
            return;
        }
        if (oldChart) {
            me.removeChartListener(oldChart);
        }
        if (newChart) {
            me.addChartListener();
        }
    },

    /**
     * @protected
     * Placeholder method.
     */
    onGesture: Ext.emptyFn,

    getGestures: function () {
        var gestures = {};
        gestures[this.getGesture()] = this.onGesture;
        return gestures;
    },

    /**
     * @protected Find and return a single series item corresponding to the given event,
     * or null if no matching item is found.
     * @param {Event} e
     * @return {Object} the item object or null if none found.
     */
    getItemForEvent: function (e) {
        var me = this,
            chart = me.getChart(),
            chartXY = chart.getEventXY(e);
        return chart.getItemForPoint(chartXY[0], chartXY[1]);
    },

    /**
     * @protected Find and return all series items corresponding to the given event.
     * @param {Event} e
     * @return {Array} array of matching item objects
     */
    getItemsForEvent: function (e) {
        var me = this,
            chart = me.getChart(),
            chartXY = chart.getEventXY(e);
        return chart.getItemsForPoint(chartXY[0], chartXY[1]);
    },

    /**
     * @private
     */
    addChartListener: function () {
        var me = this,
            chart = me.getChart().element,
            gestures = me.getGestures(),
            gesture, fn;
        me.listeners = me.listeners || {};
        for (gesture in gestures) {
            (function (name, fn) {
                chart.on(
                    name,
                    // wrap the handler so it does not fire if the event is locked by another interaction
                    me.listeners[name] = function () {
                        var locks = me.getLocks();
                        if (!(name in locks) || locks[name] === me) {
                            return fn.apply(this, arguments);
                        }
                    },
                    me
                );
            }(gesture, Ext.isFunction(gestures[gesture]) ? gestures[gesture] : me[gestures[gesture]]));
        }
    },

    removeChartListener: function (chart) {
        var me = this,
            gestures = me.getGestures(),
            gesture, fn;
        for (gesture in gestures) {
            (function (name) {
                chart.un(name, me.listeners[name]);
                delete me.listeners[name];
            })(gesture);
        }
    },

    lockEvents: function () {
        var me = this,
            locks = me.getLocks(),
            args = arguments,
            i = args.length;
        while (i--) {
            locks[args[i]] = me;
        }
    },

    unlockEvents: function () {
        var locks = this.getLocks(),
            args = arguments,
            i = args.length;
        while (i--) {
            delete locks[args[i]];
        }
    },

    getLocks: function () {
        var chart = this.getChart();
        return chart.lockedEvents || (chart.lockedEvents = {});
    },

    isMultiTouch: function () {
        return !(Ext.os.is.MultiTouch === false || (Ext.os.is.Android2 && !Ext.os.is.MultiTouch) || Ext.os.is.Desktop);
    },

    initializeDefaults: Ext.emptyFn,

    /* ---------------------------------
     Methods needed for ComponentQuery
     ----------------------------------*/

    //filled by the constructor.
    parent: null,

    getItemId: function () {
        return this.id || (this.id = Ext.id());
    },

    initCls: function () {
        return (this.cls || '').split(' ');
    },

    isXType: function (xtype) {
        return xtype === 'interaction';
    },

    getRefItems: function (deep) {
        return [];
    },

    destroy: function () {
        Ext.ComponentManager.unregister(this);
        this.callParent();
    }
});
