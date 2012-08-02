/**
 *
 */
Ext.define("Ext.draw.sprite.PieSlice", {
    extend: "Ext.draw.sprite.Path",
    alias: 'sprite.pieslice',
    type: 'pieslice',
    inheritableStatics: {
        def: {
            processors: {
                centerX: "number",
                centerY: "number",
                startAngle: "number",
                endAngle: "number",
                startRho: "number",
                endRho: "number",
                margin: "number"
            },
            aliases: {
                rho: 'endRho'
            },
            dirtyTriggers: {
                centerX: "path,bbox",
                centerY: "path,bbox",
                startAngle: "path,bbox",
                endAngle: "path,bbox",
                startRho: "path,bbox",
                endRho: "path,bbox",
                margin: "path,bbox"
            },
            defaults: {
                centerX: 0,
                centerY: 0,
                startAngle: 0,
                endAngle: 0,
                startRho: 0,
                endRho: 150,
                margin: 0,
                path: 'M 0,0'
            },
            updaters: {
                path: function () {
                    this.updatePath();
                }
            }
        }
    },

    drawPath: function (path) {
        var attr = this.attr,
            startAngle = Math.min(attr.startAngle, attr.endAngle),
            endAngle = Math.max(attr.startAngle, attr.endAngle),
            midAngle = (startAngle + endAngle) * 0.5,
            margin = attr.margin,
            centerX = attr.centerX,
            centerY = attr.centerY,
            startRho = Math.min(attr.startRho, attr.endRho),
            endRho = Math.max(attr.startRho, attr.endRho);

        if (margin) {
            centerX += margin * Math.cos(midAngle);
            centerY += margin * Math.sin(midAngle);
        }

        path.moveTo(centerX + startRho * Math.cos(startAngle), centerY + startRho * Math.sin(startAngle));
        path.lineTo(centerX + endRho * Math.cos(startAngle), centerY + endRho * Math.sin(startAngle));
        path.arc(centerX, centerY, endRho, startAngle, endAngle, false);
        path.lineTo(centerX + startRho * Math.cos(endAngle), centerY + startRho * Math.sin(endAngle));
        path.arc(centerX, centerY, startRho, endAngle, startAngle, true);
    },

    updatePath: function () {
        this.attr.path = new Ext.draw.path.Path();
        this.attr.path.clear();
        this.drawPath(this.attr.path);
    }
});