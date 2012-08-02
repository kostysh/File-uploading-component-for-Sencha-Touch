Ext.define("Ext.draw.sprite.Instancing", {
    extend: "Ext.draw.sprite.Sprite",
    alias: 'sprite.instancing',
    type: 'instancing',
    config: {
        template: null
    },
    instances: null,
    constructor: function (config) {
        this.instances = [];
        this.callParent([config]);
        if (config && config.template) {
            this.setTemplate(config.template);
        }
    },

    applyTemplate: function (template) {
        if (!(template instanceof Ext.draw.sprite.Sprite)) {
            template = Ext.create("sprite." + template.type, template);
            template.setParent(this);
        }
        this.instances = [];
        return template;
    },

    createInstance: function (config, data) {
        var template = this.getTemplate(),
            attributes = template.topModifier.forkAttributes(template.attr);

        template.self.def.set(attributes, this.topModifier, config);
        attributes.data = data;
        this.instances.push(attributes);
        return attributes;
    },

    getBBox: function (isWithoutTransform) {
        var me = this,
            totalBBox = me.attr.bbox,
            template = me.getTemplate(),
            instances = me.instances,
            left = Infinity,
            right = -Infinity,
            top = Infinity,
            bottom = -Infinity,
            bbox, instance, i, ln;

        if (!totalBBox.plain) {
            for (i = 0, ln = instances.length; i < ln; i++) {
                instance = me.instances[i];
                template.bindAttributes(instance);
                template.applyTransformations();
                bbox = template.getBBox();
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
            sprite = this.getTemplate(),
            instances = this.instances,
            i, ln = instances.length;

        mat.toContext(ctx);
        for (i = 0; i < ln; i++) {
            sprite.attr = instances[i];
            sprite.updateDirtyFlags(instances[i]);
            surface.renderSprite(sprite, region);
        }
    },

    setAttributesFor: function (index, attrs) {
        var template = this.getTemplate();

        attrs = template.self.def.normalize(attrs);
        template.topModifier.pushDown(this.instances[index], attrs);
        this.updateDirtyFlags(this.instances[index]);
    }
});