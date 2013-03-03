/**
 *
 */
Ext.define("Ext.chart.series.sprite.Line", {
    alias: 'sprite.lineSeries',
    extend: 'Ext.chart.series.sprite.Aggregative',
    requires: ['Ext.draw.RMQ'],

    renderAggregates: function (aggregates, start, end, surface, ctx, clip, region) {
        var me = this,
            attr = me.attr,
            dataX = attr.dataX,
            matrix = attr.matrix,
            first = true,
            lineTo = ctx.lineTo,
            dataY = attr.dataY,
            lineWidth = (ctx.lineWidth || 1) * surface.devicePixelRatio,
            pixelWidth = Math.ceil(lineWidth / matrix.getXX()) ,
            pixelHeight = Math.ceil(lineWidth / matrix.getYY());

        matrix.toContext(ctx);
        ctx.beginPath();
        for (var i = start; i < end; i++) {
            var aggregate = aggregates[i],
                minX = aggregate.minX,
                maxX = aggregate.maxX,
                minY = aggregate.minY,
                maxY = aggregate.maxY;
            if (first) {
                ctx.lineTo = ctx.moveTo;
            }
            if (minX < maxX) {
                ctx.lineTo(minX, minY);
                ctx.lineTo(maxX, maxY);
            } else if (minX > maxX) {
                ctx.lineTo(maxX, maxY);
                ctx.lineTo(minX, minY);
            } else {
                ctx.lineTo(maxX, maxY);
            }
            if (first) {
                ctx.lineTo = lineTo;
            }
            first = false;
        }
        ctx.lineTo(dataX[dataX.length - 1] + pixelWidth, dataY[dataY.length - 1]);
        ctx.lineTo(dataX[dataX.length - 1] + pixelWidth, clip[1] - pixelHeight);
        ctx.lineTo(dataX[0] - pixelWidth, clip[1] - pixelHeight);
        ctx.lineTo(dataX[0] - pixelWidth, (dataY[0]));
        ctx.closePath();

        ctx.fillStroke(attr);
    }
});