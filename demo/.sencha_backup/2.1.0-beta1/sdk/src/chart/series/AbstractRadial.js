/**
 * @private
 *
 * This mixin contains the main layout operations for radial based hierarchy visualizations.
 */
Ext.define('Ext.chart.series.AbstractRadial', {
    compute: function () {
        var me = this,
            lengthFunc = me.createLevelDistanceFunc(),
            bbox = me.bbox,
            nodes;

        me.centerX = bbox.x + bbox.width / 2;
        me.centerY = bbox.y + bbox.height / 2;

        nodes = me.computeAngularWidths();
        me.computePositions(nodes, null, lengthFunc);

        return nodes;
    },

    computePositions: function (nodes, links, getLength) {
        var me = this,
            store = me.getChart().getStore(),
            root = store.getRoot(),
            rootItem = nodes[0],
            parent = me.parent,
            config = me.config,
            math = Math,
            PI = math.PI,
            cos = math.cos,
            sin = math.sin,
            centerX = me.centerX,
            centerY = me.centerY,
            getRecord = function (node) {
                return node.storeItem.attributes.record;
            },
            getChildren = function (node) {
                var i = 0,
                    l = nodes.length,
                    ch = [];

                for (; i < l; ++i) {
                    if (nodes[i].parent == node) {
                        ch.push(nodes[i]);
                    }
                }

                return ch;
            },
            dimField = typeof me.dimField == 'function' ? me.dimField
                : function (n) {
                return getRecord(n).get(me.dimField);
            };

        Ext.apply(rootItem, {
            span: PI * 2,
            angleSpan: {
                begin: 0,
                end: PI * 2
            }
        });

        (function iterate(node) {
            var ch = getChildren(node),
                i = 0,
                l = ch.length,
                maxDim = Number.MIN_VALUE,
                sortFn = function (a, b) { return b.dist - a.dist; },
                elem, angleSpan, angleInit, len,
                totalAngularWidths, subnodes,
                j, n, descendants, sib, dim,
                k, ls, child, angleProportion, theta;

            angleSpan = node.angleSpan.end - node.angleSpan.begin;
            angleInit = node.angleSpan.begin;
            len = getLength(node);

            totalAngularWidths = 0;
            subnodes = [];

            descendants = getChildren(node);

            for (j = 0, n = descendants.length; j < n; j++) {
                sib = descendants[j];
                totalAngularWidths += sib._treeAngularWidth;
                dim = dimField(sib);
                maxDim = dim > maxDim ? dim : maxDim;
                subnodes.push(sib);
            }

            //Maintain children order
            //Second constraint for <http://bailando.sims.berkeley.edu/papers/infovis01.htm>
            if (parent && parent.id == node.id && subnodes.length && subnodes[0].dist) {
                subnodes.sort(sortFn);
            }

            //Calculate nodes positions.
            for (k = 0, ls = subnodes.length; k < ls; k++) {
                child = subnodes[k];

                if (!child._flag) {
                    angleProportion = child._treeAngularWidth / totalAngularWidths * angleSpan;
                    theta = angleInit + angleProportion / 2;

                    Ext.apply(child, {
                        rho: len,
                        theta: theta,
                        x: cos(theta) * len + centerX,
                        y: sin(theta) * len + centerY,
                        span: angleProportion,
                        dimQuotient: dimField(child.dim) / maxDim,
                        angleSpan: {
                            begin: angleInit,
                            end: angleInit + angleProportion
                        }
                    });
                    angleInit += angleProportion;
                }
            }

            //call the function with children.
            for (k = 0, ls = subnodes.length; k < ls; k++) {
                iterate(subnodes[k]);
            }

        })(rootItem);
    },

    /*
     * Method: setAngularWidthForNodes
     *
     * Sets nodes angular widths.
     */
    setAngularWidthForNodes: function () {
        var me = this,
            store = me.getChart().getStore(),
            nodes = [],
            root = store.getRoot(),
            getRecord = function (node) {
                return node.storeItem.attributes.record;
            },
            dimField = typeof me.dimField == 'function' ? me.dimField
                : function (n) { geRecord(n).get(me.dimField); };

        (function iterate(node, parent, depth) {
            var item = {},
                ch = node.childNodes,
                l = ch.length,
                i = 0;

            Ext.apply(item, {
                id: nodes.length,
                storeItem: node,
                parent: parent,
                depth: depth
            });

            item._angularWidth = dimField(item);
            nodes.push(item);

            for (; i < l; i++) {
                iterate(ch[i], item, depth + 1);
            }

        })(root, null, 0);

        return nodes;
    },

    /**
     * Sets subtrees angular widths.
     */
    setSubtreesAngularWidth: function (nodes) {
        var me = this,
            i = 0,
            l = nodes.length;

        for (; i < l; i++) {
            me.setSubtreeAngularWidth(nodes[i], nodes);
        }
    },

    /**
     * Sets the angular width for a subtree.
     */
    setSubtreeAngularWidth: function (elem, nodes) {
        var me = this,
            nodeAW = elem._angularWidth,
            sumAW = 0,
            i = 0,
            l = nodes.length,
            ch = [];

        for (; i < l; i++) {
            if (nodes[i].parent == elem) {
                me.setSubtreeAngularWidth(nodes[i], nodes);
                sumAW += nodes[i]._treeAngularWidth;
            }
        }
        elem._treeAngularWidth = Math.max(nodeAW, sumAW);
    },

    /**
     * Computes nodes and subtrees angular widths.
     */
    computeAngularWidths: function () {
        var nodes = this.setAngularWidthForNodes();
        this.setSubtreesAngularWidth(nodes);
        return nodes;
    }
});

