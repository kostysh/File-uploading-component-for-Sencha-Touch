/**
 * TODO(zhangbei): Documents
 */
Ext.define('Ext.chart.PolarChart', {

    extend: 'Ext.chart.AbstractChart',
    xtype: 'polar',

    config: {

    },

    layout: function () {
        try {
            this.resizing = true;
            var me = this,
                size = me.element.getSize(),
                axes = me.getAxes(), axis,
                series = me.getSeries(), seriesItem,
                padding = me.getInsetPadding(),
                width = size.width - padding.left - padding.right,
                height = size.height - padding.top - padding.bottom,
                center = [width * 0.5, height * 0.5],
                radius = Math.min(width, height) * 0.5,
                region = [padding.left, padding.top, width, height],
                i, ln;
            this.getSurface().setRegion(region);
            for (i = 0, ln = axes.length; i < ln; i++) {
                axis = axes[i];
                axis.setRadius(radius);
                axis.setCenter(center);
            }

            for (i = 0, ln = series.length; i < ln; i++) {
                seriesItem = series[i];
                seriesItem.getSurface().setRegion(region);
                seriesItem.setRadius(radius);
                seriesItem.setCenter(center);
            }
            this.redraw();
        } finally {
            this.resizing = false;
        }
    },

    redraw: function () {
        var me = this,
            size = me.element.getSize(),
            axes = me.getAxes(), axis,
            serieses = me.getSeries(), series,
            i, ln;
        for (i = 0, ln = axes.length; i < ln; i++) {
            axis = axes[i];
            axis.getSprites();
        }

        for (i = 0, ln = serieses.length; i < ln; i++) {
            series = serieses[i];
            series.getSprites();
        }
        this.renderFrame();
    }
});