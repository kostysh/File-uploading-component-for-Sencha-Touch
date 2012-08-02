/**
 *
 */
Ext.define("Ext.draw.TextMeasurer", {
    singleton: true,

    uses: ['Ext.draw.engine.Canvas'],

    measureDiv: null,

    measureCache: {},

    actualMeasureText: function (text, font) {
        var me = Ext.draw.TextMeasurer,
            measureDiv = me.measureDiv,
            size;

        if (!measureDiv) {
            var parent = Ext.Element.create({
                style: {
                    "overflow": "hidden",
                    "position": "relative",
                    "float": "left", // DO NOT REMOVE THE QUOTE OR IT WILL BREAK COMPRESSOR
                    "width": 0,
                    "height": 0
                }
            });
            me.measureDiv = measureDiv = Ext.Element.create({});
            measureDiv.setStyle({
                "position": 'absolute',
                "x": 100000,
                "y": 10000,
                "z-index": -100000,
                "white-space": "nowrap",
                "display": 'block',
                "padding": 0,
                "margin": 0
            });
            Ext.getBody().appendChild(parent);
            parent.appendChild(measureDiv);
        }
        if (font) {
            measureDiv.setStyle({
                font: font,
                lineHeight: 'normal'
            });
        }
        measureDiv.setText('(' + text + ')');
        size = measureDiv.getSize();
        measureDiv.setText('()');
        size.width -= measureDiv.getSize().width;
        return size;
    },

    measureTextSingleLine: function (text, font) {
        text = text.toString();
        var cache = this.measureCache,
            chars = text.split(''),
            width = 0,
            height = 0,
            cachedItem, charactor, i, ln, size;

        if (!cache[font]) {
            cache[font] = {};
        }
        cache = cache[font];

        if (cache[text]) {
            return cache[text];
        }

        for (i = 0, ln = chars.length; i < ln; i++) {
            charactor = chars[i];
            if (!(cachedItem = cache[charactor])) {
                size = this.actualMeasureText(charactor, font);
                cachedItem = cache[charactor] = size;
            }
            width += cachedItem.width;
            height = Math.max(height, cachedItem.height);
        }
        return cache[text] = {
            width: width,
            height: height
        };
    },

    measureText: function (text, font) {
        var lines = text.split('\n'),
            ln = lines.length,
            height = 0,
            width = 0,
            line, i;

        if (ln == 1) {
            return this.measureTextSingleLine(text, font);
        }

        for (i = 0; i < ln; i++) {
            line = this.measureTextSingleLine(lines[i], font);
            height += line.height;
            width = Math.max(width, line.width);
        }

        return {
            width: width,
            height: height
        };
    }
});