Ext.define("Ext.draw.sprite.Ellipse", {
    extend: "Ext.draw.sprite.Sprite",
    alias: 'sprite.ellipse',
    type: 'circle',
    inheritableStatics: {
        def: {
            processors: {
                cx: "number",
                cy: "number",
                rx: "number",
                ry: "number"
            },
            aliases: {
                radius: "r",
                x: "cx",
                y: "cy",
                centerX: "cx",
                centerY: "cy",
                radiusX: "rx",
                radiusY: "ry"
            },
            defaults: {
                cx: 0,
                cy: 0,
                rx: 1,
                ry: 1
            }
        }
    },

    getBBox: function (isWithoutTransform) {
        var attr = this.attr,
            cx = attr.cx,
            cy = attr.cy,
            rx = attr.rx,
            ry = attr.ry,
            rxy = ry / rx,
            matrix, xx, xy, yx, yy, dx, dy, w, h;

        if (isWithoutTransform) {
            return attr.bbox.plain || ( attr.bbox.plain = {
                x: cx - rx,
                y: cy - ry,
                width: rx + rx,
                height: ry + ry
            });
        } else {
            if (attr.bbox.transform) {
                return attr.bbox.transform;
            }
            matrix = attr.matrix.clone();
            matrix.postpend(1, 0, 0, rxy, 0, cy * (1 - rxy));
            xx = matrix.getXX();
            yx = matrix.getYX();
            dx = matrix.getDX();
            xy = matrix.getXY();
            yy = matrix.getYY();
            dy = matrix.getDY();
            w = Math.sqrt(xx * xx + yx * yx) * rx;
            h = Math.sqrt(xy * xy + yy * yy) * rx;
            return attr.bbox.transform = {
                x: cx * xx + cy * yx + dx - w,
                y: cx * xy + cy * yy + dy - h,
                width: w + w,
                height: h + h
            }
        }

    },

    render: function (surface, ctx) {
        var attr = this.attr,
            matrix = attr.matrix.clone(),
            cx = attr.cx,
            cy = attr.cy,
            rx = attr.rx,
            ry = attr.ry;

        ctx.beginPath();
        matrix.toContext(ctx);
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2, true);
        ctx.fillStroke(attr);
    }
});