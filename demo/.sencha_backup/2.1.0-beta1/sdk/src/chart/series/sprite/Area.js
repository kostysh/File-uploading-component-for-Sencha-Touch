/**
 * Area sprite.
 */
Ext.define("Ext.chart.series.sprite.Area", {
    alias: 'sprite.areaSeries',
    extend: "Ext.chart.series.sprite.StackedCartesian",

    processDataY: function () {
        var me = this,
            attr = me.attr,
            dataYs = attr.dataY;
        if (attr.dataY) {
            for (var i = 1; i < dataYs.length; i++) {
                var dataY = dataYs[i], lastDataY = dataYs[i - 1];
                for (var j = 0; j < dataY.length; j++) {
                    dataY[j] += lastDataY[j];
                }
            }
        }
    },

    /**
     * region is [left, top, right, bottom]
     */
    renderClipped: function (surface, ctx, clip, region) {
        var me = this,
            attr = this.attr,
            matrix = attr.matrix,
            dataX = attr.dataX,
            dataYs = attr.dataY,
            length = dataX.length,
            i,
            regionWidth = region[2],
            regionHeight = region[3],
            lineWidth = ctx.lineWidth,
            pixelWidth = Math.ceil((clip[2] - clip[0]) / regionWidth) * lineWidth * 10,
            pixelHeight = Math.ceil(Math.abs(clip[3] - clip[1]) / regionHeight) * lineWidth * 10;

        for (var idx = dataYs.length - 1; idx >= 0; idx--) {
            matrix.toContext(ctx);
            var dataY = dataYs[idx];
            ctx.beginPath();
            for (i = 0; i < length; i++) {
                ctx.lineTo(dataX[i], dataY[i]);
            }

            ctx.lineTo(dataX[length - 1] + pixelWidth, dataY[length - 1]);
            ctx.lineTo(dataX[length - 1] + pixelWidth, (clip[1] - pixelHeight));
            ctx.lineTo(dataX[0] - pixelWidth, (clip[1] - pixelHeight));
            ctx.lineTo(dataX[0] - pixelWidth, dataY[0]);
            ctx.closePath();

            ctx.fillStroke(attr);
        }
    }
});