/**
 * @class Ext.chart.Callout
 * @private
 */
Ext.define('Ext.chart.Callout', {

    requires: ['Ext.chart.theme.CalloutStyle'],

    constructor: function (config) {
        var me = this;
        if (config.callouts) {
            config.callouts.styles = Ext.apply({}, config.callouts.styles || {});
            me.callouts = Ext.apply(me.callouts || {}, config.callouts);
            me.calloutsArray = [];
        }
        me.calloutStyle = new Ext.chart.theme.CalloutStyle();
    },

    renderCallouts: function () {
        if (!this.callouts) {
            return;
        }

        var me = this,
            items = me.items,
            chart = me.getChart(),
            animate = !chart.resizing && chart.getAnimate(),
            config = me.callouts,
            styles = config.styles,
            group = me.calloutsArray,
            store = chart.getStore(),
            len = store.getCount(),
            ratio = items.length / len,
            previouslyPlacedCallouts = [],
            i, count, j, p;

        for (i = 0, count = 0; i < len; i++) {
            for (j = 0; j < ratio; j++) {
                var item = items[count],
                    label = group[count],
                    storeItem = store.getAt(i),
                    display;

                display = ((item && item.useCallout) || config.filter(storeItem, item, i, display, j, count)) && (Math.abs(item.endAngle - item.startAngle) > 0.8);

                if (!display && !label) {
                    count++;
                    continue;
                }

                if (!label) {
                    group[count] = label = me.onCreateCallout(storeItem, item, i, display, j, count);
                }
                for (p in label) {
                    if (label[p] && label[p].setAttributes) {
                        label[p].setAttributes(styles, true);
                    }
                }
                if (!display) {
                    for (p in label) {
                        if (label[p]) {
                            if (label[p].setAttributes) {
                                label[p].setAttributes({
                                    hidden: true
                                }, true);
                            } else if (label[p].setVisible) {
                                label[p].setVisible(false);
                            }
                        }
                    }
                }
                config.renderer.call(me, label, storeItem);

                if (display) {
                    me.onPlaceCallout(label, storeItem, item, i, display, animate,
                        j, count, previouslyPlacedCallouts);
                }
                previouslyPlacedCallouts.push(label);
                count++;
            }
        }
        this.hideCallouts(count);
    },

    onCreateCallout: function (storeItem, item, i, display) {
        var me = this,
            config = me.callouts,
            styles = config.styles,
            width = styles.width || 100,
            height = styles.height || 100,
            surface = me.getSurface(),
            calloutObj = {
                label: false,
                box: false,
                lines: false
            };

        calloutObj.lines = surface.add(Ext.apply({}, {
            type: 'path',
            path: 'M0,0',
            stroke: me.getLegendColor(i) || '#555'
        }, config.lines || {}));

        calloutObj.box = surface.add(Ext.apply({
            type: 'rect',
            width: width,
            height: height
        }, config.box || {}));

        calloutObj.label = surface.add(Ext.apply({
            type: 'text',
            text: 'some text'
        }, config.label || {}));

        return calloutObj;
    },

    hideCallouts: function (index) {
        var calloutsArray = this.calloutsArray,
            len = calloutsArray.length,
            co, p;
        while (len-- > index) {
            co = calloutsArray[len];
            for (p in co) {
                if (co[p]) {
                    co[p].hide(true);
                }
            }
        }
    },

    /* ---------------------------------
     Methods needed for ComponentQuery
     ----------------------------------*/

    //filled by the constructor.
    parent: null,

    getItemId: function () {
        return this.element && this.element.id || this.id || null;
    },

    initCls: function () {
        return (this.cls || '').split(' ');
    },

    isXType: function (xtype) {
        return xtype === 'callout';
    },

    getRefItems: function (deep) {
        return [];
    }
});
