Ext.define("Ext.chart.series.sprite.Markers", {
    extend: 'Ext.draw.sprite.Instancing',

    config: {
        streamProvider: null
    },

    updateStreamProvider: function (provider, oldProvider) {
        if (oldProvider) {
            delete oldProvider.oldSetDirty;
            delete oldProvider.setDirty;
        }
        if (provider) {
            var me = this;
            provider.oldSetDirty = provider.setDirty;
            provider.setDirty = function (dirty) {
                me.setDirty(true);
                provider.oldSetDirty(dirty);
            }
        }
    },

    getBBox: function (isWithoutTransform) {
        var me = this,
            attr = me.attr,
            stream = me.getStreamProvider(),
            marker = me.getTemplate(),
            streamBBox, markerBBox;
        if (stream) {
            streamBBox = stream.getBBox(isWithoutTransform);
        } else {
            streamBBox = {x: 0, y: 0, width: 0, height: 0};
        }
        if (marker) {
            markerBBox = marker.getBBox(true);
        } else {
            markerBBox = {x: 0, y: 0, width: 0, height: 0};
        }
        
        return {
            x: streamBBox.x + markerBBox.x,
            y: streamBBox.y + markerBBox.y,
            width: streamBBox.width + markerBBox.width,
            height: streamBBox.height + markerBBox.height
        };
    },

    render: function (surface, ctx, region) {
        var me = this,
            attr = me.attr,
            matrix = attr.matrix,
            stream = me.getStreamProvider(),
            markerAttr,
            idx = 0, iterator,
            marker = me.getTemplate();
        if (stream && marker) {
            matrix.toContext(ctx);
            iterator = stream.getIterator();
            if (!iterator) {
                return;
            }
            iterator.reset();
            while ((markerAttr = iterator.iterate())) {
                if (!me.instances[idx]) {
                    me.instances[idx] = marker.topModifier.forkAttributes(marker.attr);
                }
                marker.setAttributes(markerAttr);
                marker.bindAttributes(me.instances[idx++]);
                surface.renderSprite(marker, region);
            }
            attr.inverseMatrix.toContext(ctx);
        }
    }
});