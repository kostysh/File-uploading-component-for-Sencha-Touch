/**
 * @private
 *
 * CSS Transform implementation
 */
Ext.define('Ext.util.translatable.CssTransform', {
    extend: 'Ext.util.translatable.Dom',

    doTranslate: function() {
        this.getElement().dom.style.webkitTransform = 'matrix(1,0,0,1,' + this.x + ', ' + this.y + ')';
    },

    destroy: function() {
        var element = this.getElement();

        if (element && !element.isDestroyed) {
            element.dom.style.webkitTransform = null;
        }

        this.callParent(arguments);
    }
});
