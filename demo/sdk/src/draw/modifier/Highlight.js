/**
 * @class
 * Highlight modifier is a modifier that will override the attributes
 * with its `highlightStyle` attributes when its `highlighted` is true.
 */
Ext.define("Ext.draw.modifier.Highlight", {
    extend: 'Ext.draw.modifier.Modifier',
    alias: 'modifier.highlight',
    config: {
        enabled: false,
        sprite: null
    },

    createAttributes: function () {
        var proto = this.callParent(arguments),
            newAttr = Ext.Object.chain(proto);
        newAttr.highlightOriginal = proto;
    },

    forkAttributes: function (attr) {
        var proto = this.callParent([attr.highlightOriginal]),
            newAttr = Ext.Object.chain(proto),
            name;

        for (name in attr) {
            if (attr.hasOwnProperty(name)) {
                newAttr[name] = attr[name];
            }
        }
        newAttr.highlightOriginal = proto;
        return newAttr;
    },

    pushDown: function (attr, changes) {
        var highlightedChanges = false,
            highlightStyleChanges = false,
            result, name, value;

        // Hide `highlighted` and `highlightStyle` to underlying modifiers.
        if (changes.hasOwnProperty('highlighted')) {
            var oldHighlighted = changes.highlighted;

            delete changes.highlighted;
            highlightedChanges = true;
        }

        if (changes.hasOwnProperty('highlightStyle')) {
            var oldHighlightStyle = changes.highlightStyle;

            delete changes.highlightStyle;
            highlightStyleChanges = true;
        }

        result = Ext.draw.modifier.Modifier.prototype.pushDown.call(this, attr.highlightOriginal, changes);

        Ext.apply(attr, result);

        if (highlightStyleChanges) {
            attr.highlightStyle = result.highlightStyle = oldHighlightStyle;
        }

        if (highlightedChanges && oldHighlighted !== attr.highlighted) {
            attr.highlighted = result.highlighted = oldHighlighted;
            if (attr.highlighted) {
                for (name in attr.highlightStyle) {
                    value = attr.highlightStyle[name];
                    if (attr[name] !== value) {
                        attr.highlightOriginal[name] = attr[name];
                        result[name] = value;
                    }
                    attr[name] = value;
                }
            } else {
                for (name in attr.highlightStyle) {
                    if (attr[name] !== attr.highlightOriginal[name]) {
                        result[name] = attr.highlightOriginal[name];
                    }
                    delete attr[name];
                }
            }
        }
        return result;
    },

    beforeAttach: function (sprite) {
        // Before attaching to a sprite, register the highlight related
        // attributes to its definition.
        //
        // TODO(zhangbei): Unfortunately this will effect all the sprites of the same type.
        // As the redundant attributes would not effect performance, it is not yet a big problem.
        var def = sprite.self.def;

        def.setConfig({
            defaults: {
                highlighted: false,
                highlightStyle: {}
            },

            processors: {
                highlighted: 'bool',
                highlightStyle: function (style) {
                    return def.normalize(style);
                }
            },

            aliases: {
                "highlight": "highlighted",
                "highlighting": "highlighted",
                "highlightCfg": "highlightStyle"
            },

            dirtyFlags: {
            },

            updaters: {

            }
        });
    }
});