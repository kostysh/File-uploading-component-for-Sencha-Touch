/**
 *
 */
Ext.define('Ext.chart.theme.Theme', {

    requires: ['Ext.ComponentQuery', 'Ext.chart.theme.Base'],

    uses: ['Ext.chart.theme.Style'],

    theme: 'Base',

    timestamp: 1,

    applyStyles: function (themeName) {
        //http://www.w3.org/TR/css3-selectors/#specificity.
        var me = this,
            root = {

                getRefItems: function () {
                    return [me];
                },

                isXType: function () {
                    return false;
                },

                initCls: function () {
                    return [];
                },

                getItemId: function () {
                    return '';
                }
            },
            themes = [Ext.chart.theme.Base.selectors.slice()],
            i = 0,
            n = 0,
            results = [],
            res, selector, style, rule, j, matches, lmatches, ln, l, configs;

        if (themeName || me.getTheme() != 'Base') {
            themes.push(Ext.chart.theme[themeName || me.getTheme()].selectors.slice());
        }

        var timestamp = me.timestamp++;

        for (ln = themes.length; n < ln; ++n) {
            configs = themes[n];
            l = configs.length;

            //sort by specificity
            configs.sort(function (a, b) {
                var sa = a.specificity,
                    sb = b.specificity;

                return sb[0] < sa[0] || (sb[0] == sa[0] && (sb[1] < sa[1]
                    || (sb[1] == sa[1] && sb[2] < sa[2])));
            });

            for (i = 0; i < l; ++i) {
                rule = configs[i];
                selector = rule.selector;
                style = rule.style;
                matches = Ext.ComponentQuery.query(selector, root);
                for (j = 0, lmatches = matches.length; j < lmatches; ++j) {
                    if (matches[j] instanceof Ext.chart.theme.Style) {
                        if (matches[j].$themeTimestamp !== timestamp) {
                            matches[j].$themeTimestamp = timestamp;
                            results.push(matches[j]);
                            matches[j].themeStyle.reset();
                        }
                        Ext.merge(matches[j].themeStyle, style);
                    } else {
                        if (matches[j].$themeTimestamp !== timestamp) {
                            matches[j].$themeTimestamp = timestamp;
                            results.push(matches[j]);
                            matches[j].themeStyle = {};
                            if (!matches[j].configStyle) {
                                matches[j].configStyle = matches[j].style;
                            }
                            matches[j].style = Ext.Object.chain(matches[j].themeStyle);
                            Ext.apply(matches[j].style, matches[j].configStyle);
                        }
                        matches[j].themeStyle = Ext.merge(matches[j].themeStyle || {}, style);
                    }
                }
            }
        }

        for (j = 0, lmatches = results.length; j < lmatches; ++j) {
            res = results[j];
            delete res.$themeTimestamp;
        }
    }
}, function () {

    //TODO(nico): I'm pretty sure this shouldn't be here.
    Ext.ComponentQuery.pseudos['nth-child'] = function (items, value) {
        var index = +value - 1;
        if (items[index]) {
            return [items[index]];
        }
        return [];
    };

    Ext.ComponentQuery.pseudos.highlight = function (items, value) {
        var i = 0,
            j = 0,
            l = items.length,
            ans = [],
            item, refItems, refItem, lRefItems;

        for (; i < l; ++i) {
            item = items[i];
            if (item.isXType && item.isXType('highlight')) {
                ans.push(item);
            }
            if (item.getRefItems) {
                refItems = item.getRefItems(true);
                for (j = 0, lRefItems = refItems.length; j < lRefItems; ++j) {
                    refItem = refItems[j];
                    if (refItem.isXType && refItem.isXType('highlight')) {
                        ans.push(refItem);
                    }
                }
            }

        }
        return ans;
    };
});
