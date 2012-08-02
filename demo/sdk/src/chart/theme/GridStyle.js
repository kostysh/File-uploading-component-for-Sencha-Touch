/**
 * @private
 *
 * @xtype marker
 */
Ext.define('Ext.chart.theme.GridStyle', {

    extend: 'Ext.chart.theme.Style',

    uses: [
        'Ext.chart.theme.OddStyle',
        'Ext.chart.theme.EvenStyle'
    ],

    constructor: function (config) {
        var me = this, odd = config.odd, even = config.even;
        delete config.odd;
        delete config.even;
        me.callParent(arguments);
        me.oddStyle = Ext.create('Ext.chart.theme.OddStyle', Ext.apply({parent: me.style}, odd));
        me.evenStyle = Ext.create('Ext.chart.theme.EvenStyle', Ext.apply({parent: me.style}, even));
    },

    isXType: function (xtype) {
        return xtype === 'grid';
    },

    getRefItems: function (deep) {
        return [ this.oddStyle, this.evenStyle ];
    }
});

