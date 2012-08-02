/**
 * @class Ext.chart.series.Treemap
 * @extends Ext.chart.series.AbstractSpaceFilling
 *
 * Creates a TreeMap visualization. The TreeMap is a space filling visualization that renders hierarchies.
 * Hierarchy visualizations use TreeStores.
 *
 * {@img Ext.chart.series.TreeMap/Ext.chart.series.TreeMap.png Ext.chart.series.TreeMap TreeMap visualization}
 *
 * For example:

 Ext.define('User', {
 extend: "Ext.data.Model",
 config: {
 fields: ['children', 'leaf', 'data', 'id', 'name']
 }
 });

 treeStore = new Ext.data.TreeStore({
 model: 'User',
 batchUpdateMode: 'complete',
 proxy: {
 type: 'ajax',
 url: 'src/model.json',
 reader: {
 type: 'json',
 rootProperty: 'children'
 }
 }
 });

 treeStore.load({
 callback: callback
 });

 function callback() {
 var chart = new Ext.chart.AbstractChart({
 store: treeStore,
 animate: true,
 series: [{
 type: 'treemap',
 layout: 'squarified',
 orientation: 'horizontal',
 highlight: true,
 titleHeight: 13,
 offset: 0.5,
 rootName: 'Root node title',
 titleField: 'name',
 lengthField: function(node) {
 return node ? node.get('data').area : 1;
 },
 areaField: function(node) {
 return node ? node.get('data').area : 1;
 },
 colorField: function(node) {
 return '#555';
 }
 }]
 });


 * In this example we load a TreeStore via an http request from a json file, and once loaded we create a chart
 * with a treemap series. We set the layout to be squarified, and also the orientation of the layout to be horizontal (only useful for slice and dice layout).
 * We also set a function `lengthField` that returns the area to be allocated for the node when placed in the treemap visualization.
 *
 * @xtype treemap
 */

(function () {

//Contains mixin with multiple treemap layouts.
    var Layout = {};

//Define layout mixins
    Layout.SliceAndDice = {

        /*
         * Slice and Dice layout methods
         */
        compute: function (bounds) {
            var me = this,
                chart = me.getChart(),
                store = chart.substore || chart.getStore(),
                root = store.getRoot(),
                size = me.bbox,
                width = size.width,
                height = size.height,
                items = [], rootItem;

            rootItem = {
                x: size.x,
                y: size.y,
                width: width,
                height: height + (me.titleHeight || 0),
                storeItem: root
            };

            me.computePositions(rootItem, rootItem, me.orientation || 'horizontal', items);

            return items;
        },

        computePositions: function (parentItem, childItem, orn, items) {
            //compute children areas
            var me = this,
                parentNode = parentItem.storeItem,
                children = parentNode.childNodes,
                getArea = me.areaField,
                totalArea = 0,
                offset = me.offset || 0,
                offsetSize = 0,
                titleHeight = me.titleHeight || 0,
                width = parentItem.width,
                height = Math.max(0, parentItem.height - titleHeight),
                horizontal = orn == 'horizontal',
                i, l, item, ratio, otherSize, size, dim, pos, pos2, posth, pos2th;

            //append the node to the items
            items.push(childItem);

            //get total area of the children
            for (i = 0, l = children.length; i < l; ++i) {
                totalArea += getArea(children[i]);
            }

            ratio = parentItem == childItem ? 1 : (getArea(childItem.storeItem) / totalArea);

            //define sizes for the items
            if (horizontal) {
                orn = 'vertical';
                otherSize = height;
                size = width * ratio;
                dim = 'height';
                pos = 'y';
                pos2 = 'x';
                posth = titleHeight;
                pos2th = 0;
            } else {
                orn = 'horizontal';
                otherSize = height * ratio;
                size = width;
                dim = 'width';
                pos = 'x';
                pos2 = 'y';
                posth = 0;
                pos2th = titleHeight;
            }

            //set child item size
            childItem.width = size;
            childItem.height = otherSize;

            //iterate over grandchildren to set new positions
            children = childItem.storeItem.childNodes;
            for (i = 0, l = children.length; i < l; ++i) {
                item = {};
                item[pos] = offsetSize + childItem[pos] + posth;
                item[pos2] = childItem[pos2] + pos2th;
                item.storeItem = children[i];
                me.computePositions(childItem, item, orn, items);
                offsetSize += item[dim];
            }
        }
    };

    Layout.Area = {

        compute: function (bounds) {
            var me = this,
                chart = me.getChart(),
                store = chart.substore || chart.getStore(),
                root = store.getRoot(),
                size = me.bbox,
                width = size.width,
                height = size.height,
                items = [], rootItem, coord,
                offset = me.offset,
                offsetWidth = width - offset,
                offsetHeight = height - offset;

            //set root position and dimensions
            rootItem = {
                x: 0,
                y: 0,
                width: width,
                height: height,
                storeItem: root
            };

            items.push(rootItem);

            coord = {
                top: me.titleHeight || 0,
                left: offset / 2,
                width: offsetWidth,
                height: offsetHeight - (me.titleHeight || 0)
            };

            me.computePositions(root, coord, items);

            return items;
        },

        computeDim: function (tail, initElem, w, coord, comp, items) {
            var me = this, l, c, newCoords;

            if (tail.length + initElem.length == 1) {
                l = tail.length == 1 ? tail : initElem;
                me.layoutLast(l, w, coord, items);
                return;
            }

            if (tail.length >= 2 && initElem.length == 0) {
                initElem = [tail.shift()];
            }

            if (tail.length == 0) {
                if (initElem.length > 0) {
                    me.layoutRow(initElem, w, coord, items);
                }
                return;
            }

            c = tail[0];
            if (comp.call(this, initElem, w) >= comp.call(this, [c].concat(initElem), w)) {
                me.computeDim(tail.slice(1), initElem.concat([c]), w, coord, comp, items);
            } else {
                newCoords = me.layoutRow(initElem, w, coord, items);
                me.computeDim(tail, [], newCoords.dim, newCoords, comp, items);
            }
        },

        worstAspectRatio: function (ch, w) {
            if (!ch || ch.length == 0) {
                return Number.MAX_VALUE;
            }

            var me = this,
                areaSum = 0,
                maxArea = 0,
                minArea = Number.MAX_VALUE,
                i = 0,
                l = ch.length,
                sqw = w * w,
                area, sqAreaSum;

            for (; i < l; i++) {
                area = ch[i]._area;
                areaSum += area;
                minArea = minArea < area ? minArea : area;
                maxArea = maxArea > area ? maxArea : area;
            }

            sqAreaSum = areaSum * areaSum;

            return Math.max(sqw * maxArea / sqAreaSum,
                sqAreaSum / (sqw * minArea));
        },

        avgAspectRatio: function (ch, w) {
            if (!ch || ch.length == 0) {
                return Number.MAX_VALUE;
            }

            var me = this,
                arSum = 0,
                i = 0,
                l = ch.length,
                area, h;

            for (; i < l; i++) {
                area = ch[i]._area;
                h = area / w;
                arSum += w > h ? w / h : h / w;
            }

            return arSum / l;
        },

        layoutLast: function (ch, w, coord, items) {
            var child = ch[0];
            Ext.apply(child, {
                x: coord.left,
                y: coord.top,
                width: coord.width,
                height: coord.height
            });

            items.push(child);

            return child;
        }
    };

    Layout.Squarified = Ext.apply({

        computePositions: function (node, coord, items) {
            var me = this,
                offset = me.offset || 0,
                titleHeight = me.titleHeight || 0,
                max = Math.max,
                ch = node.childNodes,
                chItems = [],
                i = 0,
                l = ch.length,
                width, height, x, y;

            if (coord.width >= coord.height) {
                me.orientation = 'horizontal';
            } else {
                me.orientation = 'vertical';
            }

            if (ch.length > 0) {

                //create a child items array
                for (i = 0; i < l; i++) {
                    chItems.push({
                        storeItem: ch[i]
                    });
                }

                me.processChildrenLayout(node, chItems, coord, items);

                for (i = 0; i < l; i++) {
                    chi = chItems[i];
                    x = chi.x;
                    y = chi.y;
                    height = max(chi.height - offset - titleHeight, 0);
                    width = max(chi.width - offset, 0);

                    coord = {
                        width: width,
                        height: height,
                        top: y + titleHeight,
                        left: x
                    };

                    me.computePositions(chi.storeItem, coord, items);
                }
            }
        },

        processChildrenLayout: function (par, ch, coord, items) {
            //compute children real areas
            var me = this,
                i = 0,
                l = ch.length,
                parentArea = coord.width * coord.height,
                totalChArea = 0,
                chArea = [],
                minimumSideValue, initElem, tail;

            for (; i < l; i++) {
                chArea[i] = parseFloat(me.areaField(ch[i].storeItem));
                totalChArea += chArea[i];
            }

            for (i = 0; i < l; i++) {
                ch[i]._area = parentArea * chArea[i] / totalChArea;
            }

            minimumSideValue = (me.orientation == 'horizontal') ? coord.height : coord.width;

            ch.sort(function (a, b) {
                var diff = b._area - a._area;
                return diff ? diff : (b.id == a.id ? 0 : (b.id < a.id ? 1 : -1));
            });

            initElem = [ch[0]];
            tail = ch.slice(1);

            me.squarify(tail, initElem, minimumSideValue, coord, items);
        },

        squarify: function (tail, initElem, w, coord, items) {
            this.computeDim(tail, initElem, w, coord, this.worstAspectRatio, items);
        },

        layoutRow: function (ch, w, coord, items) {
            var me = this;
            if (me.orientation == 'horizontal') {
                return me.layoutV(ch, w, coord, items);
            } else {
                return me.layoutH(ch, w, coord, items);
            }
        },

        layoutV: function (ch, w, coord, items) {
            var me = this,
                totalArea = 0,
                i = 0,
                l = ch.length,
                width, h, chi, top, ans;

            for (; i < l; i++) {
                totalArea += ch[i]._area;
            }

            width = (totalArea / w) || 0;
            top = 0;

            for (i = 0; i < l; i++) {
                chi = ch[i];
                h = (chi._area / width) || 0;
                Ext.apply(chi, {
                    x: coord.left,
                    y: coord.top + top,
                    width: width,
                    height: h
                });

                //Add the item to the treemap.
                items.push(chi);

                top += h;
            }

            ans = {
                height: coord.height,
                width: coord.width - width,
                top: coord.top,
                left: coord.left + width
            };

            //take minimum side value.
            ans.dim = Math.min(ans.width, ans.height);

            if (ans.dim != ans.height) {
                me.orientation = (me.orientation == 'horizontal') ? 'vertical' : 'horizontal';
            }

            return ans;
        },

        layoutH: function (ch, w, coord, items) {
            var me = this,
                totalArea = 0,
                i = 0,
                l = ch.length,
                top = coord.top,
                left = 0,
                height, chi, ans;

            for (; i < l; i++) {
                totalArea += ch[i]._area;
            }

            height = totalArea / w || 0;

            for (i = 0; i < l; i++) {
                chi = ch[i];
                w = (chi._area / height) || 0;
                Ext.apply(chi, {
                    x: coord.left + left,
                    y: top,
                    width: w,
                    height: height
                });

                //add items to be rendered
                items.push(chi);

                left += w;
            }

            ans = {
                height: coord.height - height,
                width: coord.width,
                top: coord.top + height,
                left: coord.left
            };

            ans.dim = Math.min(ans.width, ans.height);

            if (ans.dim != ans.width) {
                me.orientation = (me.orientation == 'horizontal') ? 'vertical' : 'horizontal';
            }

            return ans;
        }

    }, Layout.Area);


    Ext.define('Ext.chart.series.Treemap', {

        extend: 'Ext.chart.series.AbstractSpaceFilling',

        type: 'treemap',

        layout: 'squarify',

        orientation: 'horizontal',

        statics: {
            Layout: Layout
        },

        /**
         * @cfg {Object} style
         * Append styling properties to this object for it to override theme properties.
         */

        /**
         * @cfg {String} layout
         * The treemap layout to be used. Possible values are sliceanddice and squarified.
         */

        /**
         * @cfg {String} orientation
         * The orientation for the layout (only used in slice and dice layouts). Possible values are horizontal or vertical.
         */

        /**
         * @cfg {Number} offset
         * Margin between nodes in pixels.
         */

        /**
         * @cfg {String} rootName
         * A value for the root node name.
         */

        /**
         * @cfg {String} titleField
         * The field to be used to display text within each node's label.
         */

        /**
         * @cfg {String/Function} lengthField
         *  A function that returns a value relative to what amount of space the node should occupy in th main layout.
         */

        /**
         * @cfg {String/Function} colorField
         * A function that returns a color string given a node.
         */

        constructor: function (config) {
            this.callParent(arguments);

            var me = this,
                surface = me.getSurface(),
                layout;


            layout = me.layout.toLowerCase();

            //set treemap layout.
            if (layout == 'sliceanddice') {
                Ext.apply(me, Layout.SliceAndDice);
            } else if (layout == 'squarified') {
                Ext.apply(me, Layout.Squarified);
            }
        }
    });

})();
