/**
 * This is the destination modifier that has to be put at
 * the top of the modifier stack.
 *
 * Performance critical
 */
Ext.define("Ext.draw.modifier.Target", {
    extend: "Ext.draw.modifier.Modifier",
    alias: 'modifier.target',

    config: {
        sprite: null
    },

    createAttributes: function () {
        var attr = Ext.draw.modifier.Modifier.prototype.createAttributes.call(this);
        // attribute bucket
        attr.bbox = {
            plain: 0,
            transform: 0
        };
        attr.dirtyFlags = {};
        attr.canvasAttributes = {};
        attr.matrix = new Ext.draw.Matrix();
        attr.inverseMatrix = new Ext.draw.Matrix();
        return attr;
    },

    forkAttributes: function (attr) {
        var newAttr = this.callParent(arguments);
        newAttr.bbox = {
            plain: attr.bbox.plain,
            transform: attr.bbox.transform
        }
        newAttr.dirtyFlags = Ext.apply({}, attr.dirtyFlags);
        newAttr.canvasAttributes = Ext.apply({}, attr.canvasAttributes);
        newAttr.matrix = attr.matrix.clone();
        newAttr.inverseMatrix = attr.inverseMatrix.clone();
        return newAttr;
    },

    popUp: function (attributes, changes) {
        this.setDirtyFlags(attributes, changes);
        this.getSprite().updateDirtyFlags(attributes);
    },

    setDirtyFlags: function (attr, changes) {
        var sprite = this._sprite,
            dirtyTriggers = sprite.self.def._dirtyTriggers,
            name, dirtyFlags = attr.dirtyFlags || (attr.dirtyFlags = {}), flags,
            triggers, trigger, i, ln, canvasNames;

        for (name in changes) {
            if ((triggers = dirtyTriggers[name])) {
                i = 0;
                while ((trigger = triggers[i++])) {
                    if (!(flags = dirtyFlags[trigger])) {
                        flags = dirtyFlags[trigger] = [];
                    }
                    flags.push(name);
                }
            }
        }
        if (dirtyFlags.canvas) {
            canvasNames = dirtyFlags.canvas;
            delete dirtyFlags.canvas;
            for (i = 0, ln = canvasNames.length; i < ln; i++) {
                name = canvasNames[i];
                attr.canvasAttributes[name] = attr[name];
            }
        }
        sprite.setDirty(true);
    },

    pushDown: function (attr, changes) {
        changes = this._previous.pushDown(attr, changes);
        this.setDirtyFlags(attr, changes);
        return changes;
    }
});