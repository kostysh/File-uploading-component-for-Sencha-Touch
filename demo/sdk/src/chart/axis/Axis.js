/**
 * @class Ext.chart.axis.Axis
 * @extends Ext.chart.axis.Abstract
 *
 * Defines axis for charts. The axis position, type, style can be configured.
 * The axes are defined in an axes array of configuration objects where the type,
 * field, grid and other configuration options can be set. To know more about how
 * to create a Chart please check the Chart class documentation. Here's an example for the axes part:
 * An example of axis for a series (in this case for an area chart that has multiple layers of yFields) could be:
 *
 *     axes: [{
 *         type: 'Numeric',
 *         grid: true,
 *         position: 'left',
 *         fields: ['data1', 'data2', 'data3'],
 *         title: 'Number of Hits',
 *         grid: {
 *             odd: {
 *                 opacity: 1,
 *                 fill: '#ddd',
 *                 stroke: '#bbb',
 *                 lineWidth: 1
 *             }
 *         },
 *         minimum: 0
 *     }, {
 *         type: 'Category',
 *         position: 'bottom',
 *         fields: ['name'],
 *         title: 'Month of the Year',
 *         grid: true,
 *         label: {
 *             rotate: {
 *                 degrees: 315
 *             }
 *         }
 *     }]
 *
 * In this case we use a `Numeric` axis for displaying the values of the Area series and a `Category` axis for displaying the names of
 * the store elements. The numeric axis is placed on the left of the screen, while the category axis is placed at the bottom of the chart.
 * Both the category and numeric axes have `grid` set, which means that horizontal and vertical lines will cover the chart background. In the
 * category axis the labels will be rotated so they can fit the space better.
 */
Ext.define('Ext.chart.axis.Axis', {

    extend: 'Ext.chart.axis.Abstract',

    requires: [
        'Ext.chart.theme.TitleStyle',
        'Ext.chart.theme.GridStyle',
        'Ext.chart.axis.sprite.Axis'
    ],

    config: {
        /**
         * @cfg {Number} majorTickSteps
         * If `minimum` and `maximum` are specified it forces the number of major ticks to the specified value.
         */
        majorTickSteps: false,
        /**
         * @cfg {Number} minorTickSteps
         * The number of small ticks between two major ticks. Default is zero.
         */
        minorTickSteps: false,

        /**
         * @cfg {String} title
         * The title for the Axis
         */
        title: { fontSize: 18, fontFamily: 'Helvetica'},

        /**
         * @cfg {Number} dashSize
         * The size of the dash marker. Default's 3.
         */
        dashSize: 3,

        /**
         * @cfg {Number} minimum
         * The minimum value drawn by the axis. If not set explicitly, the axis
         * minimum will be calculated automatically.
         */
        minimum: NaN,

        /**
         * @cfg {Number} maximum
         * The maximum value drawn by the axis. If not set explicitly, the axis
         * maximum will be calculated automatically.
         */
        maximum: NaN,

        adjustMaximumByMajorUnit: false,

        adjustMinimumByMajorUnit: false,

        /**
         * @cfg {Number} increment
         * Given a minimum and maximum bound for the series to be rendered (that can be obtained
         * automatically or by manually setting `minimum` and `maximum`) tick marks will be added
         * on each `increment` from the minimum value to the maximum one.
         */
        increment: null,

        renderer: null,

        style: null,

        label: { x: 0, y: 0, textBaseline: 'middle', textAlign: 'center', fontSize: 12, fontFamily: 'Helvetica' },

        background: null,

        /**
         * @cfg {Number} length
         *
         * Offset axis position. Default's 0.
         */
        length: 0,

        visibleRange: [0, 1],

        layout: 'continuous',

        segmenter: 'numeric'
    },


    applyLayout: function (layout) {
        // TODO: finish this
        layout= Ext.create('axisLayout.' + layout);
        layout.setAxis(this);
        return layout;
    },

    applySegmenter: function (segmenter) {
        // TODO: finish this
        segmenter = Ext.create('segmenter.' + segmenter);
        segmenter.setAxis(this);
        return segmenter;
    },

    needHighPrecision: false,
    prevMin: 0,
    prevMax: 1,
    boundSeries: [],
    sprites: null,
    range: null,
    xValues: [],
    yValues: [],
    isCartesian: true,

    constructor: function (config) {
        var me = this;
        me.sprites = [];
        me.callParent(arguments);
    },

    updateChart: function (newChart, oldChart) {
        if (oldChart) {
            oldChart.un("serieschanged", this.onSeriesChanged, this);
        }
        if (newChart) {
            newChart.on("serieschanged", this.onSeriesChanged, this);
            if (newChart.getSeries()) {
                this.onSeriesChanged(newChart);
            }
            this.getSurface().add(this.getSprites());
        }
    },

    getSurface: function () {
        return this.getChart().getSurface(this.getId(), 'axis');
    },

    applyBackground: function (background, oldBackground) {
        var rect = Ext.ClassManager.getByAlias('sprite.rect');
        return rect.def.normalize(background);
    },

    processData: function () {
        this.getLayout().processData();
        this.getSprites()[0].doLayout();
        delete this.range;
    },

    applyTitle: function (title, oldTitle) {
        if (!oldTitle) {
            oldTitle = Ext.create('sprite.text', title);
        } else {
            oldTitle.setAttributes(title);
        }
        return oldTitle;
    },

    isSide: function () {
        var position = this.getPosition();
        return position === 'left' || position === 'right';
    },

    applyFields: function (fields) {
        return [].concat(fields);
    },

    updateFields: function (fields) {
        this.fieldsMap = {};
        for (var i = 0; i < fields.length; i++) {
            this.fieldsMap[fields[i]] = true;
        }
    },

    transform: function (panX, panY, sx, sy) {
        var me = this,
            oldvisibleRange = this.getVisibleRange(),
            visibleLength = oldvisibleRange[1] - oldvisibleRange[0],
            region = me.getChart().getMainRegion(),
            isSide = me.isSide(),
            length = isSide ? region[3] : region[2],
            visibleRange,
            pan = isSide ? -panY : panX;
        visibleLength /= isSide ? sy : sx;
        if (visibleLength < 0) {
            visibleLength = -visibleLength;
        }

        if (visibleLength > 1) {
            visibleLength = 1;
        }

        if (visibleLength < 1e-5) {
            visibleLength = 1e-5;
        }
        visibleRange = [
            (oldvisibleRange[0] + oldvisibleRange[1] - visibleLength) * 0.5 - pan / length * visibleLength,
            (oldvisibleRange[0] + oldvisibleRange[1] + visibleLength) * 0.5 - pan / length * visibleLength
        ];
        if (visibleRange[0] < 0) {
            visibleRange[1] -= visibleRange[0];
            visibleRange[0] = 0;
        } else if (visibleRange[1] > 1) {
            visibleRange[0] -= visibleRange[1] - 1;
            visibleRange[1] = 1;
        }
        if (visibleRange[0] != oldvisibleRange[0] || visibleRange[1] != oldvisibleRange[1]) {
            this.setVisibleRange(visibleRange);
            this.fireEvent('transformed', this, visibleRange.slice(0));
        }
    },

    onSeriesChanged: function (chart) {
        var me = this,
            series = chart.getSeries(),
            boundSeries = [], i, ln = series.length;

        if (me.getPosition() == 'left' || me.getPosition() == 'right') {
            for (i = 0; i < ln; i++) {
                if (this == series[i].getYAxis()) {
                    boundSeries.push(series[i]);
                }
            }
        } else {
            for (i = 0; i < ln; i++) {
                if (this == series[i].getXAxis()) {
                    boundSeries.push(series[i]);
                }
            }
        }
        me.boundSeries = boundSeries;
        me.getLayout().processData();
    },

    applyRange: function (newRange) {
        if (!newRange) {
            return this.dataRange.slice(0);
        } else {
            return [
                newRange[0] === null ? this.dataRange[0] : newRange[0],
                newRange[1] === null ? this.dataRange[1] : newRange[1]
            ];
        }
    },

    getRange: function () {
        var me = this,
            isSide = me.isSide();
        if (me.range) {
            return me.range;
        }
        if (!isNaN(me.getMinimum()) && !isNaN(me.getMaximum())) {
            return this.range = [me.getMinimum(), me.getMaximum()];
        }
        var min = Infinity,
            max = -Infinity,
            boundSeries = me.boundSeries,
            series, i, ln;

        // For each series bound to this axis, ask the series for its min/max values
        // and use them to find the overall min/max.
        for (i = 0, ln = boundSeries.length; i < ln; i++) {
            series = boundSeries[i];
            var minMax;
            if (isSide) {
                minMax = series.getYRange();
            } else {
                minMax = series.getXRange();
            }

            if (minMax) {
                if (minMax[0] < min) {
                    min = minMax[0];
                }
                if (minMax[1] > max) {
                    max = minMax[1];
                }
            }
        }
        if (!isFinite(max)) {
            max = me.prevMax;
        }
        if (!isFinite(min)) {
            min = me.prevMin;
        }
        if (min == max) {
            max += 1;
        }
        if (!isNaN(me.getMinimum())) {
            min = me.getMinimum();
        }
        if (!isNaN(me.getMaximum())) {
            max = me.getMaximum();
        }
        return this.range = [min, max];
    },

    applyStyle: function (style, oldStyle) {
        var cls = Ext.ClassManager.getByAlias('sprite.' + this.seriesType);
        if (cls && cls.def) {
            style = cls.def.normalize(style);
        }
        oldStyle = Ext.apply(oldStyle || {}, style);
        return oldStyle;
    },

    getSprites: function () {
        var me = this,
            range = me.getRange(),
            docked = me.getPosition(),
            animation = me.getChart().getAnimate(),
            baseSprite,
            length = me.getLength();

        // If animation is false, then stop animation.
        if (animation === false) {
            animation = {
                duration: 0
            };
        }

        // If the sprites are not created.
        if (!me.sprites.length) {
            baseSprite = new Ext.chart.axis.sprite.Axis({docked: docked});
            baseSprite.on('thicknesschanged', 'onThicknessChanged', me);
            me.sprites.push(baseSprite);
        } else {
            baseSprite = me.sprites[0];
        }

        if (range) {
            if (animation) {
                baseSprite.fx.setConfig(animation);
            }

            baseSprite.setAttributes(Ext.applyIf({
                min: range[0],
                max: range[1],
                length: length,
                visibleRange: me.getVisibleRange(),
                hidden: me.getHidden()
            }, me.getStyle()));

            baseSprite.setLayout(me.getLayout());
            baseSprite.setSegmenter(me.getSegmenter());
            baseSprite.setLabel(me.getLabel());

            if (me.getRenderer()) {
                baseSprite.setRenderer(me.getRenderer());
            }
        }

        return me.sprites;
    },

    getCoordFor: function (value, field, idx, items) {
        return this.getLayout().getCoordFor(value, field, idx, items);
    },

    onThicknessChanged: function () {
        var me = this;
        me.fireEvent('thicknesschanged', me, me.sprites[0].thickness);
    },

    getThickness: function () {
        if (this.getHidden()) {
            return 0;
        }
        return this.sprites[0] && this.sprites[0].thickness || 10;
    }
});

