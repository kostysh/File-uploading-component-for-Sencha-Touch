/**
 * The PanZoom interaction allows the user to navigate the data for one or more chart
 * axes by panning and/or zooming. Navigation can be limited to particular axes. Zooming is
 * performed by pinching on the chart or axis area; panning is performed by single-touch dragging.
 *
 * For devices which do not support multiple-touch events, zooming can not be done via pinch
 * gestures; in this case the interaction will allow the user to perform both zooming and
 * panning using the same single-touch drag gesture. Tapping the chart will switch between
 * the two modes, {@link #modeIndicatorDuration briefly displaying a graphical indicator}
 * showing whether it is in zoom or pan mode.
 *
 * You can attach this interaction to a chart by including an entry in the chart's
 * {@link Ext.chart.AbstractChart#interactions interactions} config with the `panzoom` type:
 *
 *     new Ext.chart.AbstractChart({
 *         renderTo: Ext.getBody(),
 *         width: 800,
 *         height: 600,
 *         store: store1,
 *         axes: [ ...some axes options... ],
 *         series: [ ...some series options... ],
 *         interactions: [{
 *             type: 'panzoom',
 *             axes: {
 *                 left: {
 *                     maxZoom: 5,
 *                     startZoom: 2
 *                 },
 *                 bottom: {
 *                     maxZoom: 2
 *                 }
 *             }
 *         }]
 *     });
 *
 * The configuration object for the `panzoom` interaction type should specify which axes
 * will be made navigable via the `axes` config. See the {@link #axes} config documentation
 * for details on the allowed formats. If the `axes` config is not specified, it will default
 * to making all axes navigable with the default axis options.
 *
 * @author Jason Johnston <jason@sencha.com>
 * @docauthor Jason Johnston <jason@sencha.com>
 */
Ext.define('Ext.chart.interactions.PanZoom', {

    extend: 'Ext.chart.interactions.Abstract',

    type: 'panzoom',
    alias: 'interaction.panzoom',
    requires: [
        'Ext.util.Region',
        'Ext.draw.fx.Frame'
    ],

    config: {

        /**
         * @cfg {Object/Array} axes
         * Specifies which axes should be made navigable. The config value can take the following formats:
         *
         * - An Object whose keys correspond to the {@link Ext.chart.axis.Axis#position position} of each
         *   axis that should be made navigable. Each key's value can either be an Object with further
         *   configuration options for each axis or simply `true` for a default set of options.
         *       {
         *           type: 'panzoom',
         *           axes: {
         *               left: {
         *                   maxZoom: 5,
         *                   allowPan: false
         *               },
         *               bottom: true
         *           }
         *       }
         *
         *   If using the full Object form, the following options can be specified for each axis:
         *
         *   - minZoom (Number) A minimum zoom level for the axis. Defaults to `1` which is its natural size.
         *   - maxZoom (Number) A maximum zoom level for the axis. Defaults to `10`.
         *   - startZoom (Number) A starting zoom level for the axis. Defaults to `1`.
         *   - allowZoom (Boolean) Whether zooming is allowed for the axis. Defaults to `true`.
         *   - allowPan (Boolean) Whether panning is allowed for the axis. Defaults to `true`.
         *   - startPan (Boolean) A starting panning offset for the axis. Defaults to `0`.
         *
         * - An Array of strings, each one corresponding to the {@link Ext.chart.axis.Axis#position position}
         *   of an axis that should be made navigable. The default options will be used for each named axis.
         *
         *       {
         *           type: 'panzoom',
         *           axes: ['left', 'bottom']
         *       }
         *
         * If the `axes` config is not specified, it will default to making all axes navigable with the
         * default axis options.
         */
        axes: true,

        /**
         * @cfg {Boolean} showOverflowArrows
         * If `true`, arrows will be conditionally shown at either end of each axis to indicate that the
         * axis is overflowing and can therefore be panned in that direction. Set this to `false` to
         * prevent the arrows from being displayed.
         */
        showOverflowArrows: true,

        /**
         * @cfg {Object} overflowArrowOptions
         * A set of optional overrides for the overflow arrow sprites' options. Only relevant when
         * {@link #showOverflowArrows} is `true`.
         */

        gesture: 'pinch',

        panGesture: 'drag',

        zoomOnPanGesture: false,

        modeToggleButton: {},

        hideLabelInGesture: false
    },

    /**
     * Android device is emerging too many events so if we re-render every frame it will take for-ever to finish a frame.
     * This throttle technique will limit the timespan between two frames.
     */
    throttleGap: 0,

    applyAxes: function (axesConfig) {
        var result = {};
        if (axesConfig === true) {
            return {
                top: {},
                right: {},
                bottom: {},
                left: {}
            };
        } else if (Ext.isArray(axesConfig)) {
            // array of axis names - translate to full object form
            result = {};
            Ext.each(axesConfig, function (axis) {
                result[axis] = {};
            });
        } else if (Ext.isObject(axesConfig)) {
            Ext.iterate(axesConfig, function (key, val) {
                // axis name with `true` value -> translate to object
                if (val === true) {
                    result[key] = {};
                } else if (val !== false) {
                    result[key] = val;
                }
            });
        }
        return result;
    },

    constructor: function (config) {
        var me = this;
        me.callParent(arguments);
    },

    applyZoomOnPanGesture: function (zoomOnPanGesture) {
        this.getChart();
        if (this.isMultiTouch()) {
            return false;
        }
        return zoomOnPanGesture;
    },

    updateZoomOnPanGesture: function (zoomOnPanGesture) {
        if (!this.isMultiTouch()) {
            var button = this.getModeToggleButton(),
                zoomModeCls = Ext.baseCSSPrefix + 'zooming';
            if (zoomOnPanGesture) {
                button.addCls(zoomModeCls);
                button.setText('&nbsp;Zoom');
            } else {
                button.removeCls(zoomModeCls);
                button.setText('&nbsp;Pan');
            }
        }
    },

    toggleMode: function () {
        var me = this;
        if (!me.isMultiTouch()) {
            me.setZoomOnPanGesture(!me.getZoomOnPanGesture());
        }
    },

    applyModeToggleButton: function () {
        var me = this,
            zoomModeCls = Ext.baseCSSPrefix + 'zooming';
        if (!me.isMultiTouch()) {
            return Ext.create('Ext.Button', {
                cls: [Ext.baseCSSPrefix + 'panzoom-toggle', zoomModeCls],
                iconCls: Ext.baseCSSPrefix + 'panzoom-toggle-icon',
                iconMask: true,
                handler: function () {
                    me.toggleMode();
                }
            });
        }
    },

    updateChart: function (chart) {
        var me = this;
        if (me.showOverflowArrows) {
            chart.on('redraw', me.updateAllOverflowArrows, me);
        }
        me.callParent(arguments);
    },

    getGestures: function () {
        var me = this,
            gestures = {};
        gestures[me.getGesture()] = me.onGesture;
        gestures[me.getGesture() + 'start'] = me.onGestureStart;
        gestures[me.getGesture() + 'end'] = me.onGestureEnd;
        gestures[me.getPanGesture() + 'start'] = me.onPanGestureStart;
        gestures[me.getPanGesture()] = me.onPanGesture;
        gestures[me.getPanGesture() + 'end'] = me.onPanGestureEnd;
        gestures.doubletap = me.onDoubleTap;
        return gestures;
    },

    initializeDefaults: function (opt) {
        var me = this;

        if (!opt || opt.type == 'beforerender') {
            me.onGestureStart();
            me.onPanGestureStart();

            me.getChart().getAxes().each(function (axis) {
                if (!me.getAxes()[axis.getPosition()]) {
                    return;
                }

                var config = me.getAxes()[axis.getPosition()],
                    startPan = config.startPan || 0,
                    startZoom = config.startZoom || 1;

                if (startPan != 0 || startZoom != 1) {
                    me.transformAxisBy(axis, startPan, startPan, startZoom, startZoom);
                }
            });
        }

        if (!opt || opt.type == 'afterrender') {
            me.onGestureEnd();
            me.onPanGestureEnd();
        }
    },

    onDoubleTap: function (e) {

    },

    onPanGestureStart: function (e) {
        if (!e || !e.touches || e.touches.length < 2) { //Limit drags to single touch
            var me = this;
            if (me.getZoomOnPanGesture()) {
                me.onGestureStart(e);
            } else {
                if (this.getHideLabelInGesture()) {
                    this.eachInteractiveAxes(function (axis) {
                        axis.hideLabels();
                    });
                }
            }
        }
    },

    onPanGesture: function (e) {
        if (!e.touches || e.touches.length < 2) { //Limit drags to single touch
            var me = this;

            if (me.getZoomOnPanGesture()) {
                me.zoomBy(me.getZoomableAxes(e), (e.previousX + e.previousDeltaX) / e.previousX, e.previousY / (e.previousY + e.previousDeltaY));
            } else {
                me.panBy(me.getPannableAxes(e), e.previousDeltaX, e.previousDeltaY);
            }
            me.sync();
        }
    },

    onPanGestureEnd: function (e) {
        var me = this;
        if (me.getZoomOnPanGesture()) {
            me.onGestureEnd(e);
        } else {
            if (this.getHideLabelInGesture()) {
                this.eachInteractiveAxes(function (axis) {
                    axis.showLabels();
                });
            }
            me.sync();
        }
    },

    onGestureStart: function (e) {
        var me = this;
        if (e.touches && e.touches.length == 2) {
            me.lastPoints = [e.touches[0].point.x, e.touches[0].point.y, e.touches[1].point.x, e.touches[1].point.y];

            var xDistance = Math.max(44, Math.abs(e.touches[1].point.x - e.touches[0].point.x)),
                yDistance = Math.max(44, Math.abs(e.touches[1].point.y - e.touches[0].point.y));
            this.lastZoomDistances = [xDistance, yDistance];
            if (this.getHideLabelInGesture()) {
                this.eachInteractiveAxes(function (axis) {
                    axis.hideLabels();
                });
            }
        }
    },

    onGesture: function (e) {
        if (e.touches && e.touches.length == 2) {
            var me = this,
                abs = Math.abs,
                region = me.getChart().getMainRegion(),
                lastPoints = me.lastPoints,
                newPoints = [e.touches[0].point.x, e.touches[0].point.y, e.touches[1].point.x, e.touches[1].point.y],
                xDistance = Math.max(44, abs(e.touches[1].point.x - e.touches[0].point.x)),
                yDistance = Math.max(44, abs(e.touches[1].point.y - e.touches[0].point.y)),
                lastDistances = this.lastZoomDistances || [xDistance, yDistance],
                zoomX = xDistance / lastDistances[0],
                zoomY = yDistance / lastDistances[1];
            me.lastPoints = newPoints;
            me.lastZoomDistances = [xDistance, yDistance];
            me.transformAxisBy(me.getZoomableAxes(e),
                ((zoomX - 1) * region[2] + 2 * newPoints[0]) / (2 * zoomX) - lastPoints[0],
                ((zoomY - 1) * region[3] + 2 * newPoints[1]) / (2 * zoomY) - lastPoints[1],
                zoomX,
                zoomY);
            me.sync();
        }

    },

    onGestureEnd: function (e) {
        var me = this;
        if (this.getHideLabelInGesture()) {
            this.eachInteractiveAxes(function (axis) {
                axis.showLabels();
            });
        }
        me.sync();
    },

    doSync: function () {
        var chart = this.getChart();
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        chart.layout();
        this.syncThrottle = Ext.frameStartTime + this.throttleGap;
    },

    sync: function () {
        var me = this;
        if (me.throttleGap && Ext.frameStartTime < me.syncThrottle) {
            if (me.syncTimer) {
                return;
            }
            me.syncTimer = setTimeout(function () {
                me.doSync();
            }, me.throttleGap);
        } else {
            me.doSync();
        }
    },

    isEventOnAxis: function (e, axis) {
        // TODO: right now this uses the current event position but really we want to only
        // use the gesture's start event. Pinch does not give that to us though.
        var region = axis.getSurface().getRegion();
        return region[0] <= e.pageX && e.pageX <= region[0] + region[2] && region[1] <= e.pageY && e.pageY <= region[1] + region[3];
    },

    getPannableAxes: function (e) {
        var me = this,
            axisConfigs = me.getAxes(),
            axes = me.getChart().getAxes(),
            result = [], isEventOnAxis = false,
            config;

        if (e) {
            for (var i = 0; i < axes.length; i++) {
                if (this.isEventOnAxis(e, axes[i])) {
                    isEventOnAxis = true;
                    break;
                }
            }
        }

        for (var i = 0; i < axes.length; i++) {
            config = axisConfigs[axes[i].getPosition()];
            if (config && config.allowPan !== false && (!isEventOnAxis || this.isEventOnAxis(e, axes[i]))) {
                result.push(axes[i]);
            }
        }
        return result;
    },


    getZoomableAxes: function (e) {
        var me = this,
            axisConfigs = me.getAxes(),
            axes = me.getChart().getAxes(),
            result = [],
            isEventOnAxis = false, config;

        if (e) {
            for (var i = 0; i < axes.length; i++) {
                if (this.isEventOnAxis(e, axes[i])) {
                    isEventOnAxis = true;
                    break;
                }
            }
        }

        for (var i = 0; i < axes.length; i++) {
            var axis = axes[i];
            config = axisConfigs[axis.getPosition()];
            if (config && config.allowZoom !== false && (!isEventOnAxis || this.isEventOnAxis(e, axis))) {
                result.push(axis);
            }
        }
        return result;
    },

    eachInteractiveAxes: function (fn) {
        var me = this,
            axisConfigs = me.getAxes(),
            axes = me.getChart().getAxes(),
            result = [];
        for (var i = 0; i < axes.length; i++) {
            if (axisConfigs[axes[i].getPosition()]) {
                if (false === fn.call(this, axes[i])) {
                    return;
                }
            }
        }
    },

    transformAxisBy: function (axes, panX, panY, sx, sy) {
        for (var i = 0; i < axes.length; i++) {
            axes[i].transform(panX, panY, sx, sy);
        }
    },

    panBy: function (axes, x, y) {
        this.transformAxisBy(axes, x, y, 1, 1);
    },

    zoomBy: function (axes, zoomX, zoomY) {
        this.transformAxisBy(axes, 0, 0, zoomX, zoomY);
    },

    getOverflowArrow: function (axis, direction, opts) {
        var me = this,
            axisPos = axis.getPosition(),
            allIndicators = me.overflowIndicators || (me.overflowIndicators = {}),
            axisIndicators = allIndicators[axisPos] || (allIndicators[axisPos] = {});
        return axisIndicators[direction] || (
            axisIndicators[direction] = Ext.chart.Shape.arrow(me.getChart().getSurface('main'), opts));
    },

    updateAxisOverflowArrows: function (axis) {
        var me = this,
            isSide = axis.isSide(),
            axisPos = axis.getPosition(),
            allowPan = me.getAxes()[axisPos].allowPan !== false,
            length = axis.getLength() || 1,
            chart = me.getChart(),
            bbox = chart.chartBBox,
            matrix = axis.getTransformMatrix(),
            spriteOpts = Ext.apply({
                hidden: true,
                radius: 5,
                opacity: 0.3,
                fill: axis.style.stroke
            }, me.overflowArrowOptions),
            math = Math,
            ceil = math.ceil,
            floor = math.floor,
            upSprite = me.getOverflowArrow(axis, 'up', spriteOpts),
            downSprite = me.getOverflowArrow(axis, 'down', spriteOpts),
            path;

        if (allowPan && (isSide ? ceil(matrix.y(0, 0)) < 0 : floor(matrix.x(length, 0)) > length)) {
            // Top
            if (isSide) {
                path = ['M', bbox.x, bbox.y, 'l', bbox.width / 2, 0, 0, 5, -10, 10, 20, 0, -10, -10, 0, -5, bbox.width / 2, 0, 0, 20, -bbox.width, 0, 'z'].join(',');
            }
            // Right
            else {
                path = ['M', bbox.x + bbox.width, bbox.y, 'l', 0, bbox.height / 2, -5, 0, -10, -10, 0, 20, 10, -10, 5, 0, 0, bbox.height / 2, -20, 0, 0, -bbox.height, 'z'].join(',');
            }
            upSprite.setAttributes({
                hidden: false,
                path: path
            });
        } else {
            upSprite.hide();
        }

        if (allowPan && (isSide ? floor(matrix.y(0, length)) > length : ceil(matrix.x(0, 0)) < 0)) {
            // Bottom
            if (isSide) {
                path = ['M', bbox.x, bbox.y + bbox.height, 'l', bbox.width / 2, 0, 0, -5, -10, -10, 20, 0, -10, 10, 0, 5, bbox.width / 2, 0, 0, -20, -bbox.width, 0, 'z'].join(',');
            }
            // Left
            else {
                path = ['M', bbox.x, bbox.y, 'l', 0, bbox.height / 2, 5, 0, 10, -10, 0, 20, -10, -10, -5, 0, 0, bbox.height / 2, 20, 0, 0, -bbox.height, 'z'].join(',');
            }
            downSprite.setAttributes({
                hidden: false,
                path: path
            });
        } else {
            downSprite.hide();
        }

//        if (upSprite.dirtyTransform || upSprite.dirtyHidden || downSprite.dirtyTransform || downSprite.dirtyHidden) {
//            me.getChart().getEventsSurface().renderFrame();
//        }
    },

    updateAllOverflowArrows: function () {
        var me = this;
        me.eachInteractiveAxes(me.updateAxisOverflowArrows);
    }
}, function () {
    if (Ext.os.is.Android2) {
        this.prototype.throttleGap = 20;
    }
});
