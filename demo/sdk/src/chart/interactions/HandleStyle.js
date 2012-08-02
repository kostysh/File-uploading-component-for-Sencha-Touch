/**
 * @private
 * Handle style used for PieGrouping
 */
Ext.define('Ext.chart.interactions.HandleStyle', {

    extend: 'Ext.chart.theme.Style',

    isXType: function (xtype) {
        return xtype === 'handle';
    }
});