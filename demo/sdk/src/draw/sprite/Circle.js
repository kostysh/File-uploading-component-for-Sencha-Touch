Ext.define("Ext.draw.sprite.Circle", {
    extend: "Ext.draw.sprite.Sprite",
    alias: 'sprite.circle',
    type: 'circle',
    inheritableStatics: {
        def: {
            processors: {
                cx: "number",
                cy: "number",
                r: "number"
            },
            aliases: {
                radius: "r",
                x: "cx",
                y: "cy",
                centerX: "cx",
                centerY: "cy"
            },
            defaults: {
                cx: 0,
                cy: 0,
                r: 0
            }
        }
    },

    getBBox: function (isWithoutTransform) {
        var attr = this.attr,
            cx = attr.cx,
            cy = attr.cy,
            r = attr.r,
            matrix, scales, center, w, h;

        if (isWithoutTransform) {
            return attr.bbox.plain || ( attr.bbox.plain = {
                x: cx - r,
                y: cy - r,
                width: r + r,
                height: r + r
            });
        } else {
            if (attr.bbox.transform) {
                return attr.bbox.transform;
            }
            matrix = attr.matrix;
            scales = matrix.getScales();
            center = matrix.transformList([
                [cx, cy]
            ])[0];
            w = scales[0] * r;
            h = scales[1] * r;
            return attr.bbox.transform = {
                x: center[0] - w,
                y: center[1] - h,
                width: w + w,
                height: h + h
            }
        }

    },

    render: function (surface, ctx) {
        var attr = this.attr,
            mat = attr.matrix,
            x = attr.cx,
            y = attr.cy,
            r = attr.r;

        mat.toContext(ctx);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2, true);
        ctx.fillStroke(attr);
    }
});