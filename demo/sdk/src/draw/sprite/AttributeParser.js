/**
 *
 */
Ext.define("Ext.draw.sprite.AttributeParser", {
    singleton: true,
    attributeRe: /^url\(#([a-zA-Z\-]+)\)$/,
    requires: ['Ext.draw.Color'],

    "default": function (n) {
        return n;
    },
    string: function (n) {
        if (n != null) {
            return n.toString();
        }
    },
    number: function (n) {
        if (!isNaN(n)) {
            return n;
        }
    },
    bool: function (n) {
        return !!n;
    },
    color: function (n) {
        if (n instanceof Ext.draw.Color) {
            return n.toString();
        } else if (n instanceof Ext.draw.gradient.Gradient) {
            return n;
        } else if (!n) {
            return 'none';
        } else if (Ext.isString(n)) {
            if (n.substr(0, 3) === 'url') {
                var match = n.match(Ext.draw.sprite.AttributeParser.attributeRe);
                if (match) {
                    return this.getSurface().getGradient(match[1]).getGradient();
                }
            } else {
                return Ext.draw.Color.create(n).toString();
            }
        } else if (n.type === 'linear') {
            return Ext.create('Ext.draw.gradient.Linear', n);
        } else if (n.type === 'radial') {
            return Ext.create('Ext.draw.gradient.Radial', n);
        } else if (n.type === 'pattern') {
            return Ext.create('Ext.draw.gradient.Pattern', n);
        }
    },

    limited: function (low, hi) {
        return (function (n) {
            return isNaN(n) ? undefined : Math.min(Math.max(+n, low), hi);
        });
    },
    limited01: function (n) {
        return isNaN(n) ? undefined : Math.min(Math.max(+n, 0), 1);
    },
    enums: function () {
        var enums = {},
            args = Array.prototype.slice.call(arguments, 0),
            i, ln;

        for (i = 0, ln = args.length; i < ln; i++) {
            enums[args[i]] = true;
        }
        return (function (n) {
            return n in enums ? n : undefined;
        });
    }
});