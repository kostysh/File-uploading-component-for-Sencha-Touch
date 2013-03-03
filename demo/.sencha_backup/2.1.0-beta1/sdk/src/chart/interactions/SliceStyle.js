/**
 * @private
 * Slice style used for PieGrouping
 */
Ext.define('Ext.chart.interactions.SliceStyle', {

    extend: 'Ext.chart.theme.Style',

    isXType: function (xtype) {
        return xtype === 'slice';
    }
});

