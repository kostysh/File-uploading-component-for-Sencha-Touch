/**
 * @private
 * @class Ext.chart.legend.View
 * @extends Ext.DataView
 *
 * A DataView specialized for displaying the legend items for a chart. This class is only
 * used internally by {@link Ext.chart.Legend} and should not need to be instantiated directly.
 */
Ext.define('Ext.chart.legend.View', {

    extend: 'Ext.dataview.DataView',
    requires: [
        'Ext.viewport.Viewport',
        'Ext.draw.Draw'
    ],

    config: {
        itemTpl: [
            '<span class="x-legend-item-marker {[values.disabled?\'x-legend-inactive\':\'\']}" style="background-color:{markerColor};"></span>{label}'
        ],
        store: {
            proxy: {
                type: 'memory'
            },
            fields: ['markerColor', 'label', 'series', 'seriesId', 'index', 'disabled'],
            data: []
        },
        baseCls: Ext.baseCSSPrefix + 'legend',
        disableSelection: true,
        scrollable: false,
        legend: false
    },

    componentCls: Ext.baseCSSPrefix + 'legend',
    horizontalCls: Ext.baseCSSPrefix + 'legend-horizontal',

    initialize: function () {
        var me = this,
            scroller = me.getScrollableBehavior().getScrollView(),
            innerSize, outerSize;

        me.callParent(arguments);
        me.on('itemtap', me.itemTap);
        //append the needed css class
    },

    refresh: function () {
        this.callParent();
    },

    updateLegend: function (legend, oldLegend) {
        if (legend && legend.getChart()) {
            var chart = legend.getChart(),
                series = chart.getSeries();
            chart.on('serieschange', this.refreshStore, this);
            if (series) {
                series.each(function (series) {
                    series.on('titlechange', this.refreshStore, this);
                });
            }
        }
    },

    onDragEnd: function (draggable, e) {
        draggable.destroy();
    },

    /**
     * @private Create and return the JSON data for the legend's internal data store
     */
    updateStoreData: function () {
        var store = this.getStore(),
            data = store.getData(), info,
            series = this.getLegend().getChart().getSeries(),
            j = 0;
        if (series) {
            series.each(function (series) {
                if (series.showInLegend) {
                    info = series.getLegendInfo();
                    Ext.each(info.items, function (item, i) {
                        var record = {
                            label: item.label,
                            markerColor: item.color,
                            series: series,
                            seriesId: Ext.id(series, 'legend-series-'),
                            index: i,
                            disabled: item.disabled
                        };
                        if (data.length <= j) {
                            store.addData(record);
                        } else {
                            Ext.apply(data.get(j).data, record);
                            data.get(j).commit();
                        }
                        j++;
                    });
                }
            });
        }
        return data;
    },

    /**
     * Updates the internal store to match the current legend info supplied by all the series.
     */
    refreshStore: function () {
        this.updateStoreData();
        // TODO: remove this when iOS update issue goes away.
        Ext.draw.Draw.updateIOS();
    },

    /**
     * Update the legend component to match its current vertical/horizontal orientation
     */
    orient: function (orientation) {
        var me = this,
            legend = me.getLegend(),
            horizontalCls = me.horizontalCls,
            isVertical = legend.isVertical(),
            pos = legend.getDockedPosition();

        orientation = orientation || Ext.Viewport.getOrientation();
        if (me.lastOrientation !== orientation) {
            if (isVertical) {
                me.removeCls(horizontalCls);
            } else {
                me.addCls(horizontalCls);
            }
            me.setSize(null, null);
            me.setDocked(pos);
            // Clean up things set by previous scroller -- Component#setScrollable should be fixed to do this
            // Re-init scrolling in the correct direction
            // me.setScrollable(isVertical ? 'vertical' : 'horizontal');

            if (isVertical) {
                // Fix to the initial natural width so it doesn't expand when items are combined
                me.setSize(me.getWidth());
            }
            if (me.scroller) {
                me.scroller.scrollTo({x: 0, y: 0});
            }
            me.lastOrientation = orientation;
        }
    },

    itemTap: function (target, index, a, b, c, d, e) {
        var me = this,
            item = Ext.get(target),
            record = me.getStore().getAt(index),
            series = record && record.get('series'),
            threshold = me.getLegend().doubleTapThreshold,
            tapTask = me.tapTask || (me.tapTask = new Ext.util.DelayedTask()),
            now = +new Date(),
            oldEndsX, oldEndsY, axis;
        tapTask.cancel();

        // If the tapped item is a combined item, we need to distinguish between single and
        // double taps by waiting a bit; otherwise trigger the single tap handler immediately.
        if (series.isCombinedItem(index)) {
            if (now - (me.lastTapTime || 0) < threshold) {
                me.doItemDoubleTap(item, index);
            }
            else {
                tapTask.delay(threshold, me.doItemTap, me, [item, index]);
            }
            me.lastTapTime = now;
        } else {
            series.onLegendItemTap(record, index);
            if (series.getAxesForXAndYFields) {
                var axes = series.getAxesForXAndYFields();
                axis = axes.xAxis && series.getChart().getAxes().get(axes.xAxis);
                if (axis && axis.getRange) {
                    oldEndsX = axis.getRange();
                }
                axis = axes.yAxis && series.getChart().getAxes().get(axes.yAxis);
                if (axis && axis.getRange) {
                    oldEndsY = axis.getRange();
                }
            }

            if (oldEndsX && oldEndsY && series.getAxesForXAndYFields) {
                var newEndsX, newEndsY;
                newEndsX = axes.xAxis && series.getChart().getAxes().get(axes.xAxis).getRange();
                newEndsY = axes.xAxis && series.getChart().getAxes().get(axes.yAxis).getRange();
                if (newEndsX[0] !== oldEndsX[0] || newEndsX[1] !== oldEndsX[1] ||
                    newEndsY[0] !== oldEndsY[0] || newEndsY[1] !== oldEndsY[1]) {
                    series.getChart().redraw();
                } else {
                    series.drawSeries();
                    series.getSurface().renderFrame();
                }
            } else {
                series.getChart().redraw();
            }
        }
        me.refreshStore();
        return false;
    },
    /**
     * @private
     * Handle double-taps on legend items; splits items that are a result of item combination
     */
    doItemDoubleTap: function (item, index) {
        var me = this,
            record = me.getStore().getAt(index),
            series = record.get('series');
        if (record) {
            me.getLegend().onSplit(record.get('series'), record.get('index'));
        }
        series.onLegendItemDoubleTap(record, index);
    },

    /**
     * Reset the legend view back to its initial state before any user interactions.
     */
    reset: function () {
        var me = this;
        me.getStore().each(function (record, i) {
            var series = record.get('series');
            series._index = record.get('index');
            series.showAll();
            Ext.fly(me.getViewItems()[i]).removeCls(me.inactiveItemCls);
            series.clearCombinations();
            series.onLegendReset();
        });

        me.refreshStore();
    }

});


