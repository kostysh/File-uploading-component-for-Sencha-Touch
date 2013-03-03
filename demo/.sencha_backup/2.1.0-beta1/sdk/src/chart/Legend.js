/**
 * Defines a legend for a chart's series.
 * The 'chart' member must be set prior to rendering.
 * The legend class displays a list of legend items each of them related with a
 * series being rendered. In order to render the legend item of the proper series
 * the series configuration object must have {@link Ext.chart.series.Series#showInLegend showInLegend}
 * set to true.
 *
 * The legend configuration object accepts a {@link #position} as parameter, which allows
 * control over where the legend appears in relation to the chart. The position can be
 * confiured with different values for portrait vs. landscape orientations. Also, the {@link #dock}
 * config can be used to hide the legend in a sheet docked to one of the sides.
 *
 *     @example
 *     var store = new Ext.data.JsonStore({
 *         fields: ['name', 'data1', 'data2', 'data3', 'data4', 'data5'],
 *         data: [
 *             {'name':'metric one', 'data1':10, 'data2':12, 'data3':14, 'data4':8, 'data5':13},
 *             {'name':'metric two', 'data1':7, 'data2':8, 'data3':16, 'data4':10, 'data5':3},
 *             {'name':'metric three', 'data1':5, 'data2':2, 'data3':14, 'data4':12, 'data5':7},
 *             {'name':'metric four', 'data1':2, 'data2':14, 'data3':6, 'data4':1, 'data5':23},
 *             {'name':'metric five', 'data1':27, 'data2':38, 'data3':36, 'data4':13, 'data5':33}
 *         ]
 *     });
 *      
 *     new Ext.chart.AbstractChart({
 *         renderTo: Ext.getBody(),
 *         width: 500,
 *         height: 300,
 *         animate: true,
 *         store: store,
 *         shadow: true,
 *         theme: 'Category1',
 *         legend: {
 *             position: 'top'
 *         },
 *         axes: [{
 *             type: 'Numeric',
 *             position: 'left',
 *             fields: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             title: 'Sample Values',
 *             grid: {
 *                 odd: {
 *                     opacity: 1,
 *                     fill: '#ddd',
 *                     stroke: '#bbb',
 *                     'lineWidth': 1
 *                 }
 *             },
 *             minimum: 0,
 *             adjustMinimumByMajorUnit: 0
 *         }, {
 *             type: 'Category',
 *             position: 'bottom',
 *             fields: ['name'],
 *             title: 'Sample Metrics',
 *             grid: true,
 *             label: {
 *                 rotate: {
 *                     degrees: 315
 *                 }
 *             }
 *         }],
 *         series: [{
 *             type: 'area',
 *             highlight: false,
 *             axis: 'left',
 *             xField: 'name',
 *             yField: ['data1', 'data2', 'data3', 'data4', 'data5'],
 *             style: {
 *                 opacity: 0.93
 *             }
 *         }]
 *     });
 *
 */
Ext.define('Ext.chart.Legend', {

    mixins: {
        identifiable: 'Ext.mixin.Identifiable',
        observable: 'Ext.mixin.Observable'
    },

    requires: [
        'Ext.chart.legend.View'
    ],

    config: {
        /**
         * @cfg {Boolean} visible
         * Whether or not the legend should be displayed.
         */
        visible: true,

        /**
         * @cfg {String} position
         * The position of the legend in relation to the chart. Can be one of:
         *
         * -  "top" - positions the legend centered at the top of the chart
         * -  "bottom" - positions the legend centered at the bottom of the chart
         * -  "left" - positions the legend centered on the left side of the chart
         * -  "right" - positions the legend centered on the right side of the chart
         * -  an Object with numeric properties `x` and `y`, and boolean property `vertical` - displays the legend
         *    floating on top of the chart at the given x/y coordinates. If `vertical:true` the legend items will
         *    be arranged stacked vertically, otherwise they will be arranged side-by-side. If {@link #dock} is
         *    set to `true` then this position config will be ignored and will dock to the bottom.
         *
         * In addition, you can specify different legend alignments based on the orientation of the browser viewport,
         * for instance you might want to put the legend on the right in landscape orientation but on the bottom in
         * portrait orientation. To achieve this, you can set the `position` config to an Object with `portrait` and
         * `landscape` properties, and set the value of those properties to one of the recognized value types described
         * above. For example, the following config will put the legend on the right in landscape but float it on top
         * of the chart at position 10,10 in portrait:
         *
         *     legend: {
         *         position: {
         *             landscape: 'right',
         *             portrait: {
         *                 x: 10,
         *                 y: 10,
         *                 vertical: true
         *             }
         *         }
         *     }
         */
        position: 'bottom',

        /**
         * @cfg {Boolean} popup
         * If set to `true`, then rather than rendering alongside the chart area, an icon will be inserted
         * into chart toolbar and the legend will be shown within a {@link Ext.Sheet} when clicked on the button.
         *
         * This prevents screen real-estate from being taken up by the legend,
         * which is especially important on small screen devices.
         */
        popup: Ext.os.is.Phone,

        /**
         * @cfg {Number} doubleTapThreshold
         * The duration in milliseconds in which two consecutive taps will be considered a doubletap.
         */
        doubleTapThreshold: 250,

        view: {},

        chart: null,

        sheet: {
            ui: 'legend',
            style: 'padding: 0.3em',
            hideOnMaskTap: true,
            stretchX: true,
            stretchY: false,
            zIndex: 30,
            layout: 'fit',
            scrollable: false,
            enter: 'bottom',
            exit: 'bottom',
            hidden: true,
            items: [
                {
                    xtype: 'toolbar',
                    ui: 'dark',
                    docked: 'top',
                    title: 'Legend',
                    items: [
                        {
                            xtype: 'spacer'
                        },
                        {
                            text: 'OK'
                        }
                    ]
                }
            ]
        },

        button: {
            hide: true,
            showAnimation: 'fade',
            cls: Ext.baseCSSPrefix + 'legend-button',
            iconCls: Ext.baseCSSPrefix + 'legend-button-icon',
            iconMask: true
        }
    },
    /**
     * @event combine
     * Fired when two legend items are combined together via drag-drop.
     * @param {Ext.chart.Legend} legend
     * @param {Ext.chart.series.Series} series The series owning the items being combined
     * @param {Number} index1 The index of the first legend item
     * @param {Number} index2 The index of the second legend item
     */

    /**
     * @event split
     * Fired when a previously-combined legend item is split into its original constituent items.
     * @param {Ext.chart.Legend} legend
     * @param {Ext.chart.series.Series} series The series owning the item being split
     * @param {Number} index The index of the legend item being split
     */

    /**
     * @constructor
     * @param {Object} config
     */
    constructor: function (config) {
        var me = this;
        me.initConfig(config);

        me.callParent(arguments);
        me.mixins.observable.constructor.apply(me, arguments);
    },

    wire: function () {
        var me = this,
            popup = me.getPopup(),
            chart = me.getChart(),
            toolbar = chart && chart.getToolbar(),
            button = me.getButton(),
            view = me.getView(),
            orientation = Ext.Viewport.getOrientation(),
            sheet,
            anim = {
                type: 'slide',
                duration: 150,
                direction: orientation === 'portrait' ? "down" : "left"
            };

        if (view) {
            view.setLegend(this);
        }
        if (toolbar && button) {
            toolbar.add(button);
        }
        if (popup) {
            if ((sheet = me.getSheet())) {
                if (button) {
                    button.show();
                    button.setHandler(function () {
                        sheet && sheet.show();
                    });
                }
                // TODO: Investigate why we have to set parent to null.
                view.setParent(null);
                view.setScrollable(true);
                sheet.add(view);
                sheet.setConfig({
                    enter: "bottom",
                    anim: anim,
                    enterAnimation: anim,
                    exitAnimation: anim
                });
                Ext.Viewport.add(sheet);
            }
        } else {
            button.hide();
            view.setConfig({
                parent: null,
                scrollable: false
            });
            view.setRenderTo(chart && chart.element);
        }
    },

    updateDock: function (dock) {
        this.wire();
    },

    applyButton: function (button, oldButton) {
        return Ext.factory(button, "Ext.Button", oldButton);
    },

    updateButton: function (button, oldButton) {
        if (oldButton) {
            oldButton.destroy();
        }
        this.wire();
    },

    applySheet: function (sheet, oldSheet) {
        return Ext.factory(sheet, "Ext.Sheet", oldSheet);
    },

    updateSheet: function (sheet, oldSheet) {
        if (oldSheet) {
            oldSheet.destroy();
        }
        sheet.on({
            delegate: 'button',
            tap: function () {
                sheet.hide();
            }
        });
        this.wire();
    },

    updateChart: function (chart, oldChart) {
        var me = this,
            button = me.getButton(),
            chartEl = chart && chart.element, view = me.getView(),
            sheet = me.getSheet(), sheetAnim;
        me.wire();
        if (oldChart) {
            oldChart.un('serieschange', me.orient, me);
        }
        if (chart) {
            chart.on('serieschange', me.orient, me);
        }
    },

    applyView: function (view, currentView) {
        return Ext.factory(view, "Ext.chart.legend.View", currentView);
    },

    updateView: function (view, currentView) {
        if (currentView) {
            currentView.setLegend(false);
        }
        this.wire();
    },

    /**
     * @private Determine whether the legend should be displayed. Looks at the legend's 'visible' config,
     * and also the 'showInLegend' config for each of the series.
     * @return {Boolean}
     */
    isDisplayed: function () {
        return this.getVisible() && this.getChart().getSeries().findIndex('showInLegend', true) !== -1;
    },

    /**
     * Returns whether the legend is configured with orientation-specific positions.
     * @return {Boolean}
     */
    isOrientationSpecific: function () {
        var position = this.getPosition();
        return (Ext.isObject(position) && 'portrait' in position);
    },

    /**
     * Get the target position of the legend, after resolving any orientation-specific configs.
     * In most cases this method should be used rather than reading the `position` property directly.
     * @return {String/Object} The position config value
     */
    getDockedPosition: function () {
        var me = this,
            position = me.getPosition();

        // Grab orientation-specific config if specified
        if (me.isOrientationSpecific()) {
            position = position[Ext.Viewport.getOrientation()];
        }
        // If legend is docked, default non-String values to 'bottom'
        if (me.getPopup() && !Ext.isString(position)) {
            position = 'bottom';
        }
        return position;
    },

    /**
     * Returns whether the orientation of the legend items is vertical.
     * @return {Boolean} `true` if the legend items are to be arranged stacked vertically, `false` if they
     * are to be arranged side-by-side.
     */
    isVertical: function () {
        var position = this.getDockedPosition();
        return this.getPopup() || (Ext.isObject(position) ? position.vertical : "left|right|float".indexOf('' + position) !== -1);
    },

    /**
     * Update the legend component to match the current viewport orientation.
     */
    orient: function () {
        var me = this,
            sheet = me.getSheet(),
            position = me.getDockedPosition(),
            orientation = Ext.Viewport.getOrientation();
        me.wire();
        me.getView().orient();
        if (me.getPopup() && me.lastOrientation !== orientation) {
            if (sheet) {
                sheet.hide();
                sheet.setSize(null, null);
                if (orientation == 'landscape') {
                    sheet.setConfig({
                        stretchX: true,
                        stretchY: false,
                        top: 0,
                        bottom: 0,
                        left: null,
                        right: 0,
                        width: 200,
                        height: null,
                        enter: 'right',
                        exit: 'right',
                        zIndex: 90
                    });
                } else {
                    sheet.setConfig({
                        stretchX: true,
                        stretchY: false,
                        top: null,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        width: null,
                        height: 200,
                        enter: 'bottom',
                        exit: 'bottom',
                        zIndex: 90
                    });
                }
                // sheet.orient();
            }

            me.lastOrientation = orientation;
        }
        me.getView().refreshStore();
    },

    /**
     * @private Update the position of the legend if it is displayed and not docked.
     */
    updateLocation: function () {
        if (!this.getPopup()) {
            var me = this,
                chart = me.getChart(),
                chartBBox = chart.chartBBox,
                insets = chart.getInsetPadding(),
                isObject = Ext.isObject(insets),
                insetLeft = (isObject ? insets.left : insets) || 0,
                insetRight = (isObject ? insets.right : insets) || 0,
                insetBottom = (isObject ? insets.bottom : insets) || 0,
                insetTop = (isObject ? insets.top : insets) || 0,
                chartWidth = chart.element.getWidth(),
                chartHeight = chart.element.getHeight(),
                seriesWidth = chartBBox.width - (insetLeft + insetRight),
                seriesHeight = chartBBox.height - (insetTop + insetBottom),
                chartX = chartBBox.x + insetLeft,
                chartY = chartBBox.y + insetTop,
                isVertical = me.isVertical(),
                view = me.getView(),
                math = Math,
                mfloor = math.floor,
                mmin = math.min,
                mmax = math.max,
                x, y, legendWidth, legendHeight, maxWidth, maxHeight, position, undef;

            me.orient();
            if (me.isDisplayed()) {
                // Calculate the natural size
                view.show();
                view.element.setSize(isVertical ? undef : null, isVertical ? null : undef); //clear fixed scroller length
                legendWidth = view.element.getWidth();
                legendHeight = view.element.getHeight();

                position = me.getDockedPosition();
                if (Ext.isObject(position)) {
                    // Object with x/y properties: use them directly
                    x = position.x;
                    y = position.y;
                } else {
                    // Named positions - calculate x/y based on chart dimensions
                    switch (position) {
                        case "left":
                            x = insetLeft;
                            y = mfloor(chartY + seriesHeight / 2 - legendHeight / 2);
                            break;
                        case "right":
                            x = mfloor(chartWidth - legendWidth) - insetRight;
                            y = mfloor(chartY + seriesHeight / 2 - legendHeight / 2);
                            break;
                        case "top":
                            x = mfloor(chartX + seriesWidth / 2 - legendWidth / 2);
                            y = insetTop;
                            break;
                        default:
                            x = mfloor(chartX + seriesWidth / 2 - legendWidth / 2);
                            y = mfloor(chartHeight - legendHeight) - insetBottom;
                    }
                    x = mmax(x, insetLeft);
                    y = mmax(y, insetTop);
                }

                maxWidth = chartWidth - x - insetRight;
                maxHeight = chartHeight - y - insetBottom;

                view.setLeft(x);
                view.setTop(y);

                if (legendWidth > maxWidth || legendHeight > maxHeight) {
                    view.element.setSize(mmin(legendWidth, maxWidth), mmin(legendHeight, maxHeight));
                }
            } else {
                view.hide();
            }
        }
    },

    /**
     * Calculate and return the number of pixels that should be reserved for the legend along
     * its edge. Only returns a non-zero value if the legend is positioned to one of the four
     * named edges, and if it is not {@link #dock docked}.
     */
    getInsetSize: function () {
        var me = this,
            pos = me.getDockedPosition(),
            chartPadding = me.getChart().insets,
            left = chartPadding.left,
            bottom = chartPadding.bottom,
            top = chartPadding.top,
            right = chartPadding.right,
            size = 0,
            view;

        if (!me.getPopup() && me.isDisplayed()) {
            view = me.getView();
            view.show();
            if (pos === 'left' || pos === 'right') {
                size = view.element.getWidth() + left;
            }
            else if (pos === 'top' || pos === 'bottom') {
                size = view.element.getHeight() + top;
            }
        }
        return size;
    },

    /**
     * Shows the legend if it is currently hidden.
     */
    show: function () {
        (this.getPopup() ? this.getSheet() : this.getView()).show();
    },

    /**
     * Hides the legend if it is currently shown.
     */
    hide: function () {
        (this.getPopup() ? this.getSheet() : this.getView()).hide();
    },

    /**
     * @protected Fired when two legend items are combined via drag-drop in the legend view.
     * @param {Ext.chart.series.Series} series The series for the combined items
     * @param {Ext.chart.series.Series} index1 The series for the combined items
     * @param {Ext.chart.series.Series} index2 The series for the combined items
     */
    onCombine: function (series, index1, index2) {
        var me = this;
        series.combine(index1, index2);
        me.getView().refreshStore();
        me.fireEvent('combine', me, series, index1, index2);
    },

    onSplit: function (series, index) {
        var me = this;
        series.split(index);
        me.getView().refreshStore();
        me.fireEvent('split', me, series, index);
    },

    /**
     * Reset the legend back to its initial state before any user interactions.
     */
    reset: function () {
        this.getView().reset();
    }
});

