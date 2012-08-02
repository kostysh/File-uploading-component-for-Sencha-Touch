/**
 * The ItemHighlight interaction allows highlighting of series data items on the chart.
 * This interaction enables triggering and clearing the highlight on certain events, but
 * does not control how the highlighting is implemented or styled; that is handled by
 * each individual Series type and the {@link Ext.chart.Highlight} mixin. See the documentation
 * for that mixin for how to customize the highlighting effect.
 *
 * To attach this interaction to a chart, include an entry in the chart's
 * {@link Ext.chart.AbstractChart#interactions interactions} config with the `itemhighlight` type:
 *
 *     new Ext.chart.AbstractChart({
 *         renderTo: Ext.getBody(),
 *         width: 800,
 *         height: 600,
 *         store: store1,
 *         axes: [ ...some axes options... ],
 *         series: [ ...some series options... ],
 *         interactions: [{
 *             type: 'itemhighlight'
 *         }]
 *     });
 *
 *
 * @author Jason Johnston <jason@sencha.com>
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.chart.interactions.ItemHighlight', {

    extend: 'Ext.chart.interactions.Abstract',

    type: 'itemhighlight',

    alias: 'interaction.itemhighlight',

    config: {
        gesture: 'tap',
        unHighlightEvent: 'touchstart'
    },

    getGestures: function () {
        var gestures = {};
        gestures[this.getGesture()] = 'onGesture';
        gestures[this.getUnHighlightEvent()] = 'onUnHighlightEvent';
        return gestures;
    },

    onGesture: function (e) {
        var me = this,
            items = me.getItemsForEvent(e),
            item, highlightedItem, series,
            i, len;

        for (i = 0, len = items.length; i < len; i++) {
            item = items[i];
            series = item.series;
            highlightedItem = series.highlightedItem;
            if (highlightedItem !== item) {
                if (highlightedItem) {
                    highlightedItem.series.unHighlightItem();
                }
                series.highlightItem(item);
                series.highlightedItem = item;
                series.getSurface().renderFrame();
            }
        }
    },

    onUnHighlightEvent: function (e) {
        var me = this,
            chart = me.getChart(),
            xy = chart.getEventXY(e),
            series = chart.getSeries(),
            seriesItem,
            highlightedItem;
        for (var i = 0; i < series.length; i++) {
            seriesItem = series[i];
            highlightedItem = seriesItem.highlightedItem;
            if (highlightedItem && highlightedItem !== seriesItem.getItemForPoint(xy[0], xy[1])) {
                seriesItem.unHighlightItem();
                delete seriesItem.highlightedItem;
            }
            seriesItem.getSurface().renderFrame();
        }
    }
});
