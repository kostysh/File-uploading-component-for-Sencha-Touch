Ext.define("Ext.draw.sprite.Composite", {
    extend: "Ext.draw.sprite.Sprite",
    alias: 'sprite.composite',
    type: 'composite',
    constructor: function () {
        this.callParent(arguments);
        this.sprites = [];
        this.sprites.map = {};
    },

    add: function (sprite) {
        if (!(sprite instanceof Ext.draw.sprite.Sprite)) {
            sprite = Ext.create('sprite.' + sprite.type, sprite);
            sprite.setParent(this);
        }
        var oldTransformations = sprite.applyTransformations,
            me = this,
            attr = me.attr;

        sprite.applyTransformations = function () {
            if (sprite.attr.dirtyTransform) {
                attr.dirtyTransform = true;
                attr.bbox.plain = 0;
                attr.bbox.transform = 0;
            }
            oldTransformations.call(sprite);
        };
        this.sprites.push(sprite);
        this.sprites.map[sprite.id] = sprite.getId();
        attr.bbox.plain = 0;
        attr.bbox.transform = 0;
    },

    getBBox: function (isWithoutTransform) {
        var me = this,
            attr = me.attr,
            totalBBox = attr.bbox,
            left = Infinity,
            right = -Infinity,
            top = Infinity,
            bottom = -Infinity,
            sprite, bbox, i, ln;

        if (!totalBBox.plain) {
            for (i = 0, ln = this.sprites.length; i < ln; i++) {
                sprite = this.sprites[i];
                sprite.applyTransformations();
                bbox = sprite.getBBox();
                if (left > bbox.x) {
                    left = bbox.x;
                }
                if (right < bbox.x + bbox.width) {
                    right = bbox.x + bbox.width;
                }
                if (top > bbox.y) {
                    top = bbox.y;
                }
                if (bottom < bbox.y + bbox.height) {
                    bottom = bbox.y + bbox.height;
                }
            }
            return {
                x: left,
                y: top,
                width: right - left,
                height: bottom - top
            };
        }
        if (isWithoutTransform) {
            return totalBBox.plain;
        }
        if (!totalBBox.transform) {
            totalBBox.transform = Ext.draw.Draw.transformBBox(totalBBox.plain);
        }
        return totalBBox.transform;
    },

    render: function (surface, ctx, region) {
        var mat = this.attr.matrix,
            i, ln;

        mat.toContext(ctx);
        for (i = 0, ln = this.sprites.length; i < ln; i++) {
            surface.renderSprite(this.sprites[i], region);
        }
    }
});