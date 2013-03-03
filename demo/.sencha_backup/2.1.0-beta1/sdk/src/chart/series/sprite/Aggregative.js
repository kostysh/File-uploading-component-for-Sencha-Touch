/**
 *
 */
Ext.define("Ext.chart.series.sprite.Aggregative", {
    extend: 'Ext.chart.series.sprite.Cartesian',
    requires: ['Ext.draw.RMQ', 'Ext.draw.LimitedCache', 'Ext.draw.SegmentTree'],
    inheritableStatics: {
        def: {
            processors: {
                dataHigh: 'default',
                dataLow: 'default',
                dataClose: 'default'
            },
            aliases: {
                dataOpen: 'dataY'
            },
            defaults: {
                dataHigh: null,
                dataLow: null,
                dataClose: null
            }
        }
    },

    config: {
        aggregator: {}
    },

    applyAggregator: function (aggregator, oldAggr) {
        return Ext.factory(aggregator, Ext.draw.SegmentTree, oldAggr);
    },

    constructor: function () {
        this.callParent(arguments);
    },

    processDataY: function () {
        var me = this,
            attr = me.attr,
            high = attr.dataHigh,
            low = attr.dataLow,
            close = attr.dataClose,
            open = attr.dataY;
        me.callParent(arguments);
        if (attr.dataX && open && open.length > 0) {
            if (high) {
                me.getAggregator().setData(attr.dataX, attr.dataY, high, low, close);
            } else {
                me.getAggregator().setData(attr.dataX, attr.dataY);
            }
        }
    },

    getGapWidth: function () {
        return 1;
    },

    renderClipped: function (surface, ctx, clip, region) {
        var me = this,
            aggregates = me.getAggregator() && me.getAggregator().getAggregation(
                clip[0],
                clip[2],
                (clip[2] - clip[0]) / region[2] * me.getGapWidth()
            );

        me.dataStart = aggregates.data[aggregates.start].startIdx;
        me.dataEnd = aggregates.data[aggregates.end - 1].endIdx;

        me.renderAggregates(aggregates.data, aggregates.start, aggregates.end, surface, ctx, clip, region);
    }
});