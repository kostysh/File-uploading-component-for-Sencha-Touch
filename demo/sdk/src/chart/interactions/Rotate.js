/**
 * @class Ext.chart.interactions.Rotate
 * @extends Ext.chart.interactions.Abstract
 *
 * The Rotate interaction allows rotation of a Pie or Radar chart series. By default rotation
 * is performed via a single-finger drag around the center of the series, but can be configured
 * to use a two-finger pinch-rotate gesture by setting `gesture: 'pinch'`.
 *
 * To attach this interaction to a chart, include an entry in the chart's
 * {@link Ext.chart.AbstractChart#interactions interactions} config with the `rotate` type:
 *
 *     new Ext.chart.AbstractChart({
 *         renderTo: Ext.getBody(),
 *         width: 800,
 *         height: 600,
 *         store: store1,
 *         series: [ ...pie/radar series options... ],
 *         interactions: [{
 *             type: 'rotate'
 *         }]
 *     });
 *
 * @author Jason Johnston <jason@sencha.com>
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.chart.interactions.Rotate', {

    extend: 'Ext.chart.interactions.Abstract',

    type: 'rotate',

    alias: 'interaction.rotate',

    mixins: {
        delayedSync: 'Ext.chart.interactions.DelayedSync'
    },

    config: {
        /**
         * @cfg {String} gesture
         * Defines the gesture type that will be used to rotate the chart. Currently only
         * supports `pinch` for two-finger rotation and `drag` for single-finger rotation.
         */
        gesture: 'rotate'
    },

    constructor: function (config) {
        var me = this;
        me.callParent(arguments);
        me.mixins.delayedSync.constructor.apply(me, arguments);
    },

    initialize: function () {
        var me = this,
            gesture = me.getGesture();
        me.callParent();
    },

    getGestures: function () {
        var me = this,
            gestures = {};
        gestures['rotatestart'] = me.onGestureStart;
        gestures['rotate'] = me.onGesture;
        gestures['rotateend'] = me.onGestureEnd;
        gestures['dragstart'] = me.onGestureStart;
        gestures['drag'] = me.onDrag;
        gestures['dragend'] = me.onGestureEnd;
        return gestures;
    },

    onGestureStart: function (e) {
        var me = this,
            axis = me.getAxis();
        me.cancelSync();
        me.getSeries().each(function (series) {
            series.unHighlightItem();
            series.origHighlight = series.highlight;
            series.highlight = false;
            if (series.callouts) {
                series.hideCallouts(0);
                series.getSurface().renderFrame();
            }
        });
        if (axis && axis.getPosition() === 'radial') {
            axis.hideLabels();
            axis.renderFrame();
        }
    },

    onGesture: function (e) {
        var me = this,
            oldAngle = me.lastAngle, newAngle, undef;
        newAngle = e.rotation;
        if (oldAngle === undef) {
            oldAngle = 0;
        }
        if (oldAngle !== newAngle) {
            me.rotateBy(newAngle - oldAngle);
        }

        me.lastAngle = newAngle;
    },

    onDrag: function (e) {
        var me = this,
            oldAngle = me.lastAngle,
            firstPageX, secondPageX, firstPageY, secondPageY,
            series, seriesXY, newAngle, undef;

        // Single-touch event - use angle between touch point and series center
        series = me.getSeries().get(0);
        seriesXY = series.getSurface().element.getXY();
        firstPageX = series.centerX + seriesXY[0];
        firstPageY = series.centerY + seriesXY[1];
        secondPageX = e.pageX;
        secondPageY = e.pageY;
        newAngle = Ext.draw.Draw.degrees(Math.atan2(secondPageY - firstPageY, secondPageX - firstPageX));

        if (oldAngle === undef) {
            oldAngle = Ext.draw.Draw.degrees(Math.atan2(e.startY - firstPageY, e.startX - firstPageX));
        }

        e.preventDefault();

        if (oldAngle !== newAngle) {
            me.rotateBy(newAngle - oldAngle);
        }

        me.lastAngle = newAngle;
    },

    onGestureEnd: function () {
        var me = this;
        me.delaySync();
        me.getSeries().each(function (series) {
            series.highlight = series.origHighlight;
        });
        delete me.lastAngle;
    },

    rotateBy: function (angle) {
        var me = this,
            series = me.getSeries(),
            axis = me.getAxis(),
            matrix;

        me.rotation = (me.rotation || 0) + angle;

        // FIXME: wrong calculation
        series.each(function (series) {
            matrix = series.getFastTransformMatrix();
            matrix.rotate(angle, series.centerX, series.centerY);
            series.setFastTransformMatrix(matrix);
        });

        if (axis) {
            matrix = axis.getFastTransformMatrix();
            matrix.rotate(angle, axis.centerX, axis.centerY);
            axis.setFastTransformMatrix(matrix);
        }
    },

    seriesFilter: function (series) {
        return series.type === 'pie' || series.type === 'radar';
    },

    getSeries: function () {
        return this.getChart().getSeries().filter(this.seriesFilter);
    },

    axisFilter: function (axis) {
        return axis.getPosition() === 'radial';
    },

    getAxis: function () {
        var result = [], axes = this.getChart().getAxes();
        return this.getChart().getAxes().findBy(this.axisFilter);
    },

    sync: function () {
        var me = this,
            chart = me.getChart(),
            axis = me.getAxis(),
            anim = chart.getAnimate();

        chart.setAnimate(false);
        me.getSeries().each(function (series) {
            series.setRotation(series.getRotation() - me.rotation);
            series.drawSeries();
            series.getSurface().renderFrame();
            series.clearTransform();
        });
        if (axis) {
            axis.setRotation(axis.getRotation() - me.rotation);
            axis.drawAxis();
            axis.renderFrame();
            axis.clearTransform();
        }
        chart.setAnimate(anim);

        me.rotation = 0;
    },

    needsSync: function () {
        return !!this.rotation;
    }
});
