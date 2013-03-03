/**
 * @private
 *
 * @xtype marker
 */
Ext.define('Ext.chart.theme.CalloutStyle', {

    extend: 'Ext.chart.theme.Style',
    requires: [
        'Ext.chart.theme.OddStyle',
        'Ext.chart.theme.EvenStyle'
    ],
    constructor: function (config) {
        this.callParent(arguments);
        this.oddStyle = new Ext.chart.theme.OddStyle();
        this.evenStyle = new Ext.chart.theme.EvenStyle();
    },

    /* ---------------------------------
     Methods needed for ComponentQuery
     ----------------------------------*/

    isXType: function (xtype) {
        return xtype === 'callout';
    },

    getRefItems: function (deep) {
        return [];
    }
});


