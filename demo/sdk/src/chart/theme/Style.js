/**
 * @private
 */
Ext.define('Ext.chart.theme.Style', {

    constructor: function (config) {
        config = config || {};

        if (config.parent) {
            this.themeStyle = Ext.Object.chain(config.parent);
        } else {
            this.themeStyle = {};
        }

        this.themeStyle.reset = function () {
            Ext.Object.each(this, function (name) {
                delete this[name];
            });
        };
        this.themeStyle = Ext.Object.chain(this.themeStyle);
        this.style = Ext.Object.chain(this.themeStyle);
        Ext.apply(this.style, config);
    }
});
