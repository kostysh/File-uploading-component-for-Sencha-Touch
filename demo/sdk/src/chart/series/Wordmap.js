/**
 * @class Ext.chart.series.Wordmap
 * @extends Ext.chart.series.Series
 *
 * Creates a space filling layout for words. You can bind the size of the words to different values for the nodes.
 *
 * {@img Ext.chart.series.Wordmap/Ext.chart.series.Wordmap.png Ext.chart.series.Wordmap Wordmap visualization}
 *
 * For example:
 *            var chart = Ext.create('Ext.chart.AbstractChart', {
 *                theme: 'Demo',
 *               store: store1,
 *               animate: {
 *                    easing: "backInOut",
 *                   duration: 500
 *               },
 *               series: [{
 *                   type: 'wordmap',
 *                   wordField: 'word',
 *                   wordCountField: 'count',
 *                   minFontSize: 20,
 *                   maxFontSize: 50,
 *                   minColor: 'rgb(0,0,0)',
 *                   maxColor: '#56b31f',
 *                   fontFamily: 'Ubuntu',
 *                   positionFn: function(bounds){
 *                       var width = bounds.width,
 *                           height = bounds.height,
 *                           rnd = Math.random,
 *                           x, y;
 *                           x = (width/2) + (((rnd() * 10 > 5) ? 1 : -1) * rnd() * 100 + 1) >> 0;
 *                           y = (height/2) + (((rnd() * 10 > 5) ? 1 : -1) * rnd() * 100 + 1) >> 0;
 *
 *                       return {
 *                           x: x,
 *                           y: y
 *                       };
 *                   }
 *               }]
 *           });
 *
 *
 * @xtype wordmap
 */
Ext.define('Ext.chart.series.Wordmap', {

    extend: 'Ext.chart.series.Series',

    type: 'wordmap',

    config: {
        /**
         *  @cfg {Number} maxFontSize (optional) The font size that should be used to display a store's item with a maximum count. The default value is 55
         */
        maxFontSize: 55,

        /**
         *  @cfg {Number} minFontSize (optional) The font size that should be used to display a store's item with a minimum count. The default value is 25
         */
        minFontSize: 25,

        /**
         *  @cfg {String} maxColor (optional) The color that should be used to display a store's item with a maximum count. e.g. 'rgb(0,0,0)', '#444', .. The default value is 'rgb(255,0,0)'
         */
        maxColor: 'rgb(255,0,0)',

        /**
         *  @cfg {String} minColor (optional) The color that should be used to display a store's item with a minimum count. e.g. 'rgb(0,0,0)', '#444', .. The default value is 'rgb(0,0,0)'
         */
        minColor: 'rgb(0,0,0)',

        /**
         *  @cfg {Function} positionFn (optional) Function for positioning a word. Based on this function all words get a start position.'
         */
        positionFn: function (bounds) {
            var width = bounds.width,
                height = bounds.height,
            // random horizontal position
            // x = Math.random()*width+1 >> 0,
            // vertically centered
            // y = (height/2) >> 0;

            // centered, no distribution -> worst case since all positioned words intersect at least with the first
            // x = (width/2) >> 0;
            // y = (height/2) >> 0;

            // center distributed
                x = (width / 2) + (((Math.random() * 10 > 5) ? 1 : -1) * Math.random() * 50 + 1) >> 0,
                y = (height / 2) + (((Math.random() * 10 > 5) ? 1 : -1) * Math.random() * 50 + 1) >> 0;

            return {
                x: x,
                y: y
            };
        },

        fontFamily: 'Arial',

        wordField: false,

        wordCountField: false,

        // returns a color based on a given count and the boundary object
        colorFn: null
    },
    /* 
     example color function
     function(count, bounds){
     var r, g, b;
     r = (Math.random()*255+1>>0);
     g = (Math.random()*255+1>>0);
     b = (Math.random()*255+1>>0);
     return (new Ext.draw.Color(r, g, b).toString());
     },

     */

    // @private contains the added words which has to be checked for intersections with new words
    addedWords: [],

    constructor: function (config) {
        this.callParent(arguments);

        var me = this,
            surface = me.getSurface(),
            store = me.getChart().getStore();

        me.group = surface.getGroup(me.seriesId);
    },

    // @private returns charts boundaries and scales
    getBounds: function () {
        var me = this,
            count,
            fontScale = 0,
            colorScale = 0,
            surface = me.getSurface(),
            wordCountField = me.getWordCountField(),
            bbox, maxCount, minCount;

        minCount = Infinity;
        maxCount = 0;
        me.eachRecord(function (record) {
            count = record.get(wordCountField);
            if (count < minCount) {
                minCount = count;
            }
            if (count > maxCount) {
                maxCount = count;
            }
        });
        me.setBBox();
        bbox = me.bbox;

        // take width/height into account
        fontScale = (maxCount - minCount) / (me.getMaxFontSize() - me.getMinFontSize());
        colorScale = 1 / (maxCount - minCount);

        return {
            bbox: bbox,
            width: surface.getWidth(),
            height: surface.getHeight(),
            colorScale: colorScale,
            fontScale: fontScale,
            minCount: minCount,
            maxCount: maxCount
        }
    },

    drawSeries: function () {
        var me = this,
            chart = me.getChart(),
            animate = chart.getAnimate(),
            surface = me.getSurface(),
            store = chart.substore || chart.getStore(),
            storeCount = store.getCount(),
            group = me.group,
            groupCount = group.length,
            fontFamily = me.getFontFamily(),
            addedWords = me.addedWords || [],
            crossed = me.crossWords == null,
            startPosition,
            bounds, currentPosition, spiralAngle,
            collides, word, count, x, measuredWord,
            size, sprite, rotated, attrs, debug,
            start = +new Date;

        me.callParent();

        while (storeCount < groupCount--) {
            group.get(groupCount).hide(true);
        }
        // set the bounds in order to make the positioning possible
        bounds = me.bounds = me.getBounds();

        // TODO: check whats the biggest word by measuring all words
        // check if the biggest word can be added to the surface
        // as long as the biggest word doesnt fit on the screen, decrement the maxFont
        x = 0;

        me.eachRecord(function (record, i) {

            spiralAngle = 0.0;
            collides = false;
            rotated = crossed && (0 == (Math.random() * 2 >> 0));//(i+1)%2==0);

            word = record.get(me.getWordField());
            count = record.get(me.getWordCountField());
            // assign a position based on the positioning function
            startPosition = me.getPositionFn()(bounds);
            currentPosition = startPosition;
            measuredWord = me.getMeasuredWord(currentPosition, word, count, rotated);

            collides = me.checkForCollisions(measuredWord);

            while (collides || me.isInBoundaries(measuredWord)) {
                // moving along a spiral from the starting position
                currentPosition = me.moveAlongSpiral(startPosition, spiralAngle);
                measuredWord = me.getMeasuredWord(currentPosition, word, count, rotated);

                collides = me.checkForCollisions(measuredWord);
                // experimental addend 1/12 of a circle
                spiralAngle += Ext.draw.Draw.pi2 / 12;

            }

            addedWords.push(measuredWord);
            me.addedWords = addedWords;

            size = me.getWordSize(word, count);

            sprite = group.get(i) || (surface.add({
                type: 'text',
                group: group,
                textBaseline: 'middle',
                textAlign: 'center'
            }));

            sprite.show(true);
            me.onAnimate(sprite, {
                to: {
                    text: word,
                    x: currentPosition.x,
                    y: currentPosition.y,
                    rotation: {
                        degrees: rotated ? 90 : 0
                    },
                    fill: me.getInterpolatedColor(count),
                    fontSize: size.fontSize,
                    fontFamily: fontFamily
                }
            });
        });
        me.addedWords = [];

        me.fireEvent('draw', me);
    },

    // @private handled when creating a label.
    onCreateLabel: function (storeItem, item, i, display) {

    },

    // @private callback for when placing a label sprite.
    onPlaceLabel: function (label, storeItem, item, i, display, animate) {

    },

    // @private returns a point on a spiral based on a starting position and the spirals angle
    moveAlongSpiral: function (startPosition, spiralAngle) {
        // spiral of archimedes
        var a = spiralAngle,
            x = a * Math.cos(spiralAngle) >> 0,
            y = a * Math.sin(spiralAngle) >> 0;

        startPosition.x += x;
        startPosition.y += y;

        return startPosition;
    },

    // @private returns a color based on count by interpolating between min and maxcolor
    getInterpolatedColor: function (count) {
        var me = this,
            bounds = me.bounds,
            minCount = bounds.minCount,
            maxCount = bounds.maxCount,
            color = Ext.draw.Color,
            colorScale = (count - minCount) * bounds.colorScale,
            maxColor = color.fromString(me.getMaxColor()).getRGB(),
            minColor = color.fromString(me.getMinColor()).getRGB(),
            rInt, gInt, bInt;
        if (me.getColorFn()) {
            return me.getColorFn()(count, bounds);
        }

        rInt = minColor[0] + (maxColor[0] - minColor[0]) * colorScale >> 0,
            gInt = minColor[1] + (maxColor[1] - minColor[1]) * colorScale >> 0,
            bInt = minColor[2] + (maxColor[2] - minColor[2]) * colorScale >> 0;

        return (new color(rInt, gInt, bInt).toString());
    },

    getWordSize: function (word, count) {
        // TODO(zhangbei): this only works on Canvas engine, should we create a measure test on the Surface interface instead?
        var me = this,
            surface = me.getSurface(),
            ctx = surface.ctx,
            fontSize = me.getMinFontSize() + (((count - me.bounds.minCount) / me.bounds.fontScale) >> 0),
            font = fontSize + 'px \'' + me.getFontFamily() + '\'',
            width, height;

        ctx.save();
        if (ctx.font != font) {
            ctx.font = font;
        }
        ctx.textBaseline = 'bottom';
        width = ctx.measureText(word).width >> 0;
        // experimental
        height = fontSize;
        ctx.restore();

        return {
            width: width,
            height: height,
            fontSize: fontSize
        };
    },

    getMeasuredWord: function (position, word, count, rotated) {
        var me = this,
            wordSize = me.getWordSize(word, count),
            width = wordSize.width,
            height = wordSize.height,
            halfwidth = (!rotated) ? width / 2 : height / 2,
            halfheight = (!rotated) ? height / 2 : width / 2,
            p1 = [], p2 = [], p3 = [], p4 = [];

        // halfwidth and halfheight because the position is the center
        p1[0] = position.x - halfwidth;
        p1[1] = position.y - halfheight;

        p2[0] = position.x + halfwidth;
        p2[1] = position.y - halfheight;

        p3[0] = position.x + halfwidth;
        p3[1] = position.y + halfheight;

        p4[0] = position.x - halfwidth;
        p4[1] = position.y + halfheight;
        return [p1, p2, p3, p4];
    },

    // @private checks for word collisions
    checkForCollisions: function (currentWord) {
        var me = this,
            prevWords = me.addedWords,
            length = prevWords.length,
            prevWord;

        for (var i = 0; i < length; i++) {
            prevWord = prevWords[i];

            if (!!Ext.draw.Draw.intersect(currentWord, prevWord).length) {
                return true;
            }

        }
        return false;
    },
    // TODO: let user specify boundary function and call it in here 
    /** 
     * @private checks if a word is in defined boundaries
     * 
     * @param measuredWord
     * @return {Boolean}
     */
    isInBoundaries: function (measuredWord) {
        var me = this,
            bounds = me.bounds;

        return (measuredWord[0][0] && measuredWord[1][1] && (measuredWord[1][0] > bounds.width || measuredWord[1][1] > bounds.height));
    }
});
