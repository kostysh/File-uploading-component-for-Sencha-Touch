Ext.define("Ext.chart.axis.layout.Discrete", {
    extend: 'Ext.chart.axis.layout.Layout',
    alias: 'axisLayout.discrete',

    processData: function () {
        var me = this,
            axis = me.getAxis(),
            boundSeries = axis.boundSeries,
            direction = (axis.getPosition() == 'left' || axis.getPosition() == 'right') ? 'Y' : 'X',
            i, ln, item;
        this.labels = [];
        this.labelMap = {};
        for (i = 0, ln = boundSeries.length; i < ln; i++) {
            item = boundSeries[i];
            if (item['get' + direction + 'Axis']() == axis) {
                item.coordinate(direction);
            }
        }
    },

    calculateLayout: function (context) {
        context.data = this.labels;
        this.callParent([context]);
    },

    calculateMajorTicks: function (context) {
        var me = this,
            attr = context.attr,
            data = context.data,
            visibleRange = attr.visibleRange,
            range = attr.max - attr.min,
            zoom = range / attr.length * (visibleRange[1] - visibleRange[0]),
            viewMin = attr.min + range * visibleRange[0],
            viewMax = attr.min + range * visibleRange[1],
            estStepSize = attr.estStepSize * zoom;

        var out = me.snapEnds(context, Math.max(0, attr.min), Math.min(attr.max, data.length - 1), estStepSize);
        if (out) {
            me.trimByRange(context, out, viewMin - zoom, viewMax + zoom);
            context.majorTicks = out;
        }
    },

    snapEnds: function (context, min, max, estStepSize) {
        estStepSize = Math.ceil(estStepSize);
        var steps = Math.floor((max - min) / estStepSize),
            data = context.data;
        return {
            min: min,
            max: max,
            from: min,
            to: steps * estStepSize + min,
            step: estStepSize,
            steps: steps,
            unit: 1,
            getLabel: function (current) {
                return data[this.from + this.step * current];
            },
            get: function (current) {
                return this.from + this.step * current;
            }
        };
    },

    getCoordFor: function (value, field, idx, items) {
        this.labels.push(value);
        return this.labels.length - 1;
    }
});