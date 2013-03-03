Ext.define("Ext.draw.sprite.Rect", {
    extend: "Ext.draw.sprite.Sprite",
    alias: 'sprite.rect',
    type: 'rect',
    inheritableStatics: {
        def: {
            processors: {
                x: 'number',
                y: 'number',
                width: 'number',
                height: 'number',
                radius: 'number'
            },
            aliases: {

            },
            dirtyTriggers: {
                x: 'bbox',
                y: 'bbox',
                width: 'bbox',
                height: 'bbox',
                radius: 'bbox'
            },
            defaults: {
                x: 0,
                y: 0,
                width: 1,
                height: 1,
                radius: 0
            }
        }
    },
    getBBox: function (isWithoutTransform) {
        var me = this,
            attr = me.attr,
            bbox = attr.bbox,
            x = attr.x,
            y = attr.y,
            width = attr.width,
            height = attr.height;

        if (!bbox.plain) {
            bbox.plain = {
                x: x,
                y: y,
                width: width,
                height: height
            }
        }

        if (isWithoutTransform) {
            return bbox.plain;
        }

        if (!bbox.transform) {
            bbox.transform = attr.matrix.transformBBox(bbox.plain, attr.radius);
        }

        return bbox.transform;
    },

    render: function (surface, ctx) {
        var attr = this.attr,
            mat = attr.matrix,
            x = attr.x,
            y = attr.y,
            width = attr.width,
            height = attr.height,
            radius = attr.radius;

        mat.toContext(ctx);
        ctx.beginPath();
        if (radius == 0) {
            ctx.rect(x, y, width, height);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + width, y, x + width, y + height, radius);
            ctx.arcTo(x + width, y + height, x, y + height, radius);
            ctx.arcTo(x, y + height, x, y, radius);
            ctx.arcTo(x, y, x + radius, y, radius);
        }
        ctx.fillStroke(attr);
    }
});