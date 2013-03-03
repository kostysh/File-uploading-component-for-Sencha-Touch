Ext.define("Ext.draw.sprite.Path", {
    extend: "Ext.draw.sprite.Sprite",
    requires: ['Ext.draw.Draw', 'Ext.draw.path.Path'],
    alias: 'sprite.path',
    type: 'path',
    inheritableStatics: {
        def: {
            processors: {
                path: function (n, o) {
                    if (!(n instanceof Ext.draw.path.Path)) {
                        n = new Ext.draw.path.Path(n);
                    }
                    return n;
                }
            },
            aliases: {
                "d": "path"
            },
            defaults: {
                path: "M 0,0"
            },
            dirtyTriggers: {
                path: 'bbox'
            }
        }
    },

    getBBox: function (isWithoutTransform) {
        var bbox = this.attr.bbox;
        if (isWithoutTransform) {
            bbox.plain = bbox.plain || this.attr.path.getDimension();
            return bbox.plain;
        }
        bbox.transform = this.attr.path.getDimensionWithTransform(this.attr.matrix);
        return bbox.transform;
    },

    render: function (surface, ctx) {
        var mat = this.attr.matrix,
            attr = this.attr;

        mat.toContext(ctx);
        surface.pathApplier(ctx, attr.path,
            mat,
            attr.lineWidth +
                Math.abs(attr.shadowOffsetX) +
                Math.abs(attr.shadowOffsetY) +
                Math.abs(attr.shadowBlur)
        );
        ctx.fillStroke(attr);
    }
});