/**
 *
 */
Ext.define('Ext.mixin.Bindable', {
    extend: 'Ext.mixin.Mixin',

    mixinConfig: {
        id: 'bindable'
    },

    bind: function(instance, methodName, fn) {
        if (!fn) {
            fn = methodName;
        }

        var me = this,
            originalFn = instance[methodName];

        instance[methodName] = function() {
            var args = Array.prototype.slice.call(arguments);
            args.push(arguments);

            if (me[fn].apply(me, args) !== false) {
                return originalFn.apply(this, arguments);
            }
        };
    }
});
