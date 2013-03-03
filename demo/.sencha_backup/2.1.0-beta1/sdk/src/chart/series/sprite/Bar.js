/**
 *
 */
Ext.define("Ext.chart.series.sprite.Bar", {
    alias: 'sprite.barSeries',
    extend: 'Ext.chart.series.sprite.Cartesian',
    inheritableStatics: {
        def: {
            processors: {
                maxBarWidth: 'number',
                minGapWidth: 'number'
            },
            defaults: {
                maxBarWidth: 6,
                minGapWidth: 5
            }
        }
    },

    renderClipped: function (surface, ctx, clip) {
        var me = this,
            attr = me.attr,
            dataX = attr.dataX,
            dataY = attr.dataY,
            lineWidth = ctx.lineWidth || 1,
            offset = lineWidth * 0.5 - Math.floor(lineWidth * 0.5),
            matrix = attr.matrix,
            maxBarWidth = (dataX[dataX.length - 1] - dataX[0]) / (dataX.length - 1) * matrix.getXX() - lineWidth - attr.minGapWidth,
            barWidth = Math.ceil(Math.min(maxBarWidth, attr.maxBarWidth) * 0.5) + offset,
            center,
            xx = matrix.elements[0],
            dx = matrix.elements[4],
            yy = matrix.elements[3],
            dy = Math.round(matrix.elements[5]) + offset;

        ctx.beginPath();
        for (var i = 0; i < dataX.length; i++) {
            center = Math.round(dataX[i] * xx + dx);
            ctx.moveTo(center - barWidth, dy);
            ctx.lineTo(center - barWidth, Math.round(dataY[i] * yy + lineWidth) + dy);
            ctx.lineTo(center + barWidth, Math.round(dataY[i] * yy + lineWidth) + dy);
            ctx.lineTo(center + barWidth, dy);
            ctx.lineTo(center - barWidth, dy);
        }
        matrix.toContext(ctx);
        ctx.fillStroke(attr);
    }// (max-min)/length * xx = barWidth
});
