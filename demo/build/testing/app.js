/**
 * @private
 */
Ext.define('Ext.event.ListenerStack', {

    currentOrder: 'current',

    length: 0,

    constructor: function() {
        this.listeners = {
            before: [],
            current: [],
            after: []
        };

        this.lateBindingMap = {};

        return this;
    },

    add: function(fn, scope, options, order) {
        var lateBindingMap = this.lateBindingMap,
            listeners = this.getAll(order),
            i = listeners.length,
            bindingMap, listener, id;

        if (typeof fn == 'string' && scope.isIdentifiable) {
            id = scope.getId();

            bindingMap = lateBindingMap[id];

            if (bindingMap) {
                if (bindingMap[fn]) {
                    return false;
                }
                else {
                    bindingMap[fn] = true;
                }
            }
            else {
                lateBindingMap[id] = bindingMap = {};
                bindingMap[fn] = true;
            }
        }
        else {
            if (i > 0) {
                while (i--) {
                    listener = listeners[i];

                    if (listener.fn === fn && listener.scope === scope) {
                        listener.options = options;
                        return false;
                    }
                }
            }
        }

        listener = this.create(fn, scope, options, order);

        if (options && options.prepend) {
            delete options.prepend;
            listeners.unshift(listener);
        }
        else {
            listeners.push(listener);
        }

        this.length++;

        return true;
    },

    getAt: function(index, order) {
        return this.getAll(order)[index];
    },

    getAll: function(order) {
        if (!order) {
            order = this.currentOrder;
        }

        return this.listeners[order];
    },

    count: function(order) {
        return this.getAll(order).length;
    },

    create: function(fn, scope, options, order) {
        return {
            stack: this,
            fn: fn,
            firingFn: false,
            boundFn: false,
            isLateBinding: typeof fn == 'string',
            scope: scope,
            options: options || {},
            order: order
        };
    },

    remove: function(fn, scope, order) {
        var listeners = this.getAll(order),
            i = listeners.length,
            isRemoved = false,
            lateBindingMap = this.lateBindingMap,
            listener, id;

        if (i > 0) {
            // Start from the end index, faster than looping from the
            // beginning for "single" listeners,
            // which are normally LIFO
            while (i--) {
                listener = listeners[i];

                if (listener.fn === fn && listener.scope === scope) {
                    listeners.splice(i, 1);
                    isRemoved = true;
                    this.length--;

                    if (typeof fn == 'string' && scope.isIdentifiable) {
                        id = scope.getId();

                        if (lateBindingMap[id] && lateBindingMap[id][fn]) {
                            delete lateBindingMap[id][fn];
                        }
                    }
                    break;
                }
            }
        }

        return isRemoved;
    }
});

/**
 * @private
 */
Ext.define('Ext.event.Controller', {

    isFiring: false,

    listenerStack: null,

    constructor: function(info) {
        this.firingListeners = [];
        this.firingArguments = [];

        this.setInfo(info);

        return this;
    },

    setInfo: function(info) {
        this.info = info;
    },

    getInfo: function() {
        return this.info;
    },

    setListenerStacks: function(listenerStacks) {
        this.listenerStacks = listenerStacks;
    },

    fire: function(args, action) {
        var listenerStacks = this.listenerStacks,
            firingListeners = this.firingListeners,
            firingArguments = this.firingArguments,
            push = firingListeners.push,
            ln = listenerStacks.length,
            listeners, beforeListeners, currentListeners, afterListeners,
            isActionBefore = false,
            isActionAfter = false,
            i;

        firingListeners.length = 0;

        if (action) {
            if (action.order !== 'after') {
                isActionBefore = true;
            }
            else {
                isActionAfter = true;
            }
        }

        if (ln === 1) {
            listeners = listenerStacks[0].listeners;
            beforeListeners = listeners.before;
            currentListeners = listeners.current;
            afterListeners = listeners.after;

            if (beforeListeners.length > 0) {
                push.apply(firingListeners, beforeListeners);
            }

            if (isActionBefore) {
                push.call(firingListeners, action);
            }

            if (currentListeners.length > 0) {
                push.apply(firingListeners, currentListeners);
            }

            if (isActionAfter) {
                push.call(firingListeners, action);
            }

            if (afterListeners.length > 0) {
                push.apply(firingListeners, afterListeners);
            }
        }
        else {
            for (i = 0; i < ln; i++) {
                beforeListeners = listenerStacks[i].listeners.before;
                if (beforeListeners.length > 0) {
                    push.apply(firingListeners, beforeListeners);
                }
            }

            if (isActionBefore) {
                push.call(firingListeners, action);
            }

            for (i = 0; i < ln; i++) {
                currentListeners = listenerStacks[i].listeners.current;
                if (currentListeners.length > 0) {
                    push.apply(firingListeners, currentListeners);
                }
            }

            if (isActionAfter) {
                push.call(firingListeners, action);
            }

            for (i = 0; i < ln; i++) {
                afterListeners = listenerStacks[i].listeners.after;
                if (afterListeners.length > 0) {
                    push.apply(firingListeners, afterListeners);
                }
            }
        }

        if (firingListeners.length === 0) {
            return this;
        }

        if (!args) {
            args = [];
        }

        firingArguments.length = 0;
        firingArguments.push.apply(firingArguments, args);

        // Backwards compatibility
        firingArguments.push(null, this);

        this.doFire();

        return this;
    },

    doFire: function() {
        var firingListeners = this.firingListeners,
            firingArguments = this.firingArguments,
            optionsArgumentIndex = firingArguments.length - 2,
            i, ln, listener, options, fn, firingFn,
            boundFn, isLateBinding, scope, args, result;

        this.isPausing = false;
        this.isPaused = false;
        this.isStopped = false;
        this.isFiring = true;

        for (i = 0,ln = firingListeners.length; i < ln; i++) {
            listener = firingListeners[i];
            options = listener.options;
            fn = listener.fn;
            firingFn = listener.firingFn;
            boundFn = listener.boundFn;
            isLateBinding = listener.isLateBinding;
            scope = listener.scope;

            // Re-bind the callback if it has changed since the last time it's bound (overridden)
            if (isLateBinding && boundFn && boundFn !== scope[fn]) {
                boundFn = false;
                firingFn = false;
            }

            if (!boundFn) {
                if (isLateBinding) {
                    boundFn = scope[fn];

                    if (!boundFn) {
                        continue;
                    }
                }
                else {
                    boundFn = fn;
                }

                listener.boundFn = boundFn;
            }

            if (!firingFn) {
                firingFn = boundFn;

                if (options.buffer) {
                    firingFn = Ext.Function.createBuffered(firingFn, options.buffer, scope);
                }

                if (options.delay) {
                    firingFn = Ext.Function.createDelayed(firingFn, options.delay, scope);
                }

                listener.firingFn = firingFn;
            }

            firingArguments[optionsArgumentIndex] = options;

            args = firingArguments;

            if (options.args) {
                args = options.args.concat(args);
            }

            if (options.single === true) {
                listener.stack.remove(fn, scope, listener.order);
            }

            result = firingFn.apply(scope, args);

            if (result === false) {
                this.stop();
            }

            if (this.isStopped) {
                break;
            }

            if (this.isPausing) {
                this.isPaused = true;
                firingListeners.splice(0, i + 1);
                return;
            }
        }

        this.isFiring = false;
        this.listenerStacks = null;
        firingListeners.length = 0;
        firingArguments.length = 0;
        this.connectingController = null;
    },

    connect: function(controller) {
        this.connectingController = controller;
    },

    resume: function() {
        var connectingController = this.connectingController;

        this.isPausing = false;

        if (this.isPaused && this.firingListeners.length > 0) {
            this.isPaused = false;
            this.doFire();
        }

        if (connectingController) {
            connectingController.resume();
        }

        return this;
    },

    isInterrupted: function() {
        return this.isStopped || this.isPaused;
    },

    stop: function() {
        var connectingController = this.connectingController;

        this.isStopped = true;

        if (connectingController) {
            this.connectingController = null;
            connectingController.stop();
        }

        this.isFiring = false;

        this.listenerStacks = null;

        return this;
    },

    pause: function() {
        var connectingController = this.connectingController;

        this.isPausing = true;

        if (connectingController) {
            connectingController.pause();
        }

        return this;
    }
});

/**
 * @private
 */
Ext.define('Ext.event.publisher.Publisher', {
    targetType: '',

    idSelectorRegex: /^#([\w\-]+)$/i,

    constructor: function() {
        var handledEvents = this.handledEvents,
            handledEventsMap,
            i, ln, event;

        handledEventsMap = this.handledEventsMap = {};

        for (i = 0,ln = handledEvents.length; i < ln; i++) {
            event = handledEvents[i];

            handledEventsMap[event] = true;
        }

        this.subscribers = {};

        return this;
    },

    handles: function(eventName) {
        var map = this.handledEventsMap;

        return !!map[eventName] || !!map['*'] || eventName === '*';
    },

    getHandledEvents: function() {
        return this.handledEvents;
    },

    setDispatcher: function(dispatcher) {
        this.dispatcher = dispatcher;
    },

    subscribe: function() {
        return false;
    },

    unsubscribe: function() {
        return false;
    },

    unsubscribeAll: function() {
        delete this.subscribers;
        this.subscribers = {};

        return this;
    },

    notify: function() {
        return false;
    },

    getTargetType: function() {
        return this.targetType;
    },

    dispatch: function(target, eventName, args) {
        this.dispatcher.doDispatchEvent(this.targetType, target, eventName, args);
    }
});

// Using @mixins to include all members of Ext.event.Touch
// into here to keep documentation simpler
/**
 * @mixins Ext.event.Touch
 *
 * Just as {@link Ext.dom.Element} wraps around a native DOM node, {@link Ext.event.Event} wraps the browser's native
 * event-object normalizing cross-browser differences such as mechanisms to stop event-propagation along with a method
 * to prevent default actions from taking place.
 *
 * Here is a simple example of how you use it:
 *
 *     @example preview
 *     Ext.Viewport.add({
 *         layout: 'fit',
 *         items: [
 *             {
 *                 docked: 'top',
 *                 xtype: 'toolbar',
 *                 title: 'Ext.event.Event example!'
 *             },
 *             {
 *                 id: 'logger',
 *                 styleHtmlContent: true,
 *                 html: 'Tap somewhere!',
 *                 padding: 5
 *             }
 *         ]
 *     });
 *
 *     Ext.Viewport.element.on({
 *         tap: function(e, node) {
 *             var string = '';
 *
 *             string += 'You tapped at: <strong>{ x: ' + e.pageX + ', y: ' + e.pageY + ' }</strong> <i>(e.pageX & e.pageY)</i>';
 *             string += '<hr />';
 *             string += 'The HTMLElement you tapped has the className of: <strong>' + e.target.className + '</strong> <i>(e.target)</i>';
 *             string += '<hr />';
 *             string += 'The HTMLElement which has the listener has a className of: <strong>' + e.getTarget().className + '</strong> <i>(e.getTarget())</i>';
 *
 *             Ext.getCmp('logger').setHtml(string);
 *         }
 *     });
 *
 * ## Recognisers
 *
 * Sencha Touch includes a bunch of default event recognisers to know when a user taps, swipes, etc.
 *
 * For a full list of default recognisers, and more information, please view the {@link Ext.event.recognizer.Recognizer} documentation.
 */
Ext.define('Ext.event.Event', {
    alternateClassName: 'Ext.EventObject',
    isStopped: false,

    set: function(name, value) {
        if (arguments.length === 1 && typeof name != 'string') {
            var info = name;

            for (name in info) {
                if (info.hasOwnProperty(name)) {
                    this[name] = info[name];
                }
            }
        }
        else {
            this[name] = info[name];
        }
    },

    /**
     * Stop the event (preventDefault and stopPropagation)
     */
    stopEvent: function() {
        return this.stopPropagation();
    },

    /**
     * Cancels bubbling of the event.
     */
    stopPropagation: function() {
        this.isStopped = true;

        return this;
    }
});

/**
 * @private
 */
Ext.define('Ext.event.Dispatcher', {

    requires: [
        'Ext.event.ListenerStack',
        'Ext.event.Controller'
    ],

    statics: {
        getInstance: function() {
            if (!this.instance) {
                this.instance = new this();
            }

            return this.instance;
        },

        setInstance: function(instance) {
            this.instance = instance;

            return this;
        }
    },

    config: {
        publishers: {}
    },

    wildcard: '*',

    constructor: function(config) {
        this.listenerStacks = {};

        this.activePublishers = {};

        this.publishersCache = {};

        this.noActivePublishers = [];

        this.controller = null;

        this.initConfig(config);

        return this;
    },

    getListenerStack: function(targetType, target, eventName, createIfNotExist) {
        var listenerStacks = this.listenerStacks,
            map = listenerStacks[targetType],
            listenerStack;

        createIfNotExist = Boolean(createIfNotExist);

        if (!map) {
            if (createIfNotExist) {
                listenerStacks[targetType] = map = {};
            }
            else {
                return null;
            }
        }

        map = map[target];

        if (!map) {
            if (createIfNotExist) {
                listenerStacks[targetType][target] = map = {};
            }
            else {
                return null;
            }
        }

        listenerStack = map[eventName];

        if (!listenerStack) {
            if (createIfNotExist) {
                map[eventName] = listenerStack = new Ext.event.ListenerStack();
            }
            else {
                return null;
            }
        }

        return listenerStack;
    },

    getController: function(targetType, target, eventName, connectedController) {
        var controller = this.controller,
            info = {
                targetType: targetType,
                target: target,
                eventName: eventName
            };

        if (!controller) {
            this.controller = controller = new Ext.event.Controller();
        }

        if (controller.isFiring) {
            controller = new Ext.event.Controller();
        }

        controller.setInfo(info);

        if (connectedController && controller !== connectedController) {
            controller.connect(connectedController);
        }

        return controller;
    },

    applyPublishers: function(publishers) {
        var i, publisher;

        this.publishersCache = {};

        for (i in publishers) {
            if (publishers.hasOwnProperty(i)) {
                publisher = publishers[i];

                this.registerPublisher(publisher);
            }
        }

        return publishers;
    },

    registerPublisher: function(publisher) {
        var activePublishers = this.activePublishers,
            targetType = publisher.getTargetType(),
            publishers = activePublishers[targetType];

        if (!publishers) {
            activePublishers[targetType] = publishers = [];
        }

        publishers.push(publisher);

        publisher.setDispatcher(this);

        return this;
    },

    getCachedActivePublishers: function(targetType, eventName) {
        var cache = this.publishersCache,
            publishers;

        if ((publishers = cache[targetType]) && (publishers = publishers[eventName])) {
            return publishers;
        }

        return null;
    },

    cacheActivePublishers: function(targetType, eventName, publishers) {
        var cache = this.publishersCache;

        if (!cache[targetType]) {
            cache[targetType] = {};
        }

        cache[targetType][eventName] = publishers;

        return publishers;
    },

    getActivePublishers: function(targetType, eventName) {
        var publishers, activePublishers,
            i, ln, publisher;

        if ((publishers = this.getCachedActivePublishers(targetType, eventName))) {
            return publishers;
        }

        activePublishers = this.activePublishers[targetType];

        if (activePublishers) {
            publishers = [];

            for (i = 0,ln = activePublishers.length; i < ln; i++) {
                publisher = activePublishers[i];

                if (publisher.handles(eventName)) {
                    publishers.push(publisher);
                }
            }
        }
        else {
            publishers = this.noActivePublishers;
        }

        return this.cacheActivePublishers(targetType, eventName, publishers);
    },

    hasListener: function(targetType, target, eventName) {
        var listenerStack = this.getListenerStack(targetType, target, eventName);

        if (listenerStack) {
            return listenerStack.count() > 0;
        }

        return false;
    },

    addListener: function(targetType, target, eventName) {
        var publishers = this.getActivePublishers(targetType, eventName),
            ln = publishers.length,
            i;

        if (ln > 0) {
            for (i = 0; i < ln; i++) {
                publishers[i].subscribe(target, eventName);
            }
        }

        return this.doAddListener.apply(this, arguments);
    },

    doAddListener: function(targetType, target, eventName, fn, scope, options, order) {
        var listenerStack = this.getListenerStack(targetType, target, eventName, true);

        return listenerStack.add(fn, scope, options, order);
    },

    removeListener: function(targetType, target, eventName) {
        var publishers = this.getActivePublishers(targetType, eventName),
            ln = publishers.length,
            i;

        if (ln > 0) {
            for (i = 0; i < ln; i++) {
                publishers[i].unsubscribe(target, eventName);
            }
        }

        return this.doRemoveListener.apply(this, arguments);
    },

    doRemoveListener: function(targetType, target, eventName, fn, scope, order) {
        var listenerStack = this.getListenerStack(targetType, target, eventName);

        if (listenerStack === null) {
            return false;
        }

        return listenerStack.remove(fn, scope, order);
    },

    clearListeners: function(targetType, target, eventName) {
        var listenerStacks = this.listenerStacks,
            ln = arguments.length,
            stacks, publishers, i, publisherGroup;

        if (ln === 3) {
            if (listenerStacks[targetType] && listenerStacks[targetType][target]) {
                this.removeListener(targetType, target, eventName);
                delete listenerStacks[targetType][target][eventName];
            }
        }
        else if (ln === 2) {
            if (listenerStacks[targetType]) {
                stacks = listenerStacks[targetType][target];

                if (stacks) {
                    for (eventName in stacks) {
                        if (stacks.hasOwnProperty(eventName)) {
                            publishers = this.getActivePublishers(targetType, eventName);

                            for (i = 0,ln = publishers.length; i < ln; i++) {
                                publishers[i].unsubscribe(target, eventName, true);
                            }
                        }
                    }

                    delete listenerStacks[targetType][target];
                }
            }
        }
        else if (ln === 1) {
            publishers = this.activePublishers[targetType];

            for (i = 0,ln = publishers.length; i < ln; i++) {
                publishers[i].unsubscribeAll();
            }

            delete listenerStacks[targetType];
        }
        else {
            publishers = this.activePublishers;

            for (targetType in publishers) {
                if (publishers.hasOwnProperty(targetType)) {
                    publisherGroup = publishers[targetType];

                    for (i = 0,ln = publisherGroup.length; i < ln; i++) {
                        publisherGroup[i].unsubscribeAll();
                    }
                }
            }

            delete this.listenerStacks;
            this.listenerStacks = {};
        }

        return this;
    },

    dispatchEvent: function(targetType, target, eventName) {
        var publishers = this.getActivePublishers(targetType, eventName),
            ln = publishers.length,
            i;

        if (ln > 0) {
            for (i = 0; i < ln; i++) {
                publishers[i].notify(target, eventName);
            }
        }

        return this.doDispatchEvent.apply(this, arguments);
    },

    doDispatchEvent: function(targetType, target, eventName, args, action, connectedController) {
        var listenerStack = this.getListenerStack(targetType, target, eventName),
            wildcardStacks = this.getWildcardListenerStacks(targetType, target, eventName),
            controller;

        if ((listenerStack === null || listenerStack.length == 0)) {
            if (wildcardStacks.length == 0 && !action) {
                return;
            }
        }
        else {
            wildcardStacks.push(listenerStack);
        }

        controller = this.getController(targetType, target, eventName, connectedController);
        controller.setListenerStacks(wildcardStacks);
        controller.fire(args, action);

        return !controller.isInterrupted();
    },

    getWildcardListenerStacks: function(targetType, target, eventName) {
        var stacks = [],
            wildcard = this.wildcard,
            isEventNameNotWildcard = eventName !== wildcard,
            isTargetNotWildcard = target !== wildcard,
            stack;

        if (isEventNameNotWildcard && (stack = this.getListenerStack(targetType, target, wildcard))) {
            stacks.push(stack);
        }

        if (isTargetNotWildcard && (stack = this.getListenerStack(targetType, wildcard, eventName))) {
            stacks.push(stack);
        }

        return stacks;
    }
});

/**
 * @private
 * @extends Object
 * DOM event. This class really extends Ext.event.Event, but for documentation
 * purposes it's members are listed inside Ext.event.Event.
 */
Ext.define('Ext.event.Dom', {
    extend: 'Ext.event.Event',

    constructor: function(event) {
        var target = event.target,
            touches;

        if (target && target.nodeType !== 1) {
            target = target.parentNode;
        }
        touches = event.changedTouches;
        if (touches) {
            touches = touches[0];
            this.pageX = touches.pageX;
            this.pageY = touches.pageY;
        }
        else {
            this.pageX = event.pageX;
            this.pageY = event.pageY;
        }

        this.browserEvent = this.event = event;
        this.target = this.delegatedTarget = target;
        this.type = event.type;

        this.timeStamp = this.time = event.timeStamp;

        if (typeof this.time != 'number') {
            this.time = new Date(this.time).getTime();
        }

        return this;
    },

    /**
     * @property {Number} distance
     * The distance of the event.
     *
     * **This is only available when the event type is `swipe` and `pinch`**
     */

    /**
     * @property {HTMLElement} target
     * The target HTMLElement for this event. For example; if you are listening to a tap event and you tap on a `<div>` element,
     * this will return that `<div>` element.
     */

    /**
     * @property {Number} pageX The browsers x coordinate of the event.
     */

    /**
     * @property {Number} pageY The browsers y coordinate of the event.
     */

    stopEvent: function() {
        this.preventDefault();

        return this.callParent();
    },

    /**
     * Prevents the browsers default handling of the event.
     */
    preventDefault: function() {
        this.browserEvent.preventDefault();
    },

    /**
     * Gets the x coordinate of the event.
     * @deprecated 2.0 Please use {@link #pageX} property directly.
     */
    getPageX: function() {
        return this.browserEvent.pageX;
    },

    /**
     * Gets the y coordinate of the event.
     * @deprecated 2.0 Please use {@link #pageX} property directly.
     */
    getPageY: function() {
        return this.browserEvent.pageY;
    },

    /**
     * Gets the X and Y coordinates of the event.
     * @deprecated 2.0 Please use the {@link #pageX} and {@link #pageY} properties directly.
     */
    getXY: function() {
        if (!this.xy) {
            this.xy = [this.getPageX(), this.getPageY()];
        }

        return this.xy;
    },

    /**
     * Gets the target for the event. Unlike {@link #target}, this returns the main element for your event. So if you are
     * listening to a tap event on Ext.Viewport.element, and you tap on an inner element of Ext.Viewport.element, this will
     * return Ext.Viewport.element.
     *
     * If you want the element you tapped on, then use {@link #target}.
     *
     * @param {String} selector (optional) A simple selector to filter the target or look for an ancestor of the target
     * @param {Number/Mixed} maxDepth (optional) The max depth to
     search as a number or element (defaults to 10 || document.body)
     * @param {Boolean} returnEl (optional) True to return a Ext.Element object instead of DOM node
     * @return {HTMLElement}
     */
    getTarget: function(selector, maxDepth, returnEl) {
        if (arguments.length === 0) {
            return this.delegatedTarget;
        }

        return selector ? Ext.fly(this.target).findParent(selector, maxDepth, returnEl) : (returnEl ? Ext.get(this.target) : this.target);
    },

    /**
     * Returns the time of the event.
     * @return {Date}
     */
    getTime: function() {
        return this.time;
    },

    setDelegatedTarget: function(target) {
        this.delegatedTarget = target;
    },

    makeUnpreventable: function() {
        this.browserEvent.preventDefault = Ext.emptyFn;
    }
});

/**
 * @private
 */
Ext.define('Ext.event.publisher.Dom', {
    extend: 'Ext.event.publisher.Publisher',

    requires: [
        'Ext.env.Browser',
        'Ext.Element',
        'Ext.event.Dom'
    ],

    targetType: 'element',

    idOrClassSelectorRegex: /^([#|\.])([\w\-]+)$/,

    handledEvents: ['click', 'focus', 'blur',
                    'mousemove', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
                    'keyup', 'keydown', 'keypress', 'submit',
                    'transitionend', 'animationstart', 'animationend'],

    classNameSplitRegex: /\s+/,

    SELECTOR_ALL: '*',

    constructor: function() {
        var eventNames = this.getHandledEvents(),
            eventNameMap = {},
            i, ln, eventName, vendorEventName;

        this.doBubbleEventsMap = {
            'click': true,
            'submit': true,
            'mousedown': true,
            'mousemove': true,
            'mouseup': true,
            'mouseover': true,
            'mouseout': true,
            'transitionend': true
        };

        this.onEvent = Ext.Function.bind(this.onEvent, this);

        for (i = 0,ln = eventNames.length; i < ln; i++) {
            eventName = eventNames[i];
            vendorEventName = this.getVendorEventName(eventName);
            eventNameMap[vendorEventName] = eventName;

            this.attachListener(vendorEventName);
        }

        this.eventNameMap = eventNameMap;

        return this.callParent();
    },

    getSubscribers: function(eventName) {
        var subscribers = this.subscribers,
            eventSubscribers = subscribers[eventName];

        if (!eventSubscribers) {
            eventSubscribers = subscribers[eventName] = {
                id: {
                    $length: 0
                },
                className: {
                    $length: 0
                },
                selector: [],
                all: 0,
                $length: 0
            }
        }

        return eventSubscribers;
    },

    getVendorEventName: function(eventName) {
        if (eventName === 'transitionend') {
            eventName = Ext.browser.getVendorProperyName('transitionEnd');
        }
        else if (eventName === 'animationstart') {
            eventName = Ext.browser.getVendorProperyName('animationStart');
        }
        else if (eventName === 'animationend') {
            eventName = Ext.browser.getVendorProperyName('animationEnd');
        }

        return eventName;
    },

    attachListener: function(eventName) {
        document.addEventListener(eventName, this.onEvent, !this.doesEventBubble(eventName));

        return this;
    },

    removeListener: function(eventName) {
        document.removeEventListener(eventName, this.onEvent, !this.doesEventBubble(eventName));

        return this;
    },

    doesEventBubble: function(eventName) {
        return !!this.doBubbleEventsMap[eventName];
    },

    subscribe: function(target, eventName) {
        if (!this.handles(eventName)) {
            return false;
        }

        var idOrClassSelectorMatch = target.match(this.idOrClassSelectorRegex),
            subscribers = this.getSubscribers(eventName),
            idSubscribers = subscribers.id,
            classNameSubscribers = subscribers.className,
            selectorSubscribers = subscribers.selector,
            type, value;

        if (idOrClassSelectorMatch !== null) {
            type = idOrClassSelectorMatch[1];
            value = idOrClassSelectorMatch[2];

            if (type === '#') {
                if (idSubscribers.hasOwnProperty(value)) {
                    idSubscribers[value]++;
                    return true;
                }

                idSubscribers[value] = 1;
                idSubscribers.$length++;
            }
            else {
                if (classNameSubscribers.hasOwnProperty(value)) {
                    classNameSubscribers[value]++;
                    return true;
                }

                classNameSubscribers[value] = 1;
                classNameSubscribers.$length++;
            }
        }
        else {
            if (target === this.SELECTOR_ALL) {
                subscribers.all++;
            }
            else {
                if (selectorSubscribers.hasOwnProperty(target)) {
                    selectorSubscribers[target]++;
                    return true;
                }

                selectorSubscribers[target] = 1;
                selectorSubscribers.push(target);
            }
        }

        subscribers.$length++;

        return true;
    },

    unsubscribe: function(target, eventName, all) {
        if (!this.handles(eventName)) {
            return false;
        }

        var idOrClassSelectorMatch = target.match(this.idOrClassSelectorRegex),
            subscribers = this.getSubscribers(eventName),
            idSubscribers = subscribers.id,
            classNameSubscribers = subscribers.className,
            selectorSubscribers = subscribers.selector,
            type, value;

        all = Boolean(all);

        if (idOrClassSelectorMatch !== null) {
            type = idOrClassSelectorMatch[1];
            value = idOrClassSelectorMatch[2];

            if (type === '#') {
                if (!idSubscribers.hasOwnProperty(value) || (!all && --idSubscribers[value] > 0)) {
                    return true;
                }

                delete idSubscribers[value];
                idSubscribers.$length--;
            }
            else {
                if (!classNameSubscribers.hasOwnProperty(value) || (!all && --classNameSubscribers[value] > 0)) {
                    return true;
                }

                delete classNameSubscribers[value];
                classNameSubscribers.$length--;
            }
        }
        else {
            if (target === this.SELECTOR_ALL) {
                if (all) {
                    subscribers.all = 0;
                }
                else {
                    subscribers.all--;
                }
            }
            else {
                if (!selectorSubscribers.hasOwnProperty(target) || (!all && --selectorSubscribers[target] > 0)) {
                    return true;
                }

                delete selectorSubscribers[target];
                Ext.Array.remove(selectorSubscribers, target);
            }
        }

        subscribers.$length--;

        return true;
    },

    getElementTarget: function(target) {
        if (target.nodeType !== 1) {
            target = target.parentNode;

            if (!target || target.nodeType !== 1) {
                return null;
            }
        }

        return target;
    },

    getBubblingTargets: function(target) {
        var targets = [];

        if (!target) {
            return targets;
        }

        do {
            targets[targets.length] = target;

            target = target.parentNode;
        } while (target && target.nodeType === 1);

        return targets;
    },

    dispatch: function(target, eventName, args) {
        args.push(args[0].target);
        this.callParent(arguments);
    },

    publish: function(eventName, targets, event) {
        var subscribers = this.getSubscribers(eventName),
            wildcardSubscribers;

        if (subscribers.$length === 0 || !this.doPublish(subscribers, eventName, targets, event)) {
            wildcardSubscribers = this.getSubscribers('*');

            if (wildcardSubscribers.$length > 0) {
                this.doPublish(wildcardSubscribers, eventName, targets, event);
            }
        }

        return this;
    },

    doPublish: function(subscribers, eventName, targets, event) {
        var idSubscribers = subscribers.id,
            classNameSubscribers = subscribers.className,
            selectorSubscribers = subscribers.selector,
            hasIdSubscribers = idSubscribers.$length > 0,
            hasClassNameSubscribers = classNameSubscribers.$length > 0,
            hasSelectorSubscribers = selectorSubscribers.length > 0,
            hasAllSubscribers = subscribers.all > 0,
            isClassNameHandled = {},
            args = [event],
            hasDispatched = false,
            classNameSplitRegex = this.classNameSplitRegex,
            i, ln, j, subLn, target, id, className, classNames, selector;

        for (i = 0,ln = targets.length; i < ln; i++) {
            target = targets[i];
            event.setDelegatedTarget(target);

            if (hasIdSubscribers) {
                id = target.id;

                if (id) {
                    if (idSubscribers.hasOwnProperty(id)) {
                        hasDispatched = true;
                        this.dispatch('#' + id, eventName, args);
                    }
                }
            }

            if (hasClassNameSubscribers) {
                className = target.className;

                if (className) {
                    classNames = className.split(classNameSplitRegex);

                    for (j = 0,subLn = classNames.length; j < subLn; j++) {
                        className = classNames[j];

                        if (!isClassNameHandled[className]) {
                            isClassNameHandled[className] = true;

                            if (classNameSubscribers.hasOwnProperty(className)) {
                                hasDispatched = true;
                                this.dispatch('.' + className, eventName, args);
                            }
                        }
                    }
                }
            }

            // Stop propagation
            if (event.isStopped) {
                return hasDispatched;
            }
        }

        if (hasAllSubscribers && !hasDispatched) {
            event.setDelegatedTarget(event.browserEvent.target);
            hasDispatched = true;
            this.dispatch(this.SELECTOR_ALL, eventName, args);
            if (event.isStopped) {
                return hasDispatched;
            }
        }

        if (hasSelectorSubscribers) {
            for (j = 0,subLn = targets.length; j < subLn; j++) {
                target = targets[j];

                for (i = 0,ln = selectorSubscribers.length; i < ln; i++) {
                    selector = selectorSubscribers[i];

                    if (this.matchesSelector(target, selector)) {
                        event.setDelegatedTarget(target);
                        hasDispatched = true;
                        this.dispatch(selector, eventName, args);
                    }

                    if (event.isStopped) {
                        return hasDispatched;
                    }
                }
            }
        }

        return hasDispatched;
    },

    matchesSelector: function(element, selector) {
        if ('webkitMatchesSelector' in element) {
            return element.webkitMatchesSelector(selector);
        }

        return Ext.DomQuery.is(element, selector);
    },

    onEvent: function(e) {
        var eventName = this.eventNameMap[e.type];

        // Set the current frame start time to be the timestamp of the event.
        Ext.frameStartTime = event.timeStamp;

        if (!eventName || this.getSubscribersCount(eventName) === 0) {
            return;
        }

        var target = this.getElementTarget(e.target),
            targets;

        if (!target) {
            return;
        }

        if (this.doesEventBubble(eventName)) {
            targets = this.getBubblingTargets(target);
        }
        else {
            targets = [target];
        }

        this.publish(eventName, targets, new Ext.event.Dom(e));
    },


    getSubscribersCount: function(eventName) {
        if (!this.handles(eventName)) {
            return 0;
        }

        return this.getSubscribers(eventName).$length + this.getSubscribers('*').$length;
    }

});

/**
 * Represents a 2D point with x and y properties, useful for comparison and instantiation
 * from an event:
 *
 *     var point = Ext.util.Point.fromEvent(e);
 *
 */
Ext.define('Ext.util.Point', {

    radianToDegreeConstant: 180 / Math.PI,

    statics: {
        /**
         * Returns a new instance of Ext.util.Point based on the pageX / pageY values of the given event
         * @static
         * @param {Event} e The event
         * @return Ext.util.Point
         */
        fromEvent: function(e) {
            var changedTouches = e.changedTouches,
                touch = (changedTouches && changedTouches.length > 0) ? changedTouches[0] : e;

            return this.fromTouch(touch);
        },

        /**
         * Returns a new instance of Ext.util.Point based on the pageX / pageY values of the given touch
         * @static
         * @param {Event} touch
         * @return Ext.util.Point
         */
        fromTouch: function(touch) {
            return new this(touch.pageX, touch.pageY);
        },

        /**
         * Returns a new point from an object that has 'x' and 'y' properties, if that object is not an instance
         * of Ext.util.Point. Otherwise, returns the given point itself.
         * @param object
         */
        from: function(object) {
            if (!object) {
                return new this(0, 0);
            }

            if (!(object instanceof this)) {
                return new this(object.x, object.y);
            }

            return object;
        }
    },

    /**
     * Creates point on 2D plane.
     * @param {Number} [x=0] X coordinate.
     * @param {Number} [y=0] Y coordinate.
     */
    constructor: function(x, y) {
        if (typeof x == 'undefined') {
            x = 0;
        }

        if (typeof y == 'undefined') {
            y = 0;
        }

        this.x = x;
        this.y = y;

        return this;
    },

    /**
     * Copy a new instance of this point
     * @return {Ext.util.Point} the new point
     */
    clone: function() {
        return new this.self(this.x, this.y);
    },

    /**
     * Clones this Point.
     * @deprecated 2.0.0 Please use {@link #clone} instead
     */
    copy: function() {
        return this.clone.apply(this, arguments);
    },

    /**
     * Copy the x and y values of another point / object to this point itself
     * @param {Ext.util.Point/Object} point
     * @return {Ext.util.Point} this This point
     */
    copyFrom: function(point) {
        this.x = point.x;
        this.y = point.y;

        return this;
    },

    /**
     * Returns a human-eye-friendly string that represents this point,
     * useful for debugging.
     * @return {String} For example `Point[12,8]`
     */
    toString: function() {
        return "Point[" + this.x + "," + this.y + "]";
    },

    /**
     * Compare this point and another point
     * @param {Ext.util.Point/Object} The point to compare with, either an instance
     * of Ext.util.Point or an object with x and y properties
     * @return {Boolean} Returns whether they are equivalent
     */
    equals: function(point) {
        return (this.x === point.x && this.y === point.y);
    },

    /**
     * Whether the given point is not away from this point within the given threshold amount
     * @param {Ext.util.Point/Object} The point to check with, either an instance
     * of Ext.util.Point or an object with x and y properties
     * @param {Object/Number} threshold Can be either an object with x and y properties or a number
     * @return {Boolean}
     */
    isCloseTo: function(point, threshold) {
        if (typeof threshold == 'number') {
            threshold = {x: threshold};
            threshold.y = threshold.x;
        }

        var x = point.x,
            y = point.y,
            thresholdX = threshold.x,
            thresholdY = threshold.y;

        return (this.x <= x + thresholdX && this.x >= x - thresholdX &&
                this.y <= y + thresholdY && this.y >= y - thresholdY);
    },

    /**
     * Returns true if this point is close to another one.
     * @deprecated 2.0.0 Please use {@link #isCloseTo} instead
     */
    isWithin: function() {
        return this.isCloseTo.apply(this, arguments);
    },

    /**
     * Translate this point by the given amounts
     * @param {Number} x Amount to translate in the x-axis
     * @param {Number} y Amount to translate in the y-axis
     * @return {Boolean}
     */
    translate: function(x, y) {
        this.x += x;
        this.y += y;

        return this;
    },

    /**
     * Compare this point with another point when the x and y values of both points are rounded. E.g:
     * [100.3,199.8] will equals to [100, 200]
     * @param {Ext.util.Point/Object} The point to compare with, either an instance
     * of Ext.util.Point or an object with x and y properties
     * @return {Boolean}
     */
    roundedEquals: function(point) {
        return (Math.round(this.x) === Math.round(point.x) &&
                Math.round(this.y) === Math.round(point.y));
    },

    getDistanceTo: function(point) {
        var deltaX = this.x - point.x,
            deltaY = this.y - point.y;

        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },

    getAngleTo: function(point) {
        var deltaX = this.x - point.x,
            deltaY = this.y - point.y;

        return Math.atan2(deltaY, deltaX) * this.radianToDegreeConstant;
    }
});

/**
 * @private
 * Touch event.
 */
Ext.define('Ext.event.Touch', {
    extend: 'Ext.event.Dom',

    requires: [
        'Ext.util.Point'
    ],

    constructor: function(event, info) {
        if (info) {
            this.set(info);
        }

        this.touchesMap = {};

        this.changedTouches = this.cloneTouches(event.changedTouches);
        this.touches = this.cloneTouches(event.touches);
        this.targetTouches = this.cloneTouches(event.targetTouches);

        return this.callParent([event]);
    },

    clone: function() {
        return new this.self(this);
    },

    setTargets: function(targetsMap) {
        this.doSetTargets(this.changedTouches, targetsMap);
        this.doSetTargets(this.touches, targetsMap);
        this.doSetTargets(this.targetTouches, targetsMap);
    },

    doSetTargets: function(touches, targetsMap) {
        var i, ln, touch, identifier, targets;

        for (i = 0,ln = touches.length; i < ln; i++) {
            touch = touches[i];

            identifier = touch.identifier;

            targets = targetsMap[identifier];

            if (targets) {
                touch.targets = targets;
            }
        }
    },

    cloneTouches: function(touches) {
        var map = this.touchesMap,
            clone = [],
            lastIdentifier = null,
            i, ln, touch, identifier;

        for (i = 0,ln = touches.length; i < ln; i++) {
            touch = touches[i];

            identifier = touch.identifier;

            // A quick fix for a bug found in Bada 1.0 where all touches have
            // idenfitier of 0
            if (lastIdentifier !== null && identifier === lastIdentifier) {
                identifier++;
            }

            lastIdentifier = identifier;

            if (!map[identifier]) {
                map[identifier] = {
                    pageX: touch.pageX,
                    pageY: touch.pageY,
                    identifier: identifier,
                    target: touch.target,
                    timeStamp: touch.timeStamp,
                    point: Ext.util.Point.fromTouch(touch),
                    targets: touch.targets
                };
            }

            clone[i] = map[identifier];
        }

        return clone;
    }
});

/**
 * @private
 */
Ext.define('Ext.event.publisher.TouchGesture', {

    extend: 'Ext.event.publisher.Dom',

    requires: [
        'Ext.util.Point',
        'Ext.event.Touch'
    ],

    handledEvents: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],

    moveEventName: 'touchmove',

    config: {
        moveThrottle: 1,
        buffering: {
            enabled: false,
            interval: 10
        },
        recognizers: {}
    },

    currentTouchesCount: 0,

    constructor: function(config) {
        this.processEvents = Ext.Function.bind(this.processEvents, this);

        this.eventProcessors = {
            touchstart: this.onTouchStart,
            touchmove: this.onTouchMove,
            touchend: this.onTouchEnd,
            touchcancel: this.onTouchEnd
        };

        this.eventToRecognizerMap = {};

        this.activeRecognizers = [];

        this.currentRecognizers = [];

        this.currentTargets = {};

        this.currentTouches = {};

        this.buffer = [];

        this.initConfig(config);

        return this.callParent();
    },

    applyBuffering: function(buffering) {
        if (buffering.enabled === true) {
            this.bufferTimer = setInterval(this.processEvents, buffering.interval);
        }
        else {
            clearInterval(this.bufferTimer);
        }

        return buffering;
    },

    applyRecognizers: function(recognizers) {
        var i, recognizer;

        for (i in recognizers) {
            if (recognizers.hasOwnProperty(i)) {
                recognizer = recognizers[i];

                if (recognizer) {
                    this.registerRecognizer(recognizer);
                }
            }
        }

        return recognizers;
    },

    handles: function(eventName) {
        return this.callParent(arguments) || this.eventToRecognizerMap.hasOwnProperty(eventName);
    },

    doesEventBubble: function() {
        // All touch events bubble
        return true;
    },

    eventLogs: [],

    onEvent: function(e) {
        var buffering = this.getBuffering();

        e = new Ext.event.Touch(e);

        if (buffering.enabled) {
            this.buffer.push(e);
        }
        else {
            this.processEvent(e);
        }
    },

    processEvents: function() {
        var buffer = this.buffer,
            ln = buffer.length,
            moveEvents = [],
            events, event, i;

        if (ln > 0) {
            events = buffer.slice(0);
            buffer.length = 0;

            for (i = 0; i < ln; i++) {
                event = events[i];
                if (event.type === this.moveEventName) {
                    moveEvents.push(event);
                }
                else {
                    if (moveEvents.length > 0) {
                        this.processEvent(this.mergeEvents(moveEvents));
                        moveEvents.length = 0;
                    }

                    this.processEvent(event);
                }
            }

            if (moveEvents.length > 0) {
                this.processEvent(this.mergeEvents(moveEvents));
                moveEvents.length = 0;
            }
        }
    },

    mergeEvents: function(events) {
        var changedTouchesLists = [],
            ln = events.length,
            i, event, targetEvent;

        targetEvent = events[ln - 1];

        if (ln === 1) {
            return targetEvent;
        }

        for (i = 0; i < ln; i++) {
            event = events[i];
            changedTouchesLists.push(event.changedTouches);
        }

        targetEvent.changedTouches = this.mergeTouchLists(changedTouchesLists);

        return targetEvent;
    },

    mergeTouchLists: function(touchLists) {
        var touches = {},
            list = [],
            i, ln, touchList, j, subLn, touch, identifier;

        for (i = 0,ln = touchLists.length; i < ln; i++) {
            touchList = touchLists[i];

            for (j = 0,subLn = touchList.length; j < subLn; j++) {
                touch = touchList[j];
                identifier = touch.identifier;
                touches[identifier] = touch;
            }
        }

        for (identifier in touches) {
            if (touches.hasOwnProperty(identifier)) {
                list.push(touches[identifier]);
            }
        }

        return list;
    },

    registerRecognizer: function(recognizer) {
        var map = this.eventToRecognizerMap,
            activeRecognizers = this.activeRecognizers,
            handledEvents = recognizer.getHandledEvents(),
            i, ln, eventName;

        recognizer.setOnRecognized(this.onRecognized);
        recognizer.setCallbackScope(this);

        for (i = 0,ln = handledEvents.length; i < ln; i++) {
            eventName = handledEvents[i];

            map[eventName] = recognizer;
        }

        activeRecognizers.push(recognizer);

        return this;
    },

    onRecognized: function(eventName, e, touches, info) {
        var targetGroups = [],
            ln = touches.length,
            targets, i, touch;

        if (ln === 1) {
            return this.publish(eventName, touches[0].targets, e, info);
        }

        for (i = 0; i < ln; i++) {
            touch = touches[i];
            targetGroups.push(touch.targets);
        }

        targets = this.getCommonTargets(targetGroups);

        this.publish(eventName, targets, e, info);
    },

    publish: function(eventName, targets, event, info) {
        event.set(info);

        return this.callParent([eventName, targets, event]);
    },

    getCommonTargets: function(targetGroups) {
        var firstTargetGroup = targetGroups[0],
            ln = targetGroups.length;

        if (ln === 1) {
            return firstTargetGroup;
        }

        var commonTargets = [],
            i = 1,
            target, targets, j;

        while (true) {
            target = firstTargetGroup[firstTargetGroup.length - i];

            if (!target) {
                return commonTargets;
            }

            for (j = 1; j < ln; j++) {
                targets = targetGroups[j];

                if (targets[targets.length - i] !== target) {
                    return commonTargets;
                }
            }

            commonTargets.unshift(target);
            i++;
        }

        return commonTargets;
    },

    invokeRecognizers: function(methodName, e) {
        var recognizers = this.activeRecognizers,
            ln = recognizers.length,
            i, recognizer;

        if (methodName === 'onStart') {
            for (i = 0; i < ln; i++) {
                recognizers[i].isActive = true;
            }
        }

        for (i = 0; i < ln; i++) {
            recognizer = recognizers[i];
            if (recognizer.isActive && recognizer[methodName].call(recognizer, e) === false) {
                recognizer.isActive = false;
            }
        }
    },

    getActiveRecognizers: function() {
        return this.activeRecognizers;
    },

    processEvent: function(e) {
        this.eventProcessors[e.type].call(this, e);
    },

    onTouchStart: function(e) {
        var currentTargets = this.currentTargets,
            currentTouches = this.currentTouches,
            currentTouchesCount = this.currentTouchesCount,
            changedTouches = e.changedTouches,
            touches = e.touches,
            touchesLn = touches.length,
            currentIdentifiers = {},
            ln = changedTouches.length,
            i, touch, identifier, fakeEndEvent;

        currentTouchesCount += ln;

        if (currentTouchesCount > touchesLn) {
            for (i = 0; i < touchesLn; i++) {
                touch = touches[i];
                identifier = touch.identifier;
                currentIdentifiers[identifier] = true;
            }

            for (identifier in currentTouches) {
                if (currentTouches.hasOwnProperty(identifier)) {
                    if (!currentIdentifiers[identifier]) {
                        currentTouchesCount--;
                        fakeEndEvent = e.clone();
                        touch = currentTouches[identifier];
                        touch.targets = this.getBubblingTargets(this.getElementTarget(touch.target));
                        fakeEndEvent.changedTouches = [touch];
                        this.onTouchEnd(fakeEndEvent);
                    }
                }
            }

            // Fix for a bug found in Motorola Droid X (Gingerbread) and similar
            // where there are 2 touchstarts but just one touchend
            if (currentTouchesCount > touchesLn) {
                return;
            }
        }

        for (i = 0; i < ln; i++) {
            touch = changedTouches[i];
            identifier = touch.identifier;

            if (!currentTouches.hasOwnProperty(identifier)) {
                this.currentTouchesCount++;
            }

            currentTouches[identifier] = touch;
            currentTargets[identifier] = this.getBubblingTargets(this.getElementTarget(touch.target));
        }

        e.setTargets(currentTargets);

        for (i = 0; i < ln; i++) {
            touch = changedTouches[i];

            this.publish('touchstart', touch.targets, e, {touch: touch});
        }

        if (!this.isStarted) {
            this.isStarted = true;
            this.invokeRecognizers('onStart', e);
        }

        this.invokeRecognizers('onTouchStart', e);
    },

    onTouchMove: function(e) {
        if (!this.isStarted) {
            return;
        }

        var currentTargets = this.currentTargets,
            currentTouches = this.currentTouches,
            moveThrottle = this.getMoveThrottle(),
            changedTouches = e.changedTouches,
            stillTouchesCount = 0,
            i, ln, touch, point, oldPoint, identifier;

        e.setTargets(currentTargets);

        for (i = 0,ln = changedTouches.length; i < ln; i++) {
            touch = changedTouches[i];
            identifier = touch.identifier;
            point = touch.point;

            oldPoint = currentTouches[identifier].point;

            if (moveThrottle && point.isCloseTo(oldPoint, moveThrottle)) {
                stillTouchesCount++;
                continue;
            }

            currentTouches[identifier] = touch;

            this.publish('touchmove', touch.targets, e, {touch: touch});
        }

        if (stillTouchesCount < ln) {
            this.invokeRecognizers('onTouchMove', e);
        }
    },

    onTouchEnd: function(e) {
        if (!this.isStarted) {
            return;
        }

        var currentTargets = this.currentTargets,
            currentTouches = this.currentTouches,
            changedTouches = e.changedTouches,
            ln = changedTouches.length,
            isEnded, identifier, i, touch;

        e.setTargets(currentTargets);

        this.currentTouchesCount -= ln;

        isEnded = (this.currentTouchesCount === 0);

        if (isEnded) {
            this.isStarted = false;
        }

        for (i = 0; i < ln; i++) {
            touch = changedTouches[i];
            identifier = touch.identifier;

            delete currentTouches[identifier];
            delete currentTargets[identifier];

            this.publish('touchend', touch.targets, e, {touch: touch});
        }

        this.invokeRecognizers('onTouchEnd', e);

        if (isEnded) {
            this.invokeRecognizers('onEnd', e);
        }
    }

}, function() {
    if (!Ext.feature.has.Touch) {
        this.override({
            moveEventName: 'mousemove',

            map: {
                mouseToTouch: {
                    mousedown: 'touchstart',
                    mousemove: 'touchmove',
                    mouseup: 'touchend'
                },

                touchToMouse: {
                    touchstart: 'mousedown',
                    touchmove: 'mousemove',
                    touchend: 'mouseup'
                }
            },

            attachListener: function(eventName) {
                eventName = this.map.touchToMouse[eventName];

                if (!eventName) {
                    return;
                }

                return this.callOverridden([eventName]);
            },

            lastEventType: null,

            onEvent: function(e) {
                if ('button' in e && e.button !== 0) {
                    return;
                }

                var type = e.type,
                    touchList = [e];

                // Temporary fix for a recent Chrome bugs where events don't seem to bubble up to document
                // when the element is being animated
                // with webkit-transition (2 mousedowns without any mouseup)
                if (type === 'mousedown' && this.lastEventType && this.lastEventType !== 'mouseup') {
                    var fixedEvent = document.createEvent("MouseEvent");
                        fixedEvent.initMouseEvent('mouseup', e.bubbles, e.cancelable,
                            document.defaultView, e.detail, e.screenX, e.screenY, e.clientX,
                            e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.metaKey,
                            e.button, e.relatedTarget);

                    this.onEvent(fixedEvent);
                }

                if (type !== 'mousemove') {
                    this.lastEventType = type;
                }

                e.identifier = 1;
                e.touches = (type !== 'mouseup') ? touchList : [];
                e.targetTouches = (type !== 'mouseup') ? touchList : [];
                e.changedTouches = touchList;

                return this.callOverridden([e]);
            },

            processEvent: function(e) {
                this.eventProcessors[this.map.mouseToTouch[e.type]].call(this, e);
            }
        });
    }
});

/**
 * A base class for all event recognisers in Sencha Touch.
 *
 * Sencha Touch, by default, includes various different {@link Ext.event.recognizer.Recognizer} subclasses to recognise
 * events happening in your application.
 *
 * ## Default recognisers
 *
 * * {@link Ext.event.recognizer.Tap}
 * * {@link Ext.event.recognizer.DoubleTap}
 * * {@link Ext.event.recognizer.LongPress}
 * * {@link Ext.event.recognizer.Drag}
 * * {@link Ext.event.recognizer.HorizontalSwipe}
 * * {@link Ext.event.recognizer.Pinch}
 * * {@link Ext.event.recognizer.Rotate}
 *
 * ## Additional recognisers
 *
 * * {@link Ext.event.recognizer.VerticalSwipe}
 *
 * If you want to create custom recognisers, or disable recognisers in your Sencha Touch application, please refer to the
 * documentation in {@link Ext#setup}.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.Recognizer', {
    mixins: ['Ext.mixin.Identifiable'],

    handledEvents: [],

    config: {
        onRecognized: Ext.emptyFn,
        onFailed: Ext.emptyFn,
        callbackScope: null
    },

    constructor: function(config) {
        this.initConfig(config);

        return this;
    },

    getHandledEvents: function() {
        return this.handledEvents;
    },

    onStart: Ext.emptyFn,

    onEnd: Ext.emptyFn,

    fail: function() {
        this.getOnFailed().apply(this.getCallbackScope(), arguments);

        return false;
    },

    fire: function() {
        this.getOnRecognized().apply(this.getCallbackScope(), arguments);
    }
});

/**
 * @private
 */
Ext.define('Ext.event.recognizer.Touch', {

    extend: 'Ext.event.recognizer.Recognizer',

    onTouchStart: Ext.emptyFn,

    onTouchMove: Ext.emptyFn,

    onTouchEnd: Ext.emptyFn
});

/**
 * @private
 */
Ext.define('Ext.event.recognizer.SingleTouch', {
    extend: 'Ext.event.recognizer.Touch',

    inheritableStatics: {
        NOT_SINGLE_TOUCH: 0x01,
        TOUCH_MOVED:  0x02
    },

    onTouchStart: function(e) {
        if (e.touches.length > 1) {
            return this.fail(this.self.NOT_SINGLE_TOUCH);
        }
    }
});


/**
 * A simple event recogniser which knows when you drag.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.Drag', {
    extend: 'Ext.event.recognizer.SingleTouch',

    isStarted: false,

    startPoint: null,

    previousPoint: null,

    lastPoint: null,

    handledEvents: ['dragstart', 'drag', 'dragend'],

    /**
     * @member Ext.dom.Element
     * @event dragstart
     * Fired once when a drag has started.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event drag
     * Fires continuously when there is dragging (the touch must move for this to be fired).
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event dragend
     * Fires when a drag has ended.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    onTouchStart: function(e) {
        var startTouches,
            startTouch;

        if (this.callParent(arguments) === false) {
            if (this.isStarted && this.lastMoveEvent !== null) {
                this.onTouchEnd(this.lastMoveEvent);
            }
            return false;
        }

        this.startTouches = startTouches = e.changedTouches;
        this.startTouch = startTouch = startTouches[0];
        this.startPoint = startTouch.point;
    },

    onTouchMove: function(e) {
        var touches = e.changedTouches,
            touch = touches[0],
            point = touch.point,
            time = e.time;

        if (this.lastPoint) {
            this.previousPoint = this.lastPoint;
        }

        if (this.lastTime) {
            this.previousTime = this.lastTime;
        }

        this.lastTime = time;
        this.lastPoint = point;
        this.lastMoveEvent = e;

        if (!this.isStarted) {
            this.isStarted = true;

            this.startTime = time;
            this.previousTime = time;

            this.previousPoint = this.startPoint;

            this.fire('dragstart', e, this.startTouches, this.getInfo(e, this.startTouch));
        }
        else {
            this.fire('drag', e, touches, this.getInfo(e, touch));
        }
    },

    onTouchEnd: function(e) {
        if (this.isStarted) {
            var touches = e.changedTouches,
                touch = touches[0],
                point = touch.point;

            this.isStarted = false;

            this.lastPoint = point;

            this.fire('dragend', e, touches, this.getInfo(e, touch));

            this.startTime = 0;
            this.previousTime = 0;
            this.lastTime = 0;

            this.startPoint = null;
            this.previousPoint = null;
            this.lastPoint = null;
            this.lastMoveEvent = null;
        }
    },

    getInfo: function(e, touch) {
        var time = e.time,
            startPoint = this.startPoint,
            previousPoint = this.previousPoint,
            startTime = this.startTime,
            previousTime = this.previousTime,
            point = this.lastPoint,
            deltaX = point.x - startPoint.x,
            deltaY = point.y - startPoint.y,
            info = {
                touch: touch,
                startX: startPoint.x,
                startY: startPoint.y,
                previousX: previousPoint.x,
                previousY: previousPoint.y,
                pageX: point.x,
                pageY: point.y,
                deltaX: deltaX,
                deltaY: deltaY,
                absDeltaX: Math.abs(deltaX),
                absDeltaY: Math.abs(deltaY),
                previousDeltaX: point.x - previousPoint.x,
                previousDeltaY: point.y - previousPoint.y,
                time: time,
                startTime: startTime,
                previousTime: previousTime,
                deltaTime: time - startTime,
                previousDeltaTime: time - previousTime
            };

        return info;
    }
});

/**
 * A simple event recogniser which knows when you tap.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.Tap', {

    handledEvents: ['tap'],

    /**
     * @member Ext.dom.Element
     * @event tap
     * Fires when you tap
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event touchstart
     * Fires when touch starts.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event tapstart
     * @inheritdoc Ext.dom.Element#touchstart
     * @deprecated 2.0.0 Please add listener to 'touchstart' event instead
     */

    /**
     * @member Ext.dom.Element
     * @event touchmove
     * Fires when movement while touching.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event tapcancel
     * @inheritdoc Ext.dom.Element#touchmove
     * @deprecated 2.0.0 Please add listener to 'touchmove' event instead
     */

    extend: 'Ext.event.recognizer.SingleTouch',

    onTouchMove: function() {
        return this.fail(this.self.TOUCH_MOVED);
    },

    onTouchEnd: function(e) {
        var touch = e.changedTouches[0];

        this.fire('tap', e, [touch]);
    }

}, function() {
});

/**
 * A simple event recogniser which knows when you double tap.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.DoubleTap', {

    extend: 'Ext.event.recognizer.SingleTouch',

    inheritableStatics: {
        DIFFERENT_TARGET: 0x03
    },

    config: {
        maxDuration: 300
    },

    handledEvents: ['singletap', 'doubletap'],

    /**
     * @member Ext.dom.Element
     * @event singletap
     * Fires when there is a single tap.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event doubletap
     * Fires when there is a double tap.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    singleTapTimer: null,

    startTime: 0,

    lastTapTime: 0,

    onTouchStart: function(e) {
        if (this.callParent(arguments) === false) {
            return false;
        }

        this.startTime = e.time;

        clearTimeout(this.singleTapTimer);
    },

    onTouchMove: function() {
        return this.fail(this.self.TOUCH_MOVED);
    },

    onEnd: function(e) {
        var me = this,
            maxDuration = this.getMaxDuration(),
            touch = e.changedTouches[0],
            time = e.time,
            target = e.target,
            lastTapTime = this.lastTapTime,
            lastTarget = this.lastTarget,
            duration;

        this.lastTapTime = time;
        this.lastTarget = target;

        if (lastTapTime) {
            duration = time - lastTapTime;

            if (duration <= maxDuration) {
                if (target !== lastTarget) {
                    return this.fail(this.self.DIFFERENT_TARGET);
                }

                this.lastTarget = null;
                this.lastTapTime = 0;

                this.fire('doubletap', e, [touch], {
                    touch: touch,
                    duration: duration
                });

                return;
            }
        }

        if (time - this.startTime > maxDuration) {
            this.fireSingleTap(e, touch);
        }
        else {
            this.singleTapTimer = setTimeout(function() {
                me.fireSingleTap(e, touch);
            }, maxDuration);
        }
    },

    fireSingleTap: function(e, touch) {
        this.fire('singletap', e, [touch], {
            touch: touch
        });
    }
});

/**
 * A event recogniser which knows when you tap and hold for more than 1 second.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.LongPress', {
    extend: 'Ext.event.recognizer.SingleTouch',

    inheritableStatics: {
        DURATION_NOT_ENOUGH: 0x20
    },

    config: {
        minDuration: 1000
    },

    handledEvents: ['longpress'],

    /**
     * @member Ext.dom.Element
     * @event longpress
     * Fires when you touch and hold still for more than 1 second.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event taphold
     * @inheritdoc Ext.dom.Element#longpress
     */

    fireLongPress: function(e) {
        var touch = e.changedTouches[0];

        this.fire('longpress', e, [touch], {
            touch: touch,
            duration: this.getMinDuration()
        });

        this.isLongPress = true;
    },

    onTouchStart: function(e) {
        var me = this;

        if (this.callParent(arguments) === false) {
            return false;
        }

        this.isLongPress = false;

        this.timer = setTimeout(function() {
            me.fireLongPress(e);
        }, this.getMinDuration());
    },

    onTouchMove: function() {
        return this.fail(this.self.TOUCH_MOVED);
    },

    onTouchEnd: function() {
        if (!this.isLongPress) {
            return this.fail(this.self.DURATION_NOT_ENOUGH);
        }
    },

    fail: function() {
        clearTimeout(this.timer);

        return this.callParent(arguments);
    }

}, function() {
    this.override({
        handledEvents: ['longpress', 'taphold'],

        fire: function(eventName) {
            if (eventName === 'longpress') {
                var args = Array.prototype.slice.call(arguments);
                args[0] = 'taphold';

                this.fire.apply(this, args);
            }

            return this.callOverridden(arguments);
        }
    });
});

/**
 * A base class used for both {@link Ext.event.recognizer.VerticalSwipe} and {@link Ext.event.recognizer.HorizontalSwipe}
 * event recognisers.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.Swipe', {
    extend: 'Ext.event.recognizer.SingleTouch',

    handledEvents: ['swipe'],

    /**
     * @member Ext.dom.Element
     * @event swipe
     * Fires when there is a swipe
     * When listening to this, ensure you know about the {@link Ext.event.Event#direction} property in the `event` object.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @property {Number} direction
     * The direction of the swipe. Available options are:
     *
     * * up
     * * down
     * * left
     * * right
     *
     * Note: In order to recognise swiping up and down, you must enable the vertical swipe recogniser.
     *
     * **This is only available when the event type is `swipe`**
     * @member Ext.event.Event
     */

    /**
     * @property {Number} duration
     * The duration of the swipe.
     *
     * **This is only available when the event type is `swipe`**
     * @member Ext.event.Event
     */

    inheritableStatics: {
        MAX_OFFSET_EXCEEDED: 0x10,
        MAX_DURATION_EXCEEDED: 0x11,
        DISTANCE_NOT_ENOUGH: 0x12
    },

    config: {
        minDistance: 80,
        maxOffset: 35,
        maxDuration: 1000
    },

    onTouchStart: function(e) {
        if (this.callParent(arguments) === false) {
            return false;
        }

        var touch = e.changedTouches[0];

        this.startTime = e.time;

        this.isHorizontal = true;
        this.isVertical = true;

        this.startX = touch.pageX;
        this.startY = touch.pageY;
    },

    onTouchMove: function(e) {
        var touch = e.changedTouches[0],
            x = touch.pageX,
            y = touch.pageY,
            absDeltaX = Math.abs(x - this.startX),
            absDeltaY = Math.abs(y - this.startY),
            time = e.time;

        if (time - this.startTime > this.getMaxDuration()) {
            return this.fail(this.self.MAX_DURATION_EXCEEDED);
        }

        if (this.isVertical && absDeltaX > this.getMaxOffset()) {
            this.isVertical = false;
        }

        if (this.isHorizontal && absDeltaY > this.getMaxOffset()) {
            this.isHorizontal = false;
        }

        if (!this.isHorizontal && !this.isVertical) {
            return this.fail(this.self.MAX_OFFSET_EXCEEDED);
        }
    },

    onTouchEnd: function(e) {
        if (this.onTouchMove(e) === false) {
            return false;
        }

        var touch = e.changedTouches[0],
            x = touch.pageX,
            y = touch.pageY,
            deltaX = x - this.startX,
            deltaY = y - this.startY,
            absDeltaX = Math.abs(deltaX),
            absDeltaY = Math.abs(deltaY),
            minDistance = this.getMinDistance(),
            duration = e.time - this.startTime,
            direction, distance;

        if (this.isVertical && absDeltaY < minDistance) {
            this.isVertical = false;
        }

        if (this.isHorizontal && absDeltaX < minDistance) {
            this.isHorizontal = false;
        }

        if (this.isHorizontal) {
            direction = (deltaX < 0) ? 'left' : 'right';
            distance = absDeltaX;
        }
        else if (this.isVertical) {
            direction = (deltaY < 0) ? 'up' : 'down';
            distance = absDeltaY;
        }
        else {
            return this.fail(this.self.DISTANCE_NOT_ENOUGH);
        }

        this.fire('swipe', e, [touch], {
            touch: touch,
            direction: direction,
            distance: distance,
            duration: duration
        });
    }
});

/**
 * A event recogniser created to recognise horitzontal swipe movements.
 * 
 * @private
 */
Ext.define('Ext.event.recognizer.HorizontalSwipe', {
    extend: 'Ext.event.recognizer.Swipe',

    handledEvents: ['swipe'],

    onTouchStart: function(e) {
        if (this.callParent(arguments) === false) {
            return false;
        }

        var touch = e.changedTouches[0];

        this.startTime = e.time;

        this.startX = touch.pageX;
        this.startY = touch.pageY;
    },

    onTouchMove: function(e) {
        var touch = e.changedTouches[0],
            y = touch.pageY,
            absDeltaY = Math.abs(y - this.startY),
            time = e.time,
            maxDuration = this.getMaxDuration(),
            maxOffset = this.getMaxOffset();

        if (time - this.startTime > maxDuration) {
            return this.fail(this.self.MAX_DURATION_EXCEEDED);
        }

        if (absDeltaY > maxOffset) {
            return this.fail(this.self.MAX_OFFSET_EXCEEDED);
        }
    },

    onTouchEnd: function(e) {
        if (this.onTouchMove(e) !== false) {
            var touch = e.changedTouches[0],
                x = touch.pageX,
                deltaX = x - this.startX,
                distance = Math.abs(deltaX),
                duration = e.time - this.startTime,
                minDistance = this.getMinDistance(),
                direction;

            if (distance < minDistance) {
                return this.fail(this.self.DISTANCE_NOT_ENOUGH);
            }

            direction = (deltaX < 0) ? 'left' : 'right';

            this.fire('swipe', e, [touch], {
                touch: touch,
                direction: direction,
                distance: distance,
                duration: duration
            });
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.event.recognizer.MultiTouch', {
    extend: 'Ext.event.recognizer.Touch',

    requiredTouchesCount: 2,

    isTracking: false,

    isStarted: false,

    onTouchStart: function(e) {
        var requiredTouchesCount = this.requiredTouchesCount,
            touches = e.touches,
            touchesCount = touches.length;

        if (touchesCount === requiredTouchesCount) {
            this.start(e);
        }
        else if (touchesCount > requiredTouchesCount) {
            this.end(e);
        }
    },

    onTouchEnd: function(e) {
        this.end(e);
    },

    start: function() {
        if (!this.isTracking) {
            this.isTracking = true;
            this.isStarted = false;
        }
    },

    end: function(e) {
        if (this.isTracking) {
            this.isTracking = false;

            if (this.isStarted) {
                this.isStarted = false;

                this.fireEnd(e);
            }
        }
    }
});

/**
 * A event recogniser which knows when you pinch.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.Pinch', {
    extend: 'Ext.event.recognizer.MultiTouch',

    requiredTouchesCount: 2,

    handledEvents: ['pinchstart', 'pinch', 'pinchend'],

    /**
     * @member Ext.dom.Element
     * @event pinchstart
     * Fired once when a pinch has started.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event pinch
     * Fires continuously when there is pinching (the touch must move for this to be fired).
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event pinchend
     * Fires when a pinch has ended.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @property {Number} scale
     * The scape of a pinch event.
     *
     * **This is only available when the event type is `pinch`**
     * @member Ext.event.Event
     */

    startDistance: 0,

    lastTouches: null,

    onTouchMove: function(e) {
        if (!this.isTracking) {
            return;
        }

        var touches = Array.prototype.slice.call(e.touches),
            firstPoint, secondPoint, distance;

        firstPoint = touches[0].point;
        secondPoint = touches[1].point;

        distance = firstPoint.getDistanceTo(secondPoint);

        if (distance === 0) {
            return;
        }

        if (!this.isStarted) {

            this.isStarted = true;

            this.startDistance = distance;

            this.fire('pinchstart', e, touches, {
                touches: touches,
                distance: distance,
                scale: 1
            });
        }
        else {
            this.fire('pinch', e, touches, {
                touches: touches,
                distance: distance,
                scale: distance / this.startDistance
            });
        }

        this.lastTouches = touches;
    },

    fireEnd: function(e) {
        this.fire('pinchend', e, this.lastTouches);
    },

    fail: function() {
        return this.callParent(arguments);
    }
});

/**
 * A simple event recogniser which knows when you rotate.
 *
 * @private
 */
Ext.define('Ext.event.recognizer.Rotate', {
    extend: 'Ext.event.recognizer.MultiTouch',

    requiredTouchesCount: 2,

    handledEvents: ['rotatestart', 'rotate', 'rotateend'],

    /**
     * @member Ext.dom.Element
     * @event rotatestart
     * Fired once when a rotation has started.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event rotate
     * Fires continuously when there is rotation (the touch must move for this to be fired).
     * When listening to this, ensure you know about the {@link Ext.event.Event#angle} and {@link Ext.event.Event#rotation}
     * properties in the `event` object.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @member Ext.dom.Element
     * @event rotateend
     * Fires when a rotation event has ended.
     * @param {Ext.event.Event} event The {@link Ext.event.Event} event encapsulating the DOM event.
     * @param {HTMLElement} node The target of the event.
     * @param {Object} options The options object passed to Ext.mixin.Observable.addListener.
     */

    /**
     * @property {Number} angle
     * The angle of the rotation.
     *
     * **This is only available when the event type is `rotate`**
     * @member Ext.event.Event
     */

    /**
     * @property {Number} rotation
     * A amount of rotation, since the start of the event.
     *
     * **This is only available when the event type is `rotate`**
     * @member Ext.event.Event
     */

    startAngle: 0,

    lastTouches: null,

    lastAngle: null,

    onTouchMove: function(e) {
        if (!this.isTracking) {
            return;
        }

        var touches = Array.prototype.slice.call(e.touches),
            lastAngle = this.lastAngle,
            firstPoint, secondPoint, angle, nextAngle, previousAngle, diff;

        firstPoint = touches[0].point;
        secondPoint = touches[1].point;

        angle = firstPoint.getAngleTo(secondPoint);

        if (lastAngle !== null) {
            diff = Math.abs(lastAngle - angle);
            nextAngle = angle + 360;
            previousAngle = angle - 360;

            if (Math.abs(nextAngle - lastAngle) < diff) {
                angle = nextAngle;
            }
            else if (Math.abs(previousAngle - lastAngle) < diff) {
                angle = previousAngle;
            }
        }

        this.lastAngle = angle;

        if (!this.isStarted) {
            this.isStarted = true;

            this.startAngle = angle;

            this.fire('rotatestart', e, touches, {
                touches: touches,
                angle: angle,
                rotation: 0
            });
        }
        else {
            this.fire('rotate', e, touches, {
                touches: touches,
                angle: angle,
                rotation: angle - this.startAngle
            });
        }

        this.lastTouches = touches;
    },

    fireEnd: function(e) {
        this.lastAngle = null;
        this.fire('rotateend', e, this.lastTouches);
    }
});

/**
 * @class Ext.ComponentQuery
 * @extends Object
 * @singleton
 *
 * Provides searching of Components within Ext.ComponentManager (globally) or a specific
 * Ext.container.Container on the document with a similar syntax to a CSS selector.
 *
 * Components can be retrieved by using their {@link Ext.Component xtype} with an optional . prefix
 *
 * - `component` or `.component`
 * - `gridpanel` or `.gridpanel`
 *
 * An itemId or id must be prefixed with a #
 *
 * - `#myContainer`
 *
 * Attributes must be wrapped in brackets
 *
 * - `component[autoScroll]`
 * - `panel[title="Test"]`
 *
 * Member expressions from candidate Components may be tested. If the expression returns a *truthy* value,
 * the candidate Component will be included in the query:
 *
 *     var disabledFields = myFormPanel.query("{isDisabled()}");
 *
 * Pseudo classes may be used to filter results in the same way as in {@link Ext.DomQuery DomQuery}:
 *
 *     // Function receives array and returns a filtered array.
 *     Ext.ComponentQuery.pseudos.invalid = function(items) {
 *         var i = 0, l = items.length, c, result = [];
 *         for (; i < l; i++) {
 *             if (!(c = items[i]).isValid()) {
 *                 result.push(c);
 *             }
 *         }
 *         return result;
 *     };
 *
 *     var invalidFields = myFormPanel.query('field:invalid');
 *     if (invalidFields.length) {
 *         invalidFields[0].getEl().scrollIntoView(myFormPanel.body);
 *         for (var i = 0, l = invalidFields.length; i < l; i++) {
 *             invalidFields[i].getEl().frame("red");
 *         }
 *     }
 *
 * Default pseudos include:
 *
 * - not
 *
 * Queries return an array of components.
 * Here are some example queries.
 *
 *     // retrieve all Ext.Panels in the document by xtype
 *     var panelsArray = Ext.ComponentQuery.query('panel');
 *
 *     // retrieve all Ext.Panels within the container with an id myCt
 *     var panelsWithinmyCt = Ext.ComponentQuery.query('#myCt panel');
 *
 *     // retrieve all direct children which are Ext.Panels within myCt
 *     var directChildPanel = Ext.ComponentQuery.query('#myCt > panel');
 *
 *     // retrieve all grids and trees
 *     var gridsAndTrees = Ext.ComponentQuery.query('gridpanel, treepanel');
 *
 * For easy access to queries based from a particular Container see the {@link Ext.Container#query},
 * {@link Ext.Container#down} and {@link Ext.Container#child} methods. Also see
 * {@link Ext.Component#up}.
 */
Ext.define('Ext.ComponentQuery', {
    singleton: true,
    uses: ['Ext.ComponentManager']
}, function() {

    var cq = this,

        // A function source code pattern with a placeholder which accepts an expression which yields a truth value when applied
        // as a member on each item in the passed array.
        filterFnPattern = [
            'var r = [],',
                'i = 0,',
                'it = items,',
                'l = it.length,',
                'c;',
            'for (; i < l; i++) {',
                'c = it[i];',
                'if (c.{0}) {',
                   'r.push(c);',
                '}',
            '}',
            'return r;'
        ].join(''),

        filterItems = function(items, operation) {
            // Argument list for the operation is [ itemsArray, operationArg1, operationArg2...]
            // The operation's method loops over each item in the candidate array and
            // returns an array of items which match its criteria
            return operation.method.apply(this, [ items ].concat(operation.args));
        },

        getItems = function(items, mode) {
            var result = [],
                i = 0,
                length = items.length,
                candidate,
                deep = mode !== '>';

            for (; i < length; i++) {
                candidate = items[i];
                if (candidate.getRefItems) {
                    result = result.concat(candidate.getRefItems(deep));
                }
            }
            return result;
        },

        getAncestors = function(items) {
            var result = [],
                i = 0,
                length = items.length,
                candidate;
            for (; i < length; i++) {
                candidate = items[i];
                while (!!(candidate = (candidate.ownerCt || candidate.floatParent))) {
                    result.push(candidate);
                }
            }
            return result;
        },

        // Filters the passed candidate array and returns only items which match the passed xtype
        filterByXType = function(items, xtype, shallow) {
            if (xtype === '*') {
                return items.slice();
            }
            else {
                var result = [],
                    i = 0,
                    length = items.length,
                    candidate;
                for (; i < length; i++) {
                    candidate = items[i];
                    if (candidate.isXType(xtype, shallow)) {
                        result.push(candidate);
                    }
                }
                return result;
            }
        },

        // Filters the passed candidate array and returns only items which have the passed className
        filterByClassName = function(items, className) {
            var EA = Ext.Array,
                result = [],
                i = 0,
                length = items.length,
                candidate;
            for (; i < length; i++) {
                candidate = items[i];
                if (candidate.el ? candidate.el.hasCls(className) : EA.contains(candidate.initCls(), className)) {
                    result.push(candidate);
                }
            }
            return result;
        },

        // Filters the passed candidate array and returns only items which have the specified property match
        filterByAttribute = function(items, property, operator, value) {
            var result = [],
                i = 0,
                length = items.length,
                candidate, getter, getValue;
            for (; i < length; i++) {
                candidate = items[i];
                getter = Ext.Class.getConfigNameMap(property).get;
                if (candidate[getter]) {
                    getValue = candidate[getter]();
                    if (!value ? !!getValue : (String(getValue) === value)) {
                        result.push(candidate);
                    }
                }
                else if (candidate.config && candidate.config[property]) {
                    if (!value ? !!candidate.config[property] : (String(candidate.config[property]) === value)) {
                        result.push(candidate);
                    }
                }
                else if (!value ? !!candidate[property] : (String(candidate[property]) === value)) {
                    result.push(candidate);
                }
            }
            return result;
        },

        // Filters the passed candidate array and returns only items which have the specified itemId or id
        filterById = function(items, id) {
            var result = [],
                i = 0,
                length = items.length,
                candidate;
            for (; i < length; i++) {
                candidate = items[i];
                if (candidate.getId() === id || candidate.getItemId() === id) {
                    result.push(candidate);
                }
            }
            return result;
        },

        // Filters the passed candidate array and returns only items which the named pseudo class matcher filters in
        filterByPseudo = function(items, name, value) {
            return cq.pseudos[name](items, value);
        },

        // Determines leading mode
        // > for direct child, and ^ to switch to ownerCt axis
        modeRe = /^(\s?([>\^])\s?|\s|$)/,

        // Matches a token with possibly (true|false) appended for the "shallow" parameter
        tokenRe = /^(#)?([\w\-]+|\*)(?:\((true|false)\))?/,

        matchers = [{
            // Checks for .xtype with possibly (true|false) appended for the "shallow" parameter
            re: /^\.([\w\-]+)(?:\((true|false)\))?/,
            method: filterByXType
        },{
            // checks for [attribute=value]
            re: /^(?:[\[](?:@)?([\w\-]+)\s?(?:(=|.=)\s?['"]?(.*?)["']?)?[\]])/,
            method: filterByAttribute
        }, {
            // checks for #cmpItemId
            re: /^#([\w\-]+)/,
            method: filterById
        }, {
            // checks for :<pseudo_class>(<selector>)
            re: /^\:([\w\-]+)(?:\(((?:\{[^\}]+\})|(?:(?!\{)[^\s>\/]*?(?!\})))\))?/,
            method: filterByPseudo
        }, {
            // checks for {<member_expression>}
            re: /^(?:\{([^\}]+)\})/,
            method: filterFnPattern
        }];

    cq.Query = Ext.extend(Object, {
        constructor: function(cfg) {
            cfg = cfg || {};
            Ext.apply(this, cfg);
        },

        /**
         * @private
         * Executes this Query upon the selected root.
         * The root provides the initial source of candidate Component matches which are progressively
         * filtered by iterating through this Query's operations cache.
         * If no root is provided, all registered Components are searched via the ComponentManager.
         * root may be a Container who's descendant Components are filtered
         * root may be a Component with an implementation of getRefItems which provides some nested Components such as the
         * docked items within a Panel.
         * root may be an array of candidate Components to filter using this Query.
         */
        execute : function(root) {
            var operations = this.operations,
                i = 0,
                length = operations.length,
                operation,
                workingItems;

            // no root, use all Components in the document
            if (!root) {
                workingItems = Ext.ComponentManager.all.getArray();
            }
            // Root is a candidate Array
            else if (Ext.isArray(root)) {
                workingItems = root;
            }

            // We are going to loop over our operations and take care of them
            // one by one.
            for (; i < length; i++) {
                operation = operations[i];

                // The mode operation requires some custom handling.
                // All other operations essentially filter down our current
                // working items, while mode replaces our current working
                // items by getting children from each one of our current
                // working items. The type of mode determines the type of
                // children we get. (e.g. > only gets direct children)
                if (operation.mode === '^') {
                    workingItems = getAncestors(workingItems || [root]);
                }
                else if (operation.mode) {
                    workingItems = getItems(workingItems || [root], operation.mode);
                }
                else {
                    workingItems = filterItems(workingItems || getItems([root]), operation);
                }

                // If this is the last operation, it means our current working
                // items are the final matched items. Thus return them!
                if (i === length -1) {
                    return workingItems;
                }
            }
            return [];
        },

        is: function(component) {
            var operations = this.operations,
                components = Ext.isArray(component) ? component : [component],
                originalLength = components.length,
                lastOperation = operations[operations.length-1],
                ln, i;

            components = filterItems(components, lastOperation);
            if (components.length === originalLength) {
                if (operations.length > 1) {
                    for (i = 0, ln = components.length; i < ln; i++) {
                        if (Ext.Array.indexOf(this.execute(), components[i]) === -1) {
                            return false;
                        }
                    }
                }
                return true;
            }
            return false;
        }
    });

    Ext.apply(this, {

        // private cache of selectors and matching ComponentQuery.Query objects
        cache: {},

        // private cache of pseudo class filter functions
        pseudos: {
            not: function(components, selector){
                var CQ = Ext.ComponentQuery,
                    i = 0,
                    length = components.length,
                    results = [],
                    index = -1,
                    component;

                for(; i < length; ++i) {
                    component = components[i];
                    if (!CQ.is(component, selector)) {
                        results[++index] = component;
                    }
                }
                return results;
            }
        },

        /**
         * Returns an array of matched Components from within the passed root object.
         *
         * This method filters returned Components in a similar way to how CSS selector based DOM
         * queries work using a textual selector string.
         *
         * See class summary for details.
         *
         * @param {String} selector The selector string to filter returned Components
         * @param {Ext.Container} root The Container within which to perform the query.
         * If omitted, all Components within the document are included in the search.
         *
         * This parameter may also be an array of Components to filter according to the selector.</p>
         * @returns {Ext.Component[]} The matched Components.
         *
         * @member Ext.ComponentQuery
         */
        query: function(selector, root) {
            var selectors = selector.split(','),
                length = selectors.length,
                i = 0,
                results = [],
                noDupResults = [],
                dupMatcher = {},
                query, resultsLn, cmp;

            for (; i < length; i++) {
                selector = Ext.String.trim(selectors[i]);
                query = this.parse(selector);
//                query = this.cache[selector];
//                if (!query) {
//                    this.cache[selector] = query = this.parse(selector);
//                }
                results = results.concat(query.execute(root));
            }

            // multiple selectors, potential to find duplicates
            // lets filter them out.
            if (length > 1) {
                resultsLn = results.length;
                for (i = 0; i < resultsLn; i++) {
                    cmp = results[i];
                    if (!dupMatcher[cmp.id]) {
                        noDupResults.push(cmp);
                        dupMatcher[cmp.id] = true;
                    }
                }
                results = noDupResults;
            }
            return results;
        },

        /**
         * Tests whether the passed Component matches the selector string.
         * @param {Ext.Component} component The Component to test
         * @param {String} selector The selector string to test against.
         * @return {Boolean} True if the Component matches the selector.
         * @member Ext.ComponentQuery
         */
        is: function(component, selector) {
            if (!selector) {
                return true;
            }
            var query = this.cache[selector];
            if (!query) {
                this.cache[selector] = query = this.parse(selector);
            }
            return query.is(component);
        },

        parse: function(selector) {
            var operations = [],
                length = matchers.length,
                lastSelector,
                tokenMatch,
                matchedChar,
                modeMatch,
                selectorMatch,
                i, matcher, method;

            // We are going to parse the beginning of the selector over and
            // over again, slicing off the selector any portions we converted into an
            // operation, until it is an empty string.
            while (selector && lastSelector !== selector) {
                lastSelector = selector;

                // First we check if we are dealing with a token like #, * or an xtype
                tokenMatch = selector.match(tokenRe);

                if (tokenMatch) {
                    matchedChar = tokenMatch[1];

                    // If the token is prefixed with a # we push a filterById operation to our stack
                    if (matchedChar === '#') {
                        operations.push({
                            method: filterById,
                            args: [Ext.String.trim(tokenMatch[2])]
                        });
                    }
                    // If the token is prefixed with a . we push a filterByClassName operation to our stack
                    // FIXME: Not enabled yet. just needs \. adding to the tokenRe prefix
                    else if (matchedChar === '.') {
                        operations.push({
                            method: filterByClassName,
                            args: [Ext.String.trim(tokenMatch[2])]
                        });
                    }
                    // If the token is a * or an xtype string, we push a filterByXType
                    // operation to the stack.
                    else {
                        operations.push({
                            method: filterByXType,
                            args: [Ext.String.trim(tokenMatch[2]), Boolean(tokenMatch[3])]
                        });
                    }

                    // Now we slice of the part we just converted into an operation
                    selector = selector.replace(tokenMatch[0], '');
                }

                // If the next part of the query is not a space or > or ^, it means we
                // are going to check for more things that our current selection
                // has to comply to.
                while (!(modeMatch = selector.match(modeRe))) {
                    // Lets loop over each type of matcher and execute it
                    // on our current selector.
                    for (i = 0; selector && i < length; i++) {
                        matcher = matchers[i];
                        selectorMatch = selector.match(matcher.re);
                        method = matcher.method;

                        // If we have a match, add an operation with the method
                        // associated with this matcher, and pass the regular
                        // expression matches are arguments to the operation.
                        if (selectorMatch) {
                            operations.push({
                                method: Ext.isString(matcher.method)
                                    // Turn a string method into a function by formatting the string with our selector matche expression
                                    // A new method is created for different match expressions, eg {id=='textfield-1024'}
                                    // Every expression may be different in different selectors.
                                    ? Ext.functionFactory('items', Ext.String.format.apply(Ext.String, [method].concat(selectorMatch.slice(1))))
                                    : matcher.method,
                                args: selectorMatch.slice(1)
                            });
                            selector = selector.replace(selectorMatch[0], '');
                            break; // Break on match
                        }
                    }
                }

                // Now we are going to check for a mode change. This means a space
                // or a > to determine if we are going to select all the children
                // of the currently matched items, or a ^ if we are going to use the
                // ownerCt axis as the candidate source.
                if (modeMatch[1]) { // Assignment, and test for truthiness!
                    operations.push({
                        mode: modeMatch[2]||modeMatch[1]
                    });
                    selector = selector.replace(modeMatch[0], '');
                }
            }

            //  Now that we have all our operations in an array, we are going
            // to create a new Query using these operations.
            return new cq.Query({
                operations: operations
            });
        }
    });
});
/**
 * @private
 *
 * <p>Provides a registry of all Components (instances of {@link Ext.Component} or any subclass
 * thereof) on a page so that they can be easily accessed by {@link Ext.Component component}
 * {@link Ext.Component#getId id} (see {@link #get}, or the convenience method {@link Ext#getCmp Ext.getCmp}).</p>
 * <p>This object also provides a registry of available Component <i>classes</i>
 * indexed by a mnemonic code known as the Component's `xtype`.
 * The <code>xtype</code> provides a way to avoid instantiating child Components
 * when creating a full, nested config object for a complete Ext page.</p>
 * <p>A child Component may be specified simply as a <i>config object</i>
 * as long as the correct `xtype` is specified so that if and when the Component
 * needs rendering, the correct type can be looked up for lazy instantiation.</p>
 * <p>For a list of all available `xtype`, see {@link Ext.Component}.</p>
 */
Ext.define('Ext.ComponentManager', {
    alternateClassName: 'Ext.ComponentMgr',
    singleton: true,

    constructor: function() {
        var map = {};

        // The sole reason for this is just to support the old code of ComponentQuery
        this.all = {
            map: map,

            getArray: function() {
                var list = [],
                    id;

                for (id in map) {
                    list.push(map[id]);
                }

                return list;
            }
        };

        this.map = map;
    },

    /**
     * Registers an item to be managed
     * @param {Object} component The item to register
     */
    register: function(component) {
        var id = component.getId();


        this.map[component.getId()] = component;
    },

    /**
     * Unregisters an item by removing it from this manager
     * @param {Object} component The item to unregister
     */
    unregister: function(component) {
        delete this.map[component.getId()];
    },

    /**
     * Checks if an item type is registered.
     * @param {String} component The mnemonic string by which the class may be looked up
     * @return {Boolean} Whether the type is registered.
     */
    isRegistered : function(component){
        return this.map[component] !== undefined;
    },

    /**
     * Returns an item by id.
     * For additional details see {@link Ext.util.HashMap#get}.
     * @param {String} id The id of the item
     * @return {Object} The item, undefined if not found.
     */
    get: function(id) {
        return this.map[id];
    },

    /**
     * Creates a new Component from the specified config object using the
     * config object's xtype to determine the class to instantiate.
     * @param {Object} config A configuration object for the Component you wish to create.
     * @param {Function} defaultType (optional) The constructor to provide the default Component type if
     * the config object does not contain a <code>xtype</code>. (Optional if the config contains a <code>xtype</code>).
     * @return {Ext.Component} The newly instantiated Component.
     */
    create: function(component, defaultType) {
        if (component.isComponent) {
            return component;
        }
        else if (Ext.isString(component)) {
            return Ext.createByAlias('widget.' + component);
        }
        else {
            var type = component.xtype || defaultType;

            return Ext.createByAlias('widget.' + type, component);
        }
    },

    registerType: Ext.emptyFn
});

/**
 * Base class for all mixins.
 * @private
 */
Ext.define('Ext.mixin.Mixin', {
    onClassExtended: function(cls, data) {
        var mixinConfig = data.mixinConfig,
            parentClassMixinConfig,
            beforeHooks, afterHooks;

        if (mixinConfig) {
            parentClassMixinConfig = cls.superclass.mixinConfig;

            if (parentClassMixinConfig) {
                mixinConfig = data.mixinConfig = Ext.merge({}, parentClassMixinConfig, mixinConfig);
            }

            data.mixinId = mixinConfig.id;

            beforeHooks = mixinConfig.beforeHooks;
            afterHooks = mixinConfig.hooks || mixinConfig.afterHooks;

            if (beforeHooks || afterHooks) {
                Ext.Function.interceptBefore(data, 'onClassMixedIn', function(targetClass) {
                    var mixin = this.prototype;

                    if (beforeHooks) {
                        Ext.Object.each(beforeHooks, function(from, to) {
                            targetClass.override(to, function() {
                                if (mixin[from].apply(this, arguments) !== false) {
                                    return this.callOverridden(arguments);
                                }
                            });
                        });
                    }

                    if (afterHooks) {
                        Ext.Object.each(afterHooks, function(from, to) {
                            targetClass.override(to, function() {
                                var ret = this.callOverridden(arguments);

                                mixin[from].apply(this, arguments);

                                return ret;
                            });
                        });
                    }
                });
            }
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.behavior.Behavior', {
    constructor: function(component) {
        this.component = component;

        component.on('destroy', 'onComponentDestroy', this);
    },

    onComponentDestroy: Ext.emptyFn
});

/**
 * Mixin that provides a common interface for publishing events. Classes using this mixin can use the {@link #fireEvent}
 * and {@link #fireAction} methods to notify listeners of events on the class.
 *
 * Classes can also define a {@link #listeners} config to add an event hanler to the current object. See
 * {@link #addListener} for more details.
 *
 * ## Example
 *
 *     Ext.define('Employee', {
 *         mixins: ['Ext.mixin.Observable'],
 *
 *         config: {
 *             fullName: ''
 *         },
 *
 *         constructor: function(config) {
 *             this.initConfig(config);  // We need to initialize the config options when the class is instantiated
 *         },
 *
 *         quitJob: function() {
 *              this.fireEvent('quit');
 *         }
 *     });
 *
 *     var newEmployee = Ext.create('Employee', {
 *
 *         fullName: 'Ed Spencer',
 *
 *         listeners: {
 *             quit: function() { // This function will be called when the 'quit' event is fired
 *                 // By default, "this" will be the object that fired the event.
 *                 console.log(this.getFullName() + " has quit!");
 *             }
 *         }
 *     });
 *
 *     newEmployee.quitJob(); // Will log 'Ed Spencer has quit!'
 *
 *  @aside guide events
 */
Ext.define('Ext.mixin.Observable', {

    requires: ['Ext.event.Dispatcher'],

    extend: 'Ext.mixin.Mixin',

    mixins: ['Ext.mixin.Identifiable'],

    mixinConfig: {
        id: 'observable',
        hooks: {
            destroy: 'destroy'
        }
    },

    alternateClassName: 'Ext.util.Observable',

    // @private
    isObservable: true,

    observableType: 'observable',

    validIdRegex: /^([\w\-]+)$/,

    observableIdPrefix: '#',

    listenerOptionsRegex: /^(?:delegate|single|delay|buffer|args|prepend)$/,

    config: {
        /**
         * @cfg {Object} listeners
         *
         * A config object containing one or more event handlers to be added to this object during initialization. This
         * should be a valid listeners config object as specified in the {@link #addListener} example for attaching
         * multiple handlers at once.
         *
         * See the [Event guide](#!/guide/events) for more
         *
         * **Note** it is bad practice to specify a listeners config when you are defining a class using Ext.define.
         * Instead, only specify listeners when you are instantiating your class with Ext.create.
         * @accessor
         */
        listeners: null,

        /**
         * @cfg {String/String[]} bubbleEvents The event name to bubble, or an Array of event names.
         * @accessor
         */
        bubbleEvents: null
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    applyListeners: function(listeners) {
        if (listeners) {
            this.addListener(listeners);
        }
    },

    applyBubbleEvents: function(bubbleEvents) {
        if (bubbleEvents) {
            this.enableBubble(bubbleEvents);
        }
    },

    getOptimizedObservableId: function() {
        return this.observableId;
    },

    getObservableId: function() {
        if (!this.observableId) {
            var id = this.getUniqueId();


            this.observableId = this.observableIdPrefix + id;

            this.getObservableId = this.getOptimizedObservableId;
        }

        return this.observableId;
    },

    getOptimizedEventDispatcher: function() {
        return this.eventDispatcher;
    },

    getEventDispatcher: function() {
        if (!this.eventDispatcher) {
            this.eventDispatcher = Ext.event.Dispatcher.getInstance();
            this.getEventDispatcher = this.getOptimizedEventDispatcher;

            this.getListeners();
            this.getBubbleEvents();
        }

        return this.eventDispatcher;
    },

    getManagedListeners: function(object, eventName) {
        var id = object.getUniqueId(),
            managedListeners = this.managedListeners;

        if (!managedListeners) {
            this.managedListeners = managedListeners = {};
        }

        if (!managedListeners[id]) {
            managedListeners[id] = {};
            object.doAddListener('destroy', 'clearManagedListeners', this, {
                single: true,
                args: [object]
            });
        }

        if (!managedListeners[id][eventName]) {
            managedListeners[id][eventName] = [];
        }

        return managedListeners[id][eventName];
    },

    getUsedSelectors: function() {
        var selectors = this.usedSelectors;

        if (!selectors) {
            selectors = this.usedSelectors = [];
            selectors.$map = {};
        }

        return selectors;
    },

    /**
     * Fires the specified event with the passed parameters (minus the event name, plus the `options` object passed
     * to {@link #addListener}).
     *
     * The first argument is the name of the event. Every other argument passed will be available when you listen for 
     * the event.
     *
     * ## Example
     *
     * Firstly, we set up a listener for our new event.
     *     
     *     this.on('myevent', function(arg1, arg2, arg3, arg4, options, e) {
     *         console.log(arg1); // true
     *         console.log(arg2); // 2
     *         console.log(arg3); // { test: 'foo' }
     *         console.log(arg4); // 14
     *         console.log(options); // the options added when adding the listener
     *         console.log(e); // the event object with information about the event
     *     });
     *
     * And then we can fire off the event.
     * 
     *     this.fireEvent('myevent', true, 2, { test: 'foo' }, 14);
     *
     * An event may be set to bubble up an Observable parent hierarchy by calling {@link #enableBubble}.
     *
     * @param {String} eventName The name of the event to fire.
     * @param {Object...} args Variable number of parameters are passed to handlers.
     * @return {Boolean} returns false if any of the handlers return false otherwise it returns true.
     */
    fireEvent: function(eventName) {
        var args = Array.prototype.slice.call(arguments, 1);

        return this.doFireEvent(eventName, args);
    },

    /**
     * Fires the specified event with the passed parameters and execute a function (action)
     * at the end if there are no listeners that return false.
     *
     * @param {String} eventName The name of the event to fire.
     * @param {Array} args Arguments to pass to handers
     * @param {Function} fn Action
     * @param {Object} scope scope of fn
     */
    fireAction: function(eventName, args, fn, scope, options, order) {
        var fnType = typeof fn,
            action;

        if (args === undefined) {
            args = [];
        }

        if (fnType != 'undefined') {
            action = {
                fn: fn,
                isLateBinding: fnType == 'string',
                scope: scope || this,
                options: options || {},
                order: order
            };
        }

        return this.doFireEvent(eventName, args, action);
    },

    doFireEvent: function(eventName, args, action, connectedController) {
        if (this.eventFiringSuspended) {
            return;
        }

        var id = this.getObservableId(),
            dispatcher = this.getEventDispatcher();

        return dispatcher.dispatchEvent(this.observableType, id, eventName, args, action, connectedController);
    },

    /**
     * @private
     * @param name
     * @param fn
     * @param scope
     * @param options
     */
    doAddListener: function(name, fn, scope, options, order) {
        var isManaged = (scope && scope !== this && scope.isIdentifiable),
            usedSelectors = this.getUsedSelectors(),
            usedSelectorsMap = usedSelectors.$map,
            selector = this.getObservableId(),
            isAdded, managedListeners, delegate;

        if (!options) {
            options = {};
        }

        if (!scope) {
            scope = this;
        }

        if (options.delegate) {
            delegate = options.delegate;
            // See https://sencha.jira.com/browse/TOUCH-1579
            selector += ' ' + delegate;
        }

        if (!(selector in usedSelectorsMap)) {
            usedSelectorsMap[selector] = true;
            usedSelectors.push(selector);
        }

        isAdded = this.addDispatcherListener(selector, name, fn, scope, options, order);

        if (isAdded && isManaged) {
            managedListeners = this.getManagedListeners(scope, name);
            managedListeners.push({
                delegate: delegate,
                scope: scope,
                fn: fn,
                order: order
            });
        }

        return isAdded;
    },

    addDispatcherListener: function(selector, name, fn, scope, options, order) {
        return this.getEventDispatcher().addListener(this.observableType, selector, name, fn, scope, options, order);
    },

    doRemoveListener: function(name, fn, scope, options, order) {
        var isManaged = (scope && scope !== this && scope.isIdentifiable),
            selector = this.getObservableId(),
            isRemoved,
            managedListeners, i, ln, listener, delegate;

        if (options && options.delegate) {
            delegate = options.delegate;
            // See https://sencha.jira.com/browse/TOUCH-1579
            selector += ' ' + delegate;
        }

        if (!scope) {
            scope = this;
        }

        isRemoved = this.removeDispatcherListener(selector, name, fn, scope, order);

        if (isRemoved && isManaged) {
            managedListeners = this.getManagedListeners(scope, name);

            for (i = 0,ln = managedListeners.length; i < ln; i++) {
                listener = managedListeners[i];

                if (listener.fn === fn && listener.scope === scope && listener.delegate === delegate && listener.order === order) {
                    managedListeners.splice(i, 1);
                    break;
                }
            }
        }

        return isRemoved;
    },

    removeDispatcherListener: function(selector, name, fn, scope, order) {
        return this.getEventDispatcher().removeListener(this.observableType, selector, name, fn, scope, order);
    },

    clearManagedListeners: function(object) {
        var managedListeners = this.managedListeners,
            id, namedListeners, listeners, eventName, i, ln, listener, options;

        if (!managedListeners) {
            return this;
        }

        if (object) {
            if (typeof object != 'string') {
                id = object.getUniqueId();
            }
            else {
                id = object;
            }

            namedListeners = managedListeners[id];

            for (eventName in namedListeners) {
                if (namedListeners.hasOwnProperty(eventName)) {
                    listeners = namedListeners[eventName];

                    for (i = 0,ln = listeners.length; i < ln; i++) {
                        listener = listeners[i];

                        options = {};

                        if (listener.delegate) {
                            options.delegate = listener.delegate;
                        }

                        if (this.doRemoveListener(eventName, listener.fn, listener.scope, options, listener.order)) {
                            i--;
                            ln--;
                        }
                    }
                }
            }

            delete managedListeners[id];
            return this;
        }

        for (id in managedListeners) {
            if (managedListeners.hasOwnProperty(id)) {
                this.clearManagedListeners(id);
            }
        }
    },

    /**
     * @private
     * @param operation
     * @param eventName
     * @param fn
     * @param scope
     * @param options
     * @param order
     */
    changeListener: function(actionFn, eventName, fn, scope, options, order) {
        var eventNames,
            listeners,
            listenerOptionsRegex,
            actualOptions,
            name, value, i, ln, listener, valueType;

        if (typeof fn != 'undefined') {
            // Support for array format to add multiple listeners
            if (typeof eventName != 'string') {
                for (i = 0,ln = eventName.length; i < ln; i++) {
                    name = eventName[i];

                    actionFn.call(this, name, fn, scope, options, order);
                }

                return this;
            }

            actionFn.call(this, eventName, fn, scope, options, order);
        }
        else if (Ext.isArray(eventName)) {
            listeners = eventName;

            for (i = 0,ln = listeners.length; i < ln; i++) {
                listener = listeners[i];

                actionFn.call(this, listener.event, listener.fn, listener.scope, listener, listener.order);
            }
        }
        else {
            listenerOptionsRegex = this.listenerOptionsRegex;
            options = eventName;
            eventNames = [];
            listeners = [];
            actualOptions = {};

            for (name in options) {
                value = options[name];

                if (name === 'scope') {
                    scope = value;
                    continue;
                }
                else if (name === 'order') {
                    order = value;
                    continue;
                }

                if (!listenerOptionsRegex.test(name)) {
                    valueType = typeof value;

                    if (valueType != 'string' && valueType != 'function') {
                        actionFn.call(this, name, value.fn, value.scope || scope, value, value.order || order);
                        continue;
                    }

                    eventNames.push(name);
                    listeners.push(value);
                }
                else {
                    actualOptions[name] = value;
                }
            }

            for (i = 0,ln = eventNames.length; i < ln; i++) {
                actionFn.call(this, eventNames[i], listeners[i], scope, actualOptions, order);
            }
        }

    },

    /**
     * Appends an event handler to this object. You can review the available handlers by looking at the 'events'
     * section of the documentation for the component you are working with.
     *
     * ## Combining Options
     *
     * Using the options argument, it is possible to combine different types of listeners:
     *
     * A delayed, one-time listener:
     *
     *     container.on('tap', this.handleTap, this, {
     *         single: true,
     *         delay: 100
     *     });
     *
     * ## Attaching multiple handlers in 1 call
     *
     * The method also allows for a single argument to be passed which is a config object containing properties which
     * specify multiple events. For example:
     *
     *     container.on({
     *         tap  : this.onTap,
     *         swipe: this.onSwipe,
     *
     *         scope: this // Important. Ensure "this" is correct during handler execution
     *     });
     *
     * One can also specify options for each event handler separately:
     *
     *     container.on({
     *         tap  : { fn: this.onTap, scope: this, single: true },
     *         swipe: { fn: button.onSwipe, scope: button }
     *     });
     *
     * See the [Events Guide](#!/guide/events) for more.
     *
     * @param {String} eventName The name of the event to listen for. May also be an object who's property names are
     * event names.
     * @param {Function} fn The method the event invokes.  Will be called with arguments given to
     * {@link #fireEvent} plus the `options` parameter described below.
     * @param {Object} [scope] The scope (`this` reference) in which the handler function is executed. **If
     * omitted, defaults to the object which fired the event.**
     * @param {Object} [options] An object containing handler configuration.
     *
     * This object may contain any of the following properties:
     *
     * - **scope** : Object
     *
     *   The scope (`this` reference) in which the handler function is executed. **If omitted, defaults to the object
     *   which fired the event.**
     *
     * - **delay** : Number
     *
     *   The number of milliseconds to delay the invocation of the handler after the event fires.
     *
     * - **single** : Boolean
     *
     *   True to add a handler to handle just the next firing of the event, and then remove itself.
     *
     * - **order** : String
     *
     *   The order of when the listener should be added into the listener queue.
     *
     *   If you set an order of `before` and the event you are listening to is preventable, you can return `false` and it will stop the event.
     *
     *   Available options are `before`, `current` and `after`. Defaults to `current`.
     *
     * - **buffer** : Number
     *
     *   Causes the handler to be delayed by the specified number of milliseconds. If the event fires again within that
     *   time, the original handler is _not_ invoked, but the new handler is scheduled in its place.
     *
     * - **element** : String
     *
     *   Allows you to add a listener onto a element of this component using the elements reference.
     *
     *       Ext.create('Ext.Component', {
     *           listeners: {
     *               element: 'element',
     *               tap: function() {
     *                   console.log('element tap!');
     *               }
     *           }
     *       });
     *
     *   All components have the `element` reference, which is the outer most element of the component. {@link Ext.Container} also has the
     *   `innerElement` element which contains all children. In most cases `element` is adequate.
     *
     * - **delegate** : String
     *
     *   Uses {@link Ext.ComponentQuery} to delegate events to a specified query selector within this item.
     *
     *       // Create a container with a two children; a button and a toolbar
     *       var container = Ext.create('Ext.Container', {
     *           items: [
     *               {
     *                  xtype: 'toolbar',
     *                  docked: 'top',
     *                  title: 'My Toolbar'
     *               },
     *               {
     *                  xtype: 'button',
     *                  text: 'My Button'
     *               }
     *           ]
     *       });
     *
     *       container.on({
     *           // Ext.Buttons have an xtype of 'button', so we use that are a selector for our delegate
     *           delegate: 'button',
     *
     *           tap: function() {
     *               alert('Button tapped!');
     *           }
     *       });
     *
     * @param {String} [order='current'] The order of when the listener should be added into the listener queue.
     * Possible values are `before`, `current` and `after`.
     */
    addListener: function(eventName, fn, scope, options, order) {
        return this.changeListener(this.doAddListener, eventName, fn, scope, options, order);
    },

    /**
     * Appends a before-event handler.  Returning `false` from the handler will stop the event.
     *
     * Same as {@link #addListener} with `order` set to `'before'`.
     *
     * @param {String} eventName The name of the event to listen for.
     * @param {Function} fn The method the event invokes.
     * @param {Object} [scope] The scope for `fn`.
     * @param {Object} [options] An object containing handler configuration.
     */
    addBeforeListener: function(eventName, fn, scope, options) {
        return this.addListener(eventName, fn, scope, options, 'before');
    },

    /**
     * Appends an after-event handler.
     *
     * Same as {@link #addListener} with `order` set to `'after'`.
     *
     * @param {String} eventName The name of the event to listen for.
     * @param {Function} fn The method the event invokes.
     * @param {Object} [scope] The scope for `fn`.
     * @param {Object} [options] An object containing handler configuration.
     */
    addAfterListener: function(eventName, fn, scope, options) {
        return this.addListener(eventName, fn, scope, options, 'after');
    },

    /**
     * Removes an event handler.
     *
     * @param {String} eventName The type of event the handler was associated with.
     * @param {Function} fn The handler to remove. **This must be a reference to the function passed into the
     * {@link #addListener} call.**
     * @param {Object} [scope] The scope originally specified for the handler. It must be the same as the
     * scope argument specified in the original call to {@link #addListener} or the listener will not be removed.
     * @param {Object} [options] Extra options object. See {@link #addListener} for details.
     * @param {String} [order='current'] The order of the listener to remove.
     * Possible values are `before`, `current` and `after`.
     */
    removeListener: function(eventName, fn, scope, options, order) {
        return this.changeListener(this.doRemoveListener, eventName, fn, scope, options, order);
    },

    /**
     * Removes a before-event handler.
     *
     * Same as {@link #removeListener} with `order` set to `'before'`.
     *
     * @param {String} eventName The name of the event the handler was associated with.
     * @param {Function} fn The handler to remove.
     * @param {Object} [scope] The scope originally specified for `fn`.
     * @param {Object} [options] Extra options object.
     */
    removeBeforeListener: function(eventName, fn, scope, options) {
        return this.removeListener(eventName, fn, scope, options, 'before');
    },

    /**
     * Removes a before-event handler.
     *
     * Same as {@link #removeListener} with `order` set to `'after'`.
     *
     * @param {String} eventName The name of the event the handler was associated with.
     * @param {Function} fn The handler to remove.
     * @param {Object} [scope] The scope originally specified for `fn`.
     * @param {Object} [options] Extra options object.
     */
    removeAfterListener: function(eventName, fn, scope, options) {
        return this.removeListener(eventName, fn, scope, options, 'after');
    },

    /**
     * Removes all listeners for this object.
     */
    clearListeners: function() {
        var usedSelectors = this.getUsedSelectors(),
            dispatcher = this.getEventDispatcher(),
            i, ln, selector;

        for (i = 0,ln = usedSelectors.length; i < ln; i++) {
            selector = usedSelectors[i];

            dispatcher.clearListeners(this.observableType, selector);
        }
    },

    /**
     * Checks to see if this object has any listeners for a specified event
     *
     * @param {String} eventName The name of the event to check for
     * @return {Boolean} True if the event is being listened for, else false
     */
    hasListener: function(eventName) {
        return this.getEventDispatcher().hasListener(this.observableType, this.getObservableId(), eventName);
    },

    /**
     * Suspends the firing of all events. (see {@link #resumeEvents})
     *
     * @param {Boolean} queueSuspended Pass as true to queue up suspended events to be fired
     * after the {@link #resumeEvents} call instead of discarding all suspended events.
     */
    suspendEvents: function(queueSuspended) {
        this.eventFiringSuspended = true;
    },

    /**
     * Resumes firing events (see {@link #suspendEvents}).
     *
     * If events were suspended using the `queueSuspended` parameter, then all events fired
     * during event suspension will be sent to any listeners now.
     */
    resumeEvents: function() {
        this.eventFiringSuspended = false;
    },

    /**
     * Relays selected events from the specified Observable as if the events were fired by <code><b>this</b></code>.
     * @param {Object} object The Observable whose events this object is to relay.
     * @param {String/Array/Object} events Array of event names to relay.
     */
    relayEvents: function(object, events, prefix) {
        var i, ln, oldName, newName;

        if (typeof prefix == 'undefined') {
            prefix = '';
        }

        if (typeof events == 'string') {
            events = [events];
        }

        if (Ext.isArray(events)) {
            for (i = 0,ln = events.length; i < ln; i++) {
                oldName = events[i];
                newName = prefix + oldName;

                object.addListener(oldName, this.createEventRelayer(newName), this);
            }
        }
        else {
            for (oldName in events) {
                if (events.hasOwnProperty(oldName)) {
                    newName = prefix + events[oldName];

                    object.addListener(oldName, this.createEventRelayer(newName), this);
                }
            }
        }

        return this;
    },

    /**
     * @private
     * @param args
     * @param fn
     */
    relayEvent: function(args, fn, scope, options, order) {
        var fnType = typeof fn,
            controller = args[args.length - 1],
            eventName = controller.getInfo().eventName,
            action;

        args = Array.prototype.slice.call(args, 0, -2);
        args[0] = this;

        if (fnType != 'undefined') {
            action = {
                fn: fn,
                scope: scope || this,
                options: options || {},
                order: order,
                isLateBinding: fnType == 'string'
            };
        }

        return this.doFireEvent(eventName, args, action, controller);
    },

    /**
     * @private
     * Creates an event handling function which refires the event from this object as the passed event name.
     * @param newName
     * @returns {Function}
     */
    createEventRelayer: function(newName){
        return function() {
            return this.doFireEvent(newName, Array.prototype.slice.call(arguments, 0, -2));
        }
    },

    /**
     * Enables events fired by this Observable to bubble up an owner hierarchy by calling `this.getBubbleTarget()` if
     * present. There is no implementation in the Observable base class.
     *
     * @param {String/String[]} events The event name to bubble, or an Array of event names.
     */
    enableBubble: function(events) {
        var isBubblingEnabled = this.isBubblingEnabled,
            i, ln, name;

        if (!isBubblingEnabled) {
            isBubblingEnabled = this.isBubblingEnabled = {};
        }

        if (typeof events == 'string') {
            events = Ext.Array.clone(arguments);
        }

        for (i = 0,ln = events.length; i < ln; i++) {
            name = events[i];

            if (!isBubblingEnabled[name]) {
                isBubblingEnabled[name] = true;
                this.addListener(name, this.createEventBubbler(name), this);
            }
        }
    },

    createEventBubbler: function(name) {
        return function doBubbleEvent() {
            var bubbleTarget = ('getBubbleTarget' in this) ? this.getBubbleTarget() : null;

            if (bubbleTarget && bubbleTarget !== this && bubbleTarget.isObservable) {
                bubbleTarget.fireAction(name, Array.prototype.slice.call(arguments, 0, -2), doBubbleEvent, bubbleTarget, null, 'after');
            }
        }
    },

    getBubbleTarget: function() {
        return false;
    },

    destroy: function() {
        if (this.observableId) {
            this.fireEvent('destroy', this);
            this.clearListeners();
            this.clearManagedListeners();
        }
    },

    addEvents: Ext.emptyFn

}, function() {
    this.createAlias({
        /**
         * @method
         * Alias for {@link #addListener}.
         * @inheritdoc Ext.mixin.Observable#addListener
         */
        on: 'addListener',
        /**
         * @method
         * Alias for {@link #removeListener}.
         * @inheritdoc Ext.mixin.Observable#removeListener
         */
        un: 'removeListener',
        /**
         * @method
         * Alias for {@link #addBeforeListener}.
         * @inheritdoc Ext.mixin.Observable#addBeforeListener
         */
        onBefore: 'addBeforeListener',
        /**
         * @method
         * Alias for {@link #addAfterListener}.
         * @inheritdoc Ext.mixin.Observable#addAfterListener
         */
        onAfter: 'addAfterListener',
        /**
         * @method
         * Alias for {@link #removeBeforeListener}.
         * @inheritdoc Ext.mixin.Observable#removeBeforeListener
         */
        unBefore: 'removeBeforeListener',
        /**
         * @method
         * Alias for {@link #removeAfterListener}.
         * @inheritdoc Ext.mixin.Observable#removeAfterListener
         */
        unAfter: 'removeAfterListener'
    });

});

/**
 * This class parses the XTemplate syntax and calls abstract methods to process the parts.
 * @private
 */
Ext.define('Ext.XTemplateParser', {
    constructor: function (config) {
        Ext.apply(this, config);
    },

    /**
     * @property {Number} level The 'for' loop context level. This is adjusted up by one
     * prior to calling {@link #doFor} and down by one after calling the corresponding
     * {@link #doEnd} that closes the loop. This will be 1 on the first {@link #doFor}
     * call.
     */

    /**
     * This method is called to process a piece of raw text from the tpl.
     * @param {String} text
     * @method doText
     */
    // doText: function (text)

    /**
     * This method is called to process expressions (like `{[expr]}`).
     * @param {String} expr The body of the expression (inside "{[" and "]}").
     * @method doExpr
     */
    // doExpr: function (expr)

    /**
     * This method is called to process simple tags (like `{tag}`).
     * @method doTag
     */
    // doTag: function (tag)

    /**
     * This method is called to process `<tpl else>`.
     * @method doElse
     */
    // doElse: function ()

    /**
     * This method is called to process `{% text %}`.
     * @param {String} text
     * @method doEval
     */
    // doEval: function (text)

    /**
     * This method is called to process `<tpl if="action">`. If there are other attributes,
     * these are passed in the actions object.
     * @param {String} action
     * @param {Object} actions Other actions keyed by the attribute name (such as 'exec').
     * @method doIf
     */
    // doIf: function (action, actions)

    /**
     * This method is called to process `<tpl elseif="action">`. If there are other attributes,
     * these are passed in the actions object.
     * @param {String} action
     * @param {Object} actions Other actions keyed by the attribute name (such as 'exec').
     * @method doElseIf
     */
    // doElseIf: function (action, actions)

    /**
     * This method is called to process `<tpl switch="action">`. If there are other attributes,
     * these are passed in the actions object.
     * @param {String} action
     * @param {Object} actions Other actions keyed by the attribute name (such as 'exec').
     * @method doSwitch
     */
    // doSwitch: function (action, actions)

    /**
     * This method is called to process `<tpl case="action">`. If there are other attributes,
     * these are passed in the actions object.
     * @param {String} action
     * @param {Object} actions Other actions keyed by the attribute name (such as 'exec').
     * @method doCase
     */
    // doCase: function (action, actions)

    /**
     * This method is called to process `<tpl default>`.
     * @method doDefault
     */
    // doDefault: function ()

    /**
     * This method is called to process `</tpl>`. It is given the action type that started
     * the tpl and the set of additional actions.
     * @param {String} type The type of action that is being ended.
     * @param {Object} actions The other actions keyed by the attribute name (such as 'exec').
     * @method doEnd
     */
    // doEnd: function (type, actions) 

    /**
     * This method is called to process `<tpl for="action">`. If there are other attributes,
     * these are passed in the actions object.
     * @param {String} action
     * @param {Object} actions Other actions keyed by the attribute name (such as 'exec').
     * @method doFor
     */
    // doFor: function (action, actions)

    /**
     * This method is called to process `<tpl exec="action">`. If there are other attributes,
     * these are passed in the actions object.
     * @param {String} action
     * @param {Object} actions Other actions keyed by the attribute name.
     * @method doExec
     */
    // doExec: function (action, actions)

    /**
     * This method is called to process an empty `<tpl>`. This is unlikely to need to be
     * implemented, so a default (do nothing) version is provided.
     * @method
     */
    doTpl: Ext.emptyFn,

    parse: function (str) {
        var me = this,
            len = str.length,
            aliases = { elseif: 'elif' },
            topRe = me.topRe,
            actionsRe = me.actionsRe,
            index, stack, s, m, t, prev, frame, subMatch, begin, end, actions,
            prop;

        me.level = 0;
        me.stack = stack = [];

        for (index = 0; index < len; index = end) {
            topRe.lastIndex = index;
            m = topRe.exec(str);

            if (!m) {
                me.doText(str.substring(index, len));
                break;
            }

            begin = m.index;
            end = topRe.lastIndex;

            if (index < begin) {
                me.doText(str.substring(index, begin));
            }

            if (m[1]) {
                end = str.indexOf('%}', begin+2);
                me.doEval(str.substring(begin+2, end));
                end += 2;
            } else if (m[2]) {
                end = str.indexOf(']}', begin+2);
                me.doExpr(str.substring(begin+2, end));
                end += 2;
            } else if (m[3]) { // if ('{' token)
                me.doTag(m[3]);
            } else if (m[4]) { // content of a <tpl xxxxxx xxx> tag
                actions = null;
                while ((subMatch = actionsRe.exec(m[4])) !== null) {
                    s = subMatch[2] || subMatch[3];
                    if (s) {
                        s = Ext.String.htmlDecode(s); // decode attr value
                        t = subMatch[1];
                        t = aliases[t] || t;
                        actions = actions || {};
                        prev = actions[t];

                        if (typeof prev == 'string') {
                            actions[t] = [prev, s];
                        } else if (prev) {
                            actions[t].push(s);
                        } else {
                            actions[t] = s;
                        }
                    }
                }

                if (!actions) {
                    if (me.elseRe.test(m[4])) {
                        me.doElse();
                    } else if (me.defaultRe.test(m[4])) {
                        me.doDefault();
                    } else {
                        me.doTpl();
                        stack.push({ type: 'tpl' });
                    }
                }
                else if (actions['if']) {
                    me.doIf(actions['if'], actions);
                    stack.push({ type: 'if' });
                }
                else if (actions['switch']) {
                    me.doSwitch(actions['switch'], actions);
                    stack.push({ type: 'switch' });
                }
                else if (actions['case']) {
                    me.doCase(actions['case'], actions);
                }
                else if (actions['elif']) {
                    me.doElseIf(actions['elif'], actions);
                }
                else if (actions['for']) {
                    ++me.level;

                    // Extract property name to use from indexed item
                    if (prop = me.propRe.exec(m[4])) {
                        actions.propName = prop[1] || prop[2];
                    }
                    me.doFor(actions['for'], actions);
                    stack.push({ type: 'for', actions: actions });
                }
                else if (actions.exec) {
                    me.doExec(actions.exec, actions);
                    stack.push({ type: 'exec', actions: actions });
                }
                /*
                else {
                    // todo - error
                }
                */
            } else if (m[0].length === 5) {
                // if the length of m[0] is 5, assume that we're dealing with an opening tpl tag with no attributes (e.g. <tpl>...</tpl>)
                // in this case no action is needed other than pushing it on to the stack
                stack.push({ type: 'tpl' });
            } else {
                frame = stack.pop();
                me.doEnd(frame.type, frame.actions);
                if (frame.type == 'for') {
                    --me.level;
                }
            }
        }
    },

    // Internal regexes
    
    topRe:     /(?:(\{\%)|(\{\[)|\{([^{}]*)\})|(?:<tpl([^>]*)\>)|(?:<\/tpl>)/g,
    actionsRe: /\s*(elif|elseif|if|for|exec|switch|case|eval)\s*\=\s*(?:(?:"([^"]*)")|(?:'([^']*)'))\s*/g,
    propRe:    /prop=(?:(?:"([^"]*)")|(?:'([^']*)'))/,
    defaultRe: /^\s*default\s*$/,
    elseRe:    /^\s*else\s*$/
});

/**
 * @private
 */
Ext.define('Ext.fx.easing.Abstract', {

    config: {
        startTime: 0,
        startValue: 0
    },

    isEasing: true,

    isEnded: false,

    constructor: function(config) {
        this.initConfig(config);

        return this;
    },

    applyStartTime: function(startTime) {
        if (!startTime) {
            startTime = Ext.Date.now();
        }

        return startTime;
    },

    updateStartTime: function(startTime) {
        this.reset();
    },

    reset: function() {
        this.isEnded = false;
    },

    getValue: Ext.emptyFn
});

/**
 * A Traversable mixin.
 * @private
 */
Ext.define('Ext.mixin.Traversable', {
    extend: 'Ext.mixin.Mixin',

    mixinConfig: {
        id: 'traversable'
    },

    setParent: function(parent) {
        this.parent = parent;

        return this;
    },

    /**
     * @member Ext.Component
     * Returns `true` if this component has a parent.
     * @return {Boolean} `true` if this component has a parent.
     */
    hasParent: function() {
        return Boolean(this.parent);
    },

    /**
     * @member Ext.Component
     * Returns the parent of this component, if it has one.
     * @return {Ext.Component} The parent of this component.
     */
    getParent: function() {
        return this.parent;
    },

    getAncestors: function() {
        var ancestors = [],
            parent = this.getParent();

        while (parent) {
            ancestors.push(parent);
            parent = parent.getParent();
        }

        return ancestors;
    },

    getAncestorIds: function() {
        var ancestorIds = [],
            parent = this.getParent();

        while (parent) {
            ancestorIds.push(parent.getId());
            parent = parent.getParent();
        }

        return ancestorIds;
    }
});

/**
 * @private
 */
Ext.define('Ext.Evented', {

    alternateClassName: 'Ext.EventedBase',

    mixins: ['Ext.mixin.Observable'],

    statics: {
        generateSetter: function(nameMap) {
            var internalName = nameMap.internal,
                applyName = nameMap.apply,
                changeEventName = nameMap.changeEvent,
                doSetName = nameMap.doSet;

            return function(value) {
                var initialized = this.initialized,
                    oldValue = this[internalName],
                    applier = this[applyName];

                if (applier) {
                    value = applier.call(this, value, oldValue);

                    if (typeof value == 'undefined') {
                        return this;
                    }
                }

                // The old value might have been changed at this point
                // (after the apply call chain) so it should be read again
                oldValue = this[internalName];

                if (value !== oldValue) {
                    if (initialized) {
                        this.fireAction(changeEventName, [this, value, oldValue], this.doSet, this, {
                            nameMap: nameMap
                        });
                    }
                    else {
                        this[internalName] = value;
                        if (this[doSetName]) {
                            this[doSetName].call(this, value, oldValue);
                        }
                    }
                }

                return this;
            }
        }
    },

    initialized: false,

    constructor: function(config) {
        this.initialConfig = config;
        this.initialize();
    },

    initialize: function() {
        this.initConfig(this.initialConfig);
        this.initialized = true;
    },

    doSet: function(me, value, oldValue, options) {
        var nameMap = options.nameMap;

        me[nameMap.internal] = value;
        if (me[nameMap.doSet]) {
          me[nameMap.doSet].call(this, value, oldValue);
        }
    },

    onClassExtended: function(Class, data) {
        if (!data.hasOwnProperty('eventedConfig')) {
            return;
        }

        var ExtClass = Ext.Class,
            config = data.config,
            eventedConfig = data.eventedConfig,
            name, nameMap;

        data.config = (config) ? Ext.applyIf(config, eventedConfig) : eventedConfig;

        /*
         * These are generated setters for eventedConfig
         *
         * If the component is initialized, it invokes fireAction to fire the event as well,
         * which indicate something has changed. Otherwise, it just executes the action
         * (happens during initialization)
         *
         * This is helpful when we only want the event to be fired for subsequent changes.
         * Also it's a major performance improvement for instantiation when fired events
         * are mostly useless since there's no listeners
         */
        for (name in eventedConfig) {
            if (eventedConfig.hasOwnProperty(name)) {
                nameMap = ExtClass.getConfigNameMap(name);

                data[nameMap.set] = this.generateSetter(nameMap);
            }
        }
    }
});

/**
 * @private
 * This is the abstract class for {@link Ext.Component}.
 *
 * This should never be overriden.
 */
Ext.define('Ext.AbstractComponent', {
    extend: 'Ext.Evented',

    onClassExtended: function(Class, members) {
        if (!members.hasOwnProperty('cachedConfig')) {
            return;
        }

        var prototype = Class.prototype,
            config = members.config,
            cachedConfig = members.cachedConfig,
            cachedConfigList = prototype.cachedConfigList,
            hasCachedConfig = prototype.hasCachedConfig,
            name, value;

        delete members.cachedConfig;

        prototype.cachedConfigList = cachedConfigList = (cachedConfigList) ? cachedConfigList.slice() : [];
        prototype.hasCachedConfig = hasCachedConfig = (hasCachedConfig) ? Ext.Object.chain(hasCachedConfig) : {};

        if (!config) {
            members.config = config = {};
        }

        for (name in cachedConfig) {
            if (cachedConfig.hasOwnProperty(name)) {
                value = cachedConfig[name];

                if (!hasCachedConfig[name]) {
                    hasCachedConfig[name] = true;
                    cachedConfigList.push(name);
                }

                config[name] = value;
            }
        }
    },

    getElementConfig: Ext.emptyFn,

    referenceAttributeName: 'reference',

    referenceSelector: '[reference]',

    /**
     * @private
     * Significantly improve instantiation time for Component with multiple references
     * Ext.Element instance of the reference domNode is only created the very first time
     * it's ever used
     */
    addReferenceNode: function(name, domNode) {
        Ext.Object.defineProperty(this, name, {
            get: function() {
                var reference;

                delete this[name];
                this[name] = reference = new Ext.Element(domNode);
                return reference;
            },
            configurable: true
        });
    },

    initElement: function() {
        var prototype = this.self.prototype,
            id = this.getId(),
            referenceList = [],
            cleanAttributes = true,
            referenceAttributeName = this.referenceAttributeName,
            needsOptimization = false,
            renderTemplate, renderElement, element,
            referenceNodes, i, ln, referenceNode, reference,
            configNameCache, defaultConfig, cachedConfigList, initConfigList, initConfigMap, configList,
            elements, name, nameMap, internalName;

        if (prototype.hasOwnProperty('renderTemplate')) {
            renderTemplate = this.renderTemplate.cloneNode(true);
            renderElement = renderTemplate.firstChild;
        }
        else {
            cleanAttributes = false;
            needsOptimization = true;
            renderTemplate = document.createDocumentFragment();
            renderElement = Ext.Element.create(this.getElementConfig(), true);
            renderTemplate.appendChild(renderElement);
        }

        referenceNodes = renderTemplate.querySelectorAll(this.referenceSelector);

        for (i = 0,ln = referenceNodes.length; i < ln; i++) {
            referenceNode = referenceNodes[i];
            reference = referenceNode.getAttribute(referenceAttributeName);

            if (cleanAttributes) {
                referenceNode.removeAttribute(referenceAttributeName);
            }

            if (reference == 'element') {
                referenceNode.id = id;
                this.element = element = new Ext.Element(referenceNode);
            }
            else {
                this.addReferenceNode(reference, referenceNode);
            }

            referenceList.push(reference);
        }

        this.referenceList = referenceList;

        if (!this.innerElement) {
            this.innerElement = element;
        }

        if (renderElement === element.dom) {
            this.renderElement = element;
        }
        else {
            this.addReferenceNode('renderElement', renderElement);
        }

        // This happens only *once* per class, during the very first instantiation
        // to optimize renderTemplate based on cachedConfig
        if (needsOptimization) {
            configNameCache = Ext.Class.configNameCache;
            defaultConfig = this.config;
            cachedConfigList = this.cachedConfigList;
            initConfigList = this.initConfigList;
            initConfigMap = this.initConfigMap;
            configList = [];

            for (i = 0,ln = cachedConfigList.length; i < ln; i++) {
                name = cachedConfigList[i];
                nameMap = configNameCache[name];

                if (initConfigMap[name]) {
                    initConfigMap[name] = false;
                    Ext.Array.remove(initConfigList, name);
                }

                if (defaultConfig[name] !== null) {
                    configList.push(name);
                    this[nameMap.get] = this[nameMap.initGet];
                }
            }

            for (i = 0,ln = configList.length; i < ln; i++) {
                name = configList[i];
                nameMap = configNameCache[name];
                internalName = nameMap.internal;

                this[internalName] = null;
                this[nameMap.set].call(this, defaultConfig[name]);
                delete this[nameMap.get];

                prototype[internalName] = this[internalName];
            }

            renderElement = this.renderElement.dom;
            prototype.renderTemplate = renderTemplate = document.createDocumentFragment();
            renderTemplate.appendChild(renderElement.cloneNode(true));

            elements = renderTemplate.querySelectorAll('[id]');

            for (i = 0,ln = elements.length; i < ln; i++) {
                element = elements[i];
                element.removeAttribute('id');
            }

            for (i = 0,ln = referenceList.length; i < ln; i++) {
                reference = referenceList[i];
                this[reference].dom.removeAttribute('reference');
            }
        }

        return this;
    }
});

/**
 * This class compiles the XTemplate syntax into a function object. The function is used
 * like so:
 *
 *      function (out, values, parent, xindex, xcount) {
 *          // out is the output array to store results
 *          // values, parent, xindex and xcount have their historical meaning
 *      }
 *
 * @markdown
 * @private
 */
Ext.define('Ext.XTemplateCompiler', {
    extend: 'Ext.XTemplateParser',

    // Chrome really likes "new Function" to realize the code block (as in it is
    // 2x-3x faster to call it than using eval), but Firefox chokes on it badly.
    // IE and Opera are also fine with the "new Function" technique.
    useEval: Ext.isGecko,

    // See http://jsperf.com/nige-array-append for quickest way to append to an array of unknown length
    // (Due to arbitrary code execution inside a template, we cannot easily track the length in  var)
    // On IE6 and 7 myArray[myArray.length]='foo' is better. On other browsers myArray.push('foo') is better.
    useIndex: Ext.isIE6 || Ext.isIE7,

    useFormat: true,

    propNameRe: /^[\w\d\$]*$/,

    compile: function (tpl) {
        var me = this,
            code = me.generate(tpl);

        // When using "new Function", we have to pass our "Ext" variable to it in order to
        // support sandboxing. If we did not, the generated function would use the global
        // "Ext", not the "Ext" from our sandbox (scope chain).
        //
        return me.useEval ? me.evalTpl(code) : (new Function('Ext', code))(Ext);
    },

    generate: function (tpl) {
        var me = this,
            // note: Ext here is properly sandboxed
            definitions = 'var fm=Ext.util.Format,ts=Object.prototype.toString;',
            code;

        // Track how many levels we use, so that we only "var" each level's variables once
        me.maxLevel = 0;

        me.body = [
            'var c0=values, a0=' + me.createArrayTest(0) + ', p0=parent, n0=xcount, i0=xindex, v;\n'
        ];
        if (me.definitions) {
            if (typeof me.definitions === 'string') {
                me.definitions = [me.definitions, definitions ];
            } else {
                me.definitions.push(definitions);
            }
        } else {
            me.definitions = [ definitions ];
        }
        me.switches = [];

        me.parse(tpl);

        me.definitions.push(
            (me.useEval ? '$=' : 'return') + ' function (' + me.fnArgs + ') {',
                me.body.join(''),
            '}'
        );

        code = me.definitions.join('\n');

        // Free up the arrays.
        me.definitions.length = me.body.length = me.switches.length = 0;
        delete me.definitions;
        delete me.body;
        delete me.switches;

        return code;
    },

    //-----------------------------------
    // XTemplateParser callouts

    doText: function (text) {
        var me = this,
            out = me.body;

        text = text.replace(me.aposRe, "\\'").replace(me.newLineRe, '\\n');
        if (me.useIndex) {
            out.push('out[out.length]=\'', text, '\'\n');
        } else {
            out.push('out.push(\'', text, '\')\n');
        }
    },

    doExpr: function (expr) {
        var out = this.body;
        out.push('if ((v=' + expr + ')!==undefined) out');

        // Coerce value to string using concatenation of an empty string literal.
        // See http://jsperf.com/tostringvscoercion/5
        if (this.useIndex) {
             out.push('[out.length]=v+\'\'\n');
        } else {
             out.push('.push(v+\'\')\n');
        }
    },

    doTag: function (tag) {
        this.doExpr(this.parseTag(tag));
    },

    doElse: function () {
        this.body.push('} else {\n');
    },

    doEval: function (text) {
        this.body.push(text, '\n');
    },

    doIf: function (action, actions) {
        var me = this;

        // If it's just a propName, use it directly in the if
        if (action === '.') {
            me.body.push('if (values) {\n');
        } else if (me.propNameRe.test(action)) {
            me.body.push('if (', me.parseTag(action), ') {\n');
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            me.body.push('if (', me.addFn(action), me.callFn, ') {\n');
        }
        if (actions.exec) {
            me.doExec(actions.exec);
        }
    },

    doElseIf: function (action, actions) {
        var me = this;

        // If it's just a propName, use it directly in the else if
        if (action === '.') {
            me.body.push('else if (values) {\n');
        } else if (me.propNameRe.test(action)) {
            me.body.push('} else if (', me.parseTag(action), ') {\n');
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            me.body.push('} else if (', me.addFn(action), me.callFn, ') {\n');
        }
        if (actions.exec) {
            me.doExec(actions.exec);
        }
    },

    doSwitch: function (action) {
        var me = this;

        // If it's just a propName, use it directly in the switch
        if (action === '.') {
            me.body.push('switch (values) {\n');
        } else if (me.propNameRe.test(action)) {
            me.body.push('switch (', me.parseTag(action), ') {\n');
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            me.body.push('switch (', me.addFn(action), me.callFn, ') {\n');
        }
        me.switches.push(0);
    },

    doCase: function (action) {
        var me = this,
            cases = Ext.isArray(action) ? action : [action],
            n = me.switches.length - 1,
            match, i;

        if (me.switches[n]) {
            me.body.push('break;\n');
        } else {
            me.switches[n]++;
        }

        for (i = 0, n = cases.length; i < n; ++i) {
            match = me.intRe.exec(cases[i]);
            cases[i] = match ? match[1] : ("'" + cases[i].replace(me.aposRe,"\\'") + "'");
        }

        me.body.push('case ', cases.join(': case '), ':\n');
    },

    doDefault: function () {
        var me = this,
            n = me.switches.length - 1;

        if (me.switches[n]) {
            me.body.push('break;\n');
        } else {
            me.switches[n]++;
        }

        me.body.push('default:\n');
    },

    doEnd: function (type, actions) {
        var me = this,
            L = me.level-1;

        if (type == 'for') {
            /*
            To exit a for loop we must restore the outer loop's context. The code looks
            like this (which goes with that produced by doFor:

                    for (...) { // the part generated by doFor
                        ...  // the body of the for loop

                        // ... any tpl for exec statement goes here...
                    }
                    parent = p1;
                    values = r2;
                    xcount = n1;
                    xindex = i1
            */
            if (actions.exec) {
                me.doExec(actions.exec);
            }

            me.body.push('}\n');
            me.body.push('parent=p',L,';values=r',L+1,';xcount=n',L,';xindex=i',L,'\n');
        } else if (type == 'if' || type == 'switch') {
            me.body.push('}\n');
        }
    },

    doFor: function (action, actions) {
        var me = this,
            s,
            L = me.level,
            up = L-1,
            pL = 'p' + L,
            parentAssignment;

        // If it's just a propName, use it directly in the switch
        if (action === '.') {
            s = 'values';
        } else if (me.propNameRe.test(action)) {
            s = me.parseTag(action);
        }
        // Otherwise, it must be an expression, and needs to be returned from an fn which uses with(values)
        else {
            s = me.addFn(action) + me.callFn;
        }

        /*
        We are trying to produce a block of code that looks like below. We use the nesting
        level to uniquely name the control variables.

            // Omit "var " if we have already been through level 2
            var i2 = 0,
                n2 = 0,
                c2 = values['propName'],
                    // c2 is the context object for the for loop
                a2 = Array.isArray(c2);
                p2 = c1,
                    // p2 is the parent context (of the outer for loop)
                r2 = values
                    // r2 is the values object to

            // If iterating over the current data, the parent is always set to c2
            parent = c2;
            // If iterating over a property in an object, set the parent to the object
            parent = a1 ? c1[i1] : p2 // set parent
            if (c2) {
                if (a2) {
                    n2 = c2.length;
                } else if (c2.isMixedCollection) {
                    c2 = c2.items;
                    n2 = c2.length;
                } else if (c2.isStore) {
                    c2 = c2.data.items;
                    n2 = c2.length;
                } else {
                    c2 = [ c2 ];
                    n2 = 1;
                }
            }
            // i2 is the loop index and n2 is the number (xcount) of this for loop
            for (xcount = n2; i2 < n2; ++i2) {
                values = c2[i2]           // adjust special vars to inner scope
                xindex = i2 + 1           // xindex is 1-based

        The body of the loop is whatever comes between the tpl and /tpl statements (which
        is handled by doEnd).
        */

        // Declare the vars for a particular level only if we have not already declared them.
        if (me.maxLevel < L) {
            me.maxLevel = L;
            me.body.push('var ');
        }

        if (action == '.') {
            parentAssignment = 'c' + L;
        } else {
            parentAssignment = 'a' + up + '?c' + up + '[i' + up + ']:p' + L;
        }

        me.body.push('i',L,'=0,n', L, '=0,c',L,'=',s,',a',L,'=', me.createArrayTest(L), ',p',L,'=c',up,',r',L,'=values;\n',
            'parent=',parentAssignment,'\n',
            'if (c',L,'){if(a',L,'){n', L,'=c', L, '.length;}else if (c', L, '.isMixedCollection){c',L,'=c',L,'.items;n',L,'=c',L,'.length;}else if(c',L,'.isStore){c',L,'=c',L,'.data.items;n',L,'=c',L,'.length;}else{c',L,'=[c',L,'];n',L,'=1;}}\n',
            'for (xcount=n',L,';i',L,'<n'+L+';++i',L,'){\n',
            'values=c',L,'[i',L,']');
        if (actions.propName) {
            me.body.push('.', actions.propName);
        }
        me.body.push('\n',
            'xindex=i',L,'+1\n');
    },

    createArrayTest: ('isArray' in Array) ? function(L) {
        return 'Array.isArray(c' + L + ')';
    } : function(L) {
        return 'ts.call(c' + L + ')==="[object Array]"';
    },

    doExec: function (action, actions) {
        var me = this,
            name = 'f' + me.definitions.length;

        me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' try { with(values) {',
                            '  ' + action,
                            ' }} catch(e) {',
                            '}',
                      '}');

        me.body.push(name + me.callFn + '\n');
    },

    //-----------------------------------
    // Internal

    addFn: function (body) {
        var me = this,
            name = 'f' + me.definitions.length;

        if (body === '.') {
            me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' return values',
                       '}');
        } else if (body === '..') {
            me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' return parent',
                       '}');
        } else {
            me.definitions.push('function ' + name + '(' + me.fnArgs + ') {',
                            ' try { with(values) {',
                            '  return(' + body + ')',
                            ' }} catch(e) {',
                            '}',
                       '}');
        }

        return name;
    },

    parseTag: function (tag) {
        var me = this,
            m = me.tagRe.exec(tag),
            name = m[1],
            format = m[2],
            args = m[3],
            math = m[4],
            v;

        // name = "." - Just use the values object.
        if (name == '.') {
            // filter to not include arrays/objects/nulls
            if (!me.validTypes) {
                me.definitions.push('var validTypes={string:1,number:1,boolean:1};');
                me.validTypes = true;
            }
            v = 'validTypes[typeof values] || ts.call(values) === "[object Date]" ? values : ""';
        }
        // name = "#" - Use the xindex
        else if (name == '#') {
            v = 'xindex';
        }
        else if (name.substr(0, 7) == "parent.") {
            v = name;
        }
        // compound Javascript property name (e.g., "foo.bar")
        else if (isNaN(name) && name.indexOf('-') == -1 && name.indexOf('.') != -1) {
            v = "values." + name;
        }
        // number or a '-' in it or a single word (maybe a keyword): use array notation
        // (http://jsperf.com/string-property-access/4)
        else {
            v = "values['" + name + "']";
        }

        if (math) {
            v = '(' + v + math + ')';
        }

        if (format && me.useFormat) {
            args = args ? ',' + args : "";
            if (format.substr(0, 5) != "this.") {
                format = "fm." + format + '(';
            } else {
                format += '(';
            }
        } else {
            return v;
        }

        return format + v + args + ')';
    },

    // @private
    evalTpl: function ($) {

        // We have to use eval to realize the code block and capture the inner func we also
        // don't want a deep scope chain. We only do this in Firefox and it is also unhappy
        // with eval containing a return statement, so instead we assign to "$" and return
        // that. Because we use "eval", we are automatically sandboxed properly.
        eval($);
        return $;
    },

    newLineRe: /\r\n|\r|\n/g,
    aposRe: /[']/g,
    intRe:  /^\s*(\d+)\s*$/,
    tagRe:  /([\w-\.\#\$]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?(\s?[\+\-\*\/]\s?[\d\.\+\-\*\/\(\)]+)?/
}, function () {
    var proto = this.prototype;

    proto.fnArgs = 'out,values,parent,xindex,xcount';
    proto.callFn = '.call(this,' + proto.fnArgs + ')';
});

/**
 * @class Ext.Date
 * @mixins Ext.DateExtras
 * A set of useful static methods to deal with date.
 *
 * **Please note:** Unless you require `Ext.DateExtras`, only the {@link #now} method will be available. You **MUST**
 * require `Ext.DateExtras` to use the other methods available below.
 *
 * Usage with {@link Ext#setup}:
 *
 *     Ext.setup({
 *         requires: 'Ext.DateExtras',
 *         onReady: function() {
 *             var date = new Date();
 *             alert(Ext.Date.format(date, 'j/d/Y'));
 *         }
 *     });
 *
 * The date parsing and formatting syntax contains a subset of
 * <a href="http://www.php.net/date">PHP's date() function</a>, and the formats that are
 * supported will provide results equivalent to their PHP versions.
 *
 * The following is a list of all currently supported formats:
 * <pre class="">
Format  Description                                                               Example returned values
------  -----------------------------------------------------------------------   -----------------------
  d     Day of the month, 2 digits with leading zeros                             01 to 31
  D     A short textual representation of the day of the week                     Mon to Sun
  j     Day of the month without leading zeros                                    1 to 31
  l     A full textual representation of the day of the week                      Sunday to Saturday
  N     ISO-8601 numeric representation of the day of the week                    1 (for Monday) through 7 (for Sunday)
  S     English ordinal suffix for the day of the month, 2 characters             st, nd, rd or th. Works well with j
  w     Numeric representation of the day of the week                             0 (for Sunday) to 6 (for Saturday)
  z     The day of the year (starting from 0)                                     0 to 364 (365 in leap years)
  W     ISO-8601 week number of year, weeks starting on Monday                    01 to 53
  F     A full textual representation of a month, such as January or March        January to December
  m     Numeric representation of a month, with leading zeros                     01 to 12
  M     A short textual representation of a month                                 Jan to Dec
  n     Numeric representation of a month, without leading zeros                  1 to 12
  t     Number of days in the given month                                         28 to 31
  L     Whether it&#39;s a leap year                                                  1 if it is a leap year, 0 otherwise.
  o     ISO-8601 year number (identical to (Y), but if the ISO week number (W)    Examples: 1998 or 2004
        belongs to the previous or next year, that year is used instead)
  Y     A full numeric representation of a year, 4 digits                         Examples: 1999 or 2003
  y     A two digit representation of a year                                      Examples: 99 or 03
  a     Lowercase Ante meridiem and Post meridiem                                 am or pm
  A     Uppercase Ante meridiem and Post meridiem                                 AM or PM
  g     12-hour format of an hour without leading zeros                           1 to 12
  G     24-hour format of an hour without leading zeros                           0 to 23
  h     12-hour format of an hour with leading zeros                              01 to 12
  H     24-hour format of an hour with leading zeros                              00 to 23
  i     Minutes, with leading zeros                                               00 to 59
  s     Seconds, with leading zeros                                               00 to 59
  u     Decimal fraction of a second                                              Examples:
        (minimum 1 digit, arbitrary number of digits allowed)                     001 (i.e. 0.001s) or
                                                                                  100 (i.e. 0.100s) or
                                                                                  999 (i.e. 0.999s) or
                                                                                  999876543210 (i.e. 0.999876543210s)
  O     Difference to Greenwich time (GMT) in hours and minutes                   Example: +1030
  P     Difference to Greenwich time (GMT) with colon between hours and minutes   Example: -08:00
  T     Timezone abbreviation of the machine running the code                     Examples: EST, MDT, PDT ...
  Z     Timezone offset in seconds (negative if west of UTC, positive if east)    -43200 to 50400
  c     ISO 8601 date
        Notes:                                                                    Examples:
        1) If unspecified, the month / day defaults to the current month / day,   1991 or
           the time defaults to midnight, while the timezone defaults to the      1992-10 or
           browser's timezone. If a time is specified, it must include both hours 1993-09-20 or
           and minutes. The "T" delimiter, seconds, milliseconds and timezone     1994-08-19T16:20+01:00 or
           are optional.                                                          1995-07-18T17:21:28-02:00 or
        2) The decimal fraction of a second, if specified, must contain at        1996-06-17T18:22:29.98765+03:00 or
           least 1 digit (there is no limit to the maximum number                 1997-05-16T19:23:30,12345-0400 or
           of digits allowed), and may be delimited by either a '.' or a ','      1998-04-15T20:24:31.2468Z or
        Refer to the examples on the right for the various levels of              1999-03-14T20:24:32Z or
        date-time granularity which are supported, or see                         2000-02-13T21:25:33
        http://www.w3.org/TR/NOTE-datetime for more info.                         2001-01-12 22:26:34
  U     Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)                1193432466 or -2138434463
  MS    Microsoft AJAX serialized dates                                           \/Date(1238606590509)\/ (i.e. UTC milliseconds since epoch) or
                                                                                  \/Date(1238606590509+0800)\/
</pre>
 *
 * Example usage (note that you must escape format specifiers with '\\' to render them as character literals):
 * <pre><code>
// Sample date:
// 'Wed Jan 10 2007 15:05:01 GMT-0600 (Central Standard Time)'

var dt = new Date('1/10/2007 03:05:01 PM GMT-0600');
console.log(Ext.Date.format(dt, 'Y-m-d'));                          // 2007-01-10
console.log(Ext.Date.format(dt, 'F j, Y, g:i a'));                  // January 10, 2007, 3:05 pm
console.log(Ext.Date.format(dt, 'l, \\t\\he jS \\of F Y h:i:s A')); // Wednesday, the 10th of January 2007 03:05:01 PM
</code></pre>
 *
 * Here are some standard date/time patterns that you might find helpful.  They
 * are not part of the source of Ext.Date, but to use them you can simply copy this
 * block of code into any script that is included after Ext.Date and they will also become
 * globally available on the Date object.  Feel free to add or remove patterns as needed in your code.
 * <pre><code>
Ext.Date.patterns = {
    ISO8601Long:"Y-m-d H:i:s",
    ISO8601Short:"Y-m-d",
    ShortDate: "n/j/Y",
    LongDate: "l, F d, Y",
    FullDateTime: "l, F d, Y g:i:s A",
    MonthDay: "F d",
    ShortTime: "g:i A",
    LongTime: "g:i:s A",
    SortableDateTime: "Y-m-d\\TH:i:s",
    UniversalSortableDateTime: "Y-m-d H:i:sO",
    YearMonth: "F, Y"
};
</code></pre>
 *
 * Example usage:
 * <pre><code>
var dt = new Date();
console.log(Ext.Date.format(dt, Ext.Date.patterns.ShortDate));
</code></pre>
 * <p>Developer-written, custom formats may be used by supplying both a formatting and a parsing function
 * which perform to specialized requirements. The functions are stored in {@link #parseFunctions} and {@link #formatFunctions}.</p>
 * @singleton
 */

/*
 * Most of the date-formatting functions below are the excellent work of Baron Schwartz.
 * (see http://www.xaprb.com/blog/2005/12/12/javascript-closures-for-runtime-efficiency/)
 * They generate precompiled functions from format patterns instead of parsing and
 * processing each pattern every time a date is formatted. These functions are available
 * on every Date object.
 */

(function() {

// create private copy of Ext's Ext.util.Format.format() method
// - to remove unnecessary dependency
// - to resolve namespace conflict with MS-Ajax's implementation
function xf(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/\{(\d+)\}/g, function(m, i) {
        return args[i];
    });
}

/**
 * Extra methods to be mixed into Ext.Date.
 *
 * Require this class to get Ext.Date with all the methods listed below.
 *
 * Using Ext.setup:
 *
 *     Ext.setup({
 *         requires: 'Ext.DateExtras',
 *         onReady: function() {
 *             var date = new Date();
 *             alert(Ext.Date.format(date, 'j/d/Y'));
 *         }
 *     });
 *
 * Using Ext.application:
 *
 *     Ext.application({
 *         requires: 'Ext.DateExtras',
 *         launch: function() {
 *             var date = new Date();
 *             alert(Ext.Date.format(date, 'j/d/Y'));
 *         }
 *     });
 *
 * @singleton
 */
Ext.DateExtras = {
    /**
     * Returns the current timestamp
     * @return {Date} The current timestamp
     * @method
     */
    now: Date.now || function() {
        return +new Date();
    },

    /**
     * Returns the number of milliseconds between two dates
     * @param {Date} dateA The first date
     * @param {Date} dateB (optional) The second date, defaults to now
     * @return {Number} The difference in milliseconds
     */
    getElapsed: function(dateA, dateB) {
        return Math.abs(dateA - (dateB || new Date()));
    },

    /**
     * Global flag which determines if strict date parsing should be used.
     * Strict date parsing will not roll-over invalid dates, which is the
     * default behaviour of javascript Date objects.
     * (see {@link #parse} for more information)
     * Defaults to <tt>false</tt>.
     * @type Boolean
    */
    useStrict: false,

    // private
    formatCodeToRegex: function(character, currentGroup) {
        // Note: currentGroup - position in regex result array (see notes for Ext.Date.parseCodes below)
        var p = utilDate.parseCodes[character];

        if (p) {
          p = typeof p == 'function'? p() : p;
          utilDate.parseCodes[character] = p; // reassign function result to prevent repeated execution
        }

        return p ? Ext.applyIf({
          c: p.c ? xf(p.c, currentGroup || "{0}") : p.c
        }, p) : {
            g: 0,
            c: null,
            s: Ext.String.escapeRegex(character) // treat unrecognised characters as literals
        };
    },

    /**
     * <p>An object hash in which each property is a date parsing function. The property name is the
     * format string which that function parses.</p>
     * <p>This object is automatically populated with date parsing functions as
     * date formats are requested for Ext standard formatting strings.</p>
     * <p>Custom parsing functions may be inserted into this object, keyed by a name which from then on
     * may be used as a format string to {@link #parse}.<p>
     * <p>Example:</p><pre><code>
Ext.Date.parseFunctions['x-date-format'] = myDateParser;
</code></pre>
     * <p>A parsing function should return a Date object, and is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>date</code> : String<div class="sub-desc">The date string to parse.</div></li>
     * <li><code>strict</code> : Boolean<div class="sub-desc">True to validate date strings while parsing
     * (i.e. prevent javascript Date "rollover") (The default must be false).
     * Invalid date strings should return null when parsed.</div></li>
     * </ul></div></p>
     * <p>To enable Dates to also be <i>formatted</i> according to that format, a corresponding
     * formatting function must be placed into the {@link #formatFunctions} property.
     * @property parseFunctions
     * @type Object
     */
    parseFunctions: {
        "MS": function(input, strict) {
            // note: the timezone offset is ignored since the MS Ajax server sends
            // a UTC milliseconds-since-Unix-epoch value (negative values are allowed)
            var re = new RegExp('\\/Date\\(([-+])?(\\d+)(?:[+-]\\d{4})?\\)\\/');
            var r = (input || '').match(re);
            return r? new Date(((r[1] || '') + r[2]) * 1) : null;
        }
    },
    parseRegexes: [],

    /**
     * <p>An object hash in which each property is a date formatting function. The property name is the
     * format string which corresponds to the produced formatted date string.</p>
     * <p>This object is automatically populated with date formatting functions as
     * date formats are requested for Ext standard formatting strings.</p>
     * <p>Custom formatting functions may be inserted into this object, keyed by a name which from then on
     * may be used as a format string to {@link #format}. Example:</p><pre><code>
Ext.Date.formatFunctions['x-date-format'] = myDateFormatter;
</code></pre>
     * <p>A formatting function should return a string representation of the Date object which is the scope (this) of the function.</p>
     * <p>To enable date strings to also be <i>parsed</i> according to that format, a corresponding
     * parsing function must be placed into the {@link #parseFunctions} property.
     * @property formatFunctions
     * @type Object
     */
    formatFunctions: {
        "MS": function() {
            // UTC milliseconds since Unix epoch (MS-AJAX serialized date format (MRSF))
            return '\\/Date(' + this.getTime() + ')\\/';
        }
    },

    y2kYear : 50,

    /**
     * Date interval constant
     * @type String
     */
    MILLI : "ms",

    /**
     * Date interval constant
     * @type String
     */
    SECOND : "s",

    /**
     * Date interval constant
     * @type String
     */
    MINUTE : "mi",

    /** Date interval constant
     * @type String
     */
    HOUR : "h",

    /**
     * Date interval constant
     * @type String
     */
    DAY : "d",

    /**
     * Date interval constant
     * @type String
     */
    MONTH : "mo",

    /**
     * Date interval constant
     * @type String
     */
    YEAR : "y",

    /**
     * <p>An object hash containing default date values used during date parsing.</p>
     * <p>The following properties are available:<div class="mdetail-params"><ul>
     * <li><code>y</code> : Number<div class="sub-desc">The default year value. (defaults to undefined)</div></li>
     * <li><code>m</code> : Number<div class="sub-desc">The default 1-based month value. (defaults to undefined)</div></li>
     * <li><code>d</code> : Number<div class="sub-desc">The default day value. (defaults to undefined)</div></li>
     * <li><code>h</code> : Number<div class="sub-desc">The default hour value. (defaults to undefined)</div></li>
     * <li><code>i</code> : Number<div class="sub-desc">The default minute value. (defaults to undefined)</div></li>
     * <li><code>s</code> : Number<div class="sub-desc">The default second value. (defaults to undefined)</div></li>
     * <li><code>ms</code> : Number<div class="sub-desc">The default millisecond value. (defaults to undefined)</div></li>
     * </ul></div></p>
     * <p>Override these properties to customize the default date values used by the {@link #parse} method.</p>
     * <p><b>Note: In countries which experience Daylight Saving Time (i.e. DST), the <tt>h</tt>, <tt>i</tt>, <tt>s</tt>
     * and <tt>ms</tt> properties may coincide with the exact time in which DST takes effect.
     * It is the responsiblity of the developer to account for this.</b></p>
     * Example Usage:
     * <pre><code>
// set default day value to the first day of the month
Ext.Date.defaults.d = 1;

// parse a February date string containing only year and month values.
// setting the default day value to 1 prevents weird date rollover issues
// when attempting to parse the following date string on, for example, March 31st 2009.
Ext.Date.parse('2009-02', 'Y-m'); // returns a Date object representing February 1st 2009
</code></pre>
     * @property defaults
     * @type Object
     */
    defaults: {},

    /**
     * An array of textual day names.
     * Override these values for international dates.
     * Example:
     * <pre><code>
Ext.Date.dayNames = [
    'SundayInYourLang',
    'MondayInYourLang',
    ...
];
</code></pre>
     * @type Array
     */
    dayNames : [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ],

    /**
     * An array of textual month names.
     * Override these values for international dates.
     * Example:
     * <pre><code>
Ext.Date.monthNames = [
    'JanInYourLang',
    'FebInYourLang',
    ...
];
</code></pre>
     * @type Array
     */
    monthNames : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ],

    /**
     * An object hash of zero-based javascript month numbers (with short month names as keys. note: keys are case-sensitive).
     * Override these values for international dates.
     * Example:
     * <pre><code>
Ext.Date.monthNumbers = {
    'ShortJanNameInYourLang':0,
    'ShortFebNameInYourLang':1,
    ...
};
</code></pre>
     * @type Object
     */
    monthNumbers : {
        Jan:0,
        Feb:1,
        Mar:2,
        Apr:3,
        May:4,
        Jun:5,
        Jul:6,
        Aug:7,
        Sep:8,
        Oct:9,
        Nov:10,
        Dec:11
    },
    /**
     * <p>The date format string that the {@link Ext.util.Format#date} function uses.
     * See {@link Ext.Date} for details.</p>
     * <p>This defaults to <code>m/d/Y</code>, but may be overridden in a locale file.</p>
     * @property defaultFormat
     * @type String
     */
    defaultFormat : "m/d/Y",
    /**
     * Get the short month name for the given month number.
     * Override this function for international dates.
     * @param {Number} month A zero-based javascript month number.
     * @return {String} The short month name.
     */
    getShortMonthName : function(month) {
        return utilDate.monthNames[month].substring(0, 3);
    },

    /**
     * Get the short day name for the given day number.
     * Override this function for international dates.
     * @param {Number} day A zero-based javascript day number.
     * @return {String} The short day name.
     */
    getShortDayName : function(day) {
        return utilDate.dayNames[day].substring(0, 3);
    },

    /**
     * Get the zero-based javascript month number for the given short/full month name.
     * Override this function for international dates.
     * @param {String} name The short/full month name.
     * @return {Number} The zero-based javascript month number.
     */
    getMonthNumber : function(name) {
        // handle camel casing for english month names (since the keys for the Ext.Date.monthNumbers hash are case sensitive)
        return utilDate.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
    },

    /**
     * The base format-code to formatting-function hashmap used by the {@link #format} method.
     * Formatting functions are strings (or functions which return strings) which
     * will return the appropriate value when evaluated in the context of the Date object
     * from which the {@link #format} method is called.
     * Add to / override these mappings for custom date formatting.
     * Note: Ext.Date.format() treats characters as literals if an appropriate mapping cannot be found.
     * Example:
     * <pre><code>
Ext.Date.formatCodes.x = "Ext.util.Format.leftPad(this.getDate(), 2, '0')";
console.log(Ext.Date.format(new Date(), 'X'); // returns the current day of the month
</code></pre>
     * @type Object
     */
    formatCodes : {
        d: "Ext.String.leftPad(this.getDate(), 2, '0')",
        D: "Ext.Date.getShortDayName(this.getDay())", // get localised short day name
        j: "this.getDate()",
        l: "Ext.Date.dayNames[this.getDay()]",
        N: "(this.getDay() ? this.getDay() : 7)",
        S: "Ext.Date.getSuffix(this)",
        w: "this.getDay()",
        z: "Ext.Date.getDayOfYear(this)",
        W: "Ext.String.leftPad(Ext.Date.getWeekOfYear(this), 2, '0')",
        F: "Ext.Date.monthNames[this.getMonth()]",
        m: "Ext.String.leftPad(this.getMonth() + 1, 2, '0')",
        M: "Ext.Date.getShortMonthName(this.getMonth())", // get localised short month name
        n: "(this.getMonth() + 1)",
        t: "Ext.Date.getDaysInMonth(this)",
        L: "(Ext.Date.isLeapYear(this) ? 1 : 0)",
        o: "(this.getFullYear() + (Ext.Date.getWeekOfYear(this) == 1 && this.getMonth() > 0 ? +1 : (Ext.Date.getWeekOfYear(this) >= 52 && this.getMonth() < 11 ? -1 : 0)))",
        Y: "Ext.String.leftPad(this.getFullYear(), 4, '0')",
        y: "('' + this.getFullYear()).substring(2, 4)",
        a: "(this.getHours() < 12 ? 'am' : 'pm')",
        A: "(this.getHours() < 12 ? 'AM' : 'PM')",
        g: "((this.getHours() % 12) ? this.getHours() % 12 : 12)",
        G: "this.getHours()",
        h: "Ext.String.leftPad((this.getHours() % 12) ? this.getHours() % 12 : 12, 2, '0')",
        H: "Ext.String.leftPad(this.getHours(), 2, '0')",
        i: "Ext.String.leftPad(this.getMinutes(), 2, '0')",
        s: "Ext.String.leftPad(this.getSeconds(), 2, '0')",
        u: "Ext.String.leftPad(this.getMilliseconds(), 3, '0')",
        O: "Ext.Date.getGMTOffset(this)",
        P: "Ext.Date.getGMTOffset(this, true)",
        T: "Ext.Date.getTimezone(this)",
        Z: "(this.getTimezoneOffset() * -60)",

        c: function() { // ISO-8601 -- GMT format
            for (var c = "Y-m-dTH:i:sP", code = [], i = 0, l = c.length; i < l; ++i) {
                var e = c.charAt(i);
                code.push(e == "T" ? "'T'" : utilDate.getFormatCode(e)); // treat T as a character literal
            }
            return code.join(" + ");
        },
        /*
        c: function() { // ISO-8601 -- UTC format
            return [
              "this.getUTCFullYear()", "'-'",
              "Ext.util.Format.leftPad(this.getUTCMonth() + 1, 2, '0')", "'-'",
              "Ext.util.Format.leftPad(this.getUTCDate(), 2, '0')",
              "'T'",
              "Ext.util.Format.leftPad(this.getUTCHours(), 2, '0')", "':'",
              "Ext.util.Format.leftPad(this.getUTCMinutes(), 2, '0')", "':'",
              "Ext.util.Format.leftPad(this.getUTCSeconds(), 2, '0')",
              "'Z'"
            ].join(" + ");
        },
        */

        U: "Math.round(this.getTime() / 1000)"
    },

    /**
     * Checks if the passed Date parameters will cause a javascript Date "rollover".
     * @param {Number} year 4-digit year
     * @param {Number} month 1-based month-of-year
     * @param {Number} day Day of month
     * @param {Number} hour (optional) Hour
     * @param {Number} minute (optional) Minute
     * @param {Number} second (optional) Second
     * @param {Number} millisecond (optional) Millisecond
     * @return {Boolean} true if the passed parameters do not cause a Date "rollover", false otherwise.
     */
    isValid : function(y, m, d, h, i, s, ms) {
        // setup defaults
        h = h || 0;
        i = i || 0;
        s = s || 0;
        ms = ms || 0;

        // Special handling for year < 100
        var dt = utilDate.add(new Date(y < 100 ? 100 : y, m - 1, d, h, i, s, ms), utilDate.YEAR, y < 100 ? y - 100 : 0);

        return y == dt.getFullYear() &&
            m == dt.getMonth() + 1 &&
            d == dt.getDate() &&
            h == dt.getHours() &&
            i == dt.getMinutes() &&
            s == dt.getSeconds() &&
            ms == dt.getMilliseconds();
    },

    /**
     * Parses the passed string using the specified date format.
     * Note that this function expects normal calendar dates, meaning that months are 1-based (i.e. 1 = January).
     * The {@link #defaults} hash will be used for any date value (i.e. year, month, day, hour, minute, second or millisecond)
     * which cannot be found in the passed string. If a corresponding default date value has not been specified in the {@link #defaults} hash,
     * the current date's year, month, day or DST-adjusted zero-hour time value will be used instead.
     * Keep in mind that the input date string must precisely match the specified format string
     * in order for the parse operation to be successful (failed parse operations return a null value).
     * <p>Example:</p><pre><code>
//dt = Fri May 25 2007 (current date)
var dt = new Date();

//dt = Thu May 25 2006 (today&#39;s month/day in 2006)
dt = Ext.Date.parse("2006", "Y");

//dt = Sun Jan 15 2006 (all date parts specified)
dt = Ext.Date.parse("2006-01-15", "Y-m-d");

//dt = Sun Jan 15 2006 15:20:01
dt = Ext.Date.parse("2006-01-15 3:20:01 PM", "Y-m-d g:i:s A");

// attempt to parse Sun Feb 29 2006 03:20:01 in strict mode
dt = Ext.Date.parse("2006-02-29 03:20:01", "Y-m-d H:i:s", true); // returns null
</code></pre>
     * @param {String} input The raw date string.
     * @param {String} format The expected date string format.
     * @param {Boolean} strict (optional) True to validate date strings while parsing (i.e. prevents javascript Date "rollover")
                        (defaults to false). Invalid date strings will return null when parsed.
     * @return {Date} The parsed Date.
     */
    parse : function(input, format, strict) {
        var p = utilDate.parseFunctions;
        if (p[format] == null) {
            utilDate.createParser(format);
        }
        return p[format](input, Ext.isDefined(strict) ? strict : utilDate.useStrict);
    },

    // Backwards compat
    parseDate: function(input, format, strict){
        return utilDate.parse(input, format, strict);
    },


    // private
    getFormatCode : function(character) {
        var f = utilDate.formatCodes[character];

        if (f) {
          f = typeof f == 'function'? f() : f;
          utilDate.formatCodes[character] = f; // reassign function result to prevent repeated execution
        }

        // note: unknown characters are treated as literals
        return f || ("'" + Ext.String.escape(character) + "'");
    },

    // private
    createFormat : function(format) {
        var code = [],
            special = false,
            ch = '';

        for (var i = 0; i < format.length; ++i) {
            ch = format.charAt(i);
            if (!special && ch == "\\") {
                special = true;
            } else if (special) {
                special = false;
                code.push("'" + Ext.String.escape(ch) + "'");
            } else if (ch == '\n') {
                code.push(Ext.JSON.encode(ch));
            } else {
                code.push(utilDate.getFormatCode(ch));
            }
        }
        utilDate.formatFunctions[format] = Ext.functionFactory("return " + code.join('+'));
    },

    // private
    createParser : (function() {
        var code = [
            "var dt, y, m, d, h, i, s, ms, o, z, zz, u, v,",
                "def = Ext.Date.defaults,",
                "results = String(input).match(Ext.Date.parseRegexes[{0}]);", // either null, or an array of matched strings

            "if(results){",
                "{1}",

                "if(u != null){", // i.e. unix time is defined
                    "v = new Date(u * 1000);", // give top priority to UNIX time
                "}else{",
                    // create Date object representing midnight of the current day;
                    // this will provide us with our date defaults
                    // (note: clearTime() handles Daylight Saving Time automatically)
                    "dt = Ext.Date.clearTime(new Date);",

                    // date calculations (note: these calculations create a dependency on Ext.Number.from())
                    "y = Ext.Number.from(y, Ext.Number.from(def.y, dt.getFullYear()));",
                    "m = Ext.Number.from(m, Ext.Number.from(def.m - 1, dt.getMonth()));",
                    "d = Ext.Number.from(d, Ext.Number.from(def.d, dt.getDate()));",

                    // time calculations (note: these calculations create a dependency on Ext.Number.from())
                    "h  = Ext.Number.from(h, Ext.Number.from(def.h, dt.getHours()));",
                    "i  = Ext.Number.from(i, Ext.Number.from(def.i, dt.getMinutes()));",
                    "s  = Ext.Number.from(s, Ext.Number.from(def.s, dt.getSeconds()));",
                    "ms = Ext.Number.from(ms, Ext.Number.from(def.ms, dt.getMilliseconds()));",

                    "if(z >= 0 && y >= 0){",
                        // both the year and zero-based day of year are defined and >= 0.
                        // these 2 values alone provide sufficient info to create a full date object

                        // create Date object representing January 1st for the given year
                        // handle years < 100 appropriately
                        "v = Ext.Date.add(new Date(y < 100 ? 100 : y, 0, 1, h, i, s, ms), Ext.Date.YEAR, y < 100 ? y - 100 : 0);",

                        // then add day of year, checking for Date "rollover" if necessary
                        "v = !strict? v : (strict === true && (z <= 364 || (Ext.Date.isLeapYear(v) && z <= 365))? Ext.Date.add(v, Ext.Date.DAY, z) : null);",
                    "}else if(strict === true && !Ext.Date.isValid(y, m + 1, d, h, i, s, ms)){", // check for Date "rollover"
                        "v = null;", // invalid date, so return null
                    "}else{",
                        // plain old Date object
                        // handle years < 100 properly
                        "v = Ext.Date.add(new Date(y < 100 ? 100 : y, m, d, h, i, s, ms), Ext.Date.YEAR, y < 100 ? y - 100 : 0);",
                    "}",
                "}",
            "}",

            "if(v){",
                // favour UTC offset over GMT offset
                "if(zz != null){",
                    // reset to UTC, then add offset
                    "v = Ext.Date.add(v, Ext.Date.SECOND, -v.getTimezoneOffset() * 60 - zz);",
                "}else if(o){",
                    // reset to GMT, then add offset
                    "v = Ext.Date.add(v, Ext.Date.MINUTE, -v.getTimezoneOffset() + (sn == '+'? -1 : 1) * (hr * 60 + mn));",
                "}",
            "}",

            "return v;"
        ].join('\n');

        return function(format) {
            var regexNum = utilDate.parseRegexes.length,
                currentGroup = 1,
                calc = [],
                regex = [],
                special = false,
                ch = "";

            for (var i = 0; i < format.length; ++i) {
                ch = format.charAt(i);
                if (!special && ch == "\\") {
                    special = true;
                } else if (special) {
                    special = false;
                    regex.push(Ext.String.escape(ch));
                } else {
                    var obj = utilDate.formatCodeToRegex(ch, currentGroup);
                    currentGroup += obj.g;
                    regex.push(obj.s);
                    if (obj.g && obj.c) {
                        calc.push(obj.c);
                    }
                }
            }

            utilDate.parseRegexes[regexNum] = new RegExp("^" + regex.join('') + "$", 'i');
            utilDate.parseFunctions[format] = Ext.functionFactory("input", "strict", xf(code, regexNum, calc.join('')));
        };
    })(),

    // private
    parseCodes : {
        /*
         * Notes:
         * g = {Number} calculation group (0 or 1. only group 1 contributes to date calculations.)
         * c = {String} calculation method (required for group 1. null for group 0. {0} = currentGroup - position in regex result array)
         * s = {String} regex pattern. all matches are stored in results[], and are accessible by the calculation mapped to 'c'
         */
        d: {
            g:1,
            c:"d = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" // day of month with leading zeroes (01 - 31)
        },
        j: {
            g:1,
            c:"d = parseInt(results[{0}], 10);\n",
            s:"(\\d{1,2})" // day of month without leading zeroes (1 - 31)
        },
        D: function() {
            for (var a = [], i = 0; i < 7; a.push(utilDate.getShortDayName(i)), ++i); // get localised short day names
            return {
                g:0,
                c:null,
                s:"(?:" + a.join("|") +")"
            };
        },
        l: function() {
            return {
                g:0,
                c:null,
                s:"(?:" + utilDate.dayNames.join("|") + ")"
            };
        },
        N: {
            g:0,
            c:null,
            s:"[1-7]" // ISO-8601 day number (1 (monday) - 7 (sunday))
        },
        S: {
            g:0,
            c:null,
            s:"(?:st|nd|rd|th)"
        },
        w: {
            g:0,
            c:null,
            s:"[0-6]" // javascript day number (0 (sunday) - 6 (saturday))
        },
        z: {
            g:1,
            c:"z = parseInt(results[{0}], 10);\n",
            s:"(\\d{1,3})" // day of the year (0 - 364 (365 in leap years))
        },
        W: {
            g:0,
            c:null,
            s:"(?:\\d{2})" // ISO-8601 week number (with leading zero)
        },
        F: function() {
            return {
                g:1,
                c:"m = parseInt(Ext.Date.getMonthNumber(results[{0}]), 10);\n", // get localised month number
                s:"(" + utilDate.monthNames.join("|") + ")"
            };
        },
        M: function() {
            for (var a = [], i = 0; i < 12; a.push(utilDate.getShortMonthName(i)), ++i); // get localised short month names
            return Ext.applyIf({
                s:"(" + a.join("|") + ")"
            }, utilDate.formatCodeToRegex("F"));
        },
        m: {
            g:1,
            c:"m = parseInt(results[{0}], 10) - 1;\n",
            s:"(\\d{2})" // month number with leading zeros (01 - 12)
        },
        n: {
            g:1,
            c:"m = parseInt(results[{0}], 10) - 1;\n",
            s:"(\\d{1,2})" // month number without leading zeros (1 - 12)
        },
        t: {
            g:0,
            c:null,
            s:"(?:\\d{2})" // no. of days in the month (28 - 31)
        },
        L: {
            g:0,
            c:null,
            s:"(?:1|0)"
        },
        o: function() {
            return utilDate.formatCodeToRegex("Y");
        },
        Y: {
            g:1,
            c:"y = parseInt(results[{0}], 10);\n",
            s:"(\\d{4})" // 4-digit year
        },
        y: {
            g:1,
            c:"var ty = parseInt(results[{0}], 10);\n"
                + "y = ty > Ext.Date.y2kYear ? 1900 + ty : 2000 + ty;\n", // 2-digit year
            s:"(\\d{1,2})"
        },
        /*
         * In the am/pm parsing routines, we allow both upper and lower case
         * even though it doesn't exactly match the spec. It gives much more flexibility
         * in being able to specify case insensitive regexes.
         */
        a: {
            g:1,
            c:"if (/(am)/i.test(results[{0}])) {\n"
                + "if (!h || h == 12) { h = 0; }\n"
                + "} else { if (!h || h < 12) { h = (h || 0) + 12; }}",
            s:"(am|pm|AM|PM)"
        },
        A: {
            g:1,
            c:"if (/(am)/i.test(results[{0}])) {\n"
                + "if (!h || h == 12) { h = 0; }\n"
                + "} else { if (!h || h < 12) { h = (h || 0) + 12; }}",
            s:"(AM|PM|am|pm)"
        },
        g: function() {
            return utilDate.formatCodeToRegex("G");
        },
        G: {
            g:1,
            c:"h = parseInt(results[{0}], 10);\n",
            s:"(\\d{1,2})" // 24-hr format of an hour without leading zeroes (0 - 23)
        },
        h: function() {
            return utilDate.formatCodeToRegex("H");
        },
        H: {
            g:1,
            c:"h = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" //  24-hr format of an hour with leading zeroes (00 - 23)
        },
        i: {
            g:1,
            c:"i = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" // minutes with leading zeros (00 - 59)
        },
        s: {
            g:1,
            c:"s = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" // seconds with leading zeros (00 - 59)
        },
        u: {
            g:1,
            c:"ms = results[{0}]; ms = parseInt(ms, 10)/Math.pow(10, ms.length - 3);\n",
            s:"(\\d+)" // decimal fraction of a second (minimum = 1 digit, maximum = unlimited)
        },
        O: {
            g:1,
            c:[
                "o = results[{0}];",
                "var sn = o.substring(0,1),", // get + / - sign
                    "hr = o.substring(1,3)*1 + Math.floor(o.substring(3,5) / 60),", // get hours (performs minutes-to-hour conversion also, just in case)
                    "mn = o.substring(3,5) % 60;", // get minutes
                "o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))? (sn + Ext.String.leftPad(hr, 2, '0') + Ext.String.leftPad(mn, 2, '0')) : null;\n" // -12hrs <= GMT offset <= 14hrs
            ].join("\n"),
            s: "([+\-]\\d{4})" // GMT offset in hrs and mins
        },
        P: {
            g:1,
            c:[
                "o = results[{0}];",
                "var sn = o.substring(0,1),", // get + / - sign
                    "hr = o.substring(1,3)*1 + Math.floor(o.substring(4,6) / 60),", // get hours (performs minutes-to-hour conversion also, just in case)
                    "mn = o.substring(4,6) % 60;", // get minutes
                "o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))? (sn + Ext.String.leftPad(hr, 2, '0') + Ext.String.leftPad(mn, 2, '0')) : null;\n" // -12hrs <= GMT offset <= 14hrs
            ].join("\n"),
            s: "([+\-]\\d{2}:\\d{2})" // GMT offset in hrs and mins (with colon separator)
        },
        T: {
            g:0,
            c:null,
            s:"[A-Z]{1,4}" // timezone abbrev. may be between 1 - 4 chars
        },
        Z: {
            g:1,
            c:"zz = results[{0}] * 1;\n" // -43200 <= UTC offset <= 50400
                  + "zz = (-43200 <= zz && zz <= 50400)? zz : null;\n",
            s:"([+\-]?\\d{1,5})" // leading '+' sign is optional for UTC offset
        },
        c: function() {
            var calc = [],
                arr = [
                    utilDate.formatCodeToRegex("Y", 1), // year
                    utilDate.formatCodeToRegex("m", 2), // month
                    utilDate.formatCodeToRegex("d", 3), // day
                    utilDate.formatCodeToRegex("h", 4), // hour
                    utilDate.formatCodeToRegex("i", 5), // minute
                    utilDate.formatCodeToRegex("s", 6), // second
                    {c:"ms = results[7] || '0'; ms = parseInt(ms, 10)/Math.pow(10, ms.length - 3);\n"}, // decimal fraction of a second (minimum = 1 digit, maximum = unlimited)
                    {c:[ // allow either "Z" (i.e. UTC) or "-0530" or "+08:00" (i.e. UTC offset) timezone delimiters. assumes local timezone if no timezone is specified
                        "if(results[8]) {", // timezone specified
                            "if(results[8] == 'Z'){",
                                "zz = 0;", // UTC
                            "}else if (results[8].indexOf(':') > -1){",
                                utilDate.formatCodeToRegex("P", 8).c, // timezone offset with colon separator
                            "}else{",
                                utilDate.formatCodeToRegex("O", 8).c, // timezone offset without colon separator
                            "}",
                        "}"
                    ].join('\n')}
                ];

            for (var i = 0, l = arr.length; i < l; ++i) {
                calc.push(arr[i].c);
            }

            return {
                g:1,
                c:calc.join(""),
                s:[
                    arr[0].s, // year (required)
                    "(?:", "-", arr[1].s, // month (optional)
                        "(?:", "-", arr[2].s, // day (optional)
                            "(?:",
                                "(?:T| )?", // time delimiter -- either a "T" or a single blank space
                                arr[3].s, ":", arr[4].s,  // hour AND minute, delimited by a single colon (optional). MUST be preceded by either a "T" or a single blank space
                                "(?::", arr[5].s, ")?", // seconds (optional)
                                "(?:(?:\\.|,)(\\d+))?", // decimal fraction of a second (e.g. ",12345" or ".98765") (optional)
                                "(Z|(?:[-+]\\d{2}(?::)?\\d{2}))?", // "Z" (UTC) or "-0530" (UTC offset without colon delimiter) or "+08:00" (UTC offset with colon delimiter) (optional)
                            ")?",
                        ")?",
                    ")?"
                ].join("")
            };
        },
        U: {
            g:1,
            c:"u = parseInt(results[{0}], 10);\n",
            s:"(-?\\d+)" // leading minus sign indicates seconds before UNIX epoch
        }
    },

    //Old Ext.Date prototype methods.
    // private
    dateFormat: function(date, format) {
        return utilDate.format(date, format);
    },

    /**
     * Formats a date given the supplied format string.
     * @param {Date} date The date to format
     * @param {String} format The format string
     * @return {String} The formatted date
     */
    format: function(date, format) {
        if (utilDate.formatFunctions[format] == null) {
            utilDate.createFormat(format);
        }
        var result = utilDate.formatFunctions[format].call(date);
        return result + '';
    },

    /**
     * Get the timezone abbreviation of the current date (equivalent to the format specifier 'T').
     *
     * Note: The date string returned by the javascript Date object's toString() method varies
     * between browsers (e.g. FF vs IE) and system region settings (e.g. IE in Asia vs IE in America).
     * For a given date string e.g. "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)",
     * getTimezone() first tries to get the timezone abbreviation from between a pair of parentheses
     * (which may or may not be present), failing which it proceeds to get the timezone abbreviation
     * from the GMT offset portion of the date string.
     * @param {Date} date The date
     * @return {String} The abbreviated timezone name (e.g. 'CST', 'PDT', 'EDT', 'MPST' ...).
     */
    getTimezone : function(date) {
        // the following list shows the differences between date strings from different browsers on a WinXP SP2 machine from an Asian locale:
        //
        // Opera  : "Thu, 25 Oct 2007 22:53:45 GMT+0800" -- shortest (weirdest) date string of the lot
        // Safari : "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)" -- value in parentheses always gives the correct timezone (same as FF)
        // FF     : "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)" -- value in parentheses always gives the correct timezone
        // IE     : "Thu Oct 25 22:54:35 UTC+0800 2007" -- (Asian system setting) look for 3-4 letter timezone abbrev
        // IE     : "Thu Oct 25 17:06:37 PDT 2007" -- (American system setting) look for 3-4 letter timezone abbrev
        //
        // this crazy regex attempts to guess the correct timezone abbreviation despite these differences.
        // step 1: (?:\((.*)\) -- find timezone in parentheses
        // step 2: ([A-Z]{1,4})(?:[\-+][0-9]{4})?(?: -?\d+)?) -- if nothing was found in step 1, find timezone from timezone offset portion of date string
        // step 3: remove all non uppercase characters found in step 1 and 2
        return date.toString().replace(/^.* (?:\((.*)\)|([A-Z]{1,4})(?:[\-+][0-9]{4})?(?: -?\d+)?)$/, "$1$2").replace(/[^A-Z]/g, "");
    },

    /**
     * Get the offset from GMT of the current date (equivalent to the format specifier 'O').
     * @param {Date} date The date
     * @param {Boolean} colon (optional) true to separate the hours and minutes with a colon (defaults to false).
     * @return {String} The 4-character offset string prefixed with + or - (e.g. '-0600').
     */
    getGMTOffset : function(date, colon) {
        var offset = date.getTimezoneOffset();
        return (offset > 0 ? "-" : "+")
            + Ext.String.leftPad(Math.floor(Math.abs(offset) / 60), 2, "0")
            + (colon ? ":" : "")
            + Ext.String.leftPad(Math.abs(offset % 60), 2, "0");
    },

    /**
     * Get the numeric day number of the year, adjusted for leap year.
     * @param {Date} date The date
     * @return {Number} 0 to 364 (365 in leap years).
     */
    getDayOfYear: function(date) {
        var num = 0,
            d = Ext.Date.clone(date),
            m = date.getMonth(),
            i;

        for (i = 0, d.setDate(1), d.setMonth(0); i < m; d.setMonth(++i)) {
            num += utilDate.getDaysInMonth(d);
        }
        return num + date.getDate() - 1;
    },

    /**
     * Get the numeric ISO-8601 week number of the year.
     * (equivalent to the format specifier 'W', but without a leading zero).
     * @param {Date} date The date
     * @return {Number} 1 to 53
     * @method
     */
    getWeekOfYear : (function() {
        // adapted from http://www.merlyn.demon.co.uk/weekcalc.htm
        var ms1d = 864e5, // milliseconds in a day
            ms7d = 7 * ms1d; // milliseconds in a week

        return function(date) { // return a closure so constants get calculated only once
            var DC3 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 3) / ms1d, // an Absolute Day Number
                AWN = Math.floor(DC3 / 7), // an Absolute Week Number
                Wyr = new Date(AWN * ms7d).getUTCFullYear();

            return AWN - Math.floor(Date.UTC(Wyr, 0, 7) / ms7d) + 1;
        };
    })(),

    /**
     * Checks if the current date falls within a leap year.
     * @param {Date} date The date
     * @return {Boolean} True if the current date falls within a leap year, false otherwise.
     */
    isLeapYear : function(date) {
        var year = date.getFullYear();
        return !!((year & 3) == 0 && (year % 100 || (year % 400 == 0 && year)));
    },

    /**
     * Get the first day of the current month, adjusted for leap year.  The returned value
     * is the numeric day index within the week (0-6) which can be used in conjunction with
     * the {@link #monthNames} array to retrieve the textual day name.
     * Example:
     * <pre><code>
var dt = new Date('1/10/2007'),
    firstDay = Ext.Date.getFirstDayOfMonth(dt);
console.log(Ext.Date.dayNames[firstDay]); //output: 'Monday'
     * </code></pre>
     * @param {Date} date The date
     * @return {Number} The day number (0-6).
     */
    getFirstDayOfMonth : function(date) {
        var day = (date.getDay() - (date.getDate() - 1)) % 7;
        return (day < 0) ? (day + 7) : day;
    },

    /**
     * Get the last day of the current month, adjusted for leap year.  The returned value
     * is the numeric day index within the week (0-6) which can be used in conjunction with
     * the {@link #monthNames} array to retrieve the textual day name.
     * Example:
     * <pre><code>
var dt = new Date('1/10/2007'),
    lastDay = Ext.Date.getLastDayOfMonth(dt);
console.log(Ext.Date.dayNames[lastDay]); //output: 'Wednesday'
     * </code></pre>
     * @param {Date} date The date
     * @return {Number} The day number (0-6).
     */
    getLastDayOfMonth : function(date) {
        return utilDate.getLastDateOfMonth(date).getDay();
    },


    /**
     * Get the date of the first day of the month in which this date resides.
     * @param {Date} date The date
     * @return {Date}
     */
    getFirstDateOfMonth : function(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    },

    /**
     * Get the date of the last day of the month in which this date resides.
     * @param {Date} date The date
     * @return {Date}
     */
    getLastDateOfMonth : function(date) {
        return new Date(date.getFullYear(), date.getMonth(), utilDate.getDaysInMonth(date));
    },

    /**
     * Get the number of days in the current month, adjusted for leap year.
     * @param {Date} date The date
     * @return {Number} The number of days in the month.
     * @method
     */
    getDaysInMonth: (function() {
        var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        return function(date) { // return a closure for efficiency
            var m = date.getMonth();

            return m == 1 && utilDate.isLeapYear(date) ? 29 : daysInMonth[m];
        };
    })(),

    /**
     * Get the English ordinal suffix of the current day (equivalent to the format specifier 'S').
     * @param {Date} date The date
     * @return {String} 'st, 'nd', 'rd' or 'th'.
     */
    getSuffix : function(date) {
        switch (date.getDate()) {
            case 1:
            case 21:
            case 31:
                return "st";
            case 2:
            case 22:
                return "nd";
            case 3:
            case 23:
                return "rd";
            default:
                return "th";
        }
    },

    /**
     * Creates and returns a new Date instance with the exact same date value as the called instance.
     * Dates are copied and passed by reference, so if a copied date variable is modified later, the original
     * variable will also be changed.  When the intention is to create a new variable that will not
     * modify the original instance, you should create a clone.
     *
     * Example of correctly cloning a date:
     * <pre><code>
//wrong way:
var orig = new Date('10/1/2006');
var copy = orig;
copy.setDate(5);
console.log(orig);  //returns 'Thu Oct 05 2006'!

//correct way:
var orig = new Date('10/1/2006'),
    copy = Ext.Date.clone(orig);
copy.setDate(5);
console.log(orig);  //returns 'Thu Oct 01 2006'
     * </code></pre>
     * @param {Date} date The date
     * @return {Date} The new Date instance.
     */
    clone : function(date) {
        return new Date(date.getTime());
    },

    /**
     * Checks if the current date is affected by Daylight Saving Time (DST).
     * @param {Date} date The date
     * @return {Boolean} True if the current date is affected by DST.
     */
    isDST : function(date) {
        // adapted from http://sencha.com/forum/showthread.php?p=247172#post247172
        // courtesy of @geoffrey.mcgill
        return new Date(date.getFullYear(), 0, 1).getTimezoneOffset() != date.getTimezoneOffset();
    },

    /**
     * Attempts to clear all time information from this Date by setting the time to midnight of the same day,
     * automatically adjusting for Daylight Saving Time (DST) where applicable.
     * (note: DST timezone information for the browser's host operating system is assumed to be up-to-date)
     * @param {Date} date The date
     * @param {Boolean} clone true to create a clone of this date, clear the time and return it (defaults to false).
     * @return {Date} this or the clone.
     */
    clearTime : function(date, clone) {
        if (clone) {
            return Ext.Date.clearTime(Ext.Date.clone(date));
        }

        // get current date before clearing time
        var d = date.getDate();

        // clear time
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);

        if (date.getDate() != d) { // account for DST (i.e. day of month changed when setting hour = 0)
            // note: DST adjustments are assumed to occur in multiples of 1 hour (this is almost always the case)
            // refer to http://www.timeanddate.com/time/aboutdst.html for the (rare) exceptions to this rule

            // increment hour until cloned date == current date
            for (var hr = 1, c = utilDate.add(date, Ext.Date.HOUR, hr); c.getDate() != d; hr++, c = utilDate.add(date, Ext.Date.HOUR, hr));

            date.setDate(d);
            date.setHours(c.getHours());
        }

        return date;
    },

    /**
     * Provides a convenient method for performing basic date arithmetic. This method
     * does not modify the Date instance being called - it creates and returns
     * a new Date instance containing the resulting date value.
     *
     * Examples:
     * <pre><code>
// Basic usage:
var dt = Ext.Date.add(new Date('10/29/2006'), Ext.Date.DAY, 5);
console.log(dt); //returns 'Fri Nov 03 2006 00:00:00'

// Negative values will be subtracted:
var dt2 = Ext.Date.add(new Date('10/1/2006'), Ext.Date.DAY, -5);
console.log(dt2); //returns 'Tue Sep 26 2006 00:00:00'

     * </code></pre>
     *
     * @param {Date} date The date to modify
     * @param {String} interval A valid date interval enum value.
     * @param {Number} value The amount to add to the current date.
     * @return {Date} The new Date instance.
     */
    add : function(date, interval, value) {
        var d = Ext.Date.clone(date);
        if (!interval || value === 0) return d;

        switch(interval.toLowerCase()) {
            case Ext.Date.MILLI:
                d= new Date(d.valueOf() + value);
                break;
            case Ext.Date.SECOND:
                d= new Date(d.valueOf() + value * 1000);
                break;
            case Ext.Date.MINUTE:
                d= new Date(d.valueOf() + value * 60000);
                break;
            case Ext.Date.HOUR:
                d= new Date(d.valueOf() + value * 3600000);
                break;
            case Ext.Date.DAY:
                d= new Date(d.valueOf() + value * 86400000);
                break;
            case Ext.Date.MONTH:
                var day = date.getDate();
                if (day > 28) {
                    day = Math.min(day, Ext.Date.getLastDateOfMonth(Ext.Date.add(Ext.Date.getFirstDateOfMonth(date), 'mo', value)).getDate());
                }
                d.setDate(day);
                d.setMonth(date.getMonth() + value);
                break;
            case Ext.Date.YEAR:
                d.setFullYear(date.getFullYear() + value);
                break;
        }
        return d;
    },

    /**
     * Checks if a date falls on or between the given start and end dates.
     * @param {Date} date The date to check
     * @param {Date} start Start date
     * @param {Date} end End date
     * @return {Boolean} true if this date falls on or between the given start and end dates.
     */
    between : function(date, start, end) {
        var t = date.getTime();
        return start.getTime() <= t && t <= end.getTime();
    },

    /**
     * Calculate how many units are there between two time.
     * @param {Date} min The first time
     * @param {Date} max The second time
     * @param {String} unit The unit. This unit is compatible with the date interval constants.
     * @return {Number} The maximum number n of units that min + n * unit <= max
     */
    diff: function (min, max, unit) {
        var ExtDate = Ext.Date, est, diff = +max - min;
        switch (unit) {
            case ExtDate.MILLI:
                return diff;
            case ExtDate.SECOND:
                return Math.floor(diff / 1000);
            case ExtDate.MINUTE:
                return Math.floor(diff / 60000);
            case ExtDate.HOUR:
                return Math.floor(diff / 3600000);
            case ExtDate.DAY:
                return Math.floor(diff / 86400000);
            case 'w':
                return Math.floor(diff / 604800000);
            case ExtDate.MONTH:
                est = (max.getFullYear() * 12 + max.getMonth()) - (min.getFullYear() * 12 + min.getMonth());
                if (Ext.Date.add(min, unit, est) > max) {
                    return est - 1;
                } else {
                    return est;
                }
            case ExtDate.YEAR:
                est = max.getFullYear() - min.getFullYear();
                if (Ext.Date.add(min, unit, est) > max) {
                    return est - 1;
                } else {
                    return est;
                }
        }
    },

    /**
     * Align the date to `unit`
     * @param {Date} date The date to be aligned
     * @param {String} unit The unit. This unit is compatible with the date interval constants.
     * @return {Date} The aligned date.
     */
    align: function (date, unit, step) {
        var num = new Date(+date);
        switch (unit.toLowerCase()) {
            case Ext.Date.MILLI:
                return num;
                break;
            case Ext.Date.SECOND:
                num.setUTCSeconds(num.getUTCSeconds() - num.getUTCSeconds() % step);
                num.setUTCMilliseconds(0);
                return num;
                break;
            case Ext.Date.MINUTE:
                num.setUTCMinutes(num.getUTCMinutes() - num.getUTCMinutes() % step);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
                break;
            case Ext.Date.HOUR:
                num.setUTCHours(num.getUTCHours() - num.getUTCHours() % step);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
                break;
            case Ext.Date.DAY:
                if (step == 7 || step == 14){
                    num.setUTCDate(num.getUTCDate() - num.getUTCDay() + 1);
                }
                num.setUTCHours(0);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
                break;
            case Ext.Date.MONTH:
                num.setUTCMonth(num.getUTCMonth() - (num.getUTCMonth() - 1) % step,1);
                num.setUTCHours(0);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return num;
                break;
            case Ext.Date.YEAR:
                num.setUTCFullYear(num.getUTCFullYear() - num.getUTCFullYear() % step, 1, 1);
                num.setUTCHours(0);
                num.setUTCMinutes(0);
                num.setUTCSeconds(0);
                num.setUTCMilliseconds(0);
                return date;
                break;
        }
    }
};

var utilDate = Ext.DateExtras;

Ext.apply(Ext.Date, utilDate);


})();



/**
 * Reusable data formatting functions
 */
Ext.define('Ext.util.Format', {
    requires: [
        'Ext.DateExtras'
    ],

    singleton: true,

    /**
     * The global default date format.
     */
    defaultDateFormat: 'm/d/Y',

    escapeRe: /('|\\)/g,
    trimRe: /^[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/g,
    formatRe: /\{(\d+)\}/g,
    escapeRegexRe: /([-.*+?^${}()|[\]\/\\])/g,
    dashesRe: /-/g,
    iso8601TestRe: /\d\dT\d\d/,
    iso8601SplitRe: /[- :T\.Z\+]/,

    /**
     * Truncate a string and add an ellipsis ('...') to the end if it exceeds the specified length
     * @param {String} value The string to truncate
     * @param {Number} length The maximum length to allow before truncating
     * @param {Boolean} word True to try to find a common word break
     * @return {String} The converted text
     */
    ellipsis: function(value, len, word) {
        if (value && value.length > len) {
            if (word) {
                var vs = value.substr(0, len - 2),
                index = Math.max(vs.lastIndexOf(' '), vs.lastIndexOf('.'), vs.lastIndexOf('!'), vs.lastIndexOf('?'));
                if (index != -1 && index >= (len - 15)) {
                    return vs.substr(0, index) + "...";
                }
            }
            return value.substr(0, len - 3) + "...";
        }
        return value;
    },

    /**
     * Escapes the passed string for use in a regular expression
     * @param {String} str
     * @return {String}
     */
    escapeRegex: function(s) {
        return s.replace(Ext.util.Format.escapeRegexRe, "\\$1");
    },

    /**
     * Escapes the passed string for ' and \
     * @param {String} string The string to escape
     * @return {String} The escaped string
     */
    escape: function(string) {
        return string.replace(Ext.util.Format.escapeRe, "\\$1");
    },

    /**
     * Utility function that allows you to easily switch a string between two alternating values.  The passed value
     * is compared to the current string, and if they are equal, the other value that was passed in is returned.  If
     * they are already different, the first value passed in is returned.  Note that this method returns the new value
     * but does not change the current string.
     * <pre><code>
    // alternate sort directions
    sort = Ext.util.Format.toggle(sort, 'ASC', 'DESC');

    // instead of conditional logic:
    sort = (sort == 'ASC' ? 'DESC' : 'ASC');
       </code></pre>
     * @param {String} string The current string
     * @param {String} value The value to compare to the current string
     * @param {String} other The new value to use if the string already equals the first value passed in
     * @return {String} The new value
     */
    toggle: function(string, value, other) {
        return string == value ? other : value;
    },

    /**
     * Trims whitespace from either end of a string, leaving spaces within the string intact.  Example:
     * <pre><code>
    var s = '  foo bar  ';
    alert('-' + s + '-');         //alerts "- foo bar -"
    alert('-' + Ext.util.Format.trim(s) + '-');  //alerts "-foo bar-"
       </code></pre>
     * @param {String} string The string to escape
     * @return {String} The trimmed string
     */
    trim: function(string) {
        return string.replace(Ext.util.Format.trimRe, "");
    },

    /**
     * Pads the left side of a string with a specified character.  This is especially useful
     * for normalizing number and date strings.  Example usage:
     *
     * <pre><code>
var s = Ext.util.Format.leftPad('123', 5, '0');
// s now contains the string: '00123'
       </code></pre>
     * @param {String} string The original string
     * @param {Number} size The total length of the output string
     * @param {String} char (optional) The character with which to pad the original string (defaults to empty string " ")
     * @return {String} The padded string
     */
    leftPad: function (val, size, ch) {
        var result = String(val);
        ch = ch || " ";
        while (result.length < size) {
            result = ch + result;
        }
        return result;
    },

    /**
     * Allows you to define a tokenized string and pass an arbitrary number of arguments to replace the tokens.  Each
     * token must be unique, and must increment in the format {0}, {1}, etc.  Example usage:
     * <pre><code>
var cls = 'my-class', text = 'Some text';
var s = Ext.util.Format.format('&lt;div class="{0}">{1}&lt;/div>', cls, text);
// s now contains the string: '&lt;div class="my-class">Some text&lt;/div>'
       </code></pre>
     * @param {String} string The tokenized string to be formatted
     * @param {String...} values The values to replace token {0}, {1}, etc
     * @return {String} The formatted string
     */
    format: function (format) {
        var args = Ext.toArray(arguments, 1);
        return format.replace(Ext.util.Format.formatRe, function(m, i) {
            return args[i];
        });
    },

    /**
     * Convert certain characters (&, <, >, and ') to their HTML character equivalents for literal display in web pages.
     * @param {String} value The string to encode
     * @return {String} The encoded text
     */
    htmlEncode: function(value) {
        return ! value ? value: String(value).replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    },

    /**
     * Convert certain characters (&, <, >, and ') from their HTML character equivalents.
     * @param {String} value The string to decode
     * @return {String} The decoded text
     */
    htmlDecode: function(value) {
        return ! value ? value: String(value).replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    },

    /**
     * Parse a value into a formatted date using the specified format pattern.
     * @param {String/Date} value The value to format (Strings must conform to the format expected by the javascript
     * Date object's <a href="http://www.w3schools.com/jsref/jsref_parse.asp">parse()</a> method)
     * @param {String} format (optional) Any valid date format string (defaults to 'm/d/Y')
     * @return {String} The formatted date string
     */
    date: function(value, format) {
        var date = value;
        if (!value) {
            return "";
        }
        if (!Ext.isDate(value)) {
            date = new Date(Date.parse(value));
            if (isNaN(date)) {
                // Dates with ISO 8601 format are not well supported by mobile devices, this can work around the issue.
                if (this.iso8601TestRe.test(value)) {
                    date = value.split(this.iso8601SplitRe);
                    date = new Date(date[0], date[1]-1, date[2], date[3], date[4], date[5]);
                }
                if (isNaN(date)) {
                    // Dates with the format "2012-01-20" fail, but "2012/01/20" work in some browsers. We'll try and
                    // get around that.
                    date = new Date(Date.parse(value.replace(this.dashesRe, "/")));
                }
            }
            value = date;
        }
        return Ext.Date.format(value, format || Ext.util.Format.defaultDateFormat);
    }
});

/**
 * Represents an HTML fragment template. Templates may be {@link #compile precompiled} for greater performance.
 *
 * An instance of this class may be created by passing to the constructor either a single argument, or multiple
 * arguments:
 *
 * # Single argument: String/Array
 *
 * The single argument may be either a String or an Array:
 *
 * - String:
 *
 *       var t = new Ext.Template("<div>Hello {0}.</div>");
 *       t.{@link #append}('some-element', ['foo']);
 *
 * - Array:
 *
 *   An Array will be combined with `join('')`.
 *
 *       var t = new Ext.Template([
 *           '<div name="{id}">',
 *               '<span class="{cls}">{name:trim} {value:ellipsis(10)}</span>',
 *           '</div>',
 *       ]);
 *       t.{@link #compile}();
 *       t.{@link #append}('some-element', {id: 'myid', cls: 'myclass', name: 'foo', value: 'bar'});
 *
 * # Multiple arguments: String, Object, Array, ...
 *
 * Multiple arguments will be combined with `join('')`.
 *
 *     var t = new Ext.Template(
 *         '<div name="{id}">',
 *             '<span class="{cls}">{name} {value}</span>',
 *         '</div>',
 *         // a configuration object:
 *         {
 *             compiled: true,      // {@link #compile} immediately
 *         }
 *     );
 *
 * # Notes
 *
 * - For a list of available format functions, see {@link Ext.util.Format}.
 * - `disableFormats` reduces `{@link #apply}` time when no formatting is required.
 */
Ext.define('Ext.Template', {

    /* Begin Definitions */

    requires: ['Ext.dom.Helper', 'Ext.util.Format'],

    inheritableStatics: {
        /**
         * Creates a template from the passed element's value (_display:none_ textarea, preferred) or innerHTML.
         * @param {String/HTMLElement} el A DOM element or its id
         * @param {Object} config (optional) Config object
         * @return {Ext.Template} The created template
         * @static
         * @inheritable
         */
        from: function(el, config) {
            el = Ext.getDom(el);
            return new this(el.value || el.innerHTML, config || '');
        }
    },

    /* End Definitions */

    /**
     * Creates new template.
     * 
     * @param {String...} html List of strings to be concatenated into template.
     * Alternatively an array of strings can be given, but then no config object may be passed.
     * @param {Object} config (optional) Config object
     */
    constructor: function(html) {
        var me = this,
            args = arguments,
            buffer = [],
            i = 0,
            length = args.length,
            value;

        me.initialConfig = {};
        
        // Allow an array to be passed here so we can
        // pass an array of strings and an object
        // at the end
        if (length === 1 && Ext.isArray(html)) {
            args = html;
            length = args.length;
        }

        if (length > 1) {
            for (; i < length; i++) {
                value = args[i];
                if (typeof value == 'object') {
                    Ext.apply(me.initialConfig, value);
                    Ext.apply(me, value);
                } else {
                    buffer.push(value);
                }
            }
        } else {
            buffer.push(html);
        }

        // @private
        me.html = buffer.join('');

        if (me.compiled) {
            me.compile();
        }
    },

    /**
     * @property {Boolean} isTemplate
     * `true` in this class to identify an object as an instantiated Template, or subclass thereof.
     */
    isTemplate: true,

    /**
     * @cfg {Boolean} compiled
     * True to immediately compile the template. Defaults to false.
     */

    /**
     * @cfg {Boolean} disableFormats
     * True to disable format functions in the template. If the template doesn't contain
     * format functions, setting disableFormats to true will reduce apply time. Defaults to false.
     */
    disableFormats: false,

    re: /\{([\w\-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g,

    /**
     * Returns an HTML fragment of this template with the specified values applied.
     *
     * @param {Object/Array} values The template values. Can be an array if your params are numeric:
     *
     *     var tpl = new Ext.Template('Name: {0}, Age: {1}');
     *     tpl.apply(['John', 25]);
     *
     * or an object:
     *
     *     var tpl = new Ext.Template('Name: {name}, Age: {age}');
     *     tpl.apply({name: 'John', age: 25});
     *
     * @return {String} The HTML fragment
     */
    apply: function(values) {
        var me = this,
            useFormat = me.disableFormats !== true,
            fm = Ext.util.Format,
            tpl = me,
            ret;

        if (me.compiled) {
            return me.compiled(values).join('');
        }

        function fn(m, name, format, args) {
            if (format && useFormat) {
                if (args) {
                    args = [values[name]].concat(Ext.functionFactory('return ['+ args +'];')());
                } else {
                    args = [values[name]];
                }
                if (format.substr(0, 5) == "this.") {
                    return tpl[format.substr(5)].apply(tpl, args);
                }
                else {
                    return fm[format].apply(fm, args);
                }
            }
            else {
                return values[name] !== undefined ? values[name] : "";
            }
        }

        ret = me.html.replace(me.re, fn);
        return ret;
    },

    /**
     * Appends the result of this template to the provided output array.
     * @param {Object/Array} values The template values. See {@link #apply}.
     * @param {Array} out The array to which output is pushed.
     * @return {Array} The given out array.
     */
    applyOut: function(values, out) {
        var me = this;

        if (me.compiled) {
            out.push.apply(out, me.compiled(values));
        } else {
            out.push(me.apply(values));
        }

        return out;
    },

    /**
     * @method applyTemplate
     * @member Ext.Template
     * Alias for {@link #apply}.
     * @inheritdoc Ext.Template#apply
     */
    applyTemplate: function () {
        return this.apply.apply(this, arguments);
    },

    /**
     * Sets the HTML used as the template and optionally compiles it.
     * @param {String} html
     * @param {Boolean} compile (optional) True to compile the template.
     * @return {Ext.Template} this
     */
    set: function(html, compile) {
        var me = this;
        me.html = html;
        me.compiled = null;
        return compile ? me.compile() : me;
    },

    compileARe: /\\/g,
    compileBRe: /(\r\n|\n)/g,
    compileCRe: /'/g,

    /**
     * Compiles the template into an internal function, eliminating the RegEx overhead.
     * @return {Ext.Template} this
     */
    compile: function() {
        var me = this,
            fm = Ext.util.Format,
            useFormat = me.disableFormats !== true,
            body, bodyReturn;

        function fn(m, name, format, args) {
            if (format && useFormat) {
                args = args ? ',' + args: "";
                if (format.substr(0, 5) != "this.") {
                    format = "fm." + format + '(';
                }
                else {
                    format = 'this.' + format.substr(5) + '(';
                }
            }
            else {
                args = '';
                format = "(values['" + name + "'] == undefined ? '' : ";
            }
            return "'," + format + "values['" + name + "']" + args + ") ,'";
        }

        bodyReturn = me.html.replace(me.compileARe, '\\\\').replace(me.compileBRe, '\\n').replace(me.compileCRe, "\\'").replace(me.re, fn);
        body = "this.compiled = function(values){ return ['" + bodyReturn + "'];};";
        eval(body);
        return me;
    },

    /**
     * Applies the supplied values to the template and inserts the new node(s) as the first child of el.
     *
     * @param {String/HTMLElement/Ext.Element} el The context element
     * @param {Object/Array} values The template values. See {@link #applyTemplate} for details.
     * @param {Boolean} returnElement (optional) true to return a Ext.Element.
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    insertFirst: function(el, values, returnElement) {
        return this.doInsert('afterBegin', el, values, returnElement);
    },

    /**
     * Applies the supplied values to the template and inserts the new node(s) before el.
     *
     * @param {String/HTMLElement/Ext.Element} el The context element
     * @param {Object/Array} values The template values. See {@link #applyTemplate} for details.
     * @param {Boolean} returnElement (optional) true to return a Ext.Element.
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    insertBefore: function(el, values, returnElement) {
        return this.doInsert('beforeBegin', el, values, returnElement);
    },

    /**
     * Applies the supplied values to the template and inserts the new node(s) after el.
     *
     * @param {String/HTMLElement/Ext.Element} el The context element
     * @param {Object/Array} values The template values. See {@link #applyTemplate} for details.
     * @param {Boolean} returnElement (optional) true to return a Ext.Element.
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    insertAfter: function(el, values, returnElement) {
        return this.doInsert('afterEnd', el, values, returnElement);
    },

    /**
     * Applies the supplied `values` to the template and appends the new node(s) to the specified `el`.
     *
     * For example usage see {@link Ext.Template Ext.Template class docs}.
     *
     * @param {String/HTMLElement/Ext.Element} el The context element
     * @param {Object/Array} values The template values. See {@link #applyTemplate} for details.
     * @param {Boolean} returnElement (optional) true to return an Ext.Element.
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    append: function(el, values, returnElement) {
        return this.doInsert('beforeEnd', el, values, returnElement);
    },

    doInsert: function(where, el, values, returnElement) {
        var newNode = Ext.DomHelper.insertHtml(where, Ext.getDom(el), this.apply(values));
        return returnElement ? Ext.get(newNode) : newNode;
    },

    /**
     * Applies the supplied values to the template and overwrites the content of el with the new node(s).
     *
     * @param {String/HTMLElement/Ext.Element} el The context element
     * @param {Object/Array} values The template values. See {@link #applyTemplate} for details.
     * @param {Boolean} returnElement (optional) true to return a Ext.Element.
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    overwrite: function(el, values, returnElement) {
        var newNode = Ext.DomHelper.overwrite(Ext.getDom(el), this.apply(values));
        return returnElement ? Ext.get(newNode) : newNode;
    }
});

/**
 * A template class that supports advanced functionality like:
 *
 * - Autofilling arrays using templates and sub-templates
 * - Conditional processing with basic comparison operators
 * - Basic math function support
 * - Execute arbitrary inline code with special built-in template variables
 * - Custom member functions
 * - Many special tags and built-in operators that aren't defined as part of the API, but are supported in the templates that can be created
 *
 * XTemplate provides the templating mechanism built into {@link Ext.DataView}.
 *
 * The {@link Ext.Template} describes the acceptable parameters to pass to the constructor. The following examples
 * demonstrate all of the supported features.
 *
 * # Sample Data
 *
 * This is the data object used for reference in each code example:
 *
 *     var data = {
 *         name: 'Don Griffin',
 *         title: 'Senior Technomage',
 *         company: 'Sencha Inc.',
 *         drinks: ['Coffee', 'Water', 'More Coffee'],
 *         kids: [
 *             { name: 'Aubrey',  age: 17 },
 *             { name: 'Joshua',  age: 13 },
 *             { name: 'Cale',    age: 10 },
 *             { name: 'Nikol',   age: 5 },
 *             { name: 'Solomon', age: 0 }
 *         ]
 *     };
 *
 * # Auto filling of arrays
 *
 * The **tpl** tag and the **for** operator are used to process the provided data object:
 *
 * - If the value specified in for is an array, it will auto-fill, repeating the template block inside the tpl
 *   tag for each item in the array.
 * - If for="." is specified, the data object provided is examined.
 * - While processing an array, the special variable {#} will provide the current array index + 1 (starts at 1, not 0).
 *
 * Examples:
 *
 *     <tpl for=".">...</tpl>       // loop through array at root node
 *     <tpl for="foo">...</tpl>     // loop through array at foo node
 *     <tpl for="foo.bar">...</tpl> // loop through array at foo.bar node
 *
 * Using the sample data above:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Kids: ',
 *         '<tpl for=".">',       // process the data.kids node
 *             '<p>{#}. {name}</p>',  // use current array index to autonumber
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data.kids); // pass the kids property of the data object
 *
 * An example illustrating how the **for** property can be leveraged to access specified members of the provided data
 * object to populate the template:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Title: {title}</p>',
 *         '<p>Company: {company}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',     // interrogate the kids property within the data
 *             '<p>{name}</p>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);  // pass the root node of the data object
 *
 * Flat arrays that contain values (and not objects) can be auto-rendered using the special **`{.}`** variable inside a
 * loop. This variable will represent the value of the array at the current index:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>{name}\'s favorite beverages:</p>',
 *         '<tpl for="drinks">',
 *             '<div> - {.}</div>',
 *         '</tpl>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * When processing a sub-template, for example while looping through a child array, you can access the parent object's
 * members via the **parent** object:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="age &gt; 1">',
 *                 '<p>{name}</p>',
 *                 '<p>Dad: {parent.name}</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * # Conditional processing with basic comparison operators
 *
 * The **tpl** tag and the **if** operator are used to provide conditional checks for deciding whether or not to render
 * specific parts of the template.
 *
 * Using the sample data above:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="age &gt; 1">',
 *                 '<p>{name}</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * More advanced conditionals are also supported:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<p>{name} is a ',
 *             '<tpl if="age &gt;= 13">',
 *                 '<p>teenager</p>',
 *             '<tpl elseif="age &gt;= 2">',
 *                 '<p>kid</p>',
 *             '<tpl else>',
 *                 '<p>baby</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<p>{name} is a ',
 *             '<tpl switch="name">',
 *                 '<tpl case="Aubrey" case="Nikol">',
 *                     '<p>girl</p>',
 *                 '<tpl default">',
 *                     '<p>boy</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *
 * A `break` is implied between each case and default, however, multiple cases can be listed
 * in a single &lt;tpl&gt; tag.
 *
 * # Using double quotes
 *
 * Examples:
 *
 *     var tpl = new Ext.XTemplate(
 *         "<tpl if='age &gt; 1 && age &lt; 10'>Child</tpl>",
 *         "<tpl if='age &gt;= 10 && age &lt; 18'>Teenager</tpl>",
 *         "<tpl if='this.isGirl(name)'>...</tpl>",
 *         '<tpl if="id == \'download\'">...</tpl>',
 *         "<tpl if='needsIcon'><img src='{icon}' class='{iconCls}'/></tpl>",
 *         "<tpl if='name == \"Don\"'>Hello</tpl>"
 *     );
 *
 * # Basic math support
 *
 * The following basic math operators may be applied directly on numeric data values:
 *
 *     + - * /
 *
 * For example:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="age &gt; 1">',  // <-- Note that the > is encoded
 *                 '<p>{#}: {name}</p>',  // <-- Auto-number each item
 *                 '<p>In 5 Years: {age+5}</p>',  // <-- Basic math
 *                 '<p>Dad: {parent.name}</p>',
 *             '</tpl>',
 *         '</tpl></p>'
 *     );
 *     tpl.overwrite(panel.body, data);
 *
 * # Execute arbitrary inline code with special built-in template variables
 *
 * Anything between `{[ ... ]}` is considered code to be executed in the scope of the template.
 * The expression is evaluated and the result is included in the generated result. There are
 * some special variables available in that code:
 *
 * - **out**: The output array into which the template is being appended (using `push` to later
 *   `join`).
 * - **values**: The values in the current scope. If you are using scope changing sub-templates,
 *   you can change what values is.
 * - **parent**: The scope (values) of the ancestor template.
 * - **xindex**: If you are in a looping template, the index of the loop you are in (1-based).
 * - **xcount**: If you are in a looping template, the total length of the array you are looping.
 *
 * This example demonstrates basic row striping using an inline code block and the xindex variable:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Company: {[values.company.toUpperCase() + ", " + values.title]}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<div class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
 *             '{name}',
 *             '</div>',
 *         '</tpl></p>'
 *      );
 *
 * Any code contained in "verbatim" blocks (using "{% ... %}") will be inserted directly in
 * the generated code for the template. These blocks are not included in the output. This
 * can be used for simple things like break/continue in a loop, or control structures or
 * method calls (when they don't produce output). The `this` references the template instance.
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Company: {[values.company.toUpperCase() + ", " + values.title]}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '{% if (xindex % 2 === 0) continue; %}',
 *             '{name}',
 *             '{% if (xindex > 100) break; %}',
 *             '</div>',
 *         '</tpl></p>'
 *      );
 *
 * # Template member functions
 *
 * One or more member functions can be specified in a configuration object passed into the XTemplate constructor for
 * more complex processing:
 *
 *     var tpl = new Ext.XTemplate(
 *         '<p>Name: {name}</p>',
 *         '<p>Kids: ',
 *         '<tpl for="kids">',
 *             '<tpl if="this.isGirl(name)">',
 *                 '<p>Girl: {name} - {age}</p>',
 *             '<tpl else>',
 *                 '<p>Boy: {name} - {age}</p>',
 *             '</tpl>',
 *             '<tpl if="this.isBaby(age)">',
 *                 '<p>{name} is a baby!</p>',
 *             '</tpl>',
 *         '</tpl></p>',
 *         {
 *             // XTemplate configuration:
 *             disableFormats: true,
 *             // member functions:
 *             isGirl: function(name){
 *                return name == 'Sara Grace';
 *             },
 *             isBaby: function(age){
 *                return age < 1;
 *             }
 *         }
 *     );
 *     tpl.overwrite(panel.body, data);
 */
Ext.define('Ext.XTemplate', {
    extend: 'Ext.Template',

    requires: 'Ext.XTemplateCompiler',

    /**
     * @private
     */
    emptyObj: {},

    /**
     * @cfg {Boolean} compiled
     * Only applies to {@link Ext.Template}, XTemplates are compiled automatically on the
     * first call to {@link #apply} or {@link #applyOut}.
     */

    apply: function(values) {
        return this.applyOut(values, []).join('');
    },

    applyOut: function(values, out, parent) {
        var me = this,
            compiler;

        if (!me.fn) {
            compiler = new Ext.XTemplateCompiler({
                useFormat: me.disableFormats !== true,
                definitions: me.definitions
            });

            me.fn = compiler.compile(me.html);
        }

        try {
            me.fn.call(me, out, values, parent || me.emptyObj, 1, 1);
        } catch (e) {
        }

        return out;
    },

    /**
     * Does nothing. XTemplates are compiled automatically, so this function simply returns this.
     * @return {Ext.XTemplate} this
     */
    compile: function() {
        return this;
    },

    statics: {
        /**
         * Gets an `XTemplate` from an object (an instance of an {@link Ext#define}'d class).
         * Many times, templates are configured high in the class hierarchy and are to be
         * shared by all classes that derive from that base. To further complicate matters,
         * these templates are seldom actual instances but are rather configurations. For
         * example:
         *
         *      Ext.define('MyApp.Class', {
         *          someTpl: [
         *              'tpl text here'
         *          ]
         *      });
         *
         * The goal being to share that template definition with all instances and even
         * instances of derived classes, until `someTpl` is overridden. This method will
         * "upgrade" these configurations to be real `XTemplate` instances *in place* (to
         * avoid creating one instance per object).
         *
         * @param {Object} instance The object from which to get the `XTemplate` (must be
         * an instance of an {@link Ext#define}'d class).
         * @param {String} name The name of the property by which to get the `XTemplate`.
         * @return {Ext.XTemplate} The `XTemplate` instance or null if not found.
         * @protected
         */
        getTpl: function (instance, name) {
            var tpl = instance[name], // go for it! 99% of the time we will get it!
                proto;

            if (tpl && !tpl.isTemplate) { // tpl is just a configuration (not an instance)
                // create the template instance from the configuration:
                tpl = Ext.ClassManager.dynInstantiate('Ext.XTemplate', tpl);

                // and replace the reference with the new instance:
                if (instance.hasOwnProperty(name)) { // the tpl is on the instance
                    instance[name] = tpl;
                } else { // must be somewhere in the prototype chain
                    for (proto = instance.self.prototype; proto; proto = proto.superclass) {
                        if (proto.hasOwnProperty(name)) {
                            proto[name] = tpl;
                            break;
                        }
                    }
                }
            }
            // else !tpl (no such tpl) or the tpl is an instance already... either way, tpl
            // is ready to return

            return tpl || null;
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.util.SizeMonitor', {

    extend: 'Ext.Evented',

    config: {
        element: null,

        detectorCls: Ext.baseCSSPrefix + 'size-change-detector',

        callback: Ext.emptyFn,

        scope: null,

        args: []
    },

    constructor: function(config) {
        this.initConfig(config);

        this.doFireSizeChangeEvent = Ext.Function.bind(this.doFireSizeChangeEvent, this);

        var me = this,
            element = this.getElement().dom,
            cls = this.getDetectorCls(),
            expandDetector = Ext.Element.create({
                classList: [cls, cls + '-expand'],
                children: [{}]
            }, true),
            shrinkDetector = Ext.Element.create({
                classList: [cls, cls + '-shrink'],
                children: [{}]
            }, true),
            expandListener = function(e) {
                me.onDetectorScroll('expand', e);
            },
            shrinkListener = function(e) {
                me.onDetectorScroll('shrink', e);
            };

        element.appendChild(expandDetector);
        element.appendChild(shrinkDetector);

        this.detectors = {
            expand: expandDetector,
            shrink: shrinkDetector
        };

        this.position = {
            expand: {
                left: 0,
                top: 0
            },
            shrink: {
                left: 0,
                top: 0
            }
        };

        this.listeners = {
            expand: expandListener,
            shrink: shrinkListener
        };

        this.refresh();

        expandDetector.addEventListener('scroll', expandListener, true);
        shrinkDetector.addEventListener('scroll', shrinkListener, true);
    },

    applyElement: function(element) {
        if (element) {
            return Ext.get(element);
        }
    },

    updateElement: function(element) {
        element.on('destroy', 'destroy', this);
    },

    refreshPosition: function(name) {
        var detector = this.detectors[name],
            position = this.position[name],
            left, top;

        position.left = left = detector.scrollWidth - detector.offsetWidth;
        position.top = top = detector.scrollHeight - detector.offsetHeight;

        detector.scrollLeft = left;
        detector.scrollTop = top;
    },

    refresh: function() {
        this.refreshPosition('expand');
        this.refreshPosition('shrink');
    },

    onDetectorScroll: function(name) {
        var detector = this.detectors[name],
            position = this.position[name];

        if (detector.scrollLeft !== position.left || detector.scrollTop !== position.top) {
            this.refresh();
            this.fireSizeChangeEvent();
        }
    },

    fireSizeChangeEvent: function() {
        clearTimeout(this.sizeChangeThrottleTimer);

        this.sizeChangeThrottleTimer = setTimeout(this.doFireSizeChangeEvent, 1);
    },

    doFireSizeChangeEvent: function() {
        this.getCallback().apply(this.getScope(), this.getArgs());
    },

    destroyDetector: function(name) {
        var detector = this.detectors[name],
            listener = this.listeners[name];

        detector.removeEventListener('scroll', listener, true);
        Ext.removeNode(detector);
    },

    destroy: function() {
        clearTimeout(this.sizeChangeThrottleTimer);

        this.callParent(arguments);

        this.destroyDetector('expand');
        this.destroyDetector('shrink');

        delete this.listeners;
        delete this.detectors;
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.easing.Linear', {

    extend: 'Ext.fx.easing.Abstract',

    alias: 'easing.linear',

    config: {
        duration: 0,
        endValue: 0
    },

    updateStartValue: function(startValue) {
        this.distance = this.getEndValue() - startValue;
    },

    updateEndValue: function(endValue) {
        this.distance = endValue - this.getStartValue();
    },

    getValue: function() {
        var deltaTime = Ext.Date.now() - this.getStartTime(),
            duration = this.getDuration();

        if (deltaTime > duration) {
            this.isEnded = true;
            return this.getEndValue();
        }
        else {
            return this.getStartValue() + ((deltaTime / duration) * this.distance);
        }
    }
});

/**
 * @private
 *
 * The abstract class. Sub-classes are expected, at the very least, to implement translation logics inside
 * the 'translate' method
 */
Ext.define('Ext.util.translatable.Abstract', {
    extend: 'Ext.Evented',

    requires: ['Ext.fx.easing.Linear'],

    config: {
        easing: null,

        easingX: null,

        easingY: null,

        fps: 60
    },

    /**
     * @event animationstart
     * Fires whenever the animation is started
     * @param {Ext.util.translatable.Abstract} this
     * @param {Number} x The current translation on the x axis
     * @param {Number} y The current translation on the y axis
     */

    /**
     * @event animationframe
     * Fires for each animation frame
     * @param {Ext.util.translatable.Abstract} this
     * @param {Number} x The new translation on the x axis
     * @param {Number} y The new translation on the y axis
     */

    /**
     * @event animationend
     * Fires whenever the animation is ended
     * @param {Ext.util.translatable.Abstract} this
     * @param {Number} x The current translation on the x axis
     * @param {Number} y The current translation on the y axis
     */

    x: 0,

    y: 0,

    activeEasingX: null,

    activeEasingY: null,

    isAnimating: false,

    isTranslatable: true,

    constructor: function(config) {
        this.doAnimationFrame = Ext.Function.bind(this.doAnimationFrame, this);

        this.initConfig(config);
    },

    factoryEasing: function(easing) {
        return Ext.factory(easing, Ext.fx.easing.Linear, null, 'easing');
    },

    applyEasing: function(easing) {
        if (!this.getEasingX()) {
            this.setEasingX(this.factoryEasing(easing));
        }

        if (!this.getEasingY()) {
            this.setEasingY(this.factoryEasing(easing));
        }
    },

    applyEasingX: function(easing) {
        return this.factoryEasing(easing);
    },

    applyEasingY: function(easing) {
        return this.factoryEasing(easing);
    },

    updateFps: function(fps) {
        this.animationInterval = 1000 / fps;
    },

    doTranslate: Ext.emptyFn,

    translate: function(x, y, animation) {
        if (animation) {
            return this.translateAnimated(x, y, animation);
        }

        if (this.isAnimating) {
            this.stopAnimation();
        }

        if (typeof x == 'number') {
            this.x = x;
        }

        if (typeof y == 'number') {
            this.y = y;
        }

        return this.doTranslate(x, y);
    },

    translateAxis: function(axis, value, animation) {
        var x, y;

        if (axis == 'x') {
            x = value;
        }
        else {
            y = value;
        }

        return this.translate(x, y, animation);
    },

    animate: function(easingX, easingY) {
        this.activeEasingX = easingX;
        this.activeEasingY = easingY;

        this.isAnimating = true;
        this.animationTimer = setInterval(this.doAnimationFrame, this.animationInterval);

        this.fireEvent('animationstart', this, this.x, this.y);

        return this;
    },

    translateAnimated: function(x, y, animation) {
        if (!Ext.isObject(animation)) {
            animation = {};
        }

        if (this.isAnimating) {
            this.stopAnimation();
        }

        var now = Ext.Date.now(),
            easing = animation.easing,
            easingX = (typeof x == 'number') ? (animation.easingX || easing || this.getEasingX() || true) : null,
            easingY = (typeof y == 'number') ? (animation.easingY || easing || this.getEasingY() || true) : null;

        if (easingX) {
            easingX = this.factoryEasing(easingX);
            easingX.setStartTime(now);
            easingX.setStartValue(this.x);
            easingX.setEndValue(x);

            if ('duration' in animation) {
                easingX.setDuration(animation.duration);
            }
        }

        if (easingY) {
            easingY = this.factoryEasing(easingY);
            easingY.setStartTime(now);
            easingY.setStartValue(this.y);
            easingY.setEndValue(y);

            if ('duration' in animation) {
                easingY.setDuration(animation.duration);
            }
        }

        return this.animate(easingX, easingY);
    },

    doAnimationFrame: function() {
        var easingX = this.activeEasingX,
            easingY = this.activeEasingY,
            x, y;

        if (!this.isAnimating) {
            return;
        }

        if (easingX === null && easingY === null) {
            this.stopAnimation();
            return;
        }

        if (easingX !== null) {
            this.x = x = Math.round(easingX.getValue());

            if (easingX.isEnded) {
                this.activeEasingX = null;
                this.fireEvent('axisanimationend', this, 'x', x);
            }
        }
        else {
            x = this.x;
        }

        if (easingY !== null) {
            this.y = y = Math.round(easingY.getValue());

            if (easingY.isEnded) {
                this.activeEasingY = null;
                this.fireEvent('axisanimationend', this, 'y', y);
            }
        }
        else {
            y = this.y;
        }

        this.doTranslate(x, y);
        this.fireEvent('animationframe', this, x, y);
    },

    stopAnimation: function() {
        if (!this.isAnimating) {
            return;
        }

        this.activeEasingX = null;
        this.activeEasingY = null;

        this.isAnimating = false;

        clearInterval(this.animationTimer);
        this.fireEvent('animationend', this, this.x, this.y);
    },

    refresh: function() {
        this.translate(this.x, this.y);
    },

    destroy: function() {
        if (this.isAnimating) {
            this.stopAnimation();
        }

        this.callParent(arguments);
    }
});

/**
 * @private
 */
Ext.define('Ext.util.translatable.Dom', {
    extend: 'Ext.util.translatable.Abstract',

    config: {
        element: null
    },

    applyElement: function(element) {
        if (!element) {
            return;
        }

        return Ext.get(element);
    },

    updateElement: function() {
        this.refresh();
    }
});

/**
 * @private
 *
 * CSS Transform implementation
 */
Ext.define('Ext.util.translatable.CssTransform', {
    extend: 'Ext.util.translatable.Dom',

    doTranslate: function() {
        this.getElement().dom.style.webkitTransform = 'matrix(1,0,0,1,' + this.x + ', ' + this.y + ')';
    },

    destroy: function() {
        var element = this.getElement();

        if (element && !element.isDestroyed) {
            element.dom.style.webkitTransform = null;
        }

        this.callParent(arguments);
    }
});

/**
 * @private
 *
 * Scroll position implementation
 */
Ext.define('Ext.util.translatable.ScrollPosition', {
    extend: 'Ext.util.translatable.Dom',

    wrapperWidth: 0,

    wrapperHeight: 0,

    baseCls: 'x-translatable',

    config: {
        useWrapper: true
    },

    getWrapper: function() {
        var wrapper = this.wrapper,
            baseCls = this.baseCls,
            element = this.getElement(),
            nestedStretcher, container;

        if (!wrapper) {
            container = element.getParent();

            if (!container) {
                return null;
            }

            if (this.getUseWrapper()) {
                wrapper = element.wrap({
                    className: baseCls + '-wrapper'
                }, true);
            }
            else {
                wrapper = container.dom;
            }

            wrapper.appendChild(Ext.Element.create({
                className: baseCls + '-stretcher'
            }, true));

            this.nestedStretcher = nestedStretcher = Ext.Element.create({
                className: baseCls + '-nested-stretcher'
            }, true);

            element.appendChild(nestedStretcher);

            element.addCls(baseCls);
            container.addCls(baseCls + '-container');

            this.container = container;
            this.wrapper = wrapper;

            this.refresh();
        }

        return wrapper;
    },

    doTranslate: function(x, y) {
        var wrapper = this.getWrapper();

        if (wrapper) {
            if (typeof x == 'number') {
                wrapper.scrollLeft = this.wrapperWidth - x;
            }

            if (typeof y == 'number') {
                wrapper.scrollTop = this.wrapperHeight - y;
            }
        }
    },

    refresh: function() {
        var wrapper = this.getWrapper();

        if (wrapper) {
            this.wrapperWidth = wrapper.offsetWidth;
            this.wrapperHeight = wrapper.offsetHeight;

            this.callParent(arguments);
        }
    },

    destroy: function() {
        var element = this.getElement(),
            baseCls = this.baseCls;

        if (this.wrapper) {
            if (this.getUseWrapper()) {
                element.unwrap();
            }

            this.container.removeCls(baseCls + '-container');
            element.removeCls(baseCls);
            element.removeChild(this.nestedStretcher);
        }

        this.callParent(arguments);
    }

});

/**
 * The utility class to abstract different implementations to have the best performance when applying 2D translation
 * on any DOM element.
 *
 * @private
 */
Ext.define('Ext.util.Translatable', {
    requires: [
        'Ext.util.translatable.CssTransform',
        'Ext.util.translatable.ScrollPosition'
    ],

    constructor: function(config) {
        var namespace = Ext.util.translatable,
            CssTransform = namespace.CssTransform,
            ScrollPosition = namespace.ScrollPosition,
            classReference;

        if (typeof config == 'object' && 'translationMethod' in config) {
            if (config.translationMethod === 'scrollposition') {
                classReference = ScrollPosition;
            }
            else if (config.translationMethod === 'csstransform') {
                classReference = CssTransform;
            }
        }

        if (!classReference) {
            if (Ext.os.is.Android2 || Ext.browser.is.ChromeMobile) {
                classReference = ScrollPosition;
            }
            else {
                classReference = CssTransform;
            }
        }

        return new classReference(config);
    }
});

/**
 * @private
 */
Ext.define('Ext.behavior.Translatable', {

    extend: 'Ext.behavior.Behavior',

    requires: [
        'Ext.util.Translatable'
    ],

    constructor: function() {
        this.listeners = {
            painted: 'onComponentPainted',
            scope: this
        };

        this.callParent(arguments);
    },

    onComponentPainted: function() {
        this.translatable.refresh();
    },

    setConfig: function(config) {
        var translatable = this.translatable,
            component = this.component;

        if (config) {
            if (!translatable) {
                this.translatable = translatable = new Ext.util.Translatable(config);
                translatable.setElement(component.renderElement);
                translatable.on('destroy', 'onTranslatableDestroy', this);

                if (component.isPainted()) {
                    this.onComponentPainted(component);
                }

                component.on(this.listeners);
            }
            else if (Ext.isObject(config)) {
                translatable.setConfig(config);
            }
        }
        else if (translatable) {
            translatable.destroy();
        }

        return this;
    },

    getTranslatable: function() {
        return this.translatable;
    },

    onTranslatableDestroy: function() {
        var component = this.component;

        delete this.translatable;
        component.un(this.listeners);
    },

    onComponentDestroy: function() {
        var translatable = this.translatable;

        if (translatable) {
            translatable.destroy();
        }
    }
});

/**
 * A core util class to bring Draggable behavior to any DOM element
 */
Ext.define('Ext.util.Draggable', {
    isDraggable: true,

    mixins: [
        'Ext.mixin.Observable'
    ],

    requires: [
        'Ext.util.SizeMonitor',
        'Ext.util.Translatable'
    ],

    /**
     * @event dragstart
     * @preventable initDragStart
     * Fires whenever the component starts to be dragged
     * @param {Ext.util.Draggable} this
     * @param {Ext.event.Event} e the event object
     * @param {Number} offsetX The current offset value on the x axis
     * @param {Number} offsetY The current offset value on the y axis
     */

    /**
     * @event drag
     * Fires whenever the component is dragged
     * @param {Ext.util.Draggable} this
     * @param {Ext.event.Event} e the event object
     * @param {Number} offsetX The new offset value on the x axis
     * @param {Number} offsetY The new offset value on the y axis
     */

    /**
     * @event dragend
     * Fires whenever the component is dragged
     * @param {Ext.util.Draggable} this
     * @param {Ext.event.Event} e the event object
     * @param {Number} offsetX The current offset value on the x axis
     * @param {Number} offsetY The current offset value on the y axis
     */

    config: {
        cls: Ext.baseCSSPrefix + 'draggable',

        draggingCls: Ext.baseCSSPrefix + 'dragging',

        element: null,

        constraint: 'container',

        disabled: null,

        /**
         * @cfg {String} direction
         * Possible values: 'vertical', 'horizontal', or 'both'
         * @accessor
         */
        direction: 'both',

        /**
         * @cfg {Object/Number} initialOffset
         * The initial draggable offset.  When specified as Number,
         * both x and y will be set to that value.
         */
        initialOffset: {
            x: 0,
            y: 0
        },

        translatable: {}
    },

    DIRECTION_BOTH: 'both',

    DIRECTION_VERTICAL: 'vertical',

    DIRECTION_HORIZONTAL: 'horizontal',

    defaultConstraint: {
        min: { x: -Infinity, y: -Infinity },
        max: { x: Infinity, y: Infinity }
    },

    sizeMonitor: null,

    containerSizeMonitor: null,

    /**
     * Creates new Draggable.
     * @param {Object} config The configuration object for this Draggable.
     */
    constructor: function(config) {
        var element;

        this.extraConstraint = {};

        this.initialConfig = config;

        this.offset = {
            x: 0,
            y: 0
        };

        this.listeners = {
            dragstart: 'onDragStart',
            drag     : 'onDrag',
            dragend  : 'onDragEnd',

            scope: this
        };

        if (config && config.element) {
            element = config.element;
            delete config.element;

            this.setElement(element);
        }

        return this;
    },

    applyElement: function(element) {
        if (!element) {
            return;
        }

        return Ext.get(element);
    },

    updateElement: function(element) {
        element.on(this.listeners);

        this.sizeMonitor = new Ext.util.SizeMonitor({
            element: element,
            callback: this.doRefresh,
            scope: this
        });

        this.initConfig(this.initialConfig);
    },

    updateInitialOffset: function(initialOffset) {
        if (typeof initialOffset == 'number') {
            initialOffset = {
                x: initialOffset,
                y: initialOffset
            };
        }

        var offset = this.offset,
            x, y;

        offset.x = x = initialOffset.x;
        offset.y = y = initialOffset.y;

        this.getTranslatable().translate(x, y);
    },

    updateCls: function(cls) {
        this.getElement().addCls(cls);
    },

    applyTranslatable: function(translatable, currentInstance) {
        translatable = Ext.factory(translatable, Ext.util.Translatable, currentInstance);
        translatable.setElement(this.getElement());

        return translatable;
    },

    setExtraConstraint: function(constraint) {
        this.extraConstraint = constraint || {};

        this.refreshConstraint();

        return this;
    },

    addExtraConstraint: function(constraint) {
        Ext.merge(this.extraConstraint, constraint);

        this.refreshConstraint();

        return this;
    },

    applyConstraint: function(newConstraint) {
        this.currentConstraint = newConstraint;

        if (!newConstraint) {
            newConstraint = this.defaultConstraint;
        }

        if (newConstraint === 'container') {
            return Ext.merge(this.getContainerConstraint(), this.extraConstraint);
        }

        return Ext.merge({}, this.extraConstraint, newConstraint);
    },

    updateConstraint: function() {
        this.refreshOffset();
    },

    getContainerConstraint: function() {
        var container = this.getContainer(),
            element = this.getElement();

        if (!container || !element.dom) {
            return this.defaultConstraint;
        }

        var dom = element.dom,
            containerDom = container.dom,
            width = dom.offsetWidth,
            height = dom.offsetHeight,
            containerWidth = containerDom.offsetWidth,
            containerHeight = containerDom.offsetHeight;

        return {
            min: { x: 0, y: 0 },
            max: { x: containerWidth - width, y: containerHeight - height }
        };
    },

    getContainer: function() {
        var container = this.container;

        if (!container) {
            container = this.getElement().getParent();

            if (container) {
                this.containerSizeMonitor = new Ext.util.SizeMonitor({
                    element: container,
                    callback: this.doRefresh,
                    scope: this
                });

                this.container = container;

                container.on('destroy', 'onContainerDestroy', this);
            }
        }

        return container;
    },

    onContainerDestroy: function() {
        delete this.container;
        delete this.containerSizeMonitor;
    },

    detachListeners: function() {
        this.getElement().un(this.listeners);
    },

    isAxisEnabled: function(axis) {
        var direction = this.getDirection();

        if (axis === 'x') {
            return (direction === this.DIRECTION_BOTH || direction === this.DIRECTION_HORIZONTAL);
        }

        return (direction === this.DIRECTION_BOTH || direction === this.DIRECTION_VERTICAL);
    },

    onDragStart: function(e) {
        if (this.getDisabled()) {
            return false;
        }

        var offset = this.offset;

        this.fireAction('dragstart', [this, e, offset.x, offset.y], this.initDragStart);
    },

    initDragStart: function(me, e, offsetX, offsetY) {
        this.dragStartOffset = {
            x: offsetX,
            y: offsetY
        };

        this.isDragging = true;

        this.getElement().addCls(this.getDraggingCls());
    },

    onDrag: function(e) {
        if (!this.isDragging) {
            return;
        }

        var startOffset = this.dragStartOffset;

        this.fireAction('drag', [this, e, startOffset.x + e.deltaX, startOffset.y + e.deltaY], this.doDrag);
    },

    doDrag: function(me, e, offsetX, offsetY) {
        me.setOffset(offsetX, offsetY);
    },

    onDragEnd: function(e) {
        if (!this.isDragging) {
            return;
        }

        this.onDrag(e);

        this.isDragging = false;

        this.getElement().removeCls(this.getDraggingCls());

        this.fireEvent('dragend', this, e, this.offset.x, this.offset.y);
    },

    setOffset: function(x, y, animation) {
        var currentOffset = this.offset,
            constraint = this.getConstraint(),
            minOffset = constraint.min,
            maxOffset = constraint.max,
            min = Math.min,
            max = Math.max;

        if (this.isAxisEnabled('x') && typeof x == 'number') {
            x = min(max(x, minOffset.x), maxOffset.x);
        }
        else {
            x = currentOffset.x;
        }

        if (this.isAxisEnabled('y') && typeof y == 'number') {
            y = min(max(y, minOffset.y), maxOffset.y);
        }
        else {
            y = currentOffset.y;
        }

        currentOffset.x = x;
        currentOffset.y = y;

        this.getTranslatable().translate(x, y, animation);
    },

    getOffset: function() {
        return this.offset;
    },

    refreshConstraint: function() {
        this.setConstraint(this.currentConstraint);
    },

    refreshOffset: function() {
        var offset = this.offset;

        this.setOffset(offset.x, offset.y);
    },

    doRefresh: function() {
        this.refreshConstraint();
        this.getTranslatable().refresh();
        this.refreshOffset();
    },

    refresh: function() {
        if (this.sizeMonitor) {
            this.sizeMonitor.refresh();
        }

        if (this.containerSizeMonitor) {
            this.containerSizeMonitor.refresh();
        }

        this.doRefresh();
    },

    /**
     * Enable the Draggable.
     * @return {Ext.util.Draggable} This Draggable instance
     */
    enable: function() {
        return this.setDisabled(false);
    },

    /**
     * Disable the Draggable.
     * @return {Ext.util.Draggable} This Draggable instance
     */
    disable: function() {
        return this.setDisabled(true);
    },

    destroy: function() {
        var translatable = this.getTranslatable();

        Ext.destroy(this.containerSizeMonitor, this.sizeMonitor);
        delete this.sizeMonitor;
        delete this.containerSizeMonitor;

        var element = this.getElement();
        if (element && !element.isDestroyed) {
            element.removeCls(this.getCls());
        }

        this.detachListeners();

        if (translatable) {
            translatable.destroy();
        }
    }

}, function() {
});


/**
 * @private
 */
Ext.define('Ext.behavior.Draggable', {

    extend: 'Ext.behavior.Behavior',

    requires: [
        'Ext.util.Draggable'
    ],

    constructor: function() {
        this.listeners = {
            painted: 'onComponentPainted',
            scope: this
        };

        this.callParent(arguments);
    },

    onComponentPainted: function() {
        this.draggable.refresh();
    },

    setConfig: function(config) {
        var draggable = this.draggable,
            component = this.component;

        if (config) {
            if (!draggable) {
                component.setTranslatable(true);
                this.draggable = draggable = new Ext.util.Draggable(config);
                draggable.setTranslatable(component.getTranslatable());
                draggable.setElement(component.renderElement);
                draggable.on('destroy', 'onDraggableDestroy', this);

                if (component.isPainted()) {
                    this.onComponentPainted(component);
                }

                component.on(this.listeners);
            }
            else if (Ext.isObject(config)) {
                draggable.setConfig(config);
            }
        }
        else if (draggable) {
            draggable.destroy();
        }

        return this;
    },

    getDraggable: function() {
        return this.draggable;
    },

    onDraggableDestroy: function() {
        var component = this.component;

        delete this.draggable;
        component.un(this.listeners);
    },

    onComponentDestroy: function() {
        var draggable = this.draggable;

        if (draggable) {
            draggable.destroy();
        }
    }
});

(function(clsPrefix) {

/**
 * Most of the visual classes you interact with in Sencha Touch are Components. Every Component in Sencha Touch is a
 * subclass of Ext.Component, which means they can all:
 *
 * * Render themselves onto the page using a template
 * * Show and hide themselves at any time
 * * Center themselves on the screen
 * * Enable and disable themselves
 *
 * They can also do a few more advanced things:
 *
 * * Float above other components (windows, message boxes and overlays)
 * * Change size and position on the screen with animation
 * * Dock other Components inside themselves (useful for toolbars)
 * * Align to other components, allow themselves to be dragged around, make their content scrollable & more
 *
 * ## Available Components
 *
 * There are many components available in Sencha Touch, separated into 4 main groups:
 *
 * ### Navigation components
 * * {@link Ext.Toolbar}
 * * {@link Ext.Button}
 * * {@link Ext.TitleBar}
 * * {@link Ext.SegmentedButton}
 * * {@link Ext.Title}
 * * {@link Ext.Spacer}
 *
 * ### Store-bound components
 * * {@link Ext.dataview.DataView}
 * * {@link Ext.Carousel}
 * * {@link Ext.List}
 * * {@link Ext.NestedList}
 *
 * ### Form components
 * * {@link Ext.form.Panel}
 * * {@link Ext.form.FieldSet}
 * * {@link Ext.field.Checkbox}
 * * {@link Ext.field.Hidden}
 * * {@link Ext.field.Slider}
 * * {@link Ext.field.Text}
 * * {@link Ext.picker.Picker}
 * * {@link Ext.picker.Date}
 *
 * ### General components
 * * {@link Ext.Panel}
 * * {@link Ext.tab.Panel}
 * * {@link Ext.Viewport Ext.Viewport}
 * * {@link Ext.Img}
 * * {@link Ext.Map}
 * * {@link Ext.Audio}
 * * {@link Ext.Video}
 * * {@link Ext.Sheet}
 * * {@link Ext.ActionSheet}
 * * {@link Ext.MessageBox}
 *
 *
 * ## Instantiating Components
 *
 * Components are created the same way as all other classes in Sencha Touch - using Ext.create. Here's how we can
 * create a Text field:
 *
 *     var panel = Ext.create('Ext.Panel', {
 *         html: 'This is my panel'
 *     });
 *
 * This will create a {@link Ext.Panel Panel} instance, configured with some basic HTML content. A Panel is just a
 * simple Component that can render HTML and also contain other items. In this case we've created a Panel instance but
 * it won't show up on the screen yet because items are not rendered immediately after being instantiated. This allows
 * us to create some components and move them around before rendering and laying them out, which is a good deal faster
 * than moving them after rendering.
 *
 * To show this panel on the screen now we can simply add it to the global Viewport:
 *
 *     Ext.Viewport.add(panel);
 *
 * Panels are also Containers, which means they can contain other Components, arranged by a layout. Let's revisit the
 * above example now, this time creating a panel with two child Components and a hbox layout:
 *
 *     @example
 *     var panel = Ext.create('Ext.Panel', {
 *         layout: 'hbox',
 *
 *         items: [
 *             {
 *                 xtype: 'panel',
 *                 flex: 1,
 *                 html: 'Left Panel, 1/3rd of total size',
 *                  style: 'background-color: #5E99CC;'
 *             },
 *             {
 *                 xtype: 'panel',
 *                 flex: 2,
 *                 html: 'Right Panel, 2/3rds of total size',
 *                  style: 'background-color: #759E60;'
 *             }
 *         ]
 *     });
 *
 *     Ext.Viewport.add(panel);
 *
 * This time we created 3 Panels - the first one is created just as before but the inner two are declared inline using
 * an xtype. Xtype is a convenient way of creating Components without having to go through the process of using
 * Ext.create and specifying the full class name, instead you can just provide the xtype for the class inside an object
 * and the framework will create the components for you.
 *
 * We also specified a layout for the top level panel - in this case hbox, which splits the horizontal width of the
 * parent panel based on the 'flex' of each child. For example, if the parent Panel above is 300px wide then the first
 * child will be flexed to 100px wide and the second to 200px because the first one was given flex: 1 and the second
 * flex: 2.
 *
 * ## Using xtype
 *
 * xtype is an easy way to create Components without using the full class name. This is especially useful when creating
 * a {@link Ext.Container Container} that contains child Components. An xtype is simply a shorthand way of specifying a
 * Component - for example you can use xtype: 'panel' instead of typing out Ext.panel.Panel.
 *
 * Sample usage:
 *
 *     @example miniphone
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: 'fit',
 *
 *         items: [
 *             {
 *                 xtype: 'panel',
 *                 html: 'This panel is created by xtype'
 *             },
 *             {
 *                 xtype: 'toolbar',
 *                 title: 'So is the toolbar',
 *                 docked: 'top'
 *             }
 *         ]
 *     });
 *
 *
 * ### Common xtypes
 *
 * These are the xtypes that are most commonly used. For an exhaustive list please see the
 * <a href="#!/guide/components">Components Guide</a>
 *
 * <pre>
 xtype                   Class
 -----------------       ---------------------
 actionsheet             Ext.ActionSheet
 audio                   Ext.Audio
 button                  Ext.Button
 image                   Ext.Img
 label                   Ext.Label
 loadmask                Ext.LoadMask
 map                     Ext.Map
 panel                   Ext.Panel
 segmentedbutton         Ext.SegmentedButton
 sheet                   Ext.Sheet
 spacer                  Ext.Spacer
 title                   Ext.Title
 toolbar                 Ext.Toolbar
 video                   Ext.Video
 carousel                Ext.carousel.Carousel
 navigationview          Ext.navigation.View
 datepicker              Ext.picker.Date
 picker                  Ext.picker.Picker
 slider                  Ext.slider.Slider
 thumb                   Ext.slider.Thumb
 tabpanel                Ext.tab.Panel
 viewport                Ext.viewport.Default

 DataView Components
 ---------------------------------------------
 dataview                Ext.dataview.DataView
 list                    Ext.dataview.List
 nestedlist              Ext.dataview.NestedList

 Form Components
 ---------------------------------------------
 checkboxfield           Ext.field.Checkbox
 datepickerfield         Ext.field.DatePicker
 emailfield              Ext.field.Email
 hiddenfield             Ext.field.Hidden
 numberfield             Ext.field.Number
 passwordfield           Ext.field.Password
 radiofield              Ext.field.Radio
 searchfield             Ext.field.Search
 selectfield             Ext.field.Select
 sliderfield             Ext.field.Slider
 spinnerfield            Ext.field.Spinner
 textfield               Ext.field.Text
 textareafield           Ext.field.TextArea
 togglefield             Ext.field.Toggle
 urlfield                Ext.field.Url
 fieldset                Ext.form.FieldSet
 formpanel               Ext.form.Panel
 * </pre>
 *
 * ## Configuring Components
 *
 * Whenever you create a new Component you can pass in configuration options. All of the configurations for a given
 * Component are listed in the "Config options" section of its class docs page. You can pass in any number of
 * configuration options when you instantiate the Component, and modify any of them at any point later. For example, we
 *  can easily modify the {@link Ext.Panel#html html content} of a Panel after creating it:
 *
 *     @example miniphone
 *     // we can configure the HTML when we instantiate the Component
 *     var panel = Ext.create('Ext.Panel', {
 *         fullscreen: true,
 *         html: 'This is a Panel'
 *     });
 *
 *     // we can update the HTML later using the setHtml method:
 *     panel.setHtml('Some new HTML');
 *
 *     // we can retrieve the current HTML using the getHtml method:
 *     Ext.Msg.alert(panel.getHtml()); // displays "Some new HTML"
 *
 * Every config has a getter method and a setter method - these are automatically generated and always follow the same
 * pattern. For example, a config called 'html' will receive getHtml and setHtml methods, a config called defaultType
 * will receive getDefaultType and setDefaultType methods, and so on.
 *
 * ## Further Reading
 *
 * See the [Component & Container Guide](#!/guide/components) for more information, and check out the
 * {@link Ext.Container} class docs also.
 *
 * @aside guide components
 * @aside guide events
 *
 */
Ext.define('Ext.Component', {

    extend: 'Ext.AbstractComponent',

    alternateClassName: 'Ext.lib.Component',

    mixins: ['Ext.mixin.Traversable'],

    requires: [
        'Ext.ComponentManager',
        'Ext.XTemplate',
        'Ext.dom.Element',
        'Ext.behavior.Translatable',
        'Ext.behavior.Draggable'
    ],

    /**
     * @cfg {String} xtype
     * The `xtype` configuration option can be used to optimize Component creation and rendering. It serves as a
     * shortcut to the full componet name. For example, the component `Ext.button.Button` has an xtype of `button`.
     *
     * You can define your own xtype on a custom {@link Ext.Component component} by specifying the
     * {@link Ext.Class#alias alias} config option with a prefix of `widget`. For example:
     *
     *     Ext.define('PressMeButton', {
     *         extend: 'Ext.button.Button',
     *         alias: 'widget.pressmebutton',
     *         text: 'Press Me'
     *     })
     *
     * Any Component can be created implicitly as an object config with an xtype specified, allowing it to be
     * declared and passed into the rendering pipeline without actually being instantiated as an object. Not only is
     * rendering deferred, but the actual creation of the object itself is also deferred, saving memory and resources
     * until they are actually needed. In complex, nested layouts containing many Components, this can make a
     * noticeable improvement in performance.
     *
     *     // Explicit creation of contained Components:
     *     var panel = new Ext.Panel({
     *        ...
     *        items: [
     *           Ext.create('Ext.button.Button', {
     *              text: 'OK'
     *           })
     *        ]
     *     };
     *
     *     // Implicit creation using xtype:
     *     var panel = new Ext.Panel({
     *        ...
     *        items: [{
     *           xtype: 'button',
     *           text: 'OK'
     *        }]
     *     };
     *
     * In the first example, the button will always be created immediately during the panel's initialization. With
     * many added Components, this approach could potentially slow the rendering of the page. In the second example,
     * the button will not be created or rendered until the panel is actually displayed in the browser. If the panel
     * is never displayed (for example, if it is a tab that remains hidden) then the button will never be created and
     * will never consume any resources whatsoever.
     */
    xtype: 'component',

    observableType: 'component',

    cachedConfig: {
        /**
         * @cfg {Number} flex
         * The flex of this item *if* this item item is inside a {@link Ext.layout.HBox} or {@link Ext.layout.VBox}
         * layout.
         *
         * You can also update the flex of a component dynamically using the {@link Ext.layout.AbstractBox#setItemFlex}
         * method.
         */

        /**
         * @cfg {String} baseCls
         * The base CSS class to apply to this components's element. This will also be prepended to
         * other elements within this component. To add specific styling for sub-classes, use the {@link #cls} config.
         * @accessor
         */
        baseCls: null,

        /**
         * @cfg {String/String[]} cls The CSS class to add to this component's element, in addition to the {@link #baseCls}
         * @accessor
         */
        cls: null,

        /**
         * @cfg {String} floatingCls The CSS class to add to this component when it is floatable.
         * @accessor
         */
        floatingCls: null,

        /**
         * @cfg {String} hiddenCls The CSS class to add to the component when it is hidden
         * @accessor
         */
        hiddenCls: clsPrefix + 'item-hidden',

        /**
         * @cfg {String} ui The ui to be used on this Component
         */
        ui: null,

        /**
         * @cfg {Number/String} margin The margin to use on this Component. Can be specified as a number (in which case
         * all edges get the same margin) or a CSS string like '5 10 10 10'
         * @accessor
         */
        margin: null,

        /**
         * @cfg {Number/String} padding The padding to use on this Component. Can be specified as a number (in which
         * case all edges get the same padding) or a CSS string like '5 10 10 10'
         * @accessor
         */
        padding: null,

        /**
         * @cfg {Number/String} border The border width to use on this Component. Can be specified as a number (in which
         * case all edges get the same border width) or a CSS string like '5 10 10 10'.
         * 
         * Please note that this will not add
         * a `border-color` or `border-style` CSS property to the component; you must do that manually using either CSS or 
         * the {@link #style} configuration.
         * 
         * ## Using {@link #style}:
         * 
         *     Ext.Viewport.add({
         *         centered: true,
         *         width: 100,
         *         height: 100,
         *         
         *         border: 3,
         *         style: 'border-color: blue; border-style: solid;',
         *         ...
         *     });
         * 
         * ## Using CSS:
         * 
         *     Ext.Viewport.add({
         *         centered: true,
         *         width: 100,
         *         height: 100,
         *         
         *         border: 3,
         *         cls: 'my-component',
         *         ...
         *     });
         *     
         * And your CSS file:
         * 
         *     .my-component {
         *         border-color: red;
         *         border-style: solid;
         *     }
         * 
         * @accessor
         */
        border: null,

        /**
         * @cfg {String} styleHtmlCls
         * The class that is added to the content target when you set styleHtmlContent to true.
         * @accessor
         */
        styleHtmlCls: clsPrefix + 'html',

        /**
         * @cfg {Boolean} [styleHtmlContent=false]
         * True to automatically style the html inside the content target of this component (body for panels).
         * @accessor
         */
        styleHtmlContent: null
    },

    eventedConfig: {
        /**
         * @cfg {Number/String} left
         * The absolute left position of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * Explicitly setting this value will make this Component become 'floating', which means its layout will no
         * longer be affected by the Container that it resides in.
         * @accessor
         * @evented
         */
        left: null,

        /**
         * @cfg {Number/String} top
         * The absolute top position of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * Explicitly setting this value will make this Component become 'floating', which means its layout will no
         * longer be affected by the Container that it resides in.
         * @accessor
         * @evented
         */
        top: null,

        /**
         * @cfg {Number/String} right
         * The absolute right position of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * Explicitly setting this value will make this Component become 'floating', which means its layout will no
         * longer be affected by the Container that it resides in.
         * @accessor
         * @evented
         */
        right: null,

        /**
         * @cfg {Number/String} bottom
         * The absolute bottom position of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * Explicitly setting this value will make this Component become 'floating', which means its layout will no
         * longer be affected by the Container that it resides in.
         * @accessor
         * @evented
         */
        bottom: null,

        /**
         * @cfg {Number/String} width
         * The width of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * By default, if this is not explicitly set, this Component's element will simply have its own natual size.
         * @accessor
         * @evented
         */
        width: null,

        /**
         * @cfg {Number/String} height
         * The height of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * By default, if this is not explicitly set, this Component's element will simply have its own natual size.
         * @accessor
         * @evented
         */
        height: null,

        /**
         * @cfg {Number/String} minWidth
         * The minimum width of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * @accessor
         * @evented
         */
        minWidth: null,

        /**
         * @cfg {Number/String} minHeight
         * The minimum height of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * @accessor
         * @evented
         */
        minHeight: null,

        /**
         * @cfg {Number/String} maxWidth
         * The maximum width of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * Note that this config will not apply if the Component is 'floating' (absolutely positioned or centered)
         * @accessor
         * @evented
         */
        maxWidth: null,

        /**
         * @cfg {Number/String} maxHeight
         * The maximum height of this Component; must be a valid CSS length value, e.g: `300`, `100px`, `30%`, etc.
         * Note that this config will not apply if the Component is 'floating' (absolutely positioned or centered)
         * @accessor
         * @evented
         */
        maxHeight: null,

        /**
         * @cfg {String} docked
         * The dock position of this component in its container. Can be 'left', 'top', 'right' or 'bottom'.
         *
         * <b>Notes</b>
         *
         * You must use a HTML5 doctype for {@link #docked} `bottom` to work. To do this, simply add the following code to the HTML file:
         *
         *     <!doctype html>
         *
         * So your index.html file should look a little like this:
         *
         *     <!doctype html>
         *     <html>
         *         <head>
         *             <title>MY application title</title>
         *             ...
         *
         * @accessor
         * @evented
         */
        docked: null,

        /**
         * @cfg {Boolean} centered
         * Whether or not this Component is absolutely centered inside its Container
         * @accessor
         * @evented
         */
        centered: null,

        /**
         * @cfg {Boolean} hidden
         * Whether or not this Component is hidden (its CSS `display` property is set to `none`)
         * @accessor
         * @evented
         */
        hidden: null,

        /**
         * @cfg {Boolean} disabled
         * Whether or not this component is disabled
         * @accessor
         * @evented
         */
        disabled: null
    },

    config: {
        /**
         * @cfg {String/Object} style Optional CSS styles that will be rendered into an inline style attribute when the
         * Component is rendered.
         *
         * You can pass either a string syntax:
         *
         *     style: 'background:red'
         *
         * Or by using an object:
         *
         *     style: {
         *         background: 'red'
         *     }
         *
         * When using the object syntax, you can define CSS Properties by using a string:
         *
         *     style: {
         *         'border-left': '1px solid red'
         *     }
         *
         * Although the object syntax is much easier to read, we suggest you to use the string syntax for better performance.
         *
         * @accessor
         */
        style: null,

        /**
         * @cfg {String/Ext.Element/HTMLElement} html Optional HTML content to render inside this Component, or a reference
         * to an existing element on the page.
         * @accessor
         */
        html: null,

        /**
         * @cfg {Object} draggable Configuration options to make this Component draggable
         * @accessor
         */
        draggable: null,

        /**
         * @cfg {Object} translatable
         * @private
         * @accessor
         */
        translatable: null,

        /**
         * @cfg {Ext.Element} renderTo Optional element to render this Component to. Usually this is not needed because
         * a Component is normally full screen or automatically rendered inside another {@link Ext.Container Container}
         * @accessor
         */
        renderTo: null,

        /**
         * @cfg {Number} zIndex The z-index to give this Component when it is rendered
         * @accessor
         */
        zIndex: null,

        /**
         * @cfg {String/String[]/Ext.Template[]/Ext.XTemplate[]} tpl
         * A {@link String}, {@link Ext.Template}, {@link Ext.XTemplate} or an {@link Array} of strings to form an {@link Ext.XTemplate}.
         * Used in conjunction with the {@link #data} and {@link #tplWriteMode} configurations.
         *
         * <b>Note</b>
         * The {@link #data} configuration <i>must</i> be set for any content to be shown in the component when using this configuration.
         * @accessor
         */
        tpl: null,

        /**
         * @cfg {String/Mixed} enterAnimation
         * Animation effect to apply when the Component is being shown.  Typically you want to use an
         * inbound animation type such as 'fadeIn' or 'slideIn'.
         * @deprecated 2.0.0 Please use {@link #showAnimation} instead.
         * @accessor
         */
        enterAnimation: null,

        /**
         * @cfg {String/Mixed} exitAnimation
         * Animation effect to apply when the Component is being hidden.
         * @deprecated 2.0.0 Please use {@link #hideAnimation} instead.  Typically you want to use an
         * outbound animation type such as 'fadeOut' or 'slideOut'.
         * @accessor
         */
        exitAnimation: null,

        /**
         * @cfg {String/Mixed} showAnimation
         * Animation effect to apply when the Component is being shown.  Typically you want to use an
         * inbound animation type such as 'fadeIn' or 'slideIn'.
         * @accessor
         */
        showAnimation: null,

        /**
         * @cfg {String/Mixed} hideAnimation
         * Animation effect to apply when the Component is being hidden.  Typically you want to use an
         * outbound animation type such as 'fadeOut' or 'slideOut'.
         * @accessor
         */
        hideAnimation: null,

        /**
         * @cfg {String} tplWriteMode The Ext.(X)Template method to use when
         * updating the content area of the Component. Defaults to <code>'overwrite'</code>
         * (see <code>{@link Ext.XTemplate#overwrite}</code>).
         * @accessor
         */
        tplWriteMode: 'overwrite',

        /**
         * @cfg {Mixed} data
         * The initial set of data to apply to the <code>{@link #tpl}</code> to
         * update the content area of the Component.
         * @accessor
         */
        data: null,

        /**
         * @cfg {String} disabledCls The CSS class to add to the component when it is disabled
         * @accessor
         */
        disabledCls: clsPrefix + 'item-disabled',

        /**
         * @cfg {Ext.Element/HTMLElement/String} contentEl The configured element will automatically be
         * added as the content of this component. When you pass a string, we expect it to be an element id.
         * If the content element is hidden, we will automatically show it.
         * @accessor
         */
        contentEl: null,

        /**
         * @cfg {String} id
         * The **unique id of this component instance.**
         *
         * It should not be necessary to use this configuration except for singleton objects in your application. Components
         * created with an id may be accessed globally using {@link Ext#getCmp Ext.getCmp}.
         *
         * Instead of using assigned ids, use the {@link #itemId} config, and {@link Ext.ComponentQuery ComponentQuery}
         * which provides selector-based searching for Sencha Components analogous to DOM querying. The
         * {@link Ext.Container} class contains {@link Ext.Container#down shortcut methods} to query
         * its descendant Components by selector.
         *
         * Note that this id will also be used as the element id for the containing HTML element that is rendered to the
         * page for this component. This allows you to write id-based CSS rules to style the specific instance of this
         * component uniquely, and also to select sub-elements using this component's id as the parent.
         *
         * **Note**: to avoid complications imposed by a unique id also see `{@link #itemId}`.
         *
         * Defaults to an auto-assigned id.
         */

        /**
         * @cfg {String} itemId
         * An itemId can be used as an alternative way to get a reference to a component when no object reference is
         * available. Instead of using an `{@link #id}` with {@link Ext#getCmp}, use `itemId` with
         * {@link Ext.Container#getComponent} which will retrieve `itemId`'s or {@link #id}'s. Since `itemId`'s are an
         * index to the container's internal MixedCollection, the `itemId` is scoped locally to the container - avoiding
         * potential conflicts with {@link Ext.ComponentManager} which requires a **unique** `{@link #id}`.
         *
         * Also see {@link #id}, {@link Ext.Container#query}, {@link Ext.Container#down} and {@link Ext.Container#child}.
         *
         * @accessor
         */
        itemId: undefined,

        /**
         * @cfg {Ext.data.Model} record A model instance which updates the Component's html based on it's tpl. Similar to the data
         * configuration, but tied to to a record to make allow dynamic updates.  This must be a model
         * instance and not a configuration of one.
         * @accessor
         */
        record: null,

        /**
         * @cfg {Object/Array} plugins
         * @accessor
         * An object or array of objects that will provide custom functionality for this component.  The only
         * requirement for a valid plugin is that it contain an init method that accepts a reference of type Ext.Component.
         *
         * When a component is created, if any plugins are available, the component will call the init method on each
         * plugin, passing a reference to itself.  Each plugin can then call methods or respond to events on the
         * component as needed to provide its functionality.
         *
         * For examples of plugins, see Ext.plugin.PullRefresh and Ext.plugin.ListPaging
         *
         * ## Example code
         *
         * A plugin by alias:
         *
         *     Ext.create('Ext.dataview.List', {
         *         config: {
         *             plugins: 'listpaging',
         *             itemTpl: '<div class="item">{title}</div>',
         *             store: 'Items'
         *         }
         *     });
         *
         * Multiple plugins by alias:
         *
         *     Ext.create('Ext.dataview.List', {
         *         config: {
         *             plugins: ['listpaging', 'pullrefresh'],
         *             itemTpl: '<div class="item">{title}</div>',
         *             store: 'Items'
         *         }
         *     });
         *
         * Single plugin by class name with config options:
         *
         *     Ext.create('Ext.dataview.List', {
         *         config: {
         *             plugins: {
         *                 xclass: 'Ext.plugin.ListPaging', // Reference plugin by class
         *                 autoPaging: true
         *             },
         *
         *             itemTpl: '<div class="item">{title}</div>',
         *             store: 'Items'
         *         }
         *     });
         *
         * Multiple plugins by class name with config options:
         *
         *     Ext.create('Ext.dataview.List', {
         *         config: {
         *             plugins: [
         *                 {
         *                     xclass: 'Ext.plugin.PullRefresh',
         *                     pullRefreshText: 'Pull to refresh...'
         *                 },
         *                 {
         *                     xclass: 'Ext.plugin.ListPaging',
         *                     autoPaging: true
         *                 }
         *             ],
         *
         *             itemTpl: '<div class="item">{title}</div>',
         *             store: 'Items'
         *         }
         *     });
         *
         */
        plugins: null
    },

    /**
     * @event painted
     * Fires whenever this Component actually becomes visible (painted) on the screen. This is useful when you need to
     * perform 'read' operations on the DOM element, i.e: calculating natural sizes and positioning. If you just need
     * perform post-initialization tasks that don't rely on the fact that the element must be rendered and visible on
     * the screen, listen to {@link #event-initialize}
     *
     * Note: This event is not available to be used with event delegation. Instead 'painted' only fires if you explicily
     * add at least one listener to it, due to performance reason.
     *
     * @param {Ext.Component} this The component instance
     */

    /**
     * @event erased
     * The opposite event of {@link #painted}. This event fires whenever this Component are no longer visible
     * (erased) on the screen. This might be triggered either when this Component {@link #hidden} config is set to
     * `true`, or when its Element is taken out of the document's DOM tree. This is normally useful to perform cleaning
     * up after what you have set up from listening to {@link #painted} event.
     *
     * Note: This event is not available to be used with event delegation. Instead 'erased' only fires if you explicily
     * add at least one listener to it, due to performance reason.
     *
     * @param {Ext.Component} this The component instance
     */

    /**
     * @event resize
     * Important note: For the best performance on mobile devices, use this only when you absolutely need to monitor
     * a Component's size.
     *
     * Note: This event is not available to be used with event delegation. Instead 'resize' only fires if you explicily
     * add at least one listener to it, due to performance reason.
     *
     * @param {Ext.Component} this The component instance
     */

    /**
     * @event show
     * Fires whenever the Component is shown
     * @param {Ext.Component} this The component instance
     */

    /**
     * @event hide
     * Fires whenever the Component is hidden
     * @param {Ext.Component} this The component instance
     */

    /**
     * @event fullscreen
     * Fires whenever a Component with the fullscreen config is instantiated
     * @param {Ext.Component} this The component instance
     */

    /**
     * @event floatingchange
     * Fires whenever there is a change in the floating status of a component
     * @param {Ext.Component} this The component instance
     * @param {Boolean} floating The component's new floating state
     */

    /**
     * @event beforeorientationchange
     * Fires before orientation changes.
     * @removed 2.0.0 This event is now only available onBefore the Viewport's {@link Ext.Viewport#orientationchange}
     */

    /**
     * @event orientationchange
     * Fires when orientation changes.
     * @removed 2.0.0 This event is now only available on the Viewport's {@link Ext.Viewport#orientationchange}
     */

    /**
     * @event initialize
     * Fires when the component has been initialized
     * @param {Ext.Component} this The component instance
     */

    /**
     * @private
     */
    listenerOptionsRegex: /^(?:delegate|single|delay|buffer|args|prepend|element)$/,

    /**
     * @private
     */
    alignmentRegex: /^([a-z]+)-([a-z]+)(\?)?$/,

    /**
     * @private
     */
    isComponent: true,

    /**
     * @private
     */
    floating: false,

    /**
     * @private
     */
    rendered: false,

    /**
     * @readonly
     * @private
     */
    dockPositions: {
        top: true,
        right: true,
        bottom: true,
        left: true
    },

    innerElement: null,

    element: null,

    template: [],

    /**
     * Creates new Component.
     * @param {Object} config The standard configuration object.
     */
    constructor: function(config) {
        var me = this,
            currentConfig = me.config,
            id;

        me.onInitializedListeners = [];
        me.initialConfig = config;

        if (config !== undefined && 'id' in config) {
            id = config.id;
        }
        else if ('id' in currentConfig) {
            id = currentConfig.id;
        }
        else {
            id = me.getId();
        }

        me.id = id;
        me.setId(id);

        Ext.ComponentManager.register(me);

        me.initElement();

        me.initConfig(me.initialConfig);

        me.initialize();

        me.triggerInitialized();

        /**
         * Force the component to take up 100% width and height available, by adding it to {@link Ext.Viewport}.
         * @cfg {Boolean} fullscreen
         */
        if (me.config.fullscreen) {
            me.fireEvent('fullscreen', me);
        }

        me.fireEvent('initialize', me);
    },

    beforeInitConfig: function(config) {
        this.beforeInitialize.apply(this, arguments);
    },

    /**
     * @private
     */
    beforeInitialize: Ext.emptyFn,

    /**
     * Allows addition of behavior to the rendering phase.
     * @protected
     * @template
     */
    initialize: Ext.emptyFn,

    getTemplate: function() {
        return this.template;
    },

    getElementConfig: function() {
        return {
            reference: 'element',
            children: this.getTemplate()
        };
    },

    /**
     * @private
     */
    triggerInitialized: function() {
        var listeners = this.onInitializedListeners,
            ln = listeners.length,
            listener, i;

        if (!this.initialized) {
            this.initialized = true;

            if (ln > 0) {
                for (i = 0; i < ln; i++) {
                    listener = listeners[i];
                    listener.fn.call(listener.scope, this);
                }

                listeners.length = 0;
            }
        }
    },

    /**
     * @private
     * @param fn
     * @param scope
     */
    onInitialized: function(fn, scope) {
        var listeners = this.onInitializedListeners;

        if (!scope) {
            scope = this;
        }

        if (this.initialized) {
            fn.call(scope, this);
        }
        else {
            listeners.push({
                fn: fn,
                scope: scope
            });
        }
    },

    renderTo: function(container, insertBeforeElement) {
        var dom = this.renderElement.dom,
            containerDom = Ext.getDom(container),
            insertBeforeChildDom = Ext.getDom(insertBeforeElement);

        if (containerDom) {
            if (insertBeforeChildDom) {
                containerDom.insertBefore(dom, insertBeforeChildDom);
            }
            else {
                containerDom.appendChild(dom);
            }

            this.setRendered(Boolean(dom.offsetParent));
        }
    },

    setParent: function(parent) {
        var currentParent = this.parent;

        if (parent && currentParent && currentParent !== parent) {
            currentParent.remove(this, false);
        }

        this.parent = parent;

        return this;
    },

    applyPlugins: function(config) {
        var ln, i, configObj;

        if (!config) {
            return config;
        }

        config = [].concat(config);

        for (i = 0, ln = config.length; i < ln; i++) {
            configObj = config[i];
            config[i] = Ext.factory(configObj, 'Ext.plugin.Plugin', null, 'plugin');
        }

        return config;
    },

    updatePlugins: function(newPlugins, oldPlugins) {
        var ln, i;

        if (newPlugins) {
            for (i = 0, ln = newPlugins.length; i < ln; i++) {
                newPlugins[i].init(this);
            }
        }

        if (oldPlugins) {
            for (i = 0, ln = oldPlugins.length; i < ln; i++) {
                Ext.destroy(oldPlugins[i]);
            }
        }
    },

    updateRenderTo: function(newContainer) {
        this.renderTo(newContainer);
    },

    updateStyle: function(style) {
        this.element.applyStyles(style);
    },

    updateBorder: function(border) {
        this.element.setBorder(border);
    },

    updatePadding: function(padding) {
       this.innerElement.setPadding(padding);
    },

    updateMargin: function(margin) {
        this.element.setMargin(margin);
    },

    updateUi: function(newUi, oldUi) {
        var baseCls = this.getBaseCls();

        if (baseCls) {
            if (oldUi) {
                this.element.removeCls(oldUi, baseCls);
            }

            if (newUi) {
                this.element.addCls(newUi, baseCls);
            }
        }
    },

    applyBaseCls: function(baseCls) {
        return baseCls || clsPrefix + this.xtype;
    },

    updateBaseCls: function(newBaseCls, oldBaseCls) {
        var me = this,
            ui = me.getUi();

        if (newBaseCls) {
            this.element.addCls(newBaseCls);

            if (ui) {
                this.element.addCls(newBaseCls, null, ui);
            }
        }

        if (oldBaseCls) {
            this.element.removeCls(oldBaseCls);

            if (ui) {
                this.element.removeCls(oldBaseCls, null, ui);
            }
        }
    },

    /**
     * Adds a CSS class (or classes) to this Component's rendered element
     * @param {String} cls The CSS class to add
     * @param {String} prefix Optional prefix to add to each class
     * @param {String} suffix Optional suffix to add to each class
     */
    addCls: function(cls, prefix, suffix) {
        var oldCls = this.getCls(),
            newCls = (oldCls) ? oldCls.slice() : [],
            ln, i, cachedCls;

        prefix = prefix || '';
        suffix = suffix || '';

        if (typeof cls == "string") {
            cls = [cls];
        }

        ln = cls.length;

        //check if there is currently nothing in the array and we dont need to add a prefix or a suffix.
        //if true, we can just set the newCls value to the cls property, because that is what the value will be
        //if false, we need to loop through each and add them to the newCls array
        if (!newCls.length && prefix === '' && suffix === '') {
            newCls = cls;
        } else {
            for (i = 0; i < ln; i++) {
                cachedCls = prefix + cls[i] + suffix;
                if (newCls.indexOf(cachedCls) == -1) {
                    newCls.push(cachedCls);
                }
            }
        }

        this.setCls(newCls);
    },

    /**
     * Removes the given CSS class(es) from this Component's rendered element
     * @param {String} cls The class(es) to remove
     * @param {String} prefix Optional prefix to prepend before each class
     * @param {String} suffix Optional suffix to append to each class
     */
    removeCls: function(cls, prefix, suffix) {
        var oldCls = this.getCls(),
            newCls = (oldCls) ? oldCls.slice() : [],
            ln, i;

        prefix = prefix || '';
        suffix = suffix || '';

        if (typeof cls == "string") {
            newCls = Ext.Array.remove(newCls, prefix + cls + suffix);
        } else {
            ln = cls.length;
            for (i = 0; i < ln; i++) {
                newCls = Ext.Array.remove(newCls, prefix + cls[i] + suffix);
            }
        }

        this.setCls(newCls);
    },

    /**
     * Replaces specified classes with the newly specified classes.
     * It uses the {@link #addCls} and {@link #removeCls} methdos, so if the class(es) you are removing don't exist, it will
     * still add the new classes.
     * @param {String} oldCls The class(es) to remove
     * @param {String} newCls The class(es) to add
     * @param {String} prefix Optional prefix to prepend before each class
     * @param {String} suffix Optional suffix to append to each class
     */
    replaceCls: function(oldCls, newCls, prefix, suffix) {
        // We could have just called {@link #removeCls} and {@link #addCls}, but that would mean {@link #updateCls}
        // would get called twice, which would have performance implications because it will update the dom.

        var cls = this.getCls(),
            array = (cls) ? cls.slice() : [],
            ln, i, cachedCls;

        prefix = prefix || '';
        suffix = suffix || '';

        //remove all oldCls
        if (typeof oldCls == "string") {
            array = Ext.Array.remove(array, prefix + oldCls + suffix);
        } else if (oldCls) {
            ln = oldCls.length;
            for (i = 0; i < ln; i++) {
                array = Ext.Array.remove(array, prefix + oldCls[i] + suffix);
            }
        }

        //add all newCls
        if (typeof newCls == "string") {
            array.push(prefix + newCls + suffix);
        } else if (newCls) {
            ln = newCls.length;

            //check if there is currently nothing in the array and we dont need to add a prefix or a suffix.
            //if true, we can just set the array value to the newCls property, because that is what the value will be
            //if false, we need to loop through each and add them to the array
            if (!array.length && prefix === '' && suffix === '') {
                array = newCls;
            } else {
                for (i = 0; i < ln; i++) {
                    cachedCls = prefix + newCls[i] + suffix;
                    if (array.indexOf(cachedCls) == -1) {
                        array.push(cachedCls);
                    }
                }
            }
        }

        this.setCls(array);
    },

    /**
     * @private
     * Checks if the cls is a string. If it is, changed it into an array
     */
    applyCls: function(cls) {
        if (typeof cls == "string") {
            cls = [cls];
        }

        //reset it back to null if there is nothing.
        if (!cls || !cls.length) {
            cls = null;
        }

        return cls;
    },

    /**
     * @private
     * All cls methods directly report to the {@link #cls} configuration, so anytime it changes, {@link #updateCls} will be called
     */
    updateCls: function(newCls, oldCls) {
        if (oldCls != newCls && this.element) {
            this.element.replaceCls(oldCls, newCls);
        }
    },

    /**
     * Updates the {@link #styleHtmlCls} configuration
     */
    updateStyleHtmlCls: function(newHtmlCls, oldHtmlCls) {
        var innerHtmlElement = this.innerHtmlElement,
            innerElement = this.innerElement;

        if (this.getStyleHtmlContent() && oldHtmlCls) {
            if (innerHtmlElement) {
                innerHtmlElement.replaceCls(oldHtmlCls, newHtmlCls);
            } else {
                innerElement.replaceCls(oldHtmlCls, newHtmlCls);
            }
        }
    },

    applyStyleHtmlContent: function(config) {
        return Boolean(config);
    },

    updateStyleHtmlContent: function(styleHtmlContent) {
        var htmlCls = this.getStyleHtmlCls(),
            innerElement = this.innerElement,
            innerHtmlElement = this.innerHtmlElement;

        if (styleHtmlContent) {
            if (innerHtmlElement) {
                innerHtmlElement.addCls(htmlCls);
            } else {
                innerElement.addCls(htmlCls);
            }
        } else {
            if (innerHtmlElement) {
                innerHtmlElement.removeCls(htmlCls);
            } else {
                innerElement.addCls(htmlCls);
            }
        }
    },

    applyContentEl: function(contentEl) {
        if (contentEl) {
            return Ext.get(contentEl);
        }
    },

    updateContentEl: function(newContentEl, oldContentEl) {
        if (oldContentEl) {
            oldContentEl.hide();
            Ext.getBody().append(oldContentEl);
        }

        if (newContentEl) {
            this.setHtml(newContentEl.dom);
            newContentEl.show();
        }
    },

    /**
     * Returns the height and width of the Component
     * @return {Object} The current height and width of the Component
     */
    getSize: function() {
        return {
            width: this.getWidth(),
            height: this.getHeight()
        };
    },

    isCentered: function() {
        return Boolean(this.getCentered());
    },

    isFloating: function() {
        return this.floating;
    },

    isDocked: function() {
        return Boolean(this.getDocked());
    },

    isInnerItem: function() {
        var me = this;
        return !me.isCentered() && !me.isFloating() && !me.isDocked();
    },

    filterPositionValue: function(value) {
        if (value === '' || value === 'auto') {
            value = null;
        }

        return value;
    },

    applyTop: function(top) {
        return this.filterPositionValue(top);
    },

    applyRight: function(right) {
        return this.filterPositionValue(right);
    },

    applyBottom: function(bottom) {
        return this.filterPositionValue(bottom);
    },

    applyLeft: function(left) {
        return this.filterPositionValue(left);
    },

    doSetTop: function(top) {
        this.updateFloating();
        this.element.setTop(top);
    },

    doSetRight: function(right) {
        this.updateFloating();
        this.element.setRight(right);
    },

    doSetBottom: function(bottom) {
        this.updateFloating();
        this.element.setBottom(bottom);
    },

    doSetLeft: function(left) {
        this.updateFloating();
        this.element.setLeft(left);
    },

    doSetWidth: function(width) {
        this.element.setWidth(width);
    },

    doSetHeight: function(height) {
        this.element.setHeight(height);
    },

    doSetMinWidth: function(width) {
        this.element.setMinWidth(width);
    },

    doSetMinHeight: function(height) {
        this.element.setMinHeight(height);
    },

    doSetMaxWidth: function(width) {
        this.element.setMaxWidth(width);
    },

    doSetMaxHeight: function(height) {
        this.element.setMaxHeight(height);
    },

    applyCentered: function(centered) {
        centered = Boolean(centered);

        if (centered) {
            if (this.isFloating()) {
                this.resetFloating();
            }

            if (this.isDocked()) {
                this.setDocked(false);
            }
        }

        return centered;
    },

    doSetCentered: Ext.emptyFn,

    applyDocked: function(docked) {
        if (!docked) {
            return null;
        }

        if (!this.dockPositions[docked]) {
            return;
        }

        if (this.isFloating()) {
            this.resetFloating();
        }

        if (this.isCentered()) {
            this.setCentered(false);
        }

        return docked;
    },

    doSetDocked: Ext.emptyFn,

    /**
     * Resets {@link #top}, {@link #right}, {@link #bottom} and {@link #left} configurations to `null`, which
     * will unfloat this component.
     */
    resetFloating: function() {
        this.setTop(null);
        this.setRight(null);
        this.setBottom(null);
        this.setLeft(null);
    },

    updateFloating: function() {
        var floating = true,
            floatingCls = this.getFloatingCls();

        if (this.getTop() === null && this.getBottom() === null && this.getRight() === null && this.getLeft() === null) {
            floating = false;
        }

        if (floating !== this.floating) {
            if (floating) {
                if (this.isCentered()) {
                    this.setCentered(false);
                }

                if (this.isDocked()) {
                    this.setDocked(false);
                }

                if (floatingCls) {
                    this.addCls(floatingCls);
                }
            } else if (floatingCls) {
                this.removeCls(floatingCls);
            }

            this.floating = floating;
            this.fireEvent('floatingchange', this, floating);
        }
    },

    /**
     * Updates the floatingCls if the component is currently floating
     * @private
     */
    updateFloatingCls: function(newFloatingCls, oldFloatingCls) {
        if (this.isFloating()) {
            this.replaceCls(oldFloatingCls, newFloatingCls);
        }
    },

    applyDisabled: function(disabled) {
        return Boolean(disabled);
    },

    doSetDisabled: function(disabled) {
        this.element[disabled ? 'addCls' : 'removeCls'](this.getDisabledCls());
    },

    updateDisabledCls: function(newDisabledCls, oldDisabledCls) {
        if (this.isDisabled()) {
            this.element.replaceCls(oldDisabledCls, newDisabledCls);
        }
    },

    /**
     * Disables this Component
     */
    disable: function() {
       this.setDisabled(true);
    },

    /**
     * Enables this Component
     */
    enable: function() {
        this.setDisabled(false);
    },

    /**
     * Returns true if this Component is currently disabled
     * @return {Boolean} True if currently disabled
     */
    isDisabled: function() {
        return this.getDisabled();
    },

    applyZIndex: function(zIndex) {
        if (zIndex !== null) {
            zIndex = Number(zIndex);

            if (isNaN(zIndex)) {
                zIndex = null;
            }
        }

        return zIndex;
    },

    updateZIndex: function(zIndex) {
        var domStyle = this.element.dom.style;

        if (zIndex !== null) {
            domStyle.setProperty('z-index', zIndex, 'important');
        }
        else {
            domStyle.removeProperty('z-index');
        }
    },

    getInnerHtmlElement: function() {
        var innerHtmlElement = this.innerHtmlElement,
            styleHtmlCls = this.getStyleHtmlCls();

        if (!innerHtmlElement || !innerHtmlElement.dom || !innerHtmlElement.dom.parentNode) {
            this.innerHtmlElement = innerHtmlElement = this.innerElement.createChild({ cls: 'x-innerhtml ' });

            if (this.getStyleHtmlContent()) {
                this.innerHtmlElement.addCls(styleHtmlCls);
                this.innerElement.removeCls(styleHtmlCls);
            }
        }

        return innerHtmlElement;
    },

    updateHtml: function(html) {
        var innerHtmlElement = this.getInnerHtmlElement();

        if (Ext.isElement(html)){
            innerHtmlElement.setHtml('');
            innerHtmlElement.append(html);
        }
        else {
            innerHtmlElement.setHtml(html);
        }
    },

    applyHidden: function(hidden) {
        return Boolean(hidden);
    },

    doSetHidden: function(hidden) {
        var element = this.renderElement;

        if (element.isDestroyed) {
            return;
        }

        if (hidden) {
            element.hide();
        }
        else {
            element.show();
        }

        if (this.element) {
            this.element[hidden ? 'addCls' : 'removeCls'](this.getHiddenCls());
        }

        this.fireEvent(hidden ? 'hide' : 'show', this);
    },

    updateHiddenCls: function(newHiddenCls, oldHiddenCls) {
        if (this.isHidden()) {
            this.element.replaceCls(oldHiddenCls, newHiddenCls);
        }
    },

    /**
     * Returns true if this Component is currently hidden
     * @return {Boolean} True if currently hidden
     */
    isHidden: function() {
        return this.getHidden();
    },

    /**
     * Hides this Component
     * @param {Object/Boolean} animation (optional)
     */
    hide: function(animation) {
        if (!this.getHidden()) {
            if (animation === undefined || (animation && animation.isComponent)) {
                animation = this.getHideAnimation();
            }
            if (animation) {
                if (animation === true) {
                    animation = 'fadeOut';
                }
                this.onBefore({
                    hiddenchange: 'animateFn',
                    scope: this,
                    single: true,
                    args: [animation]
                });
            }
            this.setHidden(true);
        }
        return this;
    },

    /**
     * Shows this component
     * @param {Object/Boolean} animation (optional)
     */
    show: function(animation) {
        var hidden = this.getHidden();
        if (hidden || hidden === null) {
            if (animation === true) {
                animation = 'fadeIn';
            }
            else if (animation === undefined || (animation && animation.isComponent)) {
                animation = this.getShowAnimation();
            }

            if (animation) {
                this.onBefore({
                    hiddenchange: 'animateFn',
                    scope: this,
                    single: true,
                    args: [animation]
                });
            }

            this.setHidden(false);
        }

        return this;
    },

    animateFn: function(animation, component, newState, oldState, options, controller) {
        if (animation && (!newState || (newState && this.isPainted()))) {
            var anim = new Ext.fx.Animation(animation);

            anim.setElement(component.element);

            if (newState) {
                anim.setOnEnd(function() {
                    controller.resume();
                });

                controller.pause();
            }
            Ext.Animator.run(anim);
        }
    },

    /**
     * @private
     */
    setVisibility: function(isVisible) {
        this.renderElement.setVisibility(isVisible);
    },

    /**
     * @private
     */
    isRendered: function() {
        return this.rendered;
    },

    /**
     * @private
     */
    isPainted: function() {
        return this.renderElement.isPainted();
    },

    /**
     * @private
     */
    applyTpl: function(config) {
        return (Ext.isObject(config) && config.isTemplate) ? config : new Ext.XTemplate(config);
    },

    applyData: function(data) {
        if (Ext.isObject(data)) {
            return Ext.apply({}, data);
        } else if (!data) {
            data = {};
        }

        return data;
    },

    /**
     * @private
     */
    updateData: function(newData) {
        var me = this;
        if (newData) {
            var tpl = me.getTpl(),
                tplWriteMode = me.getTplWriteMode();

            if (tpl) {
                tpl[tplWriteMode](me.getInnerHtmlElement(), newData);
            }

            /**
             * @event updatedata
             * Fires whenever the data of the component is updated
             * @param {Ext.Component} this The component instance
             * @param {Object} newData The new data
             */
            this.fireEvent('updatedata', me, newData);
        }
    },

    applyRecord: function(config) {
        if (config && Ext.isObject(config) && config.isModel) {
            return config;
        }
        return  null;
    },

    updateRecord: function(newRecord, oldRecord) {
        var me = this;

        if (oldRecord) {
            oldRecord.unjoin(me);
        }

        if (!newRecord) {
            me.updateData('');
        }
        else {
            newRecord.join(me);
            me.updateData(newRecord.getData(true));
        }
    },

    // @private Used to handle joining of a record to a tpl
    afterEdit: function() {
        this.updateRecord(this.getRecord());
    },

    // @private Used to handle joining of a record to a tpl
    afterErase: function() {
        this.setRecord(null);
    },

    applyItemId: function(itemId) {
        return itemId || this.getId();
    },

    /**
     * <p>Tests whether or not this Component is of a specific xtype. This can test whether this Component is descended
     * from the xtype (default) or whether it is directly of the xtype specified (shallow = true).</p>
     * <p><b>If using your own subclasses, be aware that a Component must register its own xtype
     * to participate in determination of inherited xtypes.</b></p>
     * <p>For a list of all available xtypes, see the {@link Ext.Component} header.</p>
     * <p>Example usage:</p>
     * <pre><code>
var t = new Ext.field.Text();
var isText = t.isXType('textfield');        // true
var isBoxSubclass = t.isXType('field');       // true, descended from Ext.field.Field
var isBoxInstance = t.isXType('field', true); // false, not a direct Ext.field.Field instance
</code></pre>
     * @param {String} xtype The xtype to check for this Component
     * @param {Boolean} shallow (optional) False to check whether this Component is descended from the xtype (this is
     * the default), or true to check whether this Component is directly of the specified xtype.
     * @return {Boolean} True if this component descends from the specified xtype, false otherwise.
     */
    isXType: function(xtype, shallow) {
        if (shallow) {
            return this.xtypes.indexOf(xtype) != -1;
        }

        return Boolean(this.xtypesMap[xtype]);
    },

    /**
     * <p>Returns this Component's xtype hierarchy as a slash-delimited string. For a list of all
     * available xtypes, see the {@link Ext.Component} header.</p>
     * <p><b>If using your own subclasses, be aware that a Component must register its own xtype
     * to participate in determination of inherited xtypes.</b></p>
     * <p>Example usage:</p>
     * <pre><code>
var t = new Ext.field.Text();
alert(t.getXTypes());  // alerts 'component/field/textfield'
</code></pre>
     * @return {String} The xtype hierarchy string
     */
    getXTypes: function() {
        return this.xtypesChain.join('/');
    },

    getDraggableBehavior: function() {
        var behavior = this.draggableBehavior;

        if (!behavior) {
            behavior = this.draggableBehavior = new Ext.behavior.Draggable(this);
        }

        return behavior;
    },

    applyDraggable: function(config) {
        this.getDraggableBehavior().setConfig(config);
    },

    getDraggable: function() {
        return this.getDraggableBehavior().getDraggable();
    },

    getTranslatableBehavior: function() {
        var behavior = this.translatableBehavior;

        if (!behavior) {
            behavior = this.translatableBehavior = new Ext.behavior.Translatable(this);
        }

        return behavior;
    },

    applyTranslatable: function(config) {
        this.getTranslatableBehavior().setConfig(config);
    },

    getTranslatable: function() {
        return this.getTranslatableBehavior().getTranslatable();
    },

    translateAxis: function(axis, value, animation) {
        var x, y;

        if (axis === 'x') {
            x = value;
        }
        else {
            y = value;
        }

        return this.translate(x, y, animation);
    },

    translate: function() {
        var translatable = this.getTranslatable();

        if (!translatable) {
            this.setTranslatable(true);
            translatable = this.getTranslatable();
        }

        translatable.translate.apply(translatable, arguments);
    },

    /**
     * @private
     * @param rendered
     */
    setRendered: function(rendered) {
        var wasRendered = this.rendered;

        if (rendered !== wasRendered) {
            this.rendered = rendered;

            return true;
        }

        return false;
    },

    /**
     * Sets the size of the Component
     * @param {Number} width The new width for the Component
     * @param {Number} height The new height for the Component
     */
    setSize: function(width, height) {
        if (width != undefined) {
            this.setWidth(width);
        }
        if (height != undefined) {
            this.setHeight(height);
        }
    },

    //@private
    doAddListener: function(name, fn, scope, options, order) {
        if (options && 'element' in options) {

            // The default scope is this component
            this[options.element].doAddListener(name, fn, scope || this, options, order);
        }

        return this.callParent(arguments);
    },

    //@private
    doRemoveListener: function(name, fn, scope, options, order) {
        if (options && 'element' in options) {

            // The default scope is this component
            this[options.element].doRemoveListener(name, fn, scope || this, options, order);
        }

        return this.callParent(arguments);
    },

    /**
     * Shows this component by another component. If you specify no alignment, it will automatically
     * position this component relative to the reference component.
     *
     * For example, say we are aligning a Panel next to a Button, the alignment string would look like this:
     *
     *     [panel-vertical (t/b/c)][panel-horizontal (l/r/c)]-[button-vertical (t/b/c)][button-horizontal (l/r/c)]
     *
     * where t = top, b = bottom, c = center, l = left, r = right.
     *
     * ## Examples
     *
     *  - `tl-tr` means top-left corner of the Panel to the top-right corner of the Button
     *  - `tc-bc` means top-center of the Panel to the bottom-center of the Button
     *
     * You can put a '?' at the end of the alignment string to constrain the floating element to the
     * {@link Ext.Viewport Viewport}
     *
     *     // show `panel` by `button` using the default positioning (auto fit)
     *     panel.showBy(button);
     *
     *     // align the top left corner of `panel` with the top right corner of `button` (constrained to viewport)
     *     panel.showBy(button, "tl-tr?");
     *
     *     // align the bottom right corner of `panel` with the center left edge of `button` (not constrained by viewport)
     *     panel.showBy(button, "br-cl");
     *
     * @param {Ext.Component} component The target component to show this component by
     * @param {String} alignment (Optional) The specific alignment.
     */
    showBy: function(component, alignment) {
        var args = Ext.Array.from(arguments);

        var viewport = Ext.Viewport,
            parent = this.getParent();

        this.setVisibility(false);

        if (parent !== viewport) {
            viewport.add(this);
        }

        this.show();

        this.on('erased', 'onShowByErased', this, { single: true });
        viewport.on('resize', 'refreshShowBy', this, { args: [component, alignment] });

        this.currentShowByArgs = args;

        this.alignTo(component, alignment);
        this.setVisibility(true);
    },

    refreshShowBy: function(component, alignment) {
        this.alignTo(component, alignment);
    },

    /**
     * @private
     * @param component
     */
    onShowByErased: function() {
        Ext.Viewport.un('resize', 'refreshShowBy', this);
    },

    /**
     * @private
     */
    alignTo: function(component, alignment) {
        var alignToElement = component.isComponent ? component.renderElement : component,
            element = this.renderElement,
            alignToBox = alignToElement.getPageBox(),
            constrainBox = this.getParent().element.getPageBox(),
            box = element.getPageBox(),
            alignToHeight = alignToBox.height,
            alignToWidth = alignToBox.width,
            height = box.height,
            width = box.width;

        // Keep off the sides...
        constrainBox.bottom -= 5;
        constrainBox.height -= 10;
        constrainBox.left += 5;
        constrainBox.right -= 5;
        constrainBox.top += 5;
        constrainBox.width -= 10;

        if (!alignment || alignment === 'auto') {
            if (constrainBox.bottom - alignToBox.bottom < height) {
                if (alignToBox.top - constrainBox.top < height) {
                    if (alignToBox.left - constrainBox.left < width) {
                        alignment = 'cl-cr?';
                    }
                    else {
                        alignment = 'cr-cl?';
                    }
                }
                else {
                    alignment = 'bc-tc?';
                }
            }
            else {
                alignment = 'tc-bc?';
            }
        }

        var matches = alignment.match(this.alignmentRegex);

        var from = matches[1].split(''),
            to = matches[2].split(''),
            constrained = (matches[3] === '?'),
            fromVertical = from[0],
            fromHorizontal = from[1] || fromVertical,
            toVertical = to[0],
            toHorizontal = to[1] || toVertical,
            top = alignToBox.top,
            left = alignToBox.left,
            halfAlignHeight = alignToHeight / 2,
            halfAlignWidth = alignToWidth / 2,
            halfWidth = width / 2,
            halfHeight = height / 2,
            maxLeft, maxTop;

        switch (fromVertical) {
            case 't':
                switch (toVertical) {
                    case 'c':
                        top += halfAlignHeight;
                        break;
                    case 'b':
                        top += alignToHeight;
                }
                break;

            case 'b':
                switch (toVertical) {
                    case 'c':
                        top -= (height - halfAlignHeight);
                        break;
                    case 't':
                        top -= height;
                        break;
                    case 'b':
                        top -= height - alignToHeight;
                }
                break;

            case 'c':
                switch (toVertical) {
                    case 't':
                        top -= halfHeight;
                        break;
                    case 'c':
                        top -= (halfHeight - halfAlignHeight);
                        break;
                    case 'b':
                        top -= (halfHeight - alignToHeight);
                }
                break;
        }

        switch (fromHorizontal) {
            case 'l':
                switch (toHorizontal) {
                    case 'c':
                        left += halfAlignHeight;
                        break;
                    case 'r':
                        left += alignToWidth;
                }
                break;

            case 'r':
                switch (toHorizontal) {
                    case 'r':
                        left -= (width - alignToWidth);
                        break;
                    case 'c':
                        left -= (width - halfWidth);
                        break;
                    case 'l':
                        left -= width;
                }
                break;

            case 'c':
                switch (toHorizontal) {
                    case 'l':
                        left -= halfWidth;
                        break;
                    case 'c':
                        left -= (halfWidth - halfAlignWidth);
                        break;
                    case 'r':
                        left -= (halfWidth - alignToWidth);
                }
                break;
        }

        if (constrained) {
            maxLeft = (constrainBox.left + constrainBox.width) - width;
            maxTop = (constrainBox.top + constrainBox.height) - height;

            left = Math.max(constrainBox.left, Math.min(maxLeft, left));
            top = Math.max(constrainBox.top, Math.min(maxTop, top));
        }

        this.setLeft(left);
        this.setTop(top);
    },

    /**
     * <p>Walks up the <code>ownerCt</code> axis looking for an ancestor Container which matches
     * the passed simple selector.</p>
     * <p>Example:<pre><code>
var owningTabPanel = grid.up('tabpanel');
</code></pre>
     * @param {String} selector Optional. The simple selector to test.
     * @return {Ext.Container} The matching ancestor Container (or <code>undefined</code> if no match was found).
     */
    up: function(selector) {
        var result = this.parent;

        if (selector) {
            for (; result; result = result.parent) {
                if (Ext.ComponentQuery.is(result, selector)) {
                    return result;
                }
            }
        }
        return result;
    },

    getBubbleTarget: function() {
        return this.getParent();
    },

    /**
     * Destroys this Component. If it is currently added to a Container it will first be removed from that Container.
     * All Ext.Element references are also deleted and the Component is de-registered from Ext.ComponentManager
     */
    destroy: function() {
        this.destroy = Ext.emptyFn;

        var parent = this.getParent(),
            referenceList = this.referenceList,
            i, ln, reference;

        Ext.destroy(this.getTranslatable(), this.getPlugins());

        // Remove this component itself from the container if it's currently contained
        if (parent) {
            parent.remove(this, false);
        }

        // Destroy all element references
        for (i = 0, ln = referenceList.length; i < ln; i++) {
            reference = referenceList[i];
            this[reference].destroy();
            delete this[reference];
        }

        Ext.destroy(this.innerHtmlElement);
        this.setRecord(null);

        Ext.ComponentManager.unregister(this);

        this.callParent();
    }

    // Convert old properties in data into a config object

}, function() {
});

})(Ext.baseCSSPrefix);

/**
 * @private
 */
Ext.define('Ext.event.publisher.ComponentDelegation', {
    extend: 'Ext.event.publisher.Publisher',

    requires: [
        'Ext.Component',
        'Ext.ComponentQuery'
    ],

    targetType: 'component',

    optimizedSelectorRegex: /^#([\w\-]+)((?:[\s]*)>(?:[\s]*)|(?:\s*))([\w\-]+)$/i,

    handledEvents: ['*'],

    getSubscribers: function(eventName, createIfNotExist) {
        var subscribers = this.subscribers,
            eventSubscribers = subscribers[eventName];

        if (!eventSubscribers && createIfNotExist) {
            eventSubscribers = subscribers[eventName] = {
                type: {
                    $length: 0
                },
                selector: [],
                $length: 0
            }
        }

        return eventSubscribers;
    },

    subscribe: function(target, eventName) {
        // Ignore id-only selectors since they are already handled
        if (this.idSelectorRegex.test(target)) {
            return false;
        }

        var optimizedSelector = target.match(this.optimizedSelectorRegex),
            subscribers = this.getSubscribers(eventName, true),
            typeSubscribers = subscribers.type,
            selectorSubscribers = subscribers.selector,
            id, isDescendant, type, map, subMap;

        if (optimizedSelector !== null) {
            id = optimizedSelector[1];
            isDescendant = optimizedSelector[2].indexOf('>') === -1;
            type = optimizedSelector[3];

            map = typeSubscribers[type];

            if (!map) {
                typeSubscribers[type] = map = {
                    descendents: {
                        $length: 0
                    },
                    children: {
                        $length: 0
                    },
                    $length: 0
                }
            }

            subMap = isDescendant ? map.descendents : map.children;

            if (subMap.hasOwnProperty(id)) {
                subMap[id]++;
                return true;
            }

            subMap[id] = 1;
            subMap.$length++;
            map.$length++;
            typeSubscribers.$length++;
        }
        else {
            if (selectorSubscribers.hasOwnProperty(target)) {
                selectorSubscribers[target]++;
                return true;
            }

            selectorSubscribers[target] = 1;
            selectorSubscribers.push(target);
        }

        subscribers.$length++;

        return true;
    },

    unsubscribe: function(target, eventName, all) {
        var subscribers = this.getSubscribers(eventName);

        if (!subscribers) {
            return false;
        }

        var match = target.match(this.optimizedSelectorRegex),
            typeSubscribers = subscribers.type,
            selectorSubscribers = subscribers.selector,
            id, isDescendant, type, map, subMap;

        all = Boolean(all);

        if (match !== null) {
            id = match[1];
            isDescendant = match[2].indexOf('>') === -1;
            type = match[3];

            map = typeSubscribers[type];

            if (!map) {
                return true;
            }

            subMap = isDescendant ? map.descendents : map.children;

            if (!subMap.hasOwnProperty(id) || (!all && --subMap[id] > 0)) {
                return true;
            }

            delete subMap[id];
            subMap.$length--;
            map.$length--;
            typeSubscribers.$length--;
        }
        else {
            if (!selectorSubscribers.hasOwnProperty(target) || (!all && --selectorSubscribers[target] > 0)) {
                return true;
            }

            delete selectorSubscribers[target];
            Ext.Array.remove(selectorSubscribers, target);
        }

        if (--subscribers.$length === 0) {
            delete this.subscribers[eventName];
        }

        return true;
    },

    notify: function(target, eventName) {
        var subscribers = this.getSubscribers(eventName),
            id, component;

        if (!subscribers || subscribers.$length === 0) {
            return false;
        }

        id = target.substr(1);
        component = Ext.ComponentManager.get(id);

        if (component) {
            this.dispatcher.doAddListener(this.targetType, target, eventName, 'publish', this, {
                args: [eventName, component]
            }, 'before');
        }
    },

    matchesSelector: function(component, selector) {
        return Ext.ComponentQuery.is(component, selector);
    },

    dispatch: function(target, eventName, args, connectedController) {
        this.dispatcher.doDispatchEvent(this.targetType, target, eventName, args, null, connectedController);
    },

    publish: function(eventName, component) {
        var subscribers = this.getSubscribers(eventName);

        if (!subscribers) {
            return;
        }

        var eventController = arguments[arguments.length - 1],
            typeSubscribers = subscribers.type,
            selectorSubscribers = subscribers.selector,
            args = Array.prototype.slice.call(arguments, 2, -2),
            types = component.xtypesChain,
            descendentsSubscribers, childrenSubscribers,
            parentId, ancestorIds, ancestorId, parentComponent,
            selector,
            i, ln, type, j, subLn;

        for (i = 0, ln = types.length; i < ln; i++) {
            type = types[i];

            subscribers = typeSubscribers[type];

            if (subscribers && subscribers.$length > 0) {
                descendentsSubscribers = subscribers.descendents;

                if (descendentsSubscribers.$length > 0) {
                    if (!ancestorIds) {
                        ancestorIds = component.getAncestorIds();
                    }

                    for (j = 0, subLn = ancestorIds.length; j < subLn; j++) {
                        ancestorId = ancestorIds[j];

                        if (descendentsSubscribers.hasOwnProperty(ancestorId)) {
                            this.dispatch('#' + ancestorId + ' ' + type, eventName, args, eventController);
                        }

                    }
                }

                childrenSubscribers = subscribers.children;

                if (childrenSubscribers.$length > 0) {
                    if (!parentId) {
                        if (ancestorIds) {
                            parentId = ancestorIds[0];
                        }
                        else {
                            parentComponent = component.getParent();
                            if (parentComponent) {
                                parentId = parentComponent.getId();
                            }
                        }
                    }

                    if (parentId) {
                        if (childrenSubscribers.hasOwnProperty(parentId)) {
                            this.dispatch('#' + parentId + ' > ' + type, eventName, args, eventController);
                        }
                    }
                }
            }
        }

        ln = selectorSubscribers.length;

        if (ln > 0) {
            for (i = 0; i < ln; i++) {
                selector = selectorSubscribers[i];

                if (this.matchesSelector(component, selector)) {
                    this.dispatch(selector, eventName, args, eventController);
                }
            }
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.event.publisher.ComponentPaint', {

    extend: 'Ext.event.publisher.Publisher',

    targetType: 'component',

    handledEvents: ['painted', 'erased'],

    eventNames: {
        painted: 'painted',
        erased: 'erased'
    },

    constructor: function() {
        this.callParent(arguments);

        this.hiddenQueue = {};
        this.renderedQueue = {};
    },

    getSubscribers: function(eventName, createIfNotExist) {
        var subscribers = this.subscribers;

        if (!subscribers.hasOwnProperty(eventName)) {
            if (!createIfNotExist) {
                return null;
            }

            subscribers[eventName] = {
                $length: 0
            };
        }

        return subscribers[eventName];
    },

    setDispatcher: function(dispatcher) {
        var targetType = this.targetType;

        dispatcher.doAddListener(targetType, '*', 'renderedchange', 'onBeforeComponentRenderedChange', this, null, 'before');
        dispatcher.doAddListener(targetType, '*', 'hiddenchange', 'onBeforeComponentHiddenChange', this, null, 'before');
        dispatcher.doAddListener(targetType, '*', 'renderedchange', 'onComponentRenderedChange', this, null, 'after');
        dispatcher.doAddListener(targetType, '*', 'hiddenchange', 'onComponentHiddenChange', this, null, 'after');

        return this.callParent(arguments);
    },

    subscribe: function(target, eventName) {
        var match = target.match(this.idSelectorRegex),
            subscribers,
            id;

        if (!match) {
            return false;
        }

        id = match[1];

        subscribers = this.getSubscribers(eventName, true);

        if (subscribers.hasOwnProperty(id)) {
            subscribers[id]++;
            return true;
        }

        subscribers[id] = 1;
        subscribers.$length++;

        return true;
    },

    unsubscribe: function(target, eventName, all) {
        var match = target.match(this.idSelectorRegex),
            subscribers,
            id;

        if (!match || !(subscribers = this.getSubscribers(eventName))) {
            return false;
        }

        id = match[1];

        if (!subscribers.hasOwnProperty(id) || (!all && --subscribers[id] > 0)) {
            return true;
        }

        delete subscribers[id];

        if (--subscribers.$length === 0) {
            delete this.subscribers[eventName];
        }

        return true;
    },

    onBeforeComponentRenderedChange: function(container, component, rendered) {
        var eventNames = this.eventNames,
            eventName = rendered ? eventNames.painted : eventNames.erased,
            subscribers = this.getSubscribers(eventName),
            queue;

        if (subscribers && subscribers.$length > 0) {
            this.renderedQueue[component.getId()] = queue = [];
            this.publish(subscribers, component, eventName, queue);
        }
    },

    onBeforeComponentHiddenChange: function(component, hidden) {
        var eventNames = this.eventNames,
            eventName = hidden ? eventNames.erased : eventNames.painted,
            subscribers = this.getSubscribers(eventName),
            queue;

        if (subscribers && subscribers.$length > 0) {
            this.hiddenQueue[component.getId()] = queue = [];
            this.publish(subscribers, component, eventName, queue);
        }
    },

    onComponentRenderedChange: function(container, component) {
        var renderedQueue = this.renderedQueue,
            id = component.getId(),
            queue;

        if (!renderedQueue.hasOwnProperty(id)) {
            return;
        }

        queue = renderedQueue[id];
        delete renderedQueue[id];

        if (queue.length > 0) {
            this.dispatchQueue(queue);
        }
    },

    onComponentHiddenChange: function(component) {
        var hiddenQueue = this.hiddenQueue,
            id = component.getId(),
            queue;

        if (!hiddenQueue.hasOwnProperty(id)) {
            return;
        }

        queue = hiddenQueue[id];
        delete hiddenQueue[id];

        if (queue.length > 0) {
            this.dispatchQueue(queue);
        }
    },

    dispatchQueue: function(dispatchingQueue) {
        var dispatcher = this.dispatcher,
            targetType = this.targetType,
            eventNames = this.eventNames,
            queue = dispatchingQueue.slice(),
            ln = queue.length,
            i, item, component, eventName, isPainted;

        dispatchingQueue.length = 0;

        if (ln > 0) {
            for (i = 0; i < ln; i++) {
                item = queue[i];
                component = item.component;
                eventName = item.eventName;
                isPainted = component.isPainted();

                if ((eventName === eventNames.painted && isPainted) || eventName === eventNames.erased && !isPainted) {
                    dispatcher.doDispatchEvent(targetType, '#' + item.id, eventName, [component]);
                }
            }
            queue.length = 0;
        }

    },

    publish: function(subscribers, component, eventName, dispatchingQueue) {
        var id = component.getId(),
            needsDispatching = false,
            eventNames, items, i, ln, isPainted;

        if (subscribers[id]) {
            eventNames = this.eventNames;

            isPainted = component.isPainted();

            if ((eventName === eventNames.painted && !isPainted) || eventName === eventNames.erased && isPainted) {
                needsDispatching = true;
            }
            else {
                return this;
            }
        }

        if (component.isContainer) {
            items = component.getItems().items;

            for (i = 0,ln = items.length; i < ln; i++) {
                this.publish(subscribers, items[i], eventName, dispatchingQueue);
            }
        }
        else if (component.isDecorator) {
            this.publish(subscribers, component.getComponent(), eventName, dispatchingQueue);
        }

        if (needsDispatching) {
            dispatchingQueue.push({
                id: id,
                eventName: eventName,
                component: component
            });
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.event.publisher.ComponentSize', {

    extend: 'Ext.event.publisher.Publisher',

    requires: [
        'Ext.ComponentManager',
        'Ext.util.SizeMonitor'
    ],

    targetType: 'component',

    handledEvents: ['resize'],

    constructor: function() {
        this.callParent(arguments);

        this.sizeMonitors = {};
    },

    subscribe: function(target) {
        var match = target.match(this.idSelectorRegex),
            subscribers = this.subscribers,
            sizeMonitors = this.sizeMonitors,
            dispatcher = this.dispatcher,
            targetType = this.targetType,
            component;

        if (!match) {
            return false;
        }

        if (!subscribers.hasOwnProperty(target)) {
            subscribers[target] = 0;

            dispatcher.addListener(targetType, target, 'painted', 'onComponentPainted', this, null, 'before');

            component = Ext.ComponentManager.get(match[1]);


            sizeMonitors[target] = new Ext.util.SizeMonitor({
                element: component.element,
                callback: this.onComponentSizeChange,
                scope: this,
                args: [this, target]
            });
        }

        subscribers[target]++;
        return true;
    },

    unsubscribe: function(target, eventName, all) {
        var match = target.match(this.idSelectorRegex),
            subscribers = this.subscribers,
            dispatcher = this.dispatcher,
            targetType = this.targetType,
            sizeMonitors = this.sizeMonitors;

        if (!match) {
            return false;
        }

        if (!subscribers.hasOwnProperty(target) || (!all && --subscribers[target] > 0)) {
            return true;
        }

        sizeMonitors[target].destroy();
        delete sizeMonitors[target];

        dispatcher.removeListener(targetType, target, 'painted', 'onComponentPainted', this, 'before');

        delete subscribers[target];
        return true;
    },

    onComponentPainted: function(component) {
        var observableId = component.getObservableId(),
            sizeMonitor = this.sizeMonitors[observableId];

        sizeMonitor.refresh();
    },

    onComponentSizeChange: function(component, observableId) {
        this.dispatcher.doDispatchEvent(this.targetType, observableId, 'resize', [component]);
    }
});

Ext.define('Ext.log.Base', {
    config: {},

    constructor: function(config) {
        this.initConfig(config);

        return this;
    }
});

/**
 * @class Ext.Logger
 * Logs messages to help with debugging.
 *
 * ## Example
 *
 *     Ext.Logger.deprecate('This method is no longer supported.');
 *
 * @singleton
 */
(function() {
var Logger = Ext.define('Ext.log.Logger', {

    extend: 'Ext.log.Base',

    statics: {
        defaultPriority: 'info',

        priorities: {
            /**
             * @method verbose
             * Convenience method for {@link #log} with priority 'verbose'
             */
            verbose:    0,
            /**
             * @method info
             * Convenience method for {@link #log} with priority 'info'
             */
            info:       1,
            /**
             * @method deprecate
             * Convenience method for {@link #log} with priority 'deprecate'
             */
            deprecate:  2,
            /**
             * @method warn
             * Convenience method for {@link #log} with priority 'warn'
             */
            warn:       3,
            /**
             * @method error
             * Convenience method for {@link #log} with priority 'error'
             */
            error:      4
        }
    },

    config: {
        enabled: true,
        minPriority: 'deprecate',
        writers: {}
    },

    /**
     * Logs a message to help with debugging
     * @param  {String} message  Message to log
     * @param  {Number} priority Priority of the log message
     */
    log: function(message, priority, callerId) {
        if (!this.getEnabled()) {
            return this;
        }

        var statics = Logger,
            priorities = statics.priorities,
            priorityValue = priorities[priority],
            caller = this.log.caller,
            callerDisplayName = '',
            writers = this.getWriters(),
            event, i, originalCaller;

        if (!priority) {
            priority = 'info';
        }

        if (priorities[this.getMinPriority()] > priorityValue) {
            return this;
        }

        if (!callerId) {
            callerId = 1;
        }

        if (Ext.isArray(message)) {
            message = message.join(" ");
        }
        else {
            message = String(message);
        }

        if (typeof callerId == 'number') {
            i = callerId;

            do {
                i--;

                caller = caller.caller;

                if (!caller) {
                    break;
                }

                if (!originalCaller) {
                    originalCaller = caller.caller;
                }

                if (i <= 0 && caller.displayName) {
                    break;
                }
            }
            while (caller !== originalCaller);

            callerDisplayName = Ext.getDisplayName(caller);
        }
        else {
            caller = caller.caller;
            callerDisplayName = Ext.getDisplayName(callerId) + '#' + caller.$name;
        }

        event = {
            time: Ext.Date.now(),
            priority: priorityValue,
            priorityName: priority,
            message: message,
            caller: caller,
            callerDisplayName: callerDisplayName
        };

        for (i in writers) {
            if (writers.hasOwnProperty(i)) {
                writers[i].write(Ext.merge({}, event));
            }
        }

        return this;
    }

}, function() {
    Ext.Object.each(this.priorities, function(priority) {
        this.override(priority, function(message, callerId) {
            if (!callerId) {
                callerId = 1;
            }

            if (typeof callerId == 'number') {
                callerId += 1;
            }

            this.log(message, priority, callerId);
        });
    }, this);
});

})();

Ext.define('Ext.log.formatter.Formatter', {
    extend: 'Ext.log.Base',

    config: {
        messageFormat: "{message}"
    },

    format: function(event) {
        return this.substitute(this.getMessageFormat(), event);
    },

    substitute: function(template, data) {
        var name, value;

        for (name in data) {
            if (data.hasOwnProperty(name)) {
                value = data[name];

                template = template.replace(new RegExp("\\{" + name + "\\}", "g"), value);
            }
        }

        return template;
    }
});

Ext.define('Ext.log.writer.Writer', {
    extend: 'Ext.log.Base',

    requires: ['Ext.log.formatter.Formatter'],

    config: {
        formatter: null,
        filters: {}
    },

    constructor: function() {
        this.activeFilters = [];

        return this.callParent(arguments);
    },

    updateFilters: function(filters) {
        var activeFilters = this.activeFilters,
            i, filter;

        activeFilters.length = 0;

        for (i in filters) {
            if (filters.hasOwnProperty(i)) {
                filter = filters[i];
                activeFilters.push(filter);
            }
        }
    },

    write: function(event) {
        var filters = this.activeFilters,
            formatter = this.getFormatter(),
            i, ln, filter;

        for (i = 0,ln = filters.length; i < ln; i++) {
            filter = filters[i];

            if (!filters[i].accept(event)) {
                return this;
            }
        }

        if (formatter) {
            event.message = formatter.format(event);
        }

        this.doWrite(event);

        return this;
    },

    // @private
    doWrite: Ext.emptyFn
});

Ext.define('Ext.log.writer.Console', {

    extend: 'Ext.log.writer.Writer',

    config: {
        throwOnErrors: true,
        throwOnWarnings: false
    },

    doWrite: function(event) {
        var message = event.message,
            priority = event.priorityName,
            consoleMethod;

        if (priority === 'error' && this.getThrowOnErrors()) {
            throw new Error(message);
        }

        if (typeof console !== 'undefined') {
            consoleMethod = priority;

            if (consoleMethod === 'deprecate') {
                consoleMethod = 'warn';
            }

            if (consoleMethod === 'warn' && this.getThrowOnWarnings()) {
                throw new Error(message);
            }

            if (!(consoleMethod in console)) {
                consoleMethod = 'log';
            }

            console[consoleMethod](message);
        }
    }
});

Ext.define('Ext.log.formatter.Default', {
    extend: 'Ext.log.formatter.Formatter',

    config: {
        messageFormat: "[{priorityName}][{callerDisplayName}] {message}"
    },

    format: function(event) {
        var event = Ext.merge({}, event, {
                priorityName: event.priorityName.toUpperCase()
            });

        return this.callParent([event]);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.State', {

    isAnimatable: {
        'background-color'   : true,
        'background-image'   : true,
        'background-position': true,
        'border-bottom-color': true,
        'border-bottom-width': true,
        'border-color'       : true,
        'border-left-color'  : true,
        'border-left-width'  : true,
        'border-right-color' : true,
        'border-right-width' : true,
        'border-spacing'     : true,
        'border-top-color'   : true,
        'border-top-width'   : true,
        'border-width'       : true,
        'bottom'             : true,
        'color'              : true,
        'crop'               : true,
        'font-size'          : true,
        'font-weight'        : true,
        'height'             : true,
        'left'               : true,
        'letter-spacing'     : true,
        'line-height'        : true,
        'margin-bottom'      : true,
        'margin-left'        : true,
        'margin-right'       : true,
        'margin-top'         : true,
        'max-height'         : true,
        'max-width'          : true,
        'min-height'         : true,
        'min-width'          : true,
        'opacity'            : true,
        'outline-color'      : true,
        'outline-offset'     : true,
        'outline-width'      : true,
        'padding-bottom'     : true,
        'padding-left'       : true,
        'padding-right'      : true,
        'padding-top'        : true,
        'right'              : true,
        'text-indent'        : true,
        'text-shadow'        : true,
        'top'                : true,
        'vertical-align'     : true,
        'visibility'         : true,
        'width'              : true,
        'word-spacing'       : true,
        'z-index'            : true,
        'zoom'               : true,
        'transform'          : true
    },

    constructor: function(data) {
        this.data = {};

        this.set(data);
    },

    setConfig: function(data) {
        this.set(data);

        return this;
    },

    setRaw: function(data) {
        this.data = data;

        return this;
    },

    clear: function() {
        return this.setRaw({});
    },

    setTransform: function(name, value) {
        var data = this.data,
            isArray = Ext.isArray(value),
            transform = data.transform,
            ln, key;

        if (!transform) {
            transform = data.transform = {
                translateX: 0,
                translateY: 0,
                translateZ: 0,
                scaleX: 1,
                scaleY: 1,
                scaleZ: 1,
                rotate: 0,
                rotateX: 0,
                rotateY: 0,
                rotateZ: 0,
                skewX: 0,
                skewY: 0
            };
        }

        if (typeof name == 'string') {
            switch (name) {
                case 'translate':
                    if (isArray) {
                        ln = value.length;

                        if (ln == 0) { break; }

                        transform.translateX = value[0];

                        if (ln == 1) { break; }

                        transform.translateY = value[1];

                        if (ln == 2) { break; }

                        transform.translateZ = value[2];
                    }
                    else {
                        transform.translateX = value;
                    }
                    break;

                case 'rotate':
                    if (isArray) {
                        ln = value.length;

                        if (ln == 0) { break; }

                        transform.rotateX = value[0];

                        if (ln == 1) { break; }

                        transform.rotateY = value[1];

                        if (ln == 2) { break; }

                        transform.rotateZ = value[2];
                    }
                    else {
                        transform.rotate = value;
                    }
                    break;


                case 'scale':
                    if (isArray) {
                        ln = value.length;

                        if (ln == 0) { break; }

                        transform.scaleX = value[0];

                        if (ln == 1) { break; }

                        transform.scaleY = value[1];

                        if (ln == 2) { break; }

                        transform.scaleZ = value[2];
                    }
                    else {
                        transform.scaleX = value;
                        transform.scaleY = value;
                    }
                    break;

                case 'skew':
                    if (isArray) {
                        ln = value.length;

                        if (ln == 0) { break; }

                        transform.skewX = value[0];

                        if (ln == 1) { break; }

                        transform.skewY = value[1];
                    }
                    else {
                        transform.skewX = value;
                    }
                    break;

                default:
                    transform[name] = value;
            }
        }
        else {
            for (key in name) {
                if (name.hasOwnProperty(key)) {
                    value = name[key];

                    this.setTransform(key, value);
                }
            }
        }
    },

    set: function(name, value) {
        var data = this.data,
            key;

        if (typeof name != 'string') {
            for (key in name) {
                value = name[key];

                if (key === 'transform') {
                    this.setTransform(value);
                }
                else {
                    data[key] = value;
                }
            }
        }
        else {
            if (name === 'transform') {
                this.setTransform(value);
            }
            else {
                data[name] = value;
            }
        }

        return this;
    },

    unset: function(name) {
        var data = this.data;

        if (data.hasOwnProperty(name)) {
            delete data[name];
        }

        return this;
    },

    getData: function() {
        return this.data;
    }
});



/**
 * @private
 */
Ext.define('Ext.fx.animation.Abstract', {

    extend: 'Ext.Evented',

    isAnimation: true,

    requires: [
        'Ext.fx.State'
    ],

    config: {
        name: '',

        element: null,

        /**
         * @cfg
         * Before configuration.
         */
        before: null,

        from: {},

        to: {},

        after: null,

        states: {},

        duration:  300,

        /**
         * @cfg
         * Easing type.
         */
        easing: 'linear',

        iteration: 1,

        direction: 'normal',

        delay: 0,

        onBeforeStart: null,

        onEnd: null,

        onBeforeEnd: null,

        scope: null,

        reverse: null,

        preserveEndState: false,

        replacePrevious: true
    },

    STATE_FROM: '0%',

    STATE_TO: '100%',

    DIRECTION_UP: 'up',

    DIRECTION_DOWN: 'down',

    DIRECTION_LEFT: 'left',

    DIRECTION_RIGHT: 'right',

    stateNameRegex: /^(?:[\d\.]+)%$/,

    constructor: function() {
        this.states = {};

        this.callParent(arguments);

        return this;
    },

    applyElement: function(element) {
        return Ext.get(element);
    },

    applyBefore: function(before, current) {
        if (before) {
            return Ext.factory(before, Ext.fx.State, current);
        }
    },

    applyAfter: function(after, current) {
        if (after) {
            return Ext.factory(after, Ext.fx.State, current);
        }
    },

    setFrom: function(from) {
        return this.setState(this.STATE_FROM, from);
    },

    setTo: function(to) {
        return this.setState(this.STATE_TO, to);
    },

    getFrom: function() {
        return this.getState(this.STATE_FROM);
    },

    getTo: function() {
        return this.getState(this.STATE_TO);
    },

    setStates: function(states) {
        var validNameRegex = this.stateNameRegex,
            name;

        for (name in states) {
            if (validNameRegex.test(name)) {
                this.setState(name, states[name]);
            }
        }

        return this;
    },

    getStates: function() {
        return this.states;
    },

    stop: function() {
        this.fireEvent('stop', this);
    },

    destroy: function() {
        this.stop();
        this.callParent();
    },

    setState: function(name, state) {
        var states = this.getStates(),
            stateInstance;

        stateInstance = Ext.factory(state, Ext.fx.State, states[name]);

        if (stateInstance) {
            states[name] = stateInstance;
        }

        return this;
    },

    getState: function(name) {
        return this.getStates()[name];
    },

    getData: function() {
        var states = this.getStates(),
            statesData = {},
            before = this.getBefore(),
            after = this.getAfter(),
            from = states[this.STATE_FROM],
            to = states[this.STATE_TO],
            fromData = from.getData(),
            toData = to.getData(),
            data, name, state;

        for (name in states) {
            if (states.hasOwnProperty(name)) {
                state = states[name];
                data = state.getData();
                statesData[name] = data;
            }
        }

        if (Ext.os.is.Android2) {
            statesData['0.0001%'] = fromData;
        }

        return {
            before: before ? before.getData() : {},
            after: after ? after.getData() : {},
            states: statesData,
            from: fromData,
            to: toData,
            duration: this.getDuration(),
            iteration: this.getIteration(),
            direction: this.getDirection(),
            easing: this.getEasing(),
            delay: this.getDelay(),
            onEnd: this.getOnEnd(),
            onBeforeEnd: this.getOnBeforeEnd(),
            onBeforeStart: this.getOnBeforeStart(),
            scope: this.getScope(),
            preserveEndState: this.getPreserveEndState(),
            replacePrevious: this.getReplacePrevious()
        };
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.animation.Slide', {

    extend: 'Ext.fx.animation.Abstract',

    alternateClassName: 'Ext.fx.animation.SlideIn',

    alias: ['animation.slide', 'animation.slideIn'],

    config: {
        /**
         * @cfg {String} direction The direction of which the slide animates
         * @accessor
         */
        direction: 'left',

        /**
         * @cfg {Boolean} out True if you want to make this animation slide out, instead of slide in.
         * @accessor
         */
        out: false,

        /**
         * @cfg {Number} offset The offset that the animation should go offscreen before entering (or when exiting)
         * @accessor
         */
        offset: 0,

        /**
         * @cfg
         * @inheritdoc
         */
        easing: 'auto',

        containerBox: 'auto',

        elementBox: 'auto',

        isElementBoxFit: true,

        useCssTransform: true
    },

    reverseDirectionMap: {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left'
    },

    applyEasing: function(easing) {
        if (easing === 'auto') {
            return 'ease-' + ((this.getOut()) ? 'in' : 'out');
        }

        return easing;
    },

    getContainerBox: function() {
        var box = this._containerBox;

        if (box === 'auto') {
            box = this.getElement().getParent().getPageBox();
        }

        return box;
    },

    getElementBox: function() {
        var box = this._elementBox;

        if (this.getIsElementBoxFit()) {
            return this.getContainerBox();
        }

        if (box === 'auto') {
            box = this.getElement().getPageBox();
        }

        return box;
    },

    getData: function() {
        var elementBox = this.getElementBox(),
            containerBox = this.getContainerBox(),
            box = elementBox ? elementBox : containerBox,
            from = this.getFrom(),
            to = this.getTo(),
            out = this.getOut(),
            offset = this.getOffset(),
            direction = this.getDirection(),
            useCssTransform = this.getUseCssTransform(),
            reverse = this.getReverse(),
            translateX = 0,
            translateY = 0,
            fromX, fromY, toX, toY;

        if (reverse) {
            direction = this.reverseDirectionMap[direction];
        }

        switch (direction) {
            case this.DIRECTION_UP:
                if (out) {
                    translateY = containerBox.top - box.top - box.height - offset;
                }
                else {
                    translateY = containerBox.bottom - box.bottom + box.height + offset;
                }

                break;

            case this.DIRECTION_DOWN:
                if (out) {
                    translateY = containerBox.bottom - box.bottom + box.height + offset;
                }
                else {
                    translateY = containerBox.top - box.height - box.top - offset;
                }

                break;

            case this.DIRECTION_RIGHT:
                if (out) {
                    translateX = containerBox.right - box.right + box.width + offset;
                }
                else {
                    translateX = containerBox.left - box.left - box.width - offset;
                }

                break;

            case this.DIRECTION_LEFT:
                if (out) {
                    translateX = containerBox.left - box.left - box.width - offset;
                }
                else {
                    translateX = containerBox.right - box.right + box.width + offset;
                }

                break;
        }

        fromX = (out) ? 0 : translateX;
        fromY = (out) ? 0 : translateY;

        if (useCssTransform) {
            from.setTransform({
                translateX: fromX,
                translateY: fromY
            });
        }
        else {
            from.set('left', fromX);
            from.set('top', fromY);
        }

        toX = (out) ? translateX : 0;
        toY = (out) ? translateY : 0;

        if (useCssTransform) {
            to.setTransform({
                translateX: toX,
                translateY: toY
            });
        }
        else {
            to.set('left', toX);
            to.set('top', toY);
        }

        return this.callParent(arguments);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.animation.SlideOut', {
    extend: 'Ext.fx.animation.Slide',
    alias: ['animation.slideOut'],

    config: {
        // @hide
        out: true
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.animation.Fade', {
    extend: 'Ext.fx.animation.Abstract',

    alternateClassName: 'Ext.fx.animation.FadeIn',

    alias: ['animation.fade', 'animation.fadeIn'],

    config: {
        /**
         * @cfg {Boolean} out True if you want to make this animation fade out, instead of fade in.
         * @accessor
         */

        out: false,

        before: {
            display: null,
            opacity: 0
        },

        after: {
            opacity: null
        },
        reverse: null
    },

    updateOut: function(newOut) {
        var to   = this.getTo(),
            from = this.getFrom();

        if (newOut) {
            from.set('opacity', 1);
            to.set('opacity',   0);
        } else {
            from.set('opacity', 0);
            to.set('opacity',   1);
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.animation.FadeOut', {
    extend: 'Ext.fx.animation.Fade',
    alias: 'animation.fadeOut',

    config: {
        // @hide
        out: true,

        before: {}
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.animation.Flip', {
    extend: 'Ext.fx.animation.Abstract',

    alias: 'animation.flip',

    config: {
        easing: 'ease-in',

        /**
         * @cfg {String} direction The direction of which the slide animates
         * @accessor
         */
        direction: 'right',

        half: false,

        out: null
    },

    getData: function() {
        var from = this.getFrom(),
            to = this.getTo(),
            direction = this.getDirection(),
            out = this.getOut(),
            half = this.getHalf(),
            rotate = (half) ? 90 : 180,
            fromScale = 1,
            toScale = 1,
            fromRotateX = 0,
            fromRotateY = 0,
            toRotateX = 0,
            toRotateY = 0;


        if (out) {
            toScale = 0.8;
        }
        else {
            fromScale = 0.8;
        }

        switch (direction) {
            case this.DIRECTION_UP:
                if (out) {
                    toRotateX = rotate;
                }
                else {
                    fromRotateX = -rotate;
                }
                break;

            case this.DIRECTION_DOWN:
                if (out) {
                    toRotateX = -rotate;
                }
                else {
                    fromRotateX = rotate;
                }
                break;

            case this.DIRECTION_RIGHT:
                if (out) {
                    toRotateY = -rotate;
                }
                else {
                    fromRotateY = rotate;
                }
                break;

            case this.DIRECTION_LEFT:
                if (out) {
                    toRotateY = -rotate;
                }
                else {
                    fromRotateY = rotate;
                }
                break;
        }

        from.setTransform({
            rotateX: fromRotateX,
            rotateY: fromRotateY,
            scale: fromScale
        });

        to.setTransform({
            rotateX: toRotateX,
            rotateY: toRotateY,
            scale: toScale
        });

        return this.callParent(arguments);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.animation.Pop', {
    extend: 'Ext.fx.animation.Abstract',

    alias: ['animation.pop', 'animation.popIn'],

    alternateClassName: 'Ext.fx.animation.PopIn',

    config: {
        /**
         * @cfg {Boolean} out True if you want to make this animation pop out, instead of pop in.
         * @accessor
         */
        out: false,

        before: {
            display: null,
            opacity: 0
        },
        after: {
            opacity: null
        }
    },

    getData: function() {
        var to = this.getTo(),
            from = this.getFrom(),
            out = this.getOut();

        if (out) {
            from.set('opacity', 1);
            from.setTransform({
                scale: 1
            });

            to.set('opacity', 0);
            to.setTransform({
                scale: 0
            });
        }
        else {
            from.set('opacity', 0);
            from.setTransform({
                scale: 0
            });

            to.set('opacity', 1);
            to.setTransform({
                scale: 1
            });
        }

        return this.callParent(arguments);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.animation.PopOut', {
    extend: 'Ext.fx.animation.Pop',

    alias: 'animation.popOut',

    config: {
        // @hide
        out: true,

        before: {}
    }
});

/**
 * @private
 * @author Jacky Nguyen <jacky@sencha.com>
 */
Ext.define('Ext.fx.Animation', {

    requires: [
        'Ext.fx.animation.Slide',
        'Ext.fx.animation.SlideOut',
        'Ext.fx.animation.Fade',
        'Ext.fx.animation.FadeOut',
        'Ext.fx.animation.Flip',
        'Ext.fx.animation.Pop',
        'Ext.fx.animation.PopOut'
//        'Ext.fx.animation.Cube'
    ],

    constructor: function(config) {
        var defaultClass = Ext.fx.animation.Abstract,
            type;

        if (typeof config == 'string') {
            type = config;
            config = {};
        }
        else if (config && config.type) {
            type = config.type;
        }

        if (type) {
            if (Ext.os.is.Android2) {
                if (type == 'pop') {
                    type = 'fade';
                }
                if (type == 'popIn') {
                    type = 'fadeIn';
                }
                if (type == 'popOut') {
                    type = 'fadeOut';
                }
            }
            defaultClass = Ext.ClassManager.getByAlias('animation.' + type);

        }

        return Ext.factory(config, defaultClass);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.runner.Css', {
    extend: 'Ext.Evented',

    requires: [
        'Ext.fx.Animation'
    ],

    prefixedProperties: {
        'transform'                 : true,
        'transform-origin'          : true,
        'perspective'               : true,
        'transform-style'           : true,
        'transition'                : true,
        'transition-property'       : true,
        'transition-duration'       : true,
        'transition-timing-function': true,
        'transition-delay'          : true,
        'animation'                 : true,
        'animation-name'            : true,
        'animation-duration'        : true,
        'animation-iteration-count' : true,
        'animation-direction'       : true,
        'animation-timing-function' : true,
        'animation-delay'           : true
    },

    lengthProperties: {
        'top'                : true,
        'right'              : true,
        'bottom'             : true,
        'left'               : true,
        'width'              : true,
        'height'             : true,
        'max-height'         : true,
        'max-width'          : true,
        'min-height'         : true,
        'min-width'          : true,
        'margin-bottom'      : true,
        'margin-left'        : true,
        'margin-right'       : true,
        'margin-top'         : true,
        'padding-bottom'     : true,
        'padding-left'       : true,
        'padding-right'      : true,
        'padding-top'        : true,
        'border-bottom-width': true,
        'border-left-width'  : true,
        'border-right-width' : true,
        'border-spacing'     : true,
        'border-top-width'   : true,
        'border-width'       : true,
        'outline-width'      : true,
        'letter-spacing'     : true,
        'line-height'        : true,
        'text-indent'        : true,
        'word-spacing'       : true,
        'font-size'          : true,
        'translate'          : true,
        'translateX'         : true,
        'translateY'         : true,
        'translateZ'         : true,
        'translate3d'        : true
    },

    durationProperties: {
        'transition-duration'   : true,
        'transition-delay'      : true,
        'animation-duration'    : true,
        'animation-delay'       : true
    },

    angleProperties: {
        rotate     : true,
        rotateX    : true,
        rotateY    : true,
        rotateZ    : true,
        skew       : true,
        skewX      : true,
        skewY      : true
    },

    lengthUnitRegex: /([a-z%]*)$/,

    DEFAULT_UNIT_LENGTH: 'px',

    DEFAULT_UNIT_ANGLE: 'deg',

    DEFAULT_UNIT_DURATION: 'ms',

    formattedNameCache: {},

    constructor: function() {
        var supports3dTransform = Ext.feature.has.Css3dTransforms;

        if (supports3dTransform) {
            this.transformMethods = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY', 'scaleX', 'scaleY', 'scaleZ'];
        }
        else {
            this.transformMethods = ['translateX', 'translateY', 'rotate', 'skewX', 'skewY', 'scaleX', 'scaleY'];
        }

        this.vendorPrefix = Ext.browser.getStyleDashPrefix();

        this.ruleStylesCache = {};

        return this;
    },

    getStyleSheet: function() {
        var styleSheet = this.styleSheet,
            styleElement, styleSheets;

        if (!styleSheet) {
            styleElement = document.createElement('style');
            styleElement.type = 'text/css';

            (document.head || document.getElementsByTagName('head')[0]).appendChild(styleElement);

            styleSheets = document.styleSheets;

            this.styleSheet = styleSheet = styleSheets[styleSheets.length - 1];
        }

        return styleSheet;
    },

    applyRules: function(selectors) {
        var styleSheet = this.getStyleSheet(),
            ruleStylesCache = this.ruleStylesCache,
            rules = styleSheet.cssRules,
            selector, properties, ruleStyle,
            ruleStyleCache, rulesLength, name, value;

        for (selector in selectors) {
            properties = selectors[selector];

            ruleStyle = ruleStylesCache[selector];

            if (ruleStyle === undefined) {
                rulesLength = rules.length;
                styleSheet.insertRule(selector + '{}', rulesLength);
                ruleStyle = ruleStylesCache[selector] = rules.item(rulesLength).style;
            }

            ruleStyleCache = ruleStyle.$cache;

            if (!ruleStyleCache) {
                ruleStyleCache = ruleStyle.$cache = {};
            }

            for (name in properties) {
                value = this.formatValue(properties[name], name);
                name = this.formatName(name);

                if (ruleStyleCache[name] !== value) {
                    ruleStyleCache[name] = value;
//                    console.log(name + " " + value);

                    if (value === null) {
                        ruleStyle.removeProperty(name);
                    }
                    else {
                        ruleStyle.setProperty(name, value, 'important');
                    }
                }
            }
        }

        return this;
    },

    applyStyles: function(styles) {
        var id, element, elementStyle, properties, name, value;

        for (id in styles) {
//            console.log("-> ["+id+"]", "APPLY======================");
            element = document.getElementById(id);

            if (!element) {
                return this;
            }

            elementStyle = element.style;

            properties = styles[id];

            for (name in properties) {
                value = this.formatValue(properties[name], name);
                name = this.formatName(name);

//                console.log("->-> ["+id+"]", name, value);

                if (value === null) {
                    elementStyle.removeProperty(name);
                }
                else {
                    elementStyle.setProperty(name, value, 'important');
                }
            }
        }

        return this;
    },

    formatName: function(name) {
        var cache = this.formattedNameCache,
            formattedName = cache[name];

        if (!formattedName) {
            if (this.prefixedProperties[name]) {
                formattedName = this.vendorPrefix + name;
            }
            else {
                formattedName = name;
            }

            cache[name] = formattedName;
        }

        return formattedName;
    },

    formatValue: function(value, name) {
        var type = typeof value,
            lengthUnit = this.DEFAULT_UNIT_LENGTH,
            transformMethods,
            method, i, ln,
            transformValues, values, unit;

        if (type == 'string') {
            if (this.lengthProperties[name]) {
                unit = value.match(this.lengthUnitRegex)[1];

                if (unit.length > 0) {
                }
                else {
                    return value + lengthUnit;
                }
            }

            return value;
        }
        else if (type == 'number') {
            if (value == 0) {
                return '0';
            }

            if (this.lengthProperties[name]) {
                return value + lengthUnit;
            }

            if (this.angleProperties[name]) {
                return value + this.DEFAULT_UNIT_ANGLE;
            }

            if (this.durationProperties[name]) {
                return value + this.DEFAULT_UNIT_DURATION;
            }
        }
        else if (name === 'transform') {
            transformMethods = this.transformMethods;
            transformValues = [];

            for (i = 0,ln = transformMethods.length; i < ln; i++) {
                method = transformMethods[i];

                transformValues.push(method + '(' + this.formatValue(value[method], method) + ')');
            }

            return transformValues.join(' ');
        }
        else if (Ext.isArray(value)) {
            values = [];

            for (i = 0,ln = value.length; i < ln; i++) {
                values.push(this.formatValue(value[i], name));
            }

            return (values.length > 0) ? values.join(', ') : 'none';
        }

        return value;
    }
});

/**
 * @author Jacky Nguyen <jacky@sencha.com>
 * @private
 */
Ext.define('Ext.fx.runner.CssTransition', {
    extend: 'Ext.fx.runner.Css',

    listenersAttached: false,

    constructor: function() {
        this.runningAnimationsData = {};

        return this.callParent(arguments);
    },

    attachListeners: function() {
        this.listenersAttached = true;
        this.getEventDispatcher().addListener('element', '*', 'transitionend', 'onTransitionEnd', this);
    },

    onTransitionEnd: function(e) {
        var target = e.target,
            id = target.id;

        if (id && this.runningAnimationsData.hasOwnProperty(id)) {
            this.refreshRunningAnimationsData(Ext.get(target), [e.browserEvent.propertyName]);
        }
    },

    onAnimationEnd: function(element, data, animation, isInterrupted, isReplaced) {
        var id = element.getId(),
            runningData = this.runningAnimationsData[id],
            endRules = {},
            endData = {},
            runningNameMap, toPropertyNames, i, ln, name;

        animation.un('stop', 'onAnimationStop', this);

        if (runningData) {
            runningNameMap = runningData.nameMap;
        }

        endRules[id] = endData;

        if (data.onBeforeEnd) {
            data.onBeforeEnd.call(data.scope || this, element, isInterrupted);
        }

        animation.fireEvent('animationbeforeend', animation, element, isInterrupted);
        this.fireEvent('animationbeforeend', this, animation, element, isInterrupted);

        if (isReplaced || (!isInterrupted && !data.preserveEndState)) {
            toPropertyNames = data.toPropertyNames;

            for (i = 0,ln = toPropertyNames.length; i < ln; i++) {
                name = toPropertyNames[i];

                if (runningNameMap && !runningNameMap.hasOwnProperty(name)) {
                    endData[name] = null;
                }
            }
        }

        if (data.after) {
            Ext.merge(endData, data.after);
        }

        this.applyStyles(endRules);

        if (data.onEnd) {
            data.onEnd.call(data.scope || this, element, isInterrupted);
        }

        animation.fireEvent('animationend', animation, element, isInterrupted);
        this.fireEvent('animationend', this, animation, element, isInterrupted);
    },

    onAllAnimationsEnd: function(element) {
        var id = element.getId(),
            endRules = {};

        delete this.runningAnimationsData[id];

        endRules[id] = {
            'transition-property': null,
            'transition-duration': null,
            'transition-timing-function': null,
            'transition-delay': null
        };

        this.applyStyles(endRules);
        this.fireEvent('animationallend', this, element);
    },

    hasRunningAnimations: function(element) {
        var id = element.getId(),
            runningAnimationsData = this.runningAnimationsData;

        return runningAnimationsData.hasOwnProperty(id) && runningAnimationsData[id].sessions.length > 0;
    },

    refreshRunningAnimationsData: function(element, propertyNames, interrupt, replace) {
        var id = element.getId(),
            runningAnimationsData = this.runningAnimationsData,
            runningData = runningAnimationsData[id];

        if (!runningData) {
            return;
        }

        var nameMap = runningData.nameMap,
            nameList = runningData.nameList,
            sessions = runningData.sessions,
            ln, j, subLn, name,
            i, session, map, list,
            hasCompletedSession = false;

        interrupt = Boolean(interrupt);
        replace = Boolean(replace);

        if (!sessions) {
            return this;
        }

        ln = sessions.length;

        if (ln === 0) {
            return this;
        }

        if (replace) {
            runningData.nameMap = {};
            nameList.length = 0;

            for (i = 0; i < ln; i++) {
                session = sessions[i];
                this.onAnimationEnd(element, session.data, session.animation, interrupt, replace);
            }

            sessions.length = 0;
        }
        else {
            for (i = 0; i < ln; i++) {
                session = sessions[i];
                map = session.map;
                list = session.list;

                for (j = 0,subLn = propertyNames.length; j < subLn; j++) {
                    name = propertyNames[j];

                    if (map[name]) {
                        delete map[name];
                        Ext.Array.remove(list, name);
                        session.length--;
                        if (--nameMap[name] == 0) {
                            delete nameMap[name];
                            Ext.Array.remove(nameList, name);
                        }
                    }
                }

                if (session.length == 0) {
                    sessions.splice(i, 1);
                    i--;
                    ln--;

                    hasCompletedSession = true;
                    this.onAnimationEnd(element, session.data, session.animation, interrupt);
                }
            }
        }

        if (!replace && !interrupt && sessions.length == 0 && hasCompletedSession) {
            this.onAllAnimationsEnd(element);
        }
    },

    getRunningData: function(id) {
        var runningAnimationsData = this.runningAnimationsData;

        if (!runningAnimationsData.hasOwnProperty(id)) {
            runningAnimationsData[id] = {
                nameMap: {},
                nameList: [],
                sessions: []
            };
        }

        return runningAnimationsData[id];
    },

    getTestElement: function() {
        var testElement = this.testElement,
            iframe, iframeDocument, iframeStyle;

        if (!testElement) {
            iframe = document.createElement('iframe');
            iframeStyle = iframe.style;
            iframeStyle.setProperty('visibility', 'hidden', 'important');
            iframeStyle.setProperty('width', '0px', 'important');
            iframeStyle.setProperty('height', '0px', 'important');
            iframeStyle.setProperty('position', 'absolute', 'important');
            iframeStyle.setProperty('border', '0px', 'important');
            iframeStyle.setProperty('zIndex', '-1000', 'important');

            document.body.appendChild(iframe);
            iframeDocument = iframe.contentDocument;

            iframeDocument.open();
            iframeDocument.writeln('</body>');
            iframeDocument.close();

            this.testElement = testElement = iframeDocument.createElement('div');
            testElement.style.setProperty('position', 'absolute', '!important');
            iframeDocument.body.appendChild(testElement);
            this.testElementComputedStyle = window.getComputedStyle(testElement);
        }

        return testElement;
    },

    getCssStyleValue: function(name, value) {
        var testElement = this.getTestElement(),
            computedStyle = this.testElementComputedStyle,
            style = testElement.style;

        style.setProperty(name, value);
        value = computedStyle.getPropertyValue(name);
        style.removeProperty(name);

        return value;
    },

    run: function(animations) {
        var me = this,
            isLengthPropertyMap = this.lengthProperties,
            fromData = {},
            toData = {},
            data = {},
            element, elementId, from, to, before,
            fromPropertyNames, toPropertyNames,
            doApplyTo, message,
            runningData,
            i, j, ln, animation, propertiesLength, sessionNameMap,
            computedStyle, formattedName, name, toFormattedValue,
            computedValue, fromFormattedValue, isLengthProperty,
            runningNameMap, runningNameList, runningSessions, runningSession;

        if (!this.listenersAttached) {
            this.attachListeners();
        }

        animations = Ext.Array.from(animations);

        for (i = 0,ln = animations.length; i < ln; i++) {
            animation = animations[i];
            animation = Ext.factory(animation, Ext.fx.Animation);
            element = animation.getElement();

            computedStyle = window.getComputedStyle(element.dom);

            elementId = element.getId();

            data = Ext.merge({}, animation.getData());

            if (animation.onBeforeStart) {
                animation.onBeforeStart.call(animation.scope || this, element);
            }
            animation.fireEvent('animationstart', animation);
            this.fireEvent('animationstart', this, animation);

            data[elementId] = data;

            before = data.before;
            from = data.from;
            to = data.to;

            data.fromPropertyNames = fromPropertyNames = [];
            data.toPropertyNames = toPropertyNames = [];

            for (name in to) {
                if (to.hasOwnProperty(name)) {
                    to[name] = toFormattedValue = this.formatValue(to[name], name);
                    formattedName = this.formatName(name);
                    isLengthProperty = isLengthPropertyMap.hasOwnProperty(name);

                    if (!isLengthProperty) {
                        toFormattedValue = this.getCssStyleValue(formattedName, toFormattedValue);
                    }

                    if (from.hasOwnProperty(name)) {
                        from[name] = fromFormattedValue = this.formatValue(from[name], name);

                        if (!isLengthProperty) {
                            fromFormattedValue = this.getCssStyleValue(formattedName, fromFormattedValue);
                        }

                        if (toFormattedValue !== fromFormattedValue) {
                            fromPropertyNames.push(formattedName);
                            toPropertyNames.push(formattedName);
                        }
                    }
                    else {
                        computedValue = computedStyle.getPropertyValue(formattedName);

                        if (toFormattedValue !== computedValue) {
                            toPropertyNames.push(formattedName);
                        }
                    }
                }
            }

            propertiesLength = toPropertyNames.length;

            if (propertiesLength === 0) {
                this.onAnimationEnd(element, data, animation);
                continue;
            }

            runningData = this.getRunningData(elementId);
            runningSessions = runningData.sessions;

            if (runningSessions.length > 0) {
                this.refreshRunningAnimationsData(
                    element, Ext.Array.merge(fromPropertyNames, toPropertyNames), true, data.replacePrevious
                );
            }

            runningNameMap = runningData.nameMap;
            runningNameList = runningData.nameList;

            sessionNameMap = {};
            for (j = 0; j < propertiesLength; j++) {
                name = toPropertyNames[j];
                sessionNameMap[name] = true;

                if (!runningNameMap.hasOwnProperty(name)) {
                    runningNameMap[name] = 1;
                    runningNameList.push(name);
                }
                else {
                    runningNameMap[name]++;
                }
            }

            runningSession = {
                element: element,
                map: sessionNameMap,
                list: toPropertyNames.slice(),
                length: propertiesLength,
                data: data,
                animation: animation
            };
            runningSessions.push(runningSession);

            animation.on('stop', 'onAnimationStop', this);

            fromData[elementId] = from = Ext.apply(Ext.Object.chain(before), from);

            if (runningNameList.length > 0) {
                fromPropertyNames = Ext.Array.difference(runningNameList, fromPropertyNames);
                toPropertyNames = Ext.Array.merge(fromPropertyNames, toPropertyNames);
                from['transition-property'] = fromPropertyNames;
            }

            toData[elementId] = to = Ext.Object.chain(to);

            to['transition-property'] = toPropertyNames;
            to['transition-duration'] = data.duration;
            to['transition-timing-function'] = data.easing;
            to['transition-delay'] = data.delay;

            animation.startTime = Date.now();
        }

        message = this.$className;

        this.applyStyles(fromData);

        doApplyTo = function(e) {
            if (e.data === message && e.source === window) {
                window.removeEventListener('message', doApplyTo, false);
                me.applyStyles(toData);
            }
        };

        window.addEventListener('message', doApplyTo, false);
        window.postMessage(message, '*');
    },

    onAnimationStop: function(animation) {
        var runningAnimationsData = this.runningAnimationsData,
            id, runningData, sessions, i, ln, session;

        for (id in runningAnimationsData) {
            if (runningAnimationsData.hasOwnProperty(id)) {
                runningData = runningAnimationsData[id];
                sessions = runningData.sessions;

                for (i = 0,ln = sessions.length; i < ln; i++) {
                    session = sessions[i];
                    if (session.animation === animation) {
                        this.refreshRunningAnimationsData(session.element, session.list.slice(), false);
                    }
                }
            }
        }
    }
});

/**
 * @class Ext.fx.Runner
 * @private
 */
Ext.define('Ext.fx.Runner', {
    requires: [
        'Ext.fx.runner.CssTransition'
//        'Ext.fx.runner.CssAnimation'
    ],

    constructor: function() {
        return new Ext.fx.runner.CssTransition();
    }
});

/**
 * A simple class used to mask any {@link Ext.Container}.
 *
 * This should rarely be used directly, instead look at the {@link Ext.Container#masked} configuration.
 *
 * ## Example
 *
 *     @example miniphone
 *     // Create our container
 *     var container = Ext.create('Ext.Container', {
 *         html: 'My container!'
 *     });
 *
 *     // Add the container to the Viewport
 *     Ext.Viewport.add(container);
 *
 *     // Mask the container
 *     container.setMasked(true);
 */
Ext.define('Ext.Mask', {
    extend: 'Ext.Component',
    xtype: 'mask',

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'mask',

        /**
         * @cfg {Boolean} transparent True to make this mask transparent.
         */
        transparent: false,

        /**
         * @cfg
         * @hide
         */
        top: 0,

        /**
         * @cfg
         * @hide
         */
        left: 0,

        /**
         * @cfg
         * @hide
         */
        right: 0,

        /**
         * @cfg
         * @hide
         */
        bottom: 0
    },

    /**
     * @event tap
     * A tap event fired when a user taps on this mask
     * @param {Ext.Mask} this The mask instance
     * @param {Ext.EventObject} e The event object
     */
    initialize: function() {
        this.callParent();

        this.on({
            painted: 'onPainted',
            erased: 'onErased'
        })
    },

    onPainted: function() {
        this.element.on('*', 'onEvent', this);
    },

    onErased: function() {
        this.element.un('*', 'onEvent', this);
    },

    onEvent: function(e) {
        var controller = arguments[arguments.length - 1];

        if (controller.info.eventName === 'tap') {
            this.fireEvent('tap', this, e);
            return false;
        }

        if (e && e.stopEvent) {
            e.stopEvent();
        }

        return false;
    },

    updateTransparent: function(newTransparent) {
        this[newTransparent ? 'addCls' : 'removeCls'](this.getBaseCls() + '-transparent');
    }
});

(function(clsPrefix) {

/**
 * @aside guide layouts
 * @aside video layouts
 *
 * The Default Layout is the layout that all other layouts inherit from. The main capability it provides is docking,
 * which means that every other layout can also provide docking support. It's unusual to use Default layout directly,
 * instead it's much more common to use one of the sub classes:
 *
 * * {@link Ext.layout.HBox hbox layout}
 * * {@link Ext.layout.VBox vbox layout}
 * * {@link Ext.layout.Card card layout}
 * * {@link Ext.layout.Fit fit layout}
 *
 * For a full overview of layouts check out the [Layout Guide](#!/guide/layouts).
 *
 * ## Docking
 *
 * Docking enables you to place additional Components at the top, right, bottom or left edges of the parent Container,
 * resizing the other items as necessary. For example, let's say we're using an {@link Ext.layout.HBox hbox layout}
 * with a couple of items and we want to add a banner to the top so that we end up with something like this:
 *
 * {@img ../guides/layouts/docktop.jpg}
 *
 * This is simple to achieve with the `docked: 'top'` configuration below. We can dock as many of the items as we like,
 * to either the top, right, bottom or left edges of the Container:
 *
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: 'hbox',
 *         items: [
 *             {
 *                 docked: 'top',
 *                 height: 20,
 *                 html: 'This is docked to the top'
 *             },
 *             {
 *                 html: 'message list',
 *                 flex: 1
 *             },
 *             {
 *                 html: 'message preview',
 *                 flex: 2
 *             }
 *         ]
 *     });
 *
 * Similarly, to dock something to the left of a layout (a {@link Ext.layout.VBox vbox} in this case), such as the
 * following:
 *
 * {@img ../guides/layouts/dockleft.jpg}
 *
 * We can simply dock to the left:
 *
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: 'vbox',
 *         items: [
 *             {
 *                 docked: 'left',
 *                 width: 100,
 *                 html: 'This is docked to the left'
 *             },
 *             {
 *                 html: 'message list',
 *                 flex: 1
 *             },
 *             {
 *                 html: 'message preview',
 *                 flex: 2
 *             }
 *         ]
 *     });
 *
 * We can also dock to the bottom and right and use other layouts than hbox and vbox ({@link Ext.layout.Card card} and
 * {@link Ext.layout.Fit fit} layouts both accept docking too).
 */
Ext.define('Ext.layout.Default', {
    extend: 'Ext.Evented',

    alternateClassName: ['Ext.layout.AutoContainerLayout', 'Ext.layout.ContainerLayout'],

    alias: ['layout.auto', 'layout.default'],

    isLayout: true,

    hasDockedItemsCls: clsPrefix + 'hasdocked',

    centeredItemCls: clsPrefix + 'centered',

    floatingItemCls: clsPrefix + 'floating',

    dockingWrapperCls: clsPrefix + 'docking',

    dockingInnerCls: clsPrefix + 'docking-inner',

    maskCls: clsPrefix + 'mask',

    positionMap: {
        top: 'start',
        left: 'start',
        bottom: 'end',
        right: 'end'
    },

    positionDirectionMap: {
        top: 'vertical',
        bottom: 'vertical',
        left: 'horizontal',
        right: 'horizontal'
    },

    DIRECTION_VERTICAL: 'vertical',

    DIRECTION_HORIZONTAL: 'horizontal',

    POSITION_START: 'start',

    POSITION_END: 'end',

    config: {
        /**
         * @cfg {Ext.fx.layout.Card} animation Layout animation configuration
         * Controls how layout transitions are animated.  Currently only available for
         * Card Layouts
         * @accessor
         */
        animation: null
    },

    constructor: function(container, config) {
        this.container = container;

        this.innerItems = [];

        this.centeringWrappers = {};

        this.initConfig(config);
    },

    reapply: Ext.emptyFn,

    unapply: Ext.emptyFn,

    onItemAdd: function() {
        this.doItemAdd.apply(this, arguments);
    },

    onItemRemove: function() {
        this.doItemRemove.apply(this, arguments);
    },

    onItemMove: function() {
        this.doItemMove.apply(this, arguments);
    },

    onItemCenteredChange: function() {
        this.doItemCenteredChange.apply(this, arguments);
    },

    onItemFloatingChange: function() {
        this.doItemFloatingChange.apply(this, arguments);
    },

    onItemDockedChange: function() {
        this.doItemDockedChange.apply(this, arguments);
    },

    /**
     * @private
     */
    doItemAdd: function(item, index) {
        var docked = item.getDocked();

        if (docked !== null) {
            this.dockItem(item, docked);
        }
        else if (item.isCentered()) {
            this.centerItem(item, index);
        }
        else {
            this.insertItem(item, index);
        }

        if (item.isFloating()) {
            this.onItemFloatingChange(item, true);
        }
    },

    /**
     * @private
     */
    doItemRemove: function(item) {
        if (item.isDocked()) {
            this.undockItem(item);
        }
        else if (item.isCentered()) {
            this.uncenterItem(item);
        }

        if (item.getTranslatable()) {
            item.setTranslatable(false);
        }

        Ext.Array.remove(this.innerItems, item);

        Ext.fly(item.renderElement).destroy();
    },

    /**
     * @private
     */
    doItemMove: function(item, toIndex, fromIndex) {
        if (item.isCentered()) {
            item.setZIndex((toIndex + 1) * 2);
        }
        else {
            if (item.isFloating()) {
                item.setZIndex((toIndex + 1) * 2);
            }
            this.insertItem(item, toIndex);
        }
    },

    /**
     * @private
     */
    doItemCenteredChange: function(item, centered) {
        if (centered) {
            this.centerItem(item);
        }
        else {
            this.uncenterItem(item);
        }
    },

    /**
     * @private
     */
    doItemFloatingChange: function(item, floating) {
        var element = item.element,
            floatingItemCls = this.floatingItemCls;

        if (floating) {
            if (item.getZIndex() === null) {
                item.setZIndex((this.container.indexOf(item) + 1) * 2);
            }
            element.addCls(floatingItemCls);
        }
        else {
            item.setZIndex(null);
            element.removeCls(floatingItemCls);
        }
    },

    /**
     * @private
     */
    doItemDockedChange: function(item, docked, oldDocked) {
        if (oldDocked) {
            this.undockItem(item, oldDocked);
        }

        if (docked) {
            this.dockItem(item, docked);
        }
    },

    centerItem: function(item) {
        this.insertItem(item, 0);

        if (item.getZIndex() === null) {
            item.setZIndex((this.container.indexOf(item) + 1) * 2);
        }

        this.createCenteringWrapper(item);

        // Mainly for styling
        item.element.addCls(this.floatingItemCls);
    },

    uncenterItem: function(item) {
        this.destroyCenteringWrapper(item);
        item.setZIndex(null);
        this.insertItem(item, this.container.indexOf(item));

        // Mainly for styling
        item.element.removeCls(this.floatingItemCls);
    },

    dockItem: function(item, position) {
        var container = this.container,
            itemRenderElement = item.renderElement,
            itemElement = item.element,
            dockingInnerElement = this.dockingInnerElement;

        if (!dockingInnerElement) {
            container.setUseBodyElement(true);
            this.dockingInnerElement = dockingInnerElement = container.bodyElement;
        }

        this.getDockingWrapper(position);

        if (this.positionMap[position] === this.POSITION_START) {
            itemRenderElement.insertBefore(dockingInnerElement);
        }
        else {
            itemRenderElement.insertAfter(dockingInnerElement);
        }

        itemElement.addCls(clsPrefix + 'docked-' + position);
    },

    undockItem: function(item, docked) {
        this.insertItem(item, this.container.indexOf(item));
        item.element.removeCls(clsPrefix + 'docked-' + docked);
    },

    getDockingWrapper: function(position) {
        var currentDockingDirection = this.currentDockingDirection,
            direction = this.positionDirectionMap[position],
            dockingWrapper = this.dockingWrapper;

        if (currentDockingDirection !== direction) {
            this.currentDockingDirection = direction;
            this.dockingWrapper = dockingWrapper = this.createDockingWrapper(direction);
        }

        return dockingWrapper;
    },

    createDockingWrapper: function(direction) {
        return this.dockingInnerElement.wrap({
            classList: [this.dockingWrapperCls + '-' + direction]
        }, true);
    },

    createCenteringWrapper: function(item) {
        var id = item.getId(),
            wrappers = this.centeringWrappers,
            renderElement = item.renderElement,
            wrapper;

        wrappers[id] = wrapper = renderElement.wrap({
            className: this.centeredItemCls
        });

        return wrapper;
    },

    destroyCenteringWrapper: function(item) {
        var id = item.getId(),
            wrappers = this.centeringWrappers,
            renderElement = item.renderElement,
            wrapper = wrappers[id];

        renderElement.unwrap();
        wrapper.destroy();
        delete wrappers[id];

        return this;
    },

    getInnerItemsContainer: function() {
        return this.container.innerElement;
    },

    insertItem: function(item, index) {
       var container = this.container,
           items = container.getItems().items,
           innerItems = this.innerItems,
           containerDom = this.getInnerItemsContainer().dom,
           itemDom = item.renderElement.dom,
           relativeItem, relativeItemDom, domIndex;

       if (container.has(item)) {
           Ext.Array.remove(innerItems, item);
       }

       if (typeof index == 'number') {
           // Retrieve the *logical* relativeItem reference to insertBefore
           relativeItem = items[index];

           // If it is the item itself, get the next sibling
           if (relativeItem === item) {
               relativeItem = items[++index];
           }

           // Continue finding the relativeItem that is neither currently centered nor docked
           while (relativeItem && (relativeItem.isCentered() || relativeItem.isDocked())) {
               relativeItem = items[++index];
           }

           if (relativeItem) {
               // Retrieve the *physical* index of that relativeItem
               domIndex = innerItems.indexOf(relativeItem);

               if (domIndex !== -1) {
                   while (relativeItem && (relativeItem.isCentered() || relativeItem.isDocked())) {
                       relativeItem = innerItems[++domIndex];
                   }

                   if (relativeItem) {
                       innerItems.splice(domIndex, 0, item);

                       relativeItemDom = relativeItem.renderElement.dom;
                       containerDom.insertBefore(itemDom, relativeItemDom);

                       return this;
                   }
               }
           }
       }

       innerItems.push(item);
       containerDom.appendChild(itemDom);

       return this;
   }
});

})(Ext.baseCSSPrefix);

/**
 * @aside guide layouts
 * @aside video layouts
 *
 * AbstractBox is a superclass for the two box layouts:
 *
 * * {@link Ext.layout.HBox hbox}
 * * {@link Ext.layout.VBox vbox}
 *
 * AbstractBox itself is never used directly, but its subclasses provide flexible arrangement of child components
 * inside a {@link Ext.Container Container}. For a full overview of layouts check out the
 * [Layout Guide](#!/guide/layouts).
 *
 * ## Horizontal Box
 *
 * HBox allows you to easily lay out child components horizontally. It can size items based on a fixed width or a
 * fraction of the total width available, enabling you to achieve flexible layouts that expand or contract to fill the
 * space available.
 *
 * {@img ../guides/layouts/hbox.jpg}
 *
 * See the {@link Ext.layout.HBox HBox layout docs} for more information on using hboxes.
 *
 * ## Vertical Box
 *
 * VBox allows you to easily lay out child components verticaly. It can size items based on a fixed height or a
 * fraction of the total height available, enabling you to achieve flexible layouts that expand or contract to fill the
 * space available.
 *
 * {@img ../guides/layouts/vbox.jpg}
 *
 * See the {@link Ext.layout.VBox VBox layout docs} for more information on using vboxes.
 */
Ext.define('Ext.layout.AbstractBox', {
    extend: 'Ext.layout.Default',

    config: {
        /**
         * @cfg {String} align
         * Controls how the child items of the container are aligned. Acceptable configuration values for this property are:
         *
         * - ** start ** : child items are packed together at left side of container
         * - ** center ** : child items are packed together at mid-width of container
         * - ** end ** : child items are packed together at right side of container
         * - **stretch** : child items are stretched vertically to fill the height of the container
         *
         * Please see the 'Pack and Align' section of the [Layout guide](#!/guide/layouts) for a detailed example and
         * explanation.
         * @accessor
         */
        align: 'stretch',

        /**
         * @cfg {String} pack
         * Controls how the child items of the container are packed together. Acceptable configuration values
         * for this property are:
         *
         * - ** start ** : child items are packed together at left side of container
         * - ** center ** : child items are packed together at mid-width of container
         * - ** end ** : child items are packed together at right side of container
         *
         * Please see the 'Pack and Align' section of the [Layout guide](#!/guide/layouts) for a detailed example and
         * explanation.
         * @accessor
         */
        pack: null
    },

    flexItemCls: Ext.baseCSSPrefix + 'layout-box-item',

    positionMap: {
        middle: 'center',
        left: 'start',
        top: 'start',
        right: 'end',
        bottom: 'end'
    },

    constructor: function(container) {
        this.callParent(arguments);

        container.innerElement.addCls(this.cls);

        container.on(this.sizeChangeEventName, 'onItemSizeChange', this, {
            delegate: '> component'
        });
    },

    reapply: function() {
        this.container.innerElement.addCls(this.cls);

        this.updatePack(this.getPack());
        this.updateAlign(this.getAlign());
    },

    unapply: function() {
        this.container.innerElement.removeCls(this.cls);

        this.updatePack(null);
        this.updateAlign(null);
    },

    /**
     * @private
     */
    doItemAdd: function(item, index) {
        this.callParent(arguments);

        if (item.isInnerItem()) {
            var size = item.getConfig(this.sizePropertyName),
                config = item.config;

            if (!size && ('flex' in config)) {
                this.setItemFlex(item, config.flex);
            }
        }
    },

    /**
     * @private
     */
    doItemRemove: function(item) {
        if (item.isInnerItem()) {
            this.setItemFlex(item, null);
        }

        this.callParent(arguments);
    },

    onItemSizeChange: function(item) {
        this.setItemFlex(item, null);
    },

    /**
     * @private
     */
    doItemCenteredChange: function(item, centered) {
        if (centered) {
            this.setItemFlex(item, null);
        }

        this.callParent(arguments);
    },

    /**
     * @private
     */
    doItemFloatingChange: function(item, floating) {
        if (floating) {
            this.setItemFlex(item, null);
        }

        this.callParent(arguments);
    },

    /**
     * @private
     */
    doItemDockedChange: function(item, docked) {
        if (docked) {
            this.setItemFlex(item, null);
        }

        this.callParent(arguments);
    },

    redrawContainer: function() {
        var container = this.container,
            renderedTo = container.renderElement.dom.parentNode;

        if (renderedTo && renderedTo.nodeType !== 11) {
            container.innerElement.redraw();
        }
    },

    /**
     * Sets the flex of an item in this box layout.
     * @param {Ext.Component} item The item of this layout which you want to update the flex of.
     * @param {Number} flex The flex to set on this method
     */
    setItemFlex: function(item, flex) {
        var element = item.element,
            flexItemCls = this.flexItemCls;

        if (flex) {
            element.addCls(flexItemCls);
        }
        else if (element.hasCls(flexItemCls)) {
            this.redrawContainer();
            element.removeCls(flexItemCls);
        }

        element.dom.style.webkitBoxFlex = flex;
    },

    convertPosition: function(position) {
        if (this.positionMap.hasOwnProperty(position)) {
            return this.positionMap[position];
        }

        return position;
    },

    applyAlign: function(align) {
        return this.convertPosition(align);
    },

    updateAlign: function(align) {
        this.container.innerElement.dom.style.webkitBoxAlign = align;
    },

    applyPack: function(pack) {
         return this.convertPosition(pack);
    },

    updatePack: function(pack) {
        this.container.innerElement.dom.style.webkitBoxPack = pack;
    }
});

/**
 * Represents a single sorter that can be used as part of the sorters configuration in Ext.mixin.Sortable.
 *
 * A common place for Sorters to be used are {@link Ext.data.Store Stores}. For example:
 *
 *     @example miniphone
 *     var store = Ext.create('Ext.data.Store', {
 *        fields: ['firstName', 'lastName'],
 *        sorters: 'lastName',
 *
 *        data: [
 *            { firstName: 'Tommy',   lastName: 'Maintz' },
 *            { firstName: 'Rob',     lastName: 'Dougan' },
 *            { firstName: 'Ed',      lastName: 'Spencer'},
 *            { firstName: 'Jamie',   lastName: 'Avins'  },
 *            { firstName: 'Nick',    lastName: 'Poulden'}
 *        ]
 *     });
 *
 *     Ext.create('Ext.List', {
 *        fullscreen: true,
 *        itemTpl: '<div class="contact">{firstName} <strong>{lastName}</strong></div>',
 *        store: store
 *     });
 *
 * In the next example, we specify a custom sorter function:
 *
 *     @example miniphone
 *     var store = Ext.create('Ext.data.Store', {
 *         fields: ['person'],
 *         sorters: [
 *             {
 *                 // Sort by first letter of last name, in descending order
 *                 sorterFn: function(record1, record2) {
 *                     var name1 = record1.data.person.name.split('-')[1].substr(0, 1),
 *                         name2 = record2.data.person.name.split('-')[1].substr(0, 1);
 *
 *                     return name1 > name2 ? 1 : (name1 == name2 ? 0 : -1);
 *                 },
 *                 direction: 'DESC'
 *             }
 *         ],
 *         data: [
 *             { person: { name: 'Tommy-Maintz' } },
 *             { person: { name: 'Rob-Dougan'   } },
 *             { person: { name: 'Ed-Spencer'   } },
 *             { person: { name: 'Nick-Poulden' } },
 *             { person: { name: 'Jamie-Avins'  } }
 *         ]
 *     });
 *
 *     Ext.create('Ext.List', {
 *         fullscreen: true,
 *         itemTpl: '{person.name}',
 *         store: store
 *     });
 */
Ext.define('Ext.util.Sorter', {
    isSorter: true,

    config: {
        /**
         * @cfg {String} property The property to sort by. Required unless `sorterFn` is provided
         */
        property: null,

        /**
         * @cfg {Function} sorterFn A specific sorter function to execute. Can be passed instead of {@link #property}.
         * This function should compare the two passed arguments, returning -1, 0 or 1 depending on if item 1 should be
         * sorted before, at the same level, or after item 2.
         *
         *     sorterFn: function(person1, person2) {
         *         return (person1.age > person2.age) ? 1 : (person1.age == person2.age ? 0 : -1);
         *     }
         */
        sorterFn: null,

        /**
         * @cfg {String} root Optional root property. This is mostly useful when sorting a Store, in which case we set the
         * root to 'data' to make the filter pull the {@link #property} out of the data object of each item
         */
        root: null,

        /**
         * @cfg {Function} transform A function that will be run on each value before
         * it is compared in the sorter. The function will receive a single argument,
         * the value.
         */
        transform: null,

        /**
         * @cfg {String} direction The direction to sort by.
         */
        direction: "ASC",

        /**
         * @cfg {Mixed} id An optional id this sorter can be keyed by in Collections. If
         * no id is specified it will use the property name used in this Sorter. If no
         * property is specified, e.g. when adding a custom sorter function we will generate
         * a random id.
         */
        id: undefined
    },

    constructor: function(config) {
        this.initConfig(config);
    },


    applyId: function(id) {
        if (!id) {
            id = this.getProperty();
            if (!id) {
                id = Ext.id(null, 'ext-sorter-');
            }
        }

        return id;
    },

    /**
     * @private
     * Creates and returns a function which sorts an array by the given property and direction
     * @return {Function} A function which sorts by the property/direction combination provided
     */
    createSortFunction: function(sorterFn) {
        var me        = this,
            modifier  = me.getDirection().toUpperCase() == "DESC" ? -1 : 1;

        //create a comparison function. Takes 2 objects, returns 1 if object 1 is greater,
        //-1 if object 2 is greater or 0 if they are equal
        return function(o1, o2) {
            return modifier * sorterFn.call(me, o1, o2);
        };
    },

    /**
     * @private
     * Basic default sorter function that just compares the defined property of each object
     */
    defaultSortFn: function(item1, item2) {
        var me = this,
            transform = me._transform,
            root = me._root,
            value1, value2,
            property = me._property;

        if (root !== null) {
            item1 = item1[root];
            item2 = item2[root];
        }

        value1 = item1[property];
        value2 = item2[property];

        if (transform) {
            value1 = transform(value1);
            value2 = transform(value2);
        }

        return value1 > value2 ? 1 : (value1 < value2 ? -1 : 0);
    },

    updateDirection: function() {
        this.updateSortFn();
    },

    updateSortFn: function() {
        this.sort = this.createSortFunction(this.getSorterFn() || this.defaultSortFn);
    },

    /**
     * Toggles the direction of this Sorter. Note that when you call this function,
     * the Collection this Sorter is part of does not get refreshed automatically.
     */
    toggle: function() {
        this.setDirection(Ext.String.toggle(this.getDirection(), "ASC", "DESC"));
    }
});

/**
 * Represents a filter that can be applied to a {@link Ext.util.MixedCollection MixedCollection}. Can either simply
 * filter on a property/value pair or pass in a filter function with custom logic. Filters are always used in the
 * context of MixedCollections, though {@link Ext.data.Store Store}s frequently create them when filtering and searching
 * on their records. Example usage:
 *
 *     // Set up a fictional MixedCollection containing a few people to filter on
 *     var allNames = new Ext.util.MixedCollection();
 *     allNames.addAll([
 *         { id: 1, name: 'Ed',    age: 25 },
 *         { id: 2, name: 'Jamie', age: 37 },
 *         { id: 3, name: 'Abe',   age: 32 },
 *         { id: 4, name: 'Aaron', age: 26 },
 *         { id: 5, name: 'David', age: 32 }
 *     ]);
 *
 *     var ageFilter = new Ext.util.Filter({
 *         property: 'age',
 *         value   : 32
 *     });
 *
 *     var longNameFilter = new Ext.util.Filter({
 *         filterFn: function(item) {
 *             return item.name.length > 4;
 *         }
 *     });
 *
 *     // a new MixedCollection with the 3 names longer than 4 characters
 *     var longNames = allNames.filter(longNameFilter);
 *
 *     // a new MixedCollection with the 2 people of age 24:
 *     var youngFolk = allNames.filter(ageFilter);
 */
Ext.define('Ext.util.Filter', {
    isFilter: true,

    config: {
        /**
         * @cfg {String} [property=null]
         * The property to filter on. Required unless a `filter` is passed
         */
        property: null,

        /**
         * @cfg {RegExp/Mixed} [value=null]
         * The value you want to match against. Can be a regular expression which will be used as matcher or any other
         * value.
         */
        value: null,

        /**
         * @cfg {Function} filterFn
         * A custom filter function which is passed each item in the {@link Ext.util.MixedCollection} in turn. Should
         * return true to accept each item or false to reject it
         */
        filterFn: Ext.emptyFn,

        /**
         * @cfg {Boolean} [anyMatch=false]
         * True to allow any match - no regex start/end line anchors will be added.
         */
        anyMatch: false,

        /**
         * @cfg {Boolean} [exactMatch=false]
         * True to force exact match (^ and $ characters added to the regex). Ignored if anyMatch is true.
         */
        exactMatch: false,

        /**
         * @cfg {Boolean} [caseSensitive=false]
         * True to make the regex case sensitive (adds 'i' switch to regex).
         */
        caseSensitive: false,

        /**
         * @cfg {String} [root=null]
         * Optional root property. This is mostly useful when filtering a Store, in which case we set the root to 'data'
         * to make the filter pull the {@link #property} out of the data object of each item
         */
        root: null,

        /**
         * @cfg {String} id
         * An optional id this filter can be keyed by in Collections. If no id is specified it will generate an id by
         * first trying a combination of property-value, and if none if these were specified (like when having a
         * filterFn) it will generate a random id.
         */
        id: undefined,

        /**
         * @cfg {Object} [scope=null]
         * The scope in which to run the filterFn
         */
        scope: null
    },

    applyId: function(id) {
        if (!id) {
            if (this.getProperty()) {
                id = this.getProperty() + '-' + String(this.getValue());
            }
            if (!id) {
                id = Ext.id(null, 'ext-filter-');
            }
        }

        return id;
    },

    /**
     * Creates new Filter.
     * @param {Object} config Config object
     */
    constructor: function(config) {
        this.initConfig(config);
    },

    applyFilterFn: function(filterFn) {
        if (filterFn === Ext.emptyFn) {
            filterFn = this.getInitialConfig('filter');
            if (filterFn) {
                return filterFn;
            }

            var value = this.getValue();
            if (!this.getProperty() && !value && value !== 0) {
                return Ext.emptyFn;
            }
            else {
                return this.createFilterFn();
            }
        }
        return filterFn;
    },

    /**
     * @private
     * Creates a filter function for the configured property/value/anyMatch/caseSensitive options for this Filter
     */
    createFilterFn: function() {
        var me       = this,
            matcher  = me.createValueMatcher();

        return function(item) {
            var root     = me.getRoot(),
                property = me.getProperty();

            if (root) {
                item = item[root];
            }

            return matcher.test(item[property]);
        };
    },

    /**
     * @private
     * Returns a regular expression based on the given value and matching options
     */
    createValueMatcher: function() {
        var me            = this,
            value         = me.getValue(),
            anyMatch      = me.getAnyMatch(),
            exactMatch    = me.getExactMatch(),
            caseSensitive = me.getCaseSensitive(),
            escapeRe      = Ext.String.escapeRegex;

        if (value === null || value === undefined || !value.exec) { // not a regex
            value = String(value);

            if (anyMatch === true) {
                value = escapeRe(value);
            } else {
                value = '^' + escapeRe(value);
                if (exactMatch === true) {
                    value += '$';
                }
            }
            value = new RegExp(value, caseSensitive ? '' : 'i');
         }

         return value;
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.easing.EaseOut', {
    extend: 'Ext.fx.easing.Linear',

    alias: 'easing.ease-out',

    config: {
        exponent: 4,
        duration: 1500
    },

    getValue: function() {
        var deltaTime = Ext.Date.now() - this.getStartTime(),
            duration = this.getDuration(),
            startValue = this.getStartValue(),
            endValue = this.getEndValue(),
            distance = this.distance,
            theta = deltaTime / duration,
            thetaC = 1 - theta,
            thetaEnd = 1 - Math.pow(thetaC, this.getExponent()),
            currentValue = startValue + (thetaEnd * distance);

        if (deltaTime >= duration) {
            this.isEnded = true;
            return endValue;
        }

        return currentValue;
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Abstract', {
    extend: 'Ext.Evented',
    isAnimation: true,

    config: {
        direction: 'left',

        duration: null,

        reverse: null,

        layout: null
    },

    updateLayout: function() {
        this.enable();
    },

    enable: function() {
        var layout = this.getLayout();

        if (layout) {
            layout.onBefore('activeitemchange', 'onActiveItemChange', this);
        }
    },

    disable: function() {
        var layout = this.getLayout();

        if (this.isAnimating) {
            this.stopAnimation();
        }

        if (layout) {
            layout.unBefore('activeitemchange', 'onActiveItemChange', this);
        }
    },

    onActiveItemChange: Ext.emptyFn,

    destroy: function() {
        var layout = this.getLayout();

        if (this.isAnimating) {
            this.stopAnimation();
        }

        if (layout) {
            layout.unBefore('activeitemchange', 'onActiveItemChange', this);
        }
        this.setLayout(null);
    }
});

/**
 * @private
 */
Ext.define('Ext.scroll.indicator.Abstract', {
    extend: 'Ext.Component',

    config: {
        baseCls: 'x-scroll-indicator',

        axis: 'x',

        value: 0,

        length: null,

        minLength: 6,

        hidden: true,

        ui: 'dark'
    },

    cachedConfig: {
        ratio: 1,

        barCls: 'x-scroll-bar',

        active: true
    },

    barElement: null,

    barLength: 0,

    gapLength: 0,

    getElementConfig: function() {
        return {
            reference: 'barElement',
            children: [this.callParent()]
        };
    },

    applyRatio: function(ratio) {
        if (isNaN(ratio)) {
            ratio = 1;
        }

        return ratio;
    },

    refresh: function() {
        var bar = this.barElement,
            barDom = bar.dom,
            ratio = this.getRatio(),
            axis = this.getAxis(),
            barLength = (axis === 'x') ? barDom.offsetWidth : barDom.offsetHeight,
            length = barLength * ratio;

        this.barLength = barLength;

        this.gapLength = barLength - length;

        this.setLength(length);

        this.updateValue(this.getValue());
    },

    updateBarCls: function(barCls) {
        this.barElement.addCls(barCls);
    },

    updateAxis: function(axis) {
        this.element.addCls(this.getBaseCls(), null, axis);
        this.barElement.addCls(this.getBarCls(), null, axis);
    },

    updateValue: function(value) {
        this.setOffset(this.gapLength * value);
    },

    updateActive: function(active) {
        this.barElement[active ? 'addCls' : 'removeCls']('active');
    },

    doSetHidden: function(hidden) {
        var elementDomStyle = this.element.dom.style;

        if (hidden) {
            elementDomStyle.opacity = '0';
        }
        else {
            elementDomStyle.opacity = '';
        }
    },

    applyLength: function(length) {
        return Math.max(this.getMinLength(), length);
    },

    updateLength: function(length) {
        var axis = this.getAxis(),
            element = this.element;

        if (axis === 'x') {
            element.setWidth(length);
        }
        else {
            element.setHeight(length);
        }
    },

    setOffset: function(offset) {
        var axis = this.getAxis(),
            element = this.element;

        if (axis === 'x') {
            element.setLeft(offset);
        }
        else {
            element.setTop(offset);
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.easing.Momentum', {

    extend: 'Ext.fx.easing.Abstract',

    config: {
        acceleration: 30,
        friction: 0,
        startVelocity: 0
    },

    alpha: 0,

    updateFriction: function(friction) {
        var theta = Math.log(1 - (friction / 10));

        this.theta = theta;

        this.alpha = theta / this.getAcceleration();
    },

    updateStartVelocity: function(velocity) {
        this.velocity = velocity * this.getAcceleration();
    },

    updateAcceleration: function(acceleration) {
        this.velocity = this.getStartVelocity() * acceleration;

        this.alpha = this.theta / acceleration;
    },

    getValue: function() {
        return this.getStartValue() - this.velocity * (1 - this.getFrictionFactor()) / this.theta;
    },

    getFrictionFactor: function() {
        var deltaTime = Ext.Date.now() - this.getStartTime();

        return Math.exp(deltaTime * this.alpha);
    },

    getVelocity: function() {
        return this.getFrictionFactor() * this.velocity;
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.easing.Bounce', {

    extend: 'Ext.fx.easing.Abstract',

    config: {
        springTension: 0.3,
        acceleration: 30,
        startVelocity: 0
    },

    getValue: function() {
        var deltaTime = Ext.Date.now() - this.getStartTime(),
            theta = (deltaTime / this.getAcceleration()),
            powTime = theta * Math.pow(Math.E, -this.getSpringTension() * theta);

        return this.getStartValue() + (this.getStartVelocity() * powTime);
    }
});

/**
 * A simple class used to mask any {@link Ext.Container}.
 *
 * This should rarely be used directly, instead look at the {@link Ext.Container#masked} configuration.
 *
 * ## Example
 *
 *     @example miniphone
 *     Ext.Viewport.add({
 *         masked: {
 *            xtype: 'loadmask'
 *         }
 *     });
 *
 * You can customize the loading {@link #message} and whether or not you want to show the {@link #indicator}:
 *
 *     @example miniphone
 *     Ext.Viewport.add({
 *         masked: {
 *            xtype: 'loadmask',
 *            message: 'A message..',
 *            indicator: false
 *         }
 *     });
 *
 */
Ext.define('Ext.LoadMask', {
    extend: 'Ext.Mask',
    xtype: 'loadmask',

    config: {
        /**
         * @cfg {String} message
         * The text to display in a centered loading message box.
         * @accessor
         */
        message: 'Loading...',

        /**
         * @cfg {String} messageCls
         * The CSS class to apply to the loading message element.
         * @accessor
         */
        messageCls: Ext.baseCSSPrefix + 'mask-message',

        /**
         * @cfg {Boolean} indicator
         * True to show the loading indicator on this {@link Ext.LoadMask}.
         * @accessor
         */
        indicator: true
    },

    getTemplate: function() {
        var prefix = Ext.baseCSSPrefix;

        return [
            {
                //it needs an inner so it can be centered within the mask, and have a background
                reference: 'innerElement',
                cls: prefix + 'mask-inner',
                children: [
                    //the elements required for the CSS loading {@link #indicator}
                    {
                        reference: 'indicatorElement',
                        cls: prefix + 'loading-spinner-outer',
                        children: [
                            {
                                cls: prefix + 'loading-spinner',
                                children: [
                                    { tag: 'span', cls: prefix + 'loading-top' },
                                    { tag: 'span', cls: prefix + 'loading-right' },
                                    { tag: 'span', cls: prefix + 'loading-bottom' },
                                    { tag: 'span', cls: prefix + 'loading-left' }
                                ]
                            }
                        ]
                    },
                    //the element used to display the {@link #message}
                    {
                        reference: 'messageElement'
                    }
                ]
            }
        ];
    },

    /**
     * Updates the message element with the new value of the {@link #message} configuration
     * @private
     */
    updateMessage: function(newMessage) {
        this.messageElement.setHtml(newMessage);
    },

    /**
     * Replaces the cls of the message element with the value of the {@link #messageCls} configuration.
     * @private
     */
    updateMessageCls: function(newMessageCls, oldMessageCls) {
        this.messageElement.replaceCls(oldMessageCls, newMessageCls);
    },

    /**
     * Shows/hides the loading indicator when the {@link #indicator} configuration is changed.
     * @private
     */
    updateIndicator: function(newIndicator) {
        this[newIndicator ? 'removeCls' : 'addCls'](Ext.baseCSSPrefix + 'indicator-hidden');
    },

    onPainted: function() {
        this.getParent().on({
            scope  : this,
            resize : this.refreshPosition
        });

        this.refreshPosition();

        this.callParent(arguments);
    },

    onErased: function() {
        this.getParent().un({
            scope  : this,
            resize : this.refreshPosition
        });

        this.callParent(arguments);
    },

    /**
     * @private
     * Updates the location of the indicator
     */
    refreshPosition: function() {
        var parent = this.getParent(),
            scrollable = parent.getScrollable(),
            scroller = (scrollable) ? scrollable.getScroller() : null,
            offset = (scroller) ? scroller.position : { x: 0, y: 0 },
            parentSize = parent.element.getSize(),
            innerSize = this.element.getSize();

        this.innerElement.setStyle({
            marginTop: Math.round(parentSize.height - innerSize.height + (offset.y * 2)) + 'px',
            marginLeft: Math.round(parentSize.width - innerSize.width + offset.x) + 'px'
        });
    }
}, function() {
});

/**
 * @aside guide layouts
 * @aside video layouts
 *
 * Fit Layout is probably the simplest layout available. All it does is make a child component fit to the full size of
 * its parent Container.
 *
 * {@img ../guides/layouts/fit.jpg}
 *
 * For example, if you have a parent Container that is 200px by 200px and give it a single child component and a 'fit'
 * layout, the child component will also be 200px by 200px:
 *
 *     var panel = Ext.create('Ext.Panel', {
 *         width: 200,
 *         height: 200,
 *         layout: 'fit',
 *
 *         items: {
 *             xtype: 'panel',
 *             html: 'Also 200px by 200px'
 *         }
 *     });
 *
 *     Ext.Viewport.add(panel);
 *
 * For a more detailed overview of what layouts are and the types of layouts shipped with Sencha Touch 2, check out the
 * [Layout Guide](#!/guide/layouts).
 */
Ext.define('Ext.layout.Fit', {
    extend: 'Ext.layout.Default',
    alternateClassName: 'Ext.layout.FitLayout',

    alias: 'layout.fit',

    cls: Ext.baseCSSPrefix + 'layout-fit',

    itemCls: Ext.baseCSSPrefix + 'layout-fit-item',

    constructor: function(container) {
        this.callParent(arguments);

        this.apply();
    },

    apply: function() {
        this.container.innerElement.addCls(this.cls);
    },

    reapply: function() {
        this.apply();
    },

    unapply: function() {
        this.container.innerElement.removeCls(this.cls);
    },

    doItemAdd: function(item, index) {
        if (item.isInnerItem()) {
            item.addCls(this.itemCls);
        }

        this.callParent(arguments);
    },

    /**
     * @private
     */
    doItemRemove: function(item) {
        if (item.isInnerItem()) {
            item.removeCls(this.itemCls);
        }

        this.callParent(arguments);
    }
});

/**
 * @aside guide layouts
 * @aside video layouts
 *
 * The HBox (short for horizontal box) layout makes it easy to position items horizontally in a
 * {@link Ext.Container Container}. It can size items based on a fixed width or a fraction of the total width
 * available.
 *
 * For example, an email client might have a list of messages pinned to the left, taking say one third of the available
 * width, and a message viewing panel in the rest of the screen. We can achieve this with hbox layout's *flex* config:
 *
 *     @example
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: 'hbox',
 *         items: [
 *             {
 *                 html: 'message list',
 *                 style: 'background-color: #5E99CC;',
 *                 flex: 1
 *             },
 *             {
 *                 html: 'message preview',
 *                 style: 'background-color: #759E60;',
 *                 flex: 2
 *             }
 *         ]
 *     });
 *
 * This will give us two boxes - one that's one third of the available width, the other being two thirds of the
 * available width:
 *
 * {@img ../guides/layouts/hbox.jpg}
 *
 * We can also specify fixed widths for child items, or mix fixed widths and flexes. For example, here we have 3 items
 * - one on each side with flex: 1, and one in the center with a fixed width of 100px:
 *
 *     @example
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: 'hbox',
 *         items: [
 *             {
 *                 html: 'Left item',
 *                 style: 'background-color: #759E60;',
 *                 flex: 1
 *             },
 *             {
 *                 html: 'Center item',
 *                 width: 100
 *             },
 *             {
 *                 html: 'Right item',
 *                 style: 'background-color: #5E99CC;',
 *                 flex: 1
 *             }
 *         ]
 *     });
 *
 * Which gives us an effect like this:
 *
 * {@img ../guides/layouts/hboxfixed.jpg}
 *
 * For a more detailed overview of what layouts are and the types of layouts shipped with Sencha Touch 2, check out the
 * [Layout Guide](#!/guide/layouts).
 */
Ext.define('Ext.layout.HBox', {
    extend: 'Ext.layout.AbstractBox',
    alternateClassName: 'Ext.layout.HBoxLayout',

    alias: 'layout.hbox',

    sizePropertyName: 'width',

    sizeChangeEventName: 'widthchange',

    cls: Ext.baseCSSPrefix + 'layout-hbox'
});



/**
 * @aside guide layouts
 * @aside video layouts
 *
 * The VBox (short for vertical box) layout makes it easy to position items horizontally in a
 * {@link Ext.Container Container}. It can size items based on a fixed height or a fraction of the total height
 * available.
 *
 * For example, let's say we want a banner to take one third of the available height, and an information panel in the
 * rest of the screen. We can achieve this with vbox layout's *flex* config:
 *
 *     @example
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: 'vbox',
 *         items: [
 *             {
 *                 html: 'Awesome banner',
 *                 style: 'background-color: #759E60;',
 *                 flex: 1
 *             },
 *             {
 *                 html: 'Some wonderful information',
 *                 style: 'background-color: #5E99CC;',
 *                 flex: 2
 *             }
 *         ]
 *     });
 *
 * This will give us two boxes - one that's one third of the available height, the other being two thirds of the
 * available height:
 *
 * {@img ../guides/layouts/vbox.jpg}
 *
 * We can also specify fixed heights for child items, or mix fixed heights and flexes. For example, here we have 3
 * items - one at the top and bottom with flex: 1, and one in the center with a fixed width of 100px:
 *
 *     @example preview portrait
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: 'vbox',
 *         items: [
 *             {
 *                 html: 'Top item',
 *                 style: 'background-color: #5E99CC;',
 *                 flex: 1
 *             },
 *             {
 *                 html: 'Center item',
 *                 height: 100
 *             },
 *             {
 *                 html: 'Bottom item',
 *                 style: 'background-color: #759E60;',
 *                 flex: 1
 *             }
 *         ]
 *     });
 *
 * Which gives us an effect like this:
 *
 * {@img ../guides/layouts/vboxfixed.jpg}
 *
 * For a more detailed overview of what layouts are and the types of layouts shipped with Sencha Touch 2, check out the
 * [Layout Guide](#!/guide/layouts).
 *
 */
Ext.define('Ext.layout.VBox', {
    extend: 'Ext.layout.AbstractBox',
    alternateClassName: 'Ext.layout.VBoxLayout',

    alias: 'layout.vbox',

    sizePropertyName: 'height',

    sizeChangeEventName: 'heightchange',

    cls: Ext.baseCSSPrefix + 'layout-vbox'
});

/**
 * @docauthor Tommy Maintz <tommy@sencha.com>
 *
 * A mixin which allows a data component to be sorted. This is used by e.g. {@link Ext.data.Store} and {@link Ext.data.TreeStore}.
 *
 * **NOTE**: This mixin is mainly for internal library use and most users should not need to use it directly. It
 * is more likely you will want to use one of the component classes that import this mixin, such as
 * {@link Ext.data.Store} or {@link Ext.data.TreeStore}.
 */
Ext.define("Ext.util.Sortable", {
    /**
     * @property {Boolean} isSortable
     * Flag denoting that this object is sortable. Always true.
     */
    isSortable: true,
    
    /**
     * @property {String} defaultSortDirection
     * The default sort direction to use if one is not specified (defaults to "ASC")
     */
    defaultSortDirection: "ASC",
    
    requires: [
        'Ext.util.Sorter'
    ],

    /**
     * @property {String} sortRoot
     * The property in each item that contains the data to sort.
     */    
    
    /**
     * Performs initialization of this mixin. Component classes using this mixin should call this method during their
     * own initialization.
     */
    initSortable: function() {
        var me = this,
            sorters = me.sorters;
        
        /**
         * @property {Ext.util.MixedCollection} sorters
         * The collection of {@link Ext.util.Sorter Sorters} currently applied to this Store
         */
        me.sorters = Ext.create('Ext.util.AbstractMixedCollection', false, function(item) {
            return item.id || item.property;
        });
        
        if (sorters) {
            me.sorters.addAll(me.decodeSorters(sorters));
        }
    },

    /**
     * Sorts the data in the Store by one or more of its properties. Example usage:
     *
     *     //sort by a single field
     *     myStore.sort('myField', 'DESC');
     *
     *     //sorting by multiple fields
     *     myStore.sort([
     *         {
     *             property : 'age',
     *             direction: 'ASC'
     *         },
     *         {
     *             property : 'name',
     *             direction: 'DESC'
     *         }
     *     ]);
     *
     * Internally, Store converts the passed arguments into an array of {@link Ext.util.Sorter} instances, and delegates
     * the actual sorting to its internal {@link Ext.util.MixedCollection}.
     *
     * When passing a single string argument to sort, Store maintains a ASC/DESC toggler per field, so this code:
     *
     *     store.sort('myField');
     *     store.sort('myField');
     *
     * Is equivalent to this code, because Store handles the toggling automatically:
     *
     *     store.sort('myField', 'ASC');
     *     store.sort('myField', 'DESC');
     *
     * @param {String/Ext.util.Sorter[]} sorters Either a string name of one of the fields in this Store's configured
     * {@link Ext.data.Model Model}, or an array of sorter configurations.
     * @param {String} direction The overall direction to sort the data by. Defaults to "ASC".
     * @return {Ext.util.Sorter[]}
     */
    sort: function(sorters, direction, where, doSort) {
        var me = this,
            sorter, sorterFn,
            newSorters;
        
        if (Ext.isArray(sorters)) {
            doSort = where;
            where = direction;
            newSorters = sorters;
        }
        else if (Ext.isObject(sorters)) {
            doSort = where;
            where = direction;
            newSorters = [sorters];
        }
        else if (Ext.isString(sorters)) {
            sorter = me.sorters.get(sorters);

            if (!sorter) {
                sorter = {
                    property : sorters,
                    direction: direction
                };
                newSorters = [sorter];
            }
            else if (direction === undefined) {
                sorter.toggle();
            }
            else {
                sorter.setDirection(direction);
            }
        }
        
        if (newSorters && newSorters.length) {
            newSorters = me.decodeSorters(newSorters);
            if (Ext.isString(where)) {
                if (where === 'prepend') {
                    sorters = me.sorters.clone().items;
                    
                    me.sorters.clear();
                    me.sorters.addAll(newSorters);
                    me.sorters.addAll(sorters);
                }
                else {
                    me.sorters.addAll(newSorters);
                }
            }
            else {
                me.sorters.clear();
                me.sorters.addAll(newSorters);
            }
            
            if (doSort !== false) {
                me.onBeforeSort(newSorters);
            }
        }
        
        if (doSort !== false) {
            sorters = me.sorters.items;
            if (sorters.length) {
                //construct an amalgamated sorter function which combines all of the Sorters passed
                sorterFn = function(r1, r2) {
                    var result = sorters[0].sort(r1, r2),
                        length = sorters.length,
                        i;

                        //if we have more than one sorter, OR any additional sorter functions together
                        for (i = 1; i < length; i++) {
                            result = result || sorters[i].sort.call(this, r1, r2);
                        }

                    return result;
                };

                me.doSort(sorterFn);                
            }
        }
        
        return sorters;
    },
    
    onBeforeSort: Ext.emptyFn,
        
    /**
     * @private
     * Normalizes an array of sorter objects, ensuring that they are all Ext.util.Sorter instances
     * @param {Array} sorters The sorters array
     * @return {Array} Array of Ext.util.Sorter objects
     */
    decodeSorters: function(sorters) {
        if (!Ext.isArray(sorters)) {
            if (sorters === undefined) {
                sorters = [];
            } else {
                sorters = [sorters];
            }
        }

        var length = sorters.length,
            Sorter = Ext.util.Sorter,
            fields = this.model ? this.model.prototype.fields : null,
            field,
            config, i;

        for (i = 0; i < length; i++) {
            config = sorters[i];

            if (!(config instanceof Sorter)) {
                if (Ext.isString(config)) {
                    config = {
                        property: config
                    };
                }
                
                Ext.applyIf(config, {
                    root     : this.sortRoot,
                    direction: "ASC"
                });

                if (config.fn) {
                    config.sorterFn = config.fn;
                }

                //support a function to be passed as a sorter definition
                if (typeof config == 'function') {
                    config = {
                        sorterFn: config
                    };
                }

                // ensure sortType gets pushed on if necessary
                if (fields && !config.transform) {
                    field = fields.get(config.property);
                    config.transform = field ? field.sortType : undefined;
                }
                sorters[i] = Ext.create('Ext.util.Sorter', config);
            }
        }

        return sorters;
    },
    
    getSorters: function() {
        return this.sorters.items;
    }
});
/**
 * @private
 */
Ext.define('Ext.util.AbstractMixedCollection', {
    requires: ['Ext.util.Filter'],

    mixins: {
        observable: 'Ext.mixin.Observable'
    },

    /**
     * @event clear
     * Fires when the collection is cleared.
     */

    /**
     * @event add
     * Fires when an item is added to the collection.
     * @param {Number} index The index at which the item was added.
     * @param {Object} o The item added.
     * @param {String} key The key associated with the added item.
     */

    /**
     * @event replace
     * Fires when an item is replaced in the collection.
     * @param {String} key he key associated with the new added.
     * @param {Object} old The item being replaced.
     * @param {Object} new The new item.
     */

    /**
     * @event remove
     * Fires when an item is removed from the collection.
     * @param {Object} o The item being removed.
     * @param {String} key (optional) The key associated with the removed item.
     */

    /**
     * Creates new MixedCollection.
     * @param {Boolean} [allowFunctions] Specify `true` if the {@link #addAll}
     * function should add function references to the collection. (defaults to `false`)
     * @param {Function} [keyFn] A function that can accept an item of the type(s) stored in this MixedCollection
     * and return the key value for that item.  This is used when available to look up the key on items that
     * were passed without an explicit key parameter to a MixedCollection method.  Passing this parameter is
     * equivalent to providing an implementation for the {@link #getKey} method.
     */
    constructor: function(allowFunctions, keyFn) {
        var me = this;

        me.items = [];
        me.map = {};
        me.keys = [];
        me.length = 0;

        me.allowFunctions = allowFunctions === true;

        if (keyFn) {
            me.getKey = keyFn;
        }

        me.mixins.observable.constructor.call(me);
    },

    /**
     * @cfg {Boolean} allowFunctions Specify <tt>true</tt> if the {@link #addAll}
     * function should add function references to the collection. Defaults to
     * <tt>false</tt>.
     */
    allowFunctions : false,

    /**
     * Adds an item to the collection. Fires the {@link #event-add} event when complete.
     * @param {String} key <p>The key to associate with the item, or the new item.</p>
     * <p>If a {@link #getKey} implementation was specified for this MixedCollection,
     * or if the key of the stored items is in a property called <tt><b>id</b></tt>,
     * the MixedCollection will be able to <i>derive</i> the key for the new item.
     * In this case just pass the new item in this parameter.</p>
     * @param {Object} o The item to add.
     * @return {Object} The item added.
     */
    add: function(key, obj){
        var me = this,
            myObj = obj,
            myKey = key,
            old;

        if (arguments.length == 1) {
            myObj = myKey;
            myKey = me.getKey(myObj);
        }
        if (typeof myKey != 'undefined' && myKey !== null) {
            old = me.map[myKey];
            if (typeof old != 'undefined') {
                return me.replace(myKey, myObj);
            }
            me.map[myKey] = myObj;
        }
        me.length++;
        me.items.push(myObj);
        me.keys.push(myKey);
        me.fireEvent('add', me.length - 1, myObj, myKey);
        return myObj;
    },

    /**
      * MixedCollection has a generic way to fetch keys if you implement getKey.  The default implementation
      * simply returns <b><code>item.id</code></b> but you can provide your own implementation
      * to return a different value as in the following examples:<pre><code>
// normal way
var mc = new Ext.util.MixedCollection();
mc.add(someEl.dom.id, someEl);
mc.add(otherEl.dom.id, otherEl);
//and so on

// using getKey
var mc = new Ext.util.MixedCollection();
mc.getKey = function(el){
   return el.dom.id;
};
mc.add(someEl);
mc.add(otherEl);

// or via the constructor
var mc = new Ext.util.MixedCollection(false, function(el){
   return el.dom.id;
});
mc.add(someEl);
mc.add(otherEl);
     * </code></pre>
     * @param {Object} item The item for which to find the key.
     * @return {Object} The key for the passed item.
     */
    getKey: function(o){
         return o.id;
    },

    /**
     * Replaces an item in the collection. Fires the {@link #event-replace} event when complete.
     * @param {String} key <p>The key associated with the item to replace, or the replacement item.</p>
     * <p>If you supplied a {@link #getKey} implementation for this MixedCollection, or if the key
     * of your stored items is in a property called <tt><b>id</b></tt>, then the MixedCollection
     * will be able to <i>derive</i> the key of the replacement item. If you want to replace an item
     * with one having the same key value, then just pass the replacement item in this parameter.</p>
     * @param o {Object} o (optional) If the first parameter passed was a key, the item to associate
     * with that key.
     * @return {Object}  The new item.
     */
    replace: function(key, o){
        var me = this,
            old,
            index;

        if (arguments.length == 1) {
            o = arguments[0];
            key = me.getKey(o);
        }
        old = me.map[key];
        if (typeof key == 'undefined' || key === null || typeof old == 'undefined') {
             return me.add(key, o);
        }
        index = me.indexOfKey(key);
        me.items[index] = o;
        me.map[key] = o;
        me.fireEvent('replace', key, old, o);
        return o;
    },

    /**
     * Adds all elements of an Array or an Object to the collection.
     * @param {Object/Array} objs An Object containing properties which will be added
     * to the collection, or an Array of values, each of which are added to the collection.
     * Functions references will be added to the collection if <code>{@link #allowFunctions}</code>
     * has been set to <tt>true</tt>.
     */
    addAll: function(objs){
        var me = this,
            i = 0,
            args,
            len,
            key;

        if (arguments.length > 1 || Ext.isArray(objs)) {
            args = arguments.length > 1 ? arguments : objs;
            for (len = args.length; i < len; i++) {
                me.add(args[i]);
            }
        } else {
            for (key in objs) {
                if (objs.hasOwnProperty(key)) {
                    if (me.allowFunctions || typeof objs[key] != 'function') {
                        me.add(key, objs[key]);
                    }
                }
            }
        }
    },

    /**
     * Executes the specified function once for every item in the collection, passing the following arguments:
     * <div class="mdetail-params"><ul>
     * <li><b>item</b> : Mixed<p class="sub-desc">The collection item</p></li>
     * <li><b>index</b> : Number<p class="sub-desc">The item's index</p></li>
     * <li><b>length</b> : Number<p class="sub-desc">The total number of items in the collection</p></li>
     * </ul></div>
     * The function should return a boolean value. Returning false from the function will stop the iteration.
     * @param {Function} fn The function to execute for each item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the current item in the iteration.
     */
    each: function(fn, scope){
        var items = [].concat(this.items), // each safe for removal
            i = 0,
            len = items.length,
            item;

        for (; i < len; i++) {
            item = items[i];
            if (fn.call(scope || item, item, i, len) === false) {
                break;
            }
        }
    },

    /**
     * Executes the specified function once for every key in the collection, passing each
     * key, and its associated item as the first two parameters.
     * @param {Function} fn The function to execute for each item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the browser window.
     */
    eachKey: function(fn, scope){
        var keys = this.keys,
            items = this.items,
            i = 0,
            len = keys.length;

        for (; i < len; i++) {
            fn.call(scope || window, keys[i], items[i], i, len);
        }
    },

    /**
     * Returns the first item in the collection which elicits a true return value from the
     * passed selection function.
     * @param {Function} fn The selection function to execute for each item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the browser window.
     * @return {Object} The first item in the collection which returned true from the selection function.
     */
    findBy: function(fn, scope) {
        var keys = this.keys,
            items = this.items,
            i = 0,
            len = items.length;

        for (; i < len; i++) {
            if (fn.call(scope || window, items[i], keys[i])) {
                return items[i];
            }
        }
        return null;
    },

    /**
     * Inserts an item at the specified index in the collection. Fires the {@link #event-add} event when complete.
     * @param {Number} index The index to insert the item at.
     * @param {String} key The key to associate with the new item, or the item itself.
     * @param {Object} o (optional) If the second parameter was a key, the new item.
     * @return {Object} The item inserted.
     */
    insert: function(index, key, obj){
        var me = this,
            myKey = key,
            myObj = obj;

        if (arguments.length == 2) {
            myObj = myKey;
            myKey = me.getKey(myObj);
        }
        if (me.containsKey(myKey)) {
            me.suspendEvents();
            me.removeAtKey(myKey);
            me.resumeEvents();
        }
        if (index >= me.length) {
            return me.add(myKey, myObj);
        }
        me.length++;
        Ext.Array.splice(me.items, index, 0, myObj);
        if (typeof myKey != 'undefined' && myKey !== null) {
            me.map[myKey] = myObj;
        }
        Ext.Array.splice(me.keys, index, 0, myKey);
        me.fireEvent('add', index, myObj, myKey);
        return myObj;
    },

    /**
     * Remove an item from the collection.
     * @param {Object} o The item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    remove: function(o){
        return this.removeAt(this.indexOf(o));
    },

    /**
     * Remove all items in the passed array from the collection.
     * @param {Array} items An array of items to be removed.
     * @return {Ext.util.MixedCollection} this object
     */
    removeAll: function(items){
        Ext.each(items || [], function(item) {
            this.remove(item);
        }, this);

        return this;
    },

    /**
     * Remove an item from a specified index in the collection. Fires the {@link #event-remove} event when complete.
     * @param {Number} index The index within the collection of the item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    removeAt: function(index){
        var me = this,
            o,
            key;

        if (index < me.length && index >= 0) {
            me.length--;
            o = me.items[index];
            Ext.Array.erase(me.items, index, 1);
            key = me.keys[index];
            if (typeof key != 'undefined') {
                delete me.map[key];
            }
            Ext.Array.erase(me.keys, index, 1);
            me.fireEvent('remove', o, key);
            return o;
        }
        return false;
    },

    /**
     * Removed an item associated with the passed key fom the collection.
     * @param {String} key The key of the item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    removeAtKey: function(key){
        return this.removeAt(this.indexOfKey(key));
    },

    /**
     * Returns the number of items in the collection.
     * @return {Number} the number of items in the collection.
     */
    getCount: function(){
        return this.length;
    },

    /**
     * Returns index within the collection of the passed Object.
     * @param {Object} o The item to find the index of.
     * @return {Number} index of the item. Returns -1 if not found.
     */
    indexOf: function(o){
        return Ext.Array.indexOf(this.items, o);
    },

    /**
     * Returns index within the collection of the passed key.
     * @param {String} key The key to find the index of.
     * @return {Number} index of the key.
     */
    indexOfKey: function(key){
        return Ext.Array.indexOf(this.keys, key);
    },

    /**
     * Returns the item associated with the passed key OR index.
     * Key has priority over index.  This is the equivalent
     * of calling {@link #getByKey} first, then if nothing matched calling {@link #getAt}.
     * @param {String/Number} key The key or index of the item.
     * @return {Object} If the item is found, returns the item.  If the item was not found, returns <tt>undefined</tt>.
     * If an item was found, but is a Class, returns <tt>null</tt>.
     */
    get: function(key) {
        var me = this,
            mk = me.map[key],
            item = mk !== undefined ? mk : (typeof key == 'number') ? me.items[key] : undefined;
        return typeof item != 'function' || me.allowFunctions ? item : null; // for prototype!
    },

    /**
     * Returns the item at the specified index.
     * @param {Number} index The index of the item.
     * @return {Object} The item at the specified index.
     */
    getAt: function(index) {
        return this.items[index];
    },

    /**
     * Returns the item associated with the passed key.
     * @param {String/Number} key The key of the item.
     * @return {Object} The item associated with the passed key.
     */
    getByKey: function(key) {
        return this.map[key];
    },

    /**
     * Returns true if the collection contains the passed Object as an item.
     * @param {Object} o  The Object to look for in the collection.
     * @return {Boolean} True if the collection contains the Object as an item.
     */
    contains: function(o){
        return Ext.Array.contains(this.items, o);
    },

    /**
     * Returns true if the collection contains the passed Object as a key.
     * @param {String} key The key to look for in the collection.
     * @return {Boolean} True if the collection contains the Object as a key.
     */
    containsKey: function(key){
        return typeof this.map[key] != 'undefined';
    },

    /**
     * Removes all items from the collection.  Fires the {@link #event-clear} event when complete.
     */
    clear: function(){
        var me = this;

        me.length = 0;
        me.items = [];
        me.keys = [];
        me.map = {};
        me.fireEvent('clear');
    },

    /**
     * Returns the first item in the collection.
     * @return {Object} the first item in the collection..
     */
    first: function() {
        return this.items[0];
    },

    /**
     * Returns the last item in the collection.
     * @return {Object} the last item in the collection..
     */
    last: function() {
        return this.items[this.length - 1];
    },

    /**
     * Collects all of the values of the given property and returns their sum
     * @param {String} property The property to sum by
     * @param {String} root Optional 'root' property to extract the first argument from. This is used mainly when
     * summing fields in records, where the fields are all stored inside the 'data' object
     * @param {Number} start (optional) The record index to start at (defaults to <tt>0</tt>)
     * @param {Number} end (optional) The record index to end at (defaults to <tt>-1</tt>)
     * @return {Number} The total
     */
    sum: function(property, root, start, end) {
        var values = this.extractValues(property, root),
            length = values.length,
            sum    = 0,
            i;

        start = start || 0;
        end   = (end || end === 0) ? end : length - 1;

        for (i = start; i <= end; i++) {
            sum += values[i];
        }

        return sum;
    },

    /**
     * Collects unique values of a particular property in this MixedCollection
     * @param {String} property The property to collect on
     * @param {String} root Optional 'root' property to extract the first argument from. This is used mainly when
     * summing fields in records, where the fields are all stored inside the 'data' object
     * @param {Boolean} allowBlank (optional) Pass true to allow null, undefined or empty string values
     * @return {Array} The unique values
     */
    collect: function(property, root, allowNull) {
        var values = this.extractValues(property, root),
            length = values.length,
            hits   = {},
            unique = [],
            value, strValue, i;

        for (i = 0; i < length; i++) {
            value = values[i];
            strValue = String(value);

            if ((allowNull || !Ext.isEmpty(value)) && !hits[strValue]) {
                hits[strValue] = true;
                unique.push(value);
            }
        }

        return unique;
    },

    /**
     * @private
     * Extracts all of the given property values from the items in the MC. Mainly used as a supporting method for
     * functions like sum and collect.
     * @param {String} property The property to extract
     * @param {String} root Optional 'root' property to extract the first argument from. This is used mainly when
     * extracting field data from Model instances, where the fields are stored inside the 'data' object
     * @return {Array} The extracted values
     */
    extractValues: function(property, root) {
        var values = this.items;

        if (root) {
            values = Ext.Array.pluck(values, root);
        }

        return Ext.Array.pluck(values, property);
    },

    /**
     * Returns a range of items in this collection
     * @param {Number} startIndex (optional) The starting index. Defaults to 0.
     * @param {Number} endIndex (optional) The ending index. Defaults to the last item.
     * @return {Array} An array of items
     */
    getRange: function(start, end){
        var me = this,
            items = me.items,
            range = [],
            i;

        if (items.length < 1) {
            return range;
        }

        start = start || 0;
        end = Math.min(typeof end == 'undefined' ? me.length - 1 : end, me.length - 1);
        if (start <= end) {
            for (i = start; i <= end; i++) {
                range[range.length] = items[i];
            }
        } else {
            for (i = start; i >= end; i--) {
                range[range.length] = items[i];
            }
        }
        return range;
    },

    /**
     * <p>Filters the objects in this collection by a set of {@link Ext.util.Filter Filter}s, or by a single
     * property/value pair with optional parameters for substring matching and case sensitivity. See
     * {@link Ext.util.Filter Filter} for an example of using Filter objects (preferred). Alternatively,
     * MixedCollection can be easily filtered by property like this:</p>
<pre><code>
//create a simple store with a few people defined
var people = new Ext.util.MixedCollection();
people.addAll([
    {id: 1, age: 25, name: 'Ed'},
    {id: 2, age: 24, name: 'Tommy'},
    {id: 3, age: 24, name: 'Arne'},
    {id: 4, age: 26, name: 'Aaron'}
]);

//a new MixedCollection containing only the items where age == 24
var middleAged = people.filter('age', 24);
</code></pre>
     *
     *
     * @param {Ext.util.Filter[]/String} property A property on your objects, or an array of {@link Ext.util.Filter Filter} objects
     * @param {String/RegExp} value Either string that the property values
     * should start with or a RegExp to test against the property
     * @param {Boolean} anyMatch (optional) True to match any part of the string, not just the beginning
     * @param {Boolean} caseSensitive (optional) True for case sensitive comparison (defaults to False).
     * @return {Ext.util.MixedCollection} The new filtered collection
     */
    filter: function(property, value, anyMatch, caseSensitive) {
        var filters = [],
            filterFn;

        //support for the simple case of filtering by property/value
        if (Ext.isString(property)) {
            filters.push(Ext.create('Ext.util.Filter', {
                property     : property,
                value        : value,
                anyMatch     : anyMatch,
                caseSensitive: caseSensitive
            }));
        } else if (Ext.isArray(property) || property instanceof Ext.util.Filter) {
            filters = filters.concat(property);
        }

        //at this point we have an array of zero or more Ext.util.Filter objects to filter with,
        //so here we construct a function that combines these filters by ANDing them together
        filterFn = function(record) {
            var isMatch = true,
                length = filters.length,
                i;

            for (i = 0; i < length; i++) {
                var filter = filters[i],
                    fn     = filter.getFilterFn(),
                    scope  = filter.getScope();

                isMatch = isMatch && fn.call(scope, record);
            }

            return isMatch;
        };

        return this.filterBy(filterFn);
    },

    /**
     * Filter by a function. Returns a <i>new</i> collection that has been filtered.
     * The passed function will be called with each object in the collection.
     * If the function returns true, the value is included otherwise it is filtered.
     * @param {Function} fn The function to be called, it will receive the args o (the object), k (the key)
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to this MixedCollection.
     * @return {Ext.util.MixedCollection} The new filtered collection
     */
    filterBy: function(fn, scope) {
        var me = this,
            newMC  = new this.self(),
            keys   = me.keys,
            items  = me.items,
            length = items.length,
            i;

        newMC.getKey = me.getKey;

        for (i = 0; i < length; i++) {
            if (fn.call(scope || me, items[i], keys[i])) {
                newMC.add(keys[i], items[i]);
            }
        }

        return newMC;
    },

    /**
     * Finds the index of the first matching object in this collection by a specific property/value.
     * @param {String} property The name of a property on your objects.
     * @param {String/RegExp} value A string that the property values
     * should start with or a RegExp to test against the property.
     * @param {Number} start (optional) The index to start searching at (defaults to 0).
     * @param {Boolean} anyMatch (optional) True to match any part of the string, not just the beginning.
     * @param {Boolean} caseSensitive (optional) True for case sensitive comparison.
     * @return {Number} The matched index or -1
     */
    findIndex: function(property, value, start, anyMatch, caseSensitive){
        if(Ext.isEmpty(value, false)){
            return -1;
        }
        value = this.createValueMatcher(value, anyMatch, caseSensitive);
        return this.findIndexBy(function(o){
            return o && value.test(o[property]);
        }, null, start);
    },

    /**
     * Find the index of the first matching object in this collection by a function.
     * If the function returns <i>true</i> it is considered a match.
     * @param {Function} fn The function to be called, it will receive the args o (the object), k (the key).
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to this MixedCollection.
     * @param {Number} start (optional) The index to start searching at (defaults to 0).
     * @return {Number} The matched index or -1
     */
    findIndexBy: function(fn, scope, start){
        var me = this,
            keys = me.keys,
            items = me.items,
            i = start || 0,
            len = items.length;

        for (; i < len; i++) {
            if (fn.call(scope || me, items[i], keys[i])) {
                return i;
            }
        }
        return -1;
    },

    /**
     * Returns a regular expression based on the given value and matching options. This is used internally for finding and filtering,
     * and by Ext.data.Store#filter
     * @private
     * @param {String} value The value to create the regex for. This is escaped using Ext.escapeRe
     * @param {Boolean} anyMatch True to allow any match - no regex start/end line anchors will be added. Defaults to false
     * @param {Boolean} caseSensitive True to make the regex case sensitive (adds 'i' switch to regex). Defaults to false.
     * @param {Boolean} exactMatch True to force exact match (^ and $ characters added to the regex). Defaults to false. Ignored if anyMatch is true.
     */
    createValueMatcher: function(value, anyMatch, caseSensitive, exactMatch) {
        if (!value.exec) { // not a regex
            var er = Ext.String.escapeRegex;
            value = String(value);

            if (anyMatch === true) {
                value = er(value);
            } else {
                value = '^' + er(value);
                if (exactMatch === true) {
                    value += '$';
                }
            }
            value = new RegExp(value, caseSensitive ? '' : 'i');
        }
        return value;
    },

    /**
     * Creates a shallow copy of this collection
     * @return {Ext.util.MixedCollection}
     */
    clone: function() {
        var me = this,
            copy = new this.self(),
            keys = me.keys,
            items = me.items,
            i = 0,
            len = items.length;

        for(; i < len; i++){
            copy.add(keys[i], items[i]);
        }
        copy.getKey = me.getKey;
        return copy;
    }
});

/**
 * Represents a collection of a set of key and value pairs. Each key in the MixedCollection must be unique, the same key
 * cannot exist twice. This collection is ordered, items in the collection can be accessed by index or via the key.
 * Newly added items are added to the end of the collection. This class is similar to {@link Ext.util.HashMap} however
 * it is heavier and provides more functionality. Sample usage:
 *
 *     var coll = new Ext.util.MixedCollection();
 *     coll.add('key1', 'val1');
 *     coll.add('key2', 'val2');
 *     coll.add('key3', 'val3');
 *
 *     console.log(coll.get('key1')); // prints 'val1'
 *     console.log(coll.indexOfKey('key3')); // prints 2
 *
 * The MixedCollection also has support for sorting and filtering of the values in the collection.
 *
 *     var coll = new Ext.util.MixedCollection();
 *     coll.add('key1', 100);
 *     coll.add('key2', -100);
 *     coll.add('key3', 17);
 *     coll.add('key4', 0);
 *     var biggerThanZero = coll.filterBy(function(value){
 *         return value > 0;
 *     });
 *     console.log(biggerThanZero.getCount()); // prints 2
 */
Ext.define('Ext.util.MixedCollection', {
    extend: 'Ext.util.AbstractMixedCollection',
    mixins: {
        sortable: 'Ext.util.Sortable'
    },

    /**
     * @event sort
     * Fires whenever MixedCollection is sorted
     * @param {Ext.util.MixedCollection} this
     */

    constructor: function() {
        var me = this;
        me.callParent(arguments);
        me.mixins.sortable.initSortable.call(me);
    },

    doSort: function(sorterFn) {
        this.sortBy(sorterFn);
    },

    /**
     * @private
     * Performs the actual sorting based on a direction and a sorting function. Internally,
     * this creates a temporary array of all items in the MixedCollection, sorts it and then writes
     * the sorted array data back into this.items and this.keys
     * @param {String} property Property to sort by ('key', 'value', or 'index')
     * @param {String} dir (optional) Direction to sort 'ASC' or 'DESC'. Defaults to 'ASC'.
     * @param {Function} fn (optional) Comparison function that defines the sort order.
     * Defaults to sorting by numeric value.
     */
    _sort: function(property, dir, fn){
        var me = this,
            i, len,
            dsc   = String(dir).toUpperCase() == 'DESC' ? -1 : 1,

            //this is a temporary array used to apply the sorting function
            c     = [],
            keys  = me.keys,
            items = me.items;

        //default to a simple sorter function if one is not provided
        fn = fn || function(a, b) {
            return a - b;
        };

        //copy all the items into a temporary array, which we will sort
        for(i = 0, len = items.length; i < len; i++){
            c[c.length] = {
                key  : keys[i],
                value: items[i],
                index: i
            };
        }

        //sort the temporary array
        Ext.Array.sort(c, function(a, b){
            var v = fn(a[property], b[property]) * dsc;
            if(v === 0){
                v = (a.index < b.index ? -1 : 1);
            }
            return v;
        });

        //copy the temporary array back into the main this.items and this.keys objects
        for(i = 0, len = c.length; i < len; i++){
            items[i] = c[i].value;
            keys[i]  = c[i].key;
        }

        me.fireEvent('sort', me);
    },

    /**
     * Sorts the collection by a single sorter function
     * @param {Function} sorterFn The function to sort by
     */
    sortBy: function(sorterFn) {
        var me     = this,
            items  = me.items,
            keys   = me.keys,
            length = items.length,
            temp   = [],
            i;

        //first we create a copy of the items array so that we can sort it
        for (i = 0; i < length; i++) {
            temp[i] = {
                key  : keys[i],
                value: items[i],
                index: i
            };
        }

        Ext.Array.sort(temp, function(a, b) {
            var v = sorterFn(a.value, b.value);
            if (v === 0) {
                v = (a.index < b.index ? -1 : 1);
            }

            return v;
        });

        //copy the temporary array back into the main this.items and this.keys objects
        for (i = 0; i < length; i++) {
            items[i] = temp[i].value;
            keys[i]  = temp[i].key;
        }

        me.fireEvent('sort', me, items, keys);
    },

    /**
     * Reorders each of the items based on a mapping from old index to new index. Internally this just translates into a
     * sort. The 'sort' event is fired whenever reordering has occured.
     * @param {Object} mapping Mapping from old item index to new item index
     */
    reorder: function(mapping) {
        var me = this,
            items = me.items,
            index = 0,
            length = items.length,
            order = [],
            remaining = [],
            oldIndex;

        me.suspendEvents();

        //object of {oldPosition: newPosition} reversed to {newPosition: oldPosition}
        for (oldIndex in mapping) {
            order[mapping[oldIndex]] = items[oldIndex];
        }

        for (index = 0; index < length; index++) {
            if (mapping[index] == undefined) {
                remaining.push(items[index]);
            }
        }

        for (index = 0; index < length; index++) {
            if (order[index] == undefined) {
                order[index] = remaining.shift();
            }
        }

        me.clear();
        me.addAll(order);

        me.resumeEvents();
        me.fireEvent('sort', me);
    },

    /**
     * Sorts this collection by **key**s.
     * @param {String} direction 'ASC' or 'DESC'. Defaults to 'ASC'.
     * @param {Function} fn Comparison function that defines the sort order. Defaults to sorting by case insensitive
     * string.
     */
    sortByKey: function(dir, fn){
        this._sort('key', dir, fn || function(a, b){
            var v1 = String(a).toUpperCase(), v2 = String(b).toUpperCase();
            return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
        });
    }
});

/**
 * @private
 */
Ext.define('Ext.ItemCollection', {
    extend: 'Ext.util.MixedCollection',

    getKey: function(item) {
        return item.getItemId();
    },

    has: function(item) {
        return this.map.hasOwnProperty(item.getId());
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Scroll', {
    extend: 'Ext.fx.layout.card.Abstract',

    requires: [
        'Ext.fx.easing.Linear'
    ],

    alias: 'fx.layout.card.scroll',

    config: {
        duration: 150
    },

    constructor: function(config) {
        this.initConfig(config);

        this.doAnimationFrame = Ext.Function.bind(this.doAnimationFrame, this);
    },

    getEasing: function() {
        var easing = this.easing;

        if (!easing) {
            this.easing = easing = new Ext.fx.easing.Linear();
        }

        return easing;
    },

    updateDuration: function(duration) {
        this.getEasing().setDuration(duration);
    },

    onActiveItemChange: function(cardLayout, newItem, oldItem, options, controller) {
        var direction = this.getDirection(),
            easing = this.getEasing(),
            containerElement, inElement, outElement, containerWidth, containerHeight, reverse;

        if (newItem && oldItem) {
            if (this.isAnimating) {
                this.stopAnimation();
            }

            containerElement = this.getLayout().container.innerElement;
            containerWidth = containerElement.getWidth();
            containerHeight = containerElement.getHeight();

            inElement = newItem.renderElement;
            outElement = oldItem.renderElement;

            this.oldItem = oldItem;
            this.newItem = newItem;
            this.currentEventController = controller;
            this.containerElement = containerElement;
            this.isReverse = reverse = this.getReverse();

            newItem.show();

            if (direction == 'right') {
                direction = 'left';
                this.isReverse = reverse = !reverse;
            }
            else if (direction == 'down') {
                direction = 'up';
                this.isReverse = reverse = !reverse;
            }

            if (direction == 'left') {
                if (reverse) {
                    easing.setConfig({
                        startValue: containerWidth,
                        endValue: 0
                    });

                    containerElement.dom.scrollLeft = containerWidth;
                    outElement.setLeft(containerWidth);
                }
                else {
                    easing.setConfig({
                        startValue: 0,
                        endValue: containerWidth
                    });

                    inElement.setLeft(containerWidth);
                }
            }
            else {
                if (reverse) {
                    easing.setConfig({
                        startValue: containerHeight,
                        endValue: 0
                    });

                    containerElement.dom.scrollTop = containerHeight;
                    outElement.setTop(containerHeight);
                }
                else {
                    easing.setConfig({
                        startValue: 0,
                        endValue: containerHeight
                    });

                    inElement.setTop(containerHeight);
                }
            }

            this.startAnimation();

            controller.pause();
        }
    },

    startAnimation: function() {
        this.isAnimating = true;
        this.getEasing().setStartTime(Date.now());
        this.timer = setInterval(this.doAnimationFrame, 20);
        this.doAnimationFrame();
    },

    doAnimationFrame: function() {
        var easing = this.getEasing(),
            direction = this.getDirection(),
            scroll = 'scrollTop',
            value;

        if (direction == 'left' || direction == 'right') {
            scroll = 'scrollLeft';
        }

        if (easing.isEnded) {
            this.stopAnimation();
        }
        else {
            value = easing.getValue();
            this.containerElement.dom[scroll] = value;
        }
    },

    stopAnimation: function() {
        var me = this,
            direction = me.getDirection(),
            scroll = 'setTop',
            oldItem = me.oldItem,
            newItem = me.newItem;

        if (direction == 'left' || direction == 'right') {
            scroll = 'setLeft';
        }

        me.currentEventController.resume();

        if (me.isReverse && oldItem && oldItem.renderElement && oldItem.renderElement.dom) {
            oldItem.renderElement[scroll](null);
        }
        else if (newItem && newItem.renderElement && newItem.renderElement.dom) {
            newItem.renderElement[scroll](null);
        }

        clearInterval(me.timer);
        me.isAnimating = false;
        me.fireEvent('animationend', me);
    }
});

/**
 * @private
 */
Ext.define('Ext.scroll.indicator.Default', {
    extend: 'Ext.scroll.indicator.Abstract',

    config: {
        cls: 'default'
    },

    setOffset: function(offset) {
        var axis = this.getAxis(),
            domStyle = this.element.dom.style;

        if (axis === 'x') {
            domStyle.webkitTransform = 'translate3d(' + offset + 'px, 0, 0)';
        }
        else {
            domStyle.webkitTransform = 'translate3d(0, ' + offset + 'px, 0)';
        }
    },

    updateValue: function(value) {
        var barLength = this.barLength,
            gapLength = this.gapLength,
            length = this.getLength(),
            newLength, offset, extra;

        if (value <= 0) {
            offset = 0;
            this.updateLength(this.applyLength(length + value * barLength));
        }
        else if (value >= 1) {
            extra = Math.round((value - 1) * barLength);
            newLength = this.applyLength(length - extra);
            extra = length - newLength;
            this.updateLength(newLength);
            offset = gapLength + extra;
        }
        else {
            offset = gapLength * value;
        }

        this.setOffset(offset);
    }
});

/**
 * @private
 */
Ext.define('Ext.scroll.indicator.ScrollPosition', {
    extend: 'Ext.scroll.indicator.Abstract',

    config: {
        cls: 'scrollposition'
    },

    getElementConfig: function() {
        var config = this.callParent(arguments);

        config.children.unshift({
            className: 'x-scroll-bar-stretcher'
        });

        return config;
    },

    updateValue: function(value) {
        if (this.gapLength === 0) {
            if (value > 1) {
                value = value - 1;
            }

            this.setOffset(this.barLength * value);
        }
        else {
            this.setOffset(this.gapLength * value);
        }
    },

    updateLength: function() {
        var scrollOffset = this.barLength,
            barDom = this.barElement.dom,
            element = this.element;

        this.callParent(arguments);

        if (this.getAxis() === 'x') {
            barDom.scrollLeft = scrollOffset;
            element.setLeft(scrollOffset);
        }
        else {
            barDom.scrollTop = scrollOffset;
            element.setTop(scrollOffset);
        }
    },

    setOffset: function(offset) {
        var barLength = this.barLength,
            minLength = this.getMinLength(),
            barDom = this.barElement.dom;

        offset = Math.min(barLength - minLength, Math.max(offset, minLength - this.getLength()));
        offset = barLength - offset;

        if (this.getAxis() === 'x') {
            barDom.scrollLeft = offset;
        }
        else {
            barDom.scrollTop = offset;
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.scroll.indicator.CssTransform', {
    extend: 'Ext.scroll.indicator.Abstract',

    config: {
        cls: 'csstransform'
    },

    getElementConfig: function() {
        var config = this.callParent();

        config.children[0].children = [
            {
                reference: 'startElement'
            },
            {
                reference: 'middleElement'
            },
            {
                reference: 'endElement'
            }
        ];

        return config;
    },

    refresh: function() {
        var axis = this.getAxis(),
            startElementDom = this.startElement.dom,
            endElementDom = this.endElement.dom,
            middleElement = this.middleElement,
            startElementLength, endElementLength;

        if (axis === 'x') {
            startElementLength = startElementDom.offsetWidth;
            endElementLength = endElementDom.offsetWidth;
            middleElement.setLeft(startElementLength);
        }
        else {
            startElementLength = startElementDom.offsetHeight;
            endElementLength = endElementDom.offsetHeight;
            middleElement.setTop(startElementLength);
        }

        this.startElementLength = startElementLength;
        this.endElementLength = endElementLength;

        this.callParent();
    },

    updateLength: function(length) {
        var axis = this.getAxis(),
            endElementStyle = this.endElement.dom.style,
            middleElementStyle = this.middleElement.dom.style,
            endElementLength = this.endElementLength,
            endElementOffset = length - endElementLength,
            middleElementLength = endElementOffset - this.startElementLength;

        if (axis === 'x') {
            endElementStyle.webkitTransform = 'translate3d(' + endElementOffset + 'px, 0, 0)';
            middleElementStyle.webkitTransform = 'translate3d(0, 0, 0) scaleX(' + middleElementLength + ')';
        }
        else {
            endElementStyle.webkitTransform = 'translate3d(0, ' + endElementOffset + 'px, 0)';
            middleElementStyle.webkitTransform = 'translate3d(0, 0, 0) scaleY(' + middleElementLength + ')';
        }
    },

    updateValue: function(value) {
        var barLength = this.barLength,
            gapLength = this.gapLength,
            length = this.getLength(),
            newLength, offset, extra;

        if (value <= 0) {
            offset = 0;
            this.updateLength(this.applyLength(length + value * barLength));
        }
        else if (value >= 1) {
            extra = Math.round((value - 1) * barLength);
            newLength = this.applyLength(length - extra);
            extra = length - newLength;
            this.updateLength(newLength);
            offset = gapLength + extra;
        }
        else {
            offset = gapLength * value;
        }

        this.setOffset(offset);
    },

    setOffset: function(offset) {
        var axis = this.getAxis(),
            elementStyle = this.element.dom.style;

        offset = Math.round(offset);

        if (axis === 'x') {
            elementStyle.webkitTransform = 'translate3d(' + offset + 'px, 0, 0)';
        }
        else {
            elementStyle.webkitTransform = 'translate3d(0, ' + offset + 'px, 0)';
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.scroll.Indicator', {
    requires: [
        'Ext.scroll.indicator.Default',
        'Ext.scroll.indicator.ScrollPosition',
        'Ext.scroll.indicator.CssTransform'
    ],

    alternateClassName: 'Ext.util.Indicator',

    constructor: function(config) {
        if (Ext.os.is.Android2 || Ext.os.is.Android3 || Ext.browser.is.ChromeMobile) {
            return new Ext.scroll.indicator.ScrollPosition(config);
        }
        else if (Ext.os.is.iOS) {
            return new Ext.scroll.indicator.CssTransform(config);
        }
        else {
            return new Ext.scroll.indicator.Default(config);
        }
    }
});

/**
 * @private
 *
 * This easing is typically used for {@link Ext.scroll.Scroller}. It's a combination of
 * {@link Ext.fx.easing.Momentum} and {@link Ext.fx.easing.Bounce}, which emulates deceleration when the animated element
 * is still within its boundary, then bouncing back (snapping) when it's out-of-bound.
 */

Ext.define('Ext.fx.easing.BoundMomentum', {
    extend: 'Ext.fx.easing.Abstract',

    requires: [
        'Ext.fx.easing.Momentum',
        'Ext.fx.easing.Bounce'
    ],

    config: {
        /**
         * @cfg {Object} momentum
         * A valid config object for {@link Ext.fx.easing.Momentum}
         * @accessor
         */
        momentum: null,

        /**
         * @cfg {Object} bounce
         * A valid config object for {@link Ext.fx.easing.Bounce}
         * @accessor
         */
        bounce: null,

        minMomentumValue: 0,

        maxMomentumValue: 0,

        /**
         * @cfg {Number} minVelocity
         * The minimum velocity to end this easing
         * @accessor
         */
        minVelocity: 0.01,

        /**
         * @cfg {Number} startVelocity
         * The start velocity
         * @accessor
         */
        startVelocity: 0
    },

    applyMomentum: function(config, currentEasing) {
        return Ext.factory(config, Ext.fx.easing.Momentum, currentEasing);
    },

    applyBounce: function(config, currentEasing) {
        return Ext.factory(config, Ext.fx.easing.Bounce, currentEasing);
    },

    updateStartTime: function(startTime) {
        this.getMomentum().setStartTime(startTime);

        this.callParent(arguments);
    },

    updateStartVelocity: function(startVelocity) {
        this.getMomentum().setStartVelocity(startVelocity);
    },

    updateStartValue: function(startValue) {
        this.getMomentum().setStartValue(startValue);
    },

    reset: function() {
        this.lastValue = null;

        this.isBouncingBack = false;

        this.isOutOfBound = false;

        return this.callParent(arguments);
    },

    getValue: function() {
        var momentum = this.getMomentum(),
            bounce = this.getBounce(),
            startVelocity = momentum.getStartVelocity(),
            direction = startVelocity > 0 ? 1 : -1,
            minValue = this.getMinMomentumValue(),
            maxValue = this.getMaxMomentumValue(),
            boundedValue = (direction == 1) ? maxValue : minValue,
            lastValue = this.lastValue,
            value, velocity;

        if (startVelocity === 0) {
            return this.getStartValue();
        }

        if (!this.isOutOfBound) {
            value = momentum.getValue();
            velocity = momentum.getVelocity();

            if (Math.abs(velocity) < this.getMinVelocity()) {
                this.isEnded = true;
            }

            if (value >= minValue && value <= maxValue) {
                return value;
            }

            this.isOutOfBound = true;

            bounce.setStartTime(Ext.Date.now())
                  .setStartVelocity(velocity)
                  .setStartValue(boundedValue);
        }

        value = bounce.getValue();

        if (!this.isEnded) {
            if (!this.isBouncingBack) {
                if (lastValue !== null) {
                    if ((direction == 1 && value < lastValue) || (direction == -1 && value > lastValue)) {
                        this.isBouncingBack = true;
                    }
                }
            }
            else {
                if (Math.round(value) == boundedValue) {
                    this.isEnded = true;
                }
            }
        }

        this.lastValue = value;

        return value;
    }
});

/**
 * @class Ext.scroll.Scroller
 * @author Jacky Nguyen <jacky@sencha.com>
 *
 * Momentum scrolling is one of the most important part of the framework's UI layer. In Sencha Touch there are
 * several scroller implementations so we can have the best performance on all mobile devices and browsers.
 *
 * Scroller settings can be changed using the {@link Ext.Container#scrollable scrollable} configuration in
 * {@link Ext.Container}. Anything you pass to that method will be passed to the scroller when it is
 * instanciated in your container.
 *
 * Please note that the {@link Ext.Container#getScrollable} method returns an instance of {@link Ext.scroll.View}.
 * So if you need to get access to the scroller after your container has been instansiated, you must used the
 * {@link Ext.scroll.View#getScroller} method.
 *
 *     //lets assume container is a container you have
 *     //created which is scrollable
 *     container.getScrollable.getScroller().setFps(10);
 *
 * ## Example
 *
 * Here is a simple example of how to adjust the scroller settings when using a {@link Ext.Container} (or anything
 * that extends it).
 *
 *     @example
 *     var container = Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         html: 'This container is scrollable!',
 *         scrollable: {
 *             direction: 'vertical'
 *         }
 *     });
 *
 * As you can see, we are passing the {@link #direction} configuration into the scroller instance in our container.
 *
 * You can pass any of the configs below in that {@link Ext.Container#scrollable scrollable} configuration and it will
 * just work.
 *
 * Go ahead and try it in the live code editor above!
 */
Ext.define('Ext.scroll.Scroller', {

    extend: 'Ext.Evented',

    requires: [
        'Ext.fx.easing.BoundMomentum',
        'Ext.fx.easing.EaseOut',
        'Ext.util.SizeMonitor',
        'Ext.util.Translatable'
    ],

    /**
     * @event maxpositionchange
     * Fires whenever the maximum position has changed
     * @param {Ext.scroll.Scroller} this
     * @param {Number} maxPosition The new maximum position
     */

    /**
     * @event refresh
     * Fires whenever the Scroller is refreshed
     * @param {Ext.scroll.Scroller} this
     */

    /**
     * @event scrollstart
     * Fires whenever the scrolling is started
     * @param {Ext.scroll.Scroller} this
     * @param {Number} x The current x position
     * @param {Number} y The current y position
     */

    /**
     * @event scrollend
     * Fires whenever the scrolling is ended
     * @param {Ext.scroll.Scroller} this
     * @param {Number} x The current x position
     * @param {Number} y The current y position
     */

    /**
     * @event scroll
     * Fires whenever the Scroller is scrolled
     * @param {Ext.scroll.Scroller} this
     * @param {Number} x The new x position
     * @param {Number} y The new y position
     */

    config: {
        /**
         * @cfg
         * @private
         */
        element: null,

        /**
         * @cfg {String} direction
         * Possible values: 'auto', 'vertical', 'horizontal', or 'both'
         * @accessor
         */
        direction: 'auto',

        /**
         * @cfg
         * @private
         */
        fps: 'auto',

        /**
         * @cfg {Boolean} disabled
         * Whether or not this component is disabled
         * @accessor
         */
        disabled: null,

        /**
         * @cfg {Boolean} directionLock
         * True to lock the direction of the scroller when the user starts scrolling.
         * This is useful when putting a scroller inside a scroller or a {@link Ext.Carousel}.
         * @accessor
         */
        directionLock: false,

        /**
         * @cfg {Object} momentumEasing
         * A valid config for {@link Ext.fx.easing.BoundMomentum}. The default value is:
         *
         *     {
         *         momentum: {
         *             acceleration: 30,
         *             friction: 0.5
         *         },
         *         bounce: {
         *             acceleration: 30,
         *             springTension: 0.3
         *         }
         *     }
         *
         * Note that supplied object will be recursively merged with the default object. For example: you can simply
         * pass this to change the momentum acceleration only
         *
         *     {
         *         momentum: {
         *             acceleration: 10
         *         }
         *     }
         *
         * @accessor
         */
        momentumEasing: {
            momentum: {
                acceleration: 30,
                friction: 0.5
            },

            bounce: {
                acceleration: 30,
                springTension: 0.3
            },

            minVelocity: 1
        },

        /**
         * @cfg
         * @private
         */
        bounceEasing: {
            duration: 400
        },

        /**
         * @cfg
         * @private
         */
        outOfBoundRestrictFactor: 0.5,

        /**
         * @cfg
         * @private
         */
        startMomentumResetTime: 300,

        /**
         * @cfg
         * @private
         */
        maxAbsoluteVelocity: 6,

        /**
         * @cfg
         * @private
         */
        containerSize: 'auto',

        /**
         * @cfg
         * @private
         */
        size: 'auto',

        /**
         * @cfg
         * @private
         */
        autoRefresh: true,

        /**
         * @cfg {Object/Number} initialOffset
         * The initial scroller position.  When specified as Number,
         * both x and y will be set to that value.
         */
        initialOffset: {
            x: 0,
            y: 0
        },

        /**
         * @cfg {Number/Object} slotSnapSize
         * The size of each slot to snap to in 'px', can be either an object with x and y values, i.e:
         *
         *      {
         *          x: 50,
         *          y: 100
         *      }
         *
         * or a number value to be used for both directions. For example: a value of '`50`' will be treated as:
         *
         *      {
         *          x: 50,
         *          y: 50
         *      }
         *
         * @accessor
         */
        slotSnapSize: {
            x: 0,
            y: 0
        },

        /**
         * @cfg
         * @private
         */
        slotSnapOffset: {
            x: 0,
            y: 0
        },

        slotSnapEasing: {
            duration: 150
        },

        translatable: {
            translationMethod: 'auto',
            useWrapper: false
        }
    },

    cls: Ext.baseCSSPrefix + 'scroll-scroller',

    containerCls: Ext.baseCSSPrefix + 'scroll-container',

    dragStartTime: 0,

    dragEndTime: 0,

    isDragging: false,

    isAnimating: false,

    /**
     * @private
     */
    constructor: function(config) {
        var element = config && config.element;

        this.listeners = {
            scope: this,
            touchstart: 'onTouchStart',
            touchend: 'onTouchEnd',
            dragstart: 'onDragStart',
            drag: 'onDrag',
            dragend: 'onDragEnd'
        };

        this.minPosition = { x: 0, y: 0 };

        this.startPosition = { x: 0, y: 0 };

        this.position = { x: 0, y: 0 };

        this.velocity = { x: 0, y: 0 };

        this.isAxisEnabledFlags = { x: false, y: false };

        this.flickStartPosition = { x: 0, y: 0 };

        this.flickStartTime = { x: 0, y: 0 };

        this.lastDragPosition = { x: 0, y: 0 };

        this.dragDirection = { x: 0, y: 0};

        this.initialConfig = config;

        if (element) {
            this.setElement(element);
        }

        return this;
    },

    /**
     * @private
     */
    applyElement: function(element) {
        if (!element) {
            return;
        }

        return Ext.get(element);
    },

    /**
     * @private
     */
    updateElement: function(element) {
        this.initialize();

        element.addCls(this.cls);

        if (!this.getDisabled()) {
            this.attachListeneners();
        }

        this.onConfigUpdate(['containerSize', 'size'], 'refreshMaxPosition');

        this.on('maxpositionchange', 'snapToBoundary');
        this.on('minpositionchange', 'snapToBoundary');

        return this;
    },

    applyTranslatable: function(config, translatable) {
        return Ext.factory(config, Ext.util.Translatable, translatable);
    },

    updateTranslatable: function(translatable) {
        translatable.setConfig({
            element: this.getElement(),
            listeners: {
                animationframe: 'onAnimationFrame',
                animationend: 'onAnimationEnd',
                scope: this
            }
        });
    },

    updateFps: function(fps) {
        if (fps !== 'auto') {
            this.getTranslatable().setFps(fps);
        }
    },

    /**
     * @private
     */
    attachListeneners: function() {
        this.getContainer().on(this.listeners);
    },

    /**
     * @private
     */
    detachListeners: function() {
        this.getContainer().un(this.listeners);
    },

    /**
     * @private
     */
    updateDisabled: function(disabled) {
        if (disabled) {
            this.detachListeners();
        }
        else {
            this.attachListeneners();
        }
    },

    updateInitialOffset: function(initialOffset) {
        if (typeof initialOffset == 'number') {
            initialOffset = {
                x: initialOffset,
                y: initialOffset
            };
        }

        var position = this.position,
            x, y;

        position.x = x = initialOffset.x;
        position.y = y = initialOffset.y;

        this.getTranslatable().translate(-x, -y);
    },

    /**
     * @private
     */
    applyDirection: function(direction) {
        var minPosition = this.getMinPosition(),
            maxPosition = this.getMaxPosition(),
            isHorizontal, isVertical;

        this.givenDirection = direction;

        if (direction === 'auto') {
            isHorizontal = maxPosition.x > minPosition.x;
            isVertical = maxPosition.y > minPosition.y;

            if (isHorizontal && isVertical) {
                direction = 'both';
            }
            else if (isHorizontal) {
                direction = 'horizontal';
            }
            else {
                direction = 'vertical';
            }
        }

        return direction;
    },

    /**
     * @private
     */
    updateDirection: function(direction) {
        var isAxisEnabled = this.isAxisEnabledFlags;

        isAxisEnabled.x = (direction === 'both' || direction === 'horizontal');
        isAxisEnabled.y = (direction === 'both' || direction === 'vertical');
    },

    /**
     * Returns true if a specified axis is enabled
     * @param {String} axis The axis to check (`x` or `y`).
     * @return {Boolean} True if the axis is enabled
     */
    isAxisEnabled: function(axis) {
        this.getDirection();

        return this.isAxisEnabledFlags[axis];
    },

    /**
     * @private
     */
    applyMomentumEasing: function(easing) {
        var defaultClass = Ext.fx.easing.BoundMomentum;

        return {
            x: Ext.factory(easing, defaultClass),
            y: Ext.factory(easing, defaultClass)
        };
    },

    /**
     * @private
     */
    applyBounceEasing: function(easing) {
        var defaultClass = Ext.fx.easing.EaseOut;

        return {
            x: Ext.factory(easing, defaultClass),
            y: Ext.factory(easing, defaultClass)
        };
    },

    updateBounceEasing: function(easing) {
        this.getTranslatable().setEasingX(easing.x).setEasingY(easing.y);
    },

    /**
     * @private
     */
    applySlotSnapEasing: function(easing) {
        var defaultClass = Ext.fx.easing.EaseOut;

        return {
            x: Ext.factory(easing, defaultClass),
            y: Ext.factory(easing, defaultClass)
        };
    },

    /**
     * @private
     */
    getMinPosition: function() {
        var minPosition = this.minPosition;

        if (!minPosition) {
            this.minPosition = minPosition = {
                x: 0,
                y: 0
            };

            this.fireEvent('minpositionchange', this, minPosition);
        }

        return minPosition;
    },

    /**
     * @private
     */
    getMaxPosition: function() {
        var maxPosition = this.maxPosition,
            size, containerSize;

        if (!maxPosition) {
            size = this.getSize();
            containerSize = this.getContainerSize();

            this.maxPosition = maxPosition = {
                x: Math.max(0, size.x - containerSize.x),
                y: Math.max(0, size.y - containerSize.y)
            };

            this.fireEvent('maxpositionchange', this, maxPosition);
        }

        return maxPosition;
    },

    /**
     * @private
     */
    refreshMaxPosition: function() {
        this.maxPosition = null;
        this.getMaxPosition();
    },

    /**
     * @private
     */
    applyContainerSize: function(size) {
        var containerDom = this.getContainer().dom,
            x, y;

        if (!containerDom) {
            return;
        }

        this.givenContainerSize = size;

        if (size === 'auto') {
            x = containerDom.offsetWidth;
            y = containerDom.offsetHeight;
        }
        else {
            x = size.x;
            y = size.y;
        }

        return {
            x: x,
            y: y
        };
    },

    /**
     * @private
     */
    applySize: function(size) {
        var dom = this.getElement().dom,
            x, y;

        if (!dom) {
            return;
        }

        this.givenSize = size;

        if (size === 'auto') {
            x = dom.offsetWidth;
            y = dom.offsetHeight;
        }
        else if (typeof size == 'number') {
            x = size;
            y = size;
        }
        else {
            x = size.x;
            y = size.y;
        }

        return {
            x: x,
            y: y
        };
    },

    /**
     * @private
     */
    updateAutoRefresh: function(autoRefresh) {
        var SizeMonitor = Ext.util.SizeMonitor,
            sizeMonitors;

        if (autoRefresh) {
            this.sizeMonitors = {
                element: new SizeMonitor({
                    element: this.getElement(),
                    callback: this.doRefresh,
                    scope: this
                }),
                container: new SizeMonitor({
                    element: this.getContainer(),
                    callback: this.doRefresh,
                    scope: this
                })
            };
        }
        else {
            sizeMonitors = this.sizeMonitors;

            if (sizeMonitors) {
                sizeMonitors.element.destroy();
                sizeMonitors.container.destroy();
            }
        }
    },

    applySlotSnapSize: function(snapSize) {
        if (typeof snapSize == 'number') {
            return {
                x: snapSize,
                y: snapSize
            }
        }

        return snapSize;
    },

    applySlotSnapOffset: function(snapOffset) {
        if (typeof snapOffset == 'number') {
            return {
                x: snapOffset,
                y: snapOffset
            }
        }

        return snapOffset;
    },

    /**
     * @private
     * Returns the container for this scroller
     */
    getContainer: function() {
        var container = this.container;

        if (!container) {
            this.container = container = this.getElement().getParent();
            container.addCls(this.containerCls);
        }

        return container;
    },

    /**
     * @private
     */
    doRefresh: function() {
        this.stopAnimation();

        this.getTranslatable().refresh();
        this.setSize(this.givenSize);
        this.setContainerSize(this.givenContainerSize);
        this.setDirection(this.givenDirection);

        this.fireEvent('refresh', this);
    },

    /**
     * @private
     * @return {Ext.scroll.Scroller} this
     */
    refresh: function() {
        var sizeMonitors = this.sizeMonitors;

        if (sizeMonitors) {
            sizeMonitors.element.refresh();
            sizeMonitors.container.refresh();
        }

        this.doRefresh();

        return this;
    },

    /**
     * Scrolls to the given location
     *
     * @param {Number} x The scroll position on the x axis
     * @param {Number} y The scroll position on the y axis
     * @param {Boolean/Object} animation (Optional) Whether or not to animate the scrolling to the new position
     *
     * @return {Ext.scroll.Scroller} this
     */
    scrollTo: function(x, y, animation) {

        var translatable = this.getTranslatable(),
            position = this.position,
            positionChanged = false,
            translationX, translationY;

        if (this.isAxisEnabled('x')) {
            if (typeof x != 'number') {
                x = position.x;
            }
            else {
                if (position.x !== x) {
                    position.x = x;
                    positionChanged = true;
                }
            }

            translationX = -x;
        }

        if (this.isAxisEnabled('y')) {
            if (typeof y != 'number') {
                y = position.y;
            }
            else {
                if (position.y !== y) {
                    position.y = y;
                    positionChanged = true;
                }
            }

            translationY = -y;
        }

        if (positionChanged) {
            if (animation !== undefined) {
                translatable.translateAnimated(translationX, translationY, animation);
            }
            else {
                this.fireEvent('scroll', this, position.x, position.y);
                translatable.translate(translationX, translationY);
            }
        }

        return this;
    },

    /**
     * @private
     */
    scrollToTop: function(animation) {
        var initialOffset = this.getInitialOffset();

        return this.scrollTo(initialOffset.x, initialOffset.y, animation);
    },

    /**
     * Scrolls to the end of the scrollable view
     * @return {Ext.scroll.Scroller} this
     */
    scrollToEnd: function(animation) {
        var size    = this.getSize(),
            cntSize = this.getContainerSize();

        return this.scrollTo(size.x - cntSize.x, size.y - cntSize.y, animation);
    },

    /**
     * Change the scroll offset by the given amount
     * @param {Number} x The offset to scroll by on the x axis
     * @param {Number} y The offset to scroll by on the y axis
     * @return {Ext.scroll.Scroller} this
     */
    scrollBy: function(x, y, animation) {
        var position = this.position;

        x = (typeof x == 'number') ? x + position.x : null;
        y = (typeof y == 'number') ? y + position.y : null;

        return this.scrollTo(x, y, animation);
    },

    /**
     * @private
     */
    onTouchStart: function() {
        this.isTouching = true;
        this.stopAnimation();
    },

    /**
     * @private
     */
    onTouchEnd: function() {
        var position = this.position;

        this.isTouching = false;

        if (!this.isDragging && this.snapToSlot()) {
            this.fireEvent('scrollstart', this, position.x, position.y);
        }
    },

    /**
     * @private
     */
    onDragStart: function(e) {
        var direction = this.getDirection(),
            absDeltaX = e.absDeltaX,
            absDeltaY = e.absDeltaY,
            directionLock = this.getDirectionLock(),
            startPosition = this.startPosition,
            flickStartPosition = this.flickStartPosition,
            flickStartTime = this.flickStartTime,
            lastDragPosition = this.lastDragPosition,
            currentPosition = this.position,
            dragDirection = this.dragDirection,
            x = currentPosition.x,
            y = currentPosition.y,
            now = Ext.Date.now();

        this.isDragging = true;

        if (directionLock && direction !== 'both') {
            if ((direction === 'horizontal' && absDeltaX > absDeltaY)
                    || (direction === 'vertical' && absDeltaY > absDeltaX)) {
                e.stopPropagation();
            }
            else {
                this.isDragging = false;
                return;
            }
        }

        lastDragPosition.x = x;
        lastDragPosition.y = y;

        flickStartPosition.x = x;
        flickStartPosition.y = y;

        startPosition.x = x;
        startPosition.y = y;

        flickStartTime.x = now;
        flickStartTime.y = now;

        dragDirection.x = 0;
        dragDirection.y = 0;

        this.dragStartTime = now;

        this.isDragging = true;

        this.fireEvent('scrollstart', this, x, y);
    },

    /**
     * @private
     */
    onAxisDrag: function(axis, delta) {
        if (!this.isAxisEnabled(axis)) {
            return;
        }

        var flickStartPosition = this.flickStartPosition,
            flickStartTime = this.flickStartTime,
            lastDragPosition = this.lastDragPosition,
            dragDirection = this.dragDirection,
            old = this.position[axis],
            min = this.getMinPosition()[axis],
            max = this.getMaxPosition()[axis],
            start = this.startPosition[axis],
            last = lastDragPosition[axis],
            current = start - delta,
            lastDirection = dragDirection[axis],
            restrictFactor = this.getOutOfBoundRestrictFactor(),
            startMomentumResetTime = this.getStartMomentumResetTime(),
            now = Ext.Date.now(),
            distance;

        if (current < min) {
            current *= restrictFactor;
        }
        else if (current > max) {
            distance = current - max;
            current = max + distance * restrictFactor;
        }

        if (current > last) {
            dragDirection[axis] = 1;
        }
        else if (current < last) {
            dragDirection[axis] = -1;
        }

        if ((lastDirection !== 0 && (dragDirection[axis] !== lastDirection))
                || (now - flickStartTime[axis]) > startMomentumResetTime) {
            flickStartPosition[axis] = old;
            flickStartTime[axis] = now;
        }

        lastDragPosition[axis] = current;
    },

    /**
     * @private
     */
    onDrag: function(e) {
        if (!this.isDragging) {
            return;
        }

        var lastDragPosition = this.lastDragPosition;

        this.onAxisDrag('x', e.deltaX);
        this.onAxisDrag('y', e.deltaY);

        this.scrollTo(lastDragPosition.x, lastDragPosition.y);
    },

    /**
     * @private
     */
    onDragEnd: function(e) {
        var easingX, easingY;

        if (!this.isDragging) {
            return;
        }

        this.dragEndTime = Ext.Date.now();

        this.onDrag(e);

        this.isDragging = false;

        easingX = this.getAnimationEasing('x');
        easingY = this.getAnimationEasing('y');

        if (easingX || easingY) {
            this.getTranslatable().animate(easingX, easingY);
        }
        else {
            this.onScrollEnd();
        }
    },

    /**
     * @private
     */
    getAnimationEasing: function(axis) {
        if (!this.isAxisEnabled(axis)) {
            return null;
        }

        var currentPosition = this.position[axis],
            flickStartPosition = this.flickStartPosition[axis],
            flickStartTime = this.flickStartTime[axis],
            minPosition = this.getMinPosition()[axis],
            maxPosition = this.getMaxPosition()[axis],
            maxAbsVelocity = this.getMaxAbsoluteVelocity(),
            boundValue = null,
            dragEndTime = this.dragEndTime,
            easing, velocity, duration;

        if (currentPosition < minPosition) {
            boundValue = minPosition;
        }
        else if (currentPosition > maxPosition) {
            boundValue = maxPosition;
        }

        // Out of bound, to be pulled back
        if (boundValue !== null) {
            easing = this.getBounceEasing()[axis];
            easing.setConfig({
                startTime: dragEndTime,
                startValue: -currentPosition,
                endValue: -boundValue
            });

            return easing;
        }

        // Still within boundary, start deceleration
        duration = dragEndTime - flickStartTime;

        if (duration === 0) {
            return null;
        }

        velocity = (currentPosition - flickStartPosition) / (dragEndTime - flickStartTime);

        if (velocity === 0) {
            return null;
        }

        if (velocity < -maxAbsVelocity) {
            velocity = -maxAbsVelocity;
        }
        else if (velocity > maxAbsVelocity) {
            velocity = maxAbsVelocity;
        }

        easing = this.getMomentumEasing()[axis];
        easing.setConfig({
            startTime: dragEndTime,
            startValue: -currentPosition,
            startVelocity: -velocity,
            minMomentumValue: -maxPosition,
            maxMomentumValue: 0
        });

        return easing;
    },

    /**
     * @private
     */
    onAnimationFrame: function(translatable, x, y) {
        var position = this.position;

        position.x = -x;
        position.y = -y;

        this.fireEvent('scroll', this, position.x, position.y);
    },

    /**
     * @private
     */
    onAnimationEnd: function() {
        this.snapToBoundary();
        this.onScrollEnd();
    },

    /**
     * @private
     * Stops the animation of the scroller at any time.
     */
    stopAnimation: function() {
        this.getTranslatable().stopAnimation();
    },

    /**
     * @private
     */
    onScrollEnd: function() {
        var position = this.position;

        if (this.isTouching || !this.snapToSlot()) {
            this.fireEvent('scrollend', this, position.x, position.y);
        }
    },

    /**
     * @private
     */
    snapToSlot: function() {
        var snapX = this.getSnapPosition('x'),
            snapY = this.getSnapPosition('y'),
            easing = this.getSlotSnapEasing();

        if (snapX !== null || snapY !== null) {
            this.scrollTo(snapX, snapY, {
                easingX: easing.x,
                easingY: easing.y
            });

            return true;
        }

        return false;
    },

    /**
     * @private
     */
    getSnapPosition: function(axis) {
        var snapSize = this.getSlotSnapSize()[axis],
            snapPosition = null,
            position, snapOffset, maxPosition, mod;

        if (snapSize !== 0 && this.isAxisEnabled(axis)) {
            position = this.position[axis];
            snapOffset = this.getSlotSnapOffset()[axis];
            maxPosition = this.getMaxPosition()[axis];

            mod = (position - snapOffset) % snapSize;

            if (mod !== 0) {
                if (Math.abs(mod) > snapSize / 2) {
                    snapPosition = position + ((mod > 0) ? snapSize - mod : mod - snapSize);

                    if (snapPosition > maxPosition) {
                        snapPosition = position - mod;
                    }
                }
                else {
                    snapPosition = position - mod;
                }
            }
        }

        return snapPosition;
    },

    /**
     * @private
     */
    snapToBoundary: function() {
        var position = this.position,
            minPosition = this.getMinPosition(),
            maxPosition = this.getMaxPosition(),
            minX = minPosition.x,
            minY = minPosition.y,
            maxX = maxPosition.x,
            maxY = maxPosition.y,
            x = Math.round(position.x),
            y = Math.round(position.y);

        if (x < minX) {
            x = minX;
        }
        else if (x > maxX) {
            x = maxX;
        }

        if (y < minY) {
            y = minY;
        }
        else if (y > maxY) {
            y = maxY;
        }

        this.scrollTo(x, y);
    },

    destroy: function() {
        var element = this.getElement(),
            sizeMonitors = this.sizeMonitors;

        if (sizeMonitors) {
            sizeMonitors.element.destroy();
            sizeMonitors.container.destroy();
        }

        if (element && !element.isDestroyed) {
            element.removeCls(this.cls);
            this.getContainer().removeCls(this.containerCls);
        }

        Ext.destroy(this.getTranslatable());

        this.callParent(arguments);
    }

}, function() {
});

/**
 * This is a simple container that is used to combile content and a {@link Ext.scroll.View} instance. It also
 * provides scroll indicators.
 *
 * 99% of the time all you need to use in this class is {@link #getScroller}.
 *
 * This should never should be extended.
 */
Ext.define('Ext.scroll.View', {
    extend: 'Ext.Evented',

    alternateClassName: 'Ext.util.ScrollView',

    requires: [
        'Ext.scroll.Scroller',
        'Ext.scroll.Indicator'
    ],

    config: {
        /**
         * @cfg {String} indicatorsUi
         * The style of the indicators of this view. Available options are `dark` or `light`.
         */
        indicatorsUi: 'dark',

        element: null,

        scroller: {},

        indicators: {
            x: {
                axis: 'x'
            },
            y: {
                axis: 'y'
            }
        },

        indicatorsHidingDelay: 100,

        cls: Ext.baseCSSPrefix + 'scroll-view'
    },

    /**
     * @method getScroller
     * Returns the scroller instance in this view. Checkout the documentation of {@link Ext.scroll.Scroller} and
     * {@link Ext.Container#getScrollable} for more information.
     * @return {Ext.scroll.View} The scroller
     */

    /**
     * @private
     */
    processConfig: function(config) {
        if (!config) {
            return null;
        }

        if (typeof config == 'string') {
            config = {
                direction: config
            };
        }

        config = Ext.merge({}, config);

        var scrollerConfig = config.scroller,
            name;

        if (!scrollerConfig) {
            config.scroller = scrollerConfig = {};
        }

        for (name in config) {
            if (config.hasOwnProperty(name)) {
                if (!this.hasConfig(name)) {
                    scrollerConfig[name] = config[name];
                    delete config[name];
                }
            }
        }

        return config;
    },

    constructor: function(config) {
        config = this.processConfig(config);

        this.useIndicators = { x: true, y: true };

        this.doHideIndicators = Ext.Function.bind(this.doHideIndicators, this);

        this.initConfig(config);
    },

    setConfig: function(config) {
        return this.callParent([this.processConfig(config)]);
    },

    updateIndicatorsUi: function(newUi) {
        var indicators = this.getIndicators();
        indicators.x.setUi(newUi);
        indicators.y.setUi(newUi);
    },

    applyScroller: function(config, currentScroller) {
        return Ext.factory(config, Ext.scroll.Scroller, currentScroller);
    },

    applyIndicators: function(config, indicators) {
        var defaultClass = Ext.scroll.Indicator,
            useIndicators = this.useIndicators;

        if (!config) {
            config = {};
        }

        if (!config.x) {
            useIndicators.x = false;
            config.x = {};
        }

        if (!config.y) {
            useIndicators.y = false;
            config.y = {};
        }

        return {
            x: Ext.factory(config.x, defaultClass, indicators && indicators.x),
            y: Ext.factory(config.y, defaultClass, indicators && indicators.y)
        };
    },

    updateIndicators: function(indicators) {
        this.indicatorsGrid = Ext.Element.create({
            className: 'x-scroll-bar-grid-wrapper',
            children: [{
                className: 'x-scroll-bar-grid',
                children: [
                    {
                        children: [{}, {
                            children: [indicators.y.barElement]
                        }]
                    },
                    {
                        children: [{
                            children: [indicators.x.barElement]
                        }, {}]
                    }
                ]
            }]
        });
    },

    updateScroller: function(scroller) {
        scroller.on({
            scope: this,
            scrollstart: 'onScrollStart',
            scroll: 'onScroll',
            scrollend: 'onScrollEnd',
            refresh: 'refreshIndicators'
        });
    },

    isAxisEnabled: function(axis) {
        return this.getScroller().isAxisEnabled(axis) && this.useIndicators[axis];
    },

    applyElement: function(element) {
        if (element) {
            return Ext.get(element);
        }
    },

    updateElement: function(element) {
        var scrollerElement = element.getFirstChild().getFirstChild(),
            scroller = this.getScroller();

        element.addCls(this.getCls());
        element.insertFirst(this.indicatorsGrid);

        scroller.setElement(scrollerElement);

        this.refreshIndicators();

        return this;
    },

    showIndicators: function() {
        var indicators = this.getIndicators();

        if (this.hasOwnProperty('indicatorsHidingTimer')) {
            clearTimeout(this.indicatorsHidingTimer);
            delete this.indicatorsHidingTimer;
        }

        if (this.isAxisEnabled('x')) {
            indicators.x.show();
        }

        if (this.isAxisEnabled('y')) {
            indicators.y.show();
        }
    },

    hideIndicators: function() {
        var delay = this.getIndicatorsHidingDelay();

        if (delay > 0) {
            this.indicatorsHidingTimer = setTimeout(this.doHideIndicators, delay);
        }
        else {
            this.doHideIndicators();
        }
    },

    doHideIndicators: function() {
        var indicators = this.getIndicators();

        if (this.isAxisEnabled('x')) {
            indicators.x.hide();
        }

        if (this.isAxisEnabled('y')) {
            indicators.y.hide();
        }
    },

    onScrollStart: function() {
        this.onScroll.apply(this, arguments);
        this.showIndicators();
    },

    onScrollEnd: function() {
        this.hideIndicators();
    },

    onScroll: function(scroller, x, y) {
        this.setIndicatorValue('x', x);
        this.setIndicatorValue('y', y);

    },


    setIndicatorValue: function(axis, scrollerPosition) {
        if (!this.isAxisEnabled(axis)) {
            return this;
        }

        var scroller = this.getScroller(),
            scrollerMaxPosition = scroller.getMaxPosition()[axis],
            scrollerContainerSize = scroller.getContainerSize()[axis],
            value;

        if (scrollerMaxPosition === 0) {
            value = scrollerPosition / scrollerContainerSize;

            if (scrollerPosition >= 0) {
                value += 1;
            }
        }
        else {
            if (scrollerPosition > scrollerMaxPosition) {
                value = 1 + ((scrollerPosition - scrollerMaxPosition) / scrollerContainerSize);
            }
            else if (scrollerPosition < 0) {
                value = scrollerPosition / scrollerContainerSize;
            }
            else {
                value = scrollerPosition / scrollerMaxPosition;
            }
        }

        this.getIndicators()[axis].setValue(value);
    },

    refreshIndicator: function(axis) {
        if (!this.isAxisEnabled(axis)) {
            return this;
        }

        var scroller = this.getScroller(),
            indicator = this.getIndicators()[axis],
            scrollerContainerSize = scroller.getContainerSize()[axis],
            scrollerSize = scroller.getSize()[axis],
            ratio = scrollerContainerSize / scrollerSize;

        indicator.setRatio(ratio);
        indicator.refresh();
    },

    refresh: function() {
        return this.getScroller().refresh();
    },

    refreshIndicators: function() {
        var indicators = this.getIndicators();

        indicators.x.setActive(this.isAxisEnabled('x'));
        indicators.y.setActive(this.isAxisEnabled('y'));

        this.refreshIndicator('x');
        this.refreshIndicator('y');
    },

    destroy: function() {
        var element = this.getElement(),
            indicators = this.getIndicators();

        Ext.destroy(this.getScroller(), this.indicatorsGrid);

        if (this.hasOwnProperty('indicatorsHidingTimer')) {
            clearTimeout(this.indicatorsHidingTimer);
            delete this.indicatorsHidingTimer;
        }

        if (element && !element.isDestroyed) {
            element.removeCls(this.getCls());
        }

        indicators.x.destroy();
        indicators.y.destroy();

        delete this.indicatorsGrid;

        this.callParent(arguments);
    }
});

/**
 * @private
 */
Ext.define('Ext.behavior.Scrollable', {

    extend: 'Ext.behavior.Behavior',

    requires: [
        'Ext.scroll.View'
    ],

    constructor: function() {
        this.listeners = {
            painted: 'onComponentPainted',
            scope: this
        };

        this.callParent(arguments);
    },

    onComponentPainted: function() {
        this.scrollView.refresh();
    },

    setConfig: function(config) {
        var scrollView = this.scrollView,
            component = this.component,
            scrollerElement;

        if (config) {
            if (!scrollView) {
                this.scrollView = scrollView = new Ext.scroll.View(config);
                scrollView.on('destroy', 'onScrollViewDestroy', this);

                component.setUseBodyElement(true);

                this.scrollerElement = scrollerElement = component.innerElement;
                this.scrollContainer = scrollerElement.wrap();

                scrollView.setElement(component.bodyElement);

                if (component.isPainted()) {
                    this.onComponentPainted(component);
                }

                component.on(this.listeners);
            }
            else if (Ext.isString(config) || Ext.isObject(config)) {
                scrollView.setConfig(config);
            }
        }
        else if (scrollView) {
            scrollView.destroy();
        }

        return this;
    },

    getScrollView: function() {
        return this.scrollView;
    },

    onScrollViewDestroy: function() {
        var component = this.component,
            scrollerElement = this.scrollerElement;

        if (!scrollerElement.isDestroyed) {
            this.scrollerElement.unwrap();
        }

        this.scrollContainer.destroy();

        component.un(this.listeners);

        delete this.scrollerElement;
        delete this.scrollView;
        delete this.scrollContainer;
    },

    onComponentDestroy: function() {
        var scrollView = this.scrollView;

        if (scrollView) {
            scrollView.destroy();
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Style', {

    extend: 'Ext.fx.layout.card.Abstract',

    requires: [
        'Ext.fx.Animation'
    ],

    config: {
        inAnimation: {
            before: {
                visibility: null
            },
            preserveEndState: false,
            replacePrevious: true
        },

        outAnimation: {
            preserveEndState: false,
            replacePrevious: true
        }
    },

    constructor: function(config) {
        var inAnimation, outAnimation;

        this.initConfig(config);

        this.endAnimationCounter = 0;

        inAnimation = this.getInAnimation();
        outAnimation = this.getOutAnimation();

        inAnimation.on('animationend', 'incrementEnd', this);
        outAnimation.on('animationend', 'incrementEnd', this);
    },

    updateDirection: function(direction) {
        this.getInAnimation().setDirection(direction);
        this.getOutAnimation().setDirection(direction);
    },

    updateDuration: function(duration) {
        this.getInAnimation().setDuration(duration);
        this.getOutAnimation().setDuration(duration);
    },

    updateReverse: function(reverse) {
        this.getInAnimation().setReverse(reverse);
        this.getOutAnimation().setReverse(reverse);
    },

    incrementEnd: function() {
        this.endAnimationCounter++;

        if (this.endAnimationCounter > 1) {
            this.endAnimationCounter = 0;
            this.fireEvent('animationend', this);
        }
    },

    applyInAnimation: function(animation, inAnimation) {
        return Ext.factory(animation, Ext.fx.Animation, inAnimation);
    },

    applyOutAnimation: function(animation, outAnimation) {
        return Ext.factory(animation, Ext.fx.Animation, outAnimation);
    },

    updateInAnimation: function(animation) {
        animation.setScope(this);
    },

    updateOutAnimation: function(animation) {
        animation.setScope(this);
    },

    onActiveItemChange: function(cardLayout, newItem, oldItem, options, controller) {
        var inAnimation = this.getInAnimation(),
            outAnimation = this.getOutAnimation(),
            inElement, outElement;

        if (newItem && oldItem && oldItem.isPainted()) {
            inElement = newItem.renderElement;
            outElement = oldItem.renderElement;

            inAnimation.setElement(inElement);
            outAnimation.setElement(outElement);

            outAnimation.setOnBeforeEnd(function(element, interrupted) {
                if (interrupted || Ext.Animator.hasRunningAnimations(element)) {
                    controller.firingArguments[1] = null;
                    controller.firingArguments[2] = null;
                }
            });
            outAnimation.setOnEnd(function() {
                controller.resume();
            });

            inElement.dom.style.setProperty('visibility', 'hidden', '!important');
            newItem.show();

            Ext.Animator.run([outAnimation, inAnimation]);
            controller.pause();
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Slide', {
    extend: 'Ext.fx.layout.card.Style',

    alias: 'fx.layout.card.slide',

    config: {
        inAnimation: {
            type: 'slide',
            easing: 'ease-out'
        },
        outAnimation: {
            type: 'slide',
            easing: 'ease-out',
            out: true
        }
    },

    updateReverse: function(reverse) {
        this.getInAnimation().setReverse(reverse);
        this.getOutAnimation().setReverse(reverse);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Cover', {
    extend: 'Ext.fx.layout.card.Style',

    alias: 'fx.layout.card.cover',

    config: {
        reverse: null,

        inAnimation: {
            before: {
                'z-index': 100
            },
            after: {
                'z-index': 0
            },
            type: 'slide',
            easing: 'ease-out'
        },
        outAnimation: {
            easing: 'ease-out',
            from: {
                opacity: 0.99
            },
            to: {
                opacity: 1
            },
            out: true
        }
    },

    updateReverse: function(reverse) {
        this.getInAnimation().setReverse(reverse);
        this.getOutAnimation().setReverse(reverse);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Reveal', {
    extend: 'Ext.fx.layout.card.Style',

    alias: 'fx.layout.card.reveal',

    config: {
        inAnimation: {
            easing: 'ease-out',
            from: {
                opacity: 0.99
            },
            to: {
                opacity: 1
            }
        },
        outAnimation: {
            before: {
                'z-index': 100
            },
            after: {
                'z-index': 0
            },
            type: 'slide',
            easing: 'ease-out',
            out: true
        }
    },

    updateReverse: function(reverse) {
        this.getInAnimation().setReverse(reverse);
        this.getOutAnimation().setReverse(reverse);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Fade', {
    extend: 'Ext.fx.layout.card.Style',

    alias: 'fx.layout.card.fade',

    config: {
        reverse: null,
        
        inAnimation: {
            type: 'fade',
            easing: 'ease-out'
        },
        outAnimation: {
            type: 'fade',
            easing: 'ease-out',
            out: true
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Flip', {
    extend: 'Ext.fx.layout.card.Style',

    alias: 'fx.layout.card.flip',

    config: {
        duration: 500,

        inAnimation: {
            type: 'flip',
            half: true,
            easing: 'ease-out',
            before: {
                'backface-visibility': 'hidden'
            },
            after: {
                'backface-visibility': null
            }
        },
        outAnimation: {
            type: 'flip',
            half: true,
            easing: 'ease-in',
            before: {
                'backface-visibility': 'hidden'
            },
            after: {
                'backface-visibility': null
            },
            out: true
        }
    },

    updateDuration: function(duration) {
        var halfDuration = duration / 2,
            inAnimation = this.getInAnimation(),
            outAnimation = this.getOutAnimation();

        inAnimation.setDelay(halfDuration);
        inAnimation.setDuration(halfDuration);
        outAnimation.setDuration(halfDuration);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.card.Pop', {
    extend: 'Ext.fx.layout.card.Style',

    alias: 'fx.layout.card.pop',

    config: {
        duration: 500,

        inAnimation: {
            type: 'pop',
            easing: 'ease-out'
        },
        outAnimation: {
            type: 'pop',
            easing: 'ease-in',
            out: true
        }
    },

    updateDuration: function(duration) {
        var halfDuration = duration / 2,
            inAnimation = this.getInAnimation(),
            outAnimation = this.getOutAnimation();

        inAnimation.setDelay(halfDuration);
        inAnimation.setDuration(halfDuration);
        outAnimation.setDuration(halfDuration);
    }
});

/**
 * @private
 */
Ext.define('Ext.fx.layout.Card', {
    requires: [
        'Ext.fx.layout.card.Slide',
        'Ext.fx.layout.card.Cover',
        'Ext.fx.layout.card.Reveal',
        'Ext.fx.layout.card.Fade',
        'Ext.fx.layout.card.Flip',
        'Ext.fx.layout.card.Pop',
//        'Ext.fx.layout.card.Cube',
        'Ext.fx.layout.card.Scroll'
    ],

    constructor: function(config) {
        var defaultClass = Ext.fx.layout.card.Abstract,
            type;

        if (!config) {
            return null;
        }

        if (typeof config == 'string') {
            type = config;

            config = {};
        }
        else if (config.type) {
            type = config.type;
        }

        config.elementBox = false;

        if (type) {

            if (Ext.os.is.Android2) {
                // In Android 2 we only support scroll and fade. Otherwise force it to slide.
                if (type != 'fade') {
                    type = 'scroll';
                }
            }
            else if (type === 'slide' && Ext.browser.is.ChromeMobile) {
                type = 'scroll';
            }

            defaultClass = Ext.ClassManager.getByAlias('fx.layout.card.' + type);

        }

        return Ext.factory(config, defaultClass);
    }
});

/**
 * @aside guide layouts
 * @aside video layouts
 *
 * Sometimes you want to show several screens worth of information but you've only got a small screen to work with.
 * TabPanels and Carousels both enable you to see one screen of many at a time, and underneath they both use a Card
 * Layout.
 *
 * Card Layout takes the size of the Container it is applied to and sizes the currently active item to fill the
 * Container completely. It then hides the rest of the items, allowing you to change which one is currently visible but
 * only showing one at once:
 *
 * {@img ../guides/layouts/card.jpg}
 *
 *
 * Here the gray box is our Container, and the blue box inside it is the currently active card. The three other cards
 * are hidden from view, but can be swapped in later. While it's not too common to create Card layouts directly, you
 * can do so like this:
 *
 *     var panel = Ext.create('Ext.Panel', {
 *         layout: 'card',
 *         items: [
 *             {
 *                 html: "First Item"
 *             },
 *             {
 *                 html: "Second Item"
 *             },
 *             {
 *                 html: "Third Item"
 *             },
 *             {
 *                 html: "Fourth Item"
 *             }
 *         ]
 *     });
 *
 *     panel.{@link Ext.Container#setActiveItem setActiveItem}(1);
 *
 * Here we create a Panel with a Card Layout and later set the second item active (the active item index is zero-based,
 * so 1 corresponds to the second item). Normally you're better off using a {@link Ext.tab.Panel tab panel} or a
 * {@link Ext.carousel.Carousel carousel}.
 *
 * For a more detailed overview of what layouts are and the types of layouts shipped with Sencha Touch 2, check out the
 * [Layout Guide](#!/guide/layouts).
 */
Ext.define('Ext.layout.Card', {
    extend: 'Ext.layout.Fit',
    alternateClassName: 'Ext.layout.CardLayout',

    isCard: true,

    /**
     * @event activeitemchange
     * @preventable doActiveItemChange
     * Fires when an card is made active
     * @param {Ext.layout.Card} this The layout instance
     * @param {Mixed} newActiveItem The new active item
     * @param {Mixed} oldActiveItem The old active item
     */

    requires: [
        'Ext.fx.layout.Card'
    ],

    alias: 'layout.card',

    cls: Ext.baseCSSPrefix + 'layout-card',

    itemCls: Ext.baseCSSPrefix + 'layout-card-item',

    constructor: function() {
        this.callParent(arguments);
        this.container.onInitialized(this.onContainerInitialized, this);
    },

    /**
     * @private
     */
    applyAnimation: function(animation) {
        return new Ext.fx.layout.Card(animation);
    },

    /**
     * @private
     */
    updateAnimation: function(animation, oldAnimation) {
        if (animation && animation.isAnimation) {
            animation.setLayout(this);
        }

        if (oldAnimation) {
            oldAnimation.destroy();
        }
    },

    /**
     * @private
     */
    doItemAdd: function(item, index) {
        if (item.isInnerItem()) {
            item.hide();
        }

        this.callParent(arguments);
    },

    getInnerItemsContainer: function() {
        var innerItemsContainer = this.innerItemsContainer;

        if (!innerItemsContainer) {
            this.innerItemsContainer = innerItemsContainer = Ext.Element.create({
                className: this.cls + '-container'
            });

            this.container.innerElement.append(innerItemsContainer);
        }

        return innerItemsContainer;
    },

    /**
     * @private
     */
    doItemRemove: function(item, index, destroy) {
        this.callParent(arguments);

        if (!destroy && item.isInnerItem()) {
            item.show();
        }
    },

    onContainerInitialized: function(container) {
        var activeItem = container.getActiveItem();

        if (activeItem) {
            activeItem.show();
        }

        container.on('activeitemchange', 'onContainerActiveItemChange', this);
    },

    /**
     * @private
     */
    onContainerActiveItemChange: function(container) {
        this.relayEvent(arguments, 'doActiveItemChange');
    },

    /**
     * @private
     */
    doActiveItemChange: function(me, newActiveItem, oldActiveItem) {
        if (oldActiveItem) {
            oldActiveItem.hide();
        }

        if (newActiveItem) {
            newActiveItem.show();
        }
    },

    doItemDockedChange: function(item, docked) {
        var element = item.element;
        // See https://sencha.jira.com/browse/TOUCH-1508
        if (docked) {
            element.removeCls(this.itemCls);
        }
        else {
            element.addCls(this.itemCls);
        }

        this.callParent(arguments);
    }
});

/**
 * @aside guide layouts
 * @aside video layouts
 *
 * Factory class which returns an instance of the provided layout.
 */
Ext.define('Ext.layout.Layout', {

    requires: [
        'Ext.layout.Fit',
        'Ext.layout.Card',
        'Ext.layout.HBox',
        'Ext.layout.VBox'
    ],

    /**
     * Creates a new Layout for the specified container using the config object's layout to determine
     * layout to instantiate.
     * @param {Ext.Container} container A configuration object for the Component you wish to create.
     * @param {Object} [config] The alias to provide the Layout type; if none is
     * specified, Ext.layout.Default will be used.
     * @return {Ext.layout.Default} The newly instantiated Layout.
     */
    constructor: function(container, config) {
        var layoutClass = Ext.layout.Default,
            type, layout;

        if (typeof config == 'string') {
            type = config;
            config = {};
        }
        else if ('type' in config) {
            type = config.type;
        }

        if (type) {
            layoutClass = Ext.ClassManager.getByAlias('layout.' + type);

        }

        return new layoutClass(container, config);
    }
});


/**
 * A Container has all of the abilities of {@link Ext.Component Component}, but lets you nest other Components inside
 * it. Applications are made up of lots of components, usually nested inside one another. Containers allow you to
 * render and arrange child Components inside them. Most apps have a single top-level Container called a Viewport,
 * which takes up the entire screen. Inside of this are child components, for example in a mail app the Viewport
 * Container's two children might be a message List and an email preview pane.
 *
 * Containers give the following extra functionality:
 *
 * * Adding child Components at instantiation and run time
 * * Removing child Components
 * * Specifying a [Layout](#!/guide/layouts)
 *
 * Layouts determine how the child Components should be laid out on the screen. In our mail app example we'd use an
 * HBox layout so that we can pin the email list to the left hand edge of the screen and allow the preview pane to
 * occupy the rest. There are several layouts in Sencha Touch 2, each of which help you achieve your desired
 * application structure, further explained in the [Layout guide](#!/guide/layouts).
 *
 * ## Adding Components to Containers
 *
 * As we mentioned above, Containers are special Components that can have child Components arranged by a Layout. One of
 * the code samples above showed how to create a Panel with 2 child Panels already defined inside it but it's easy to
 * do this at run time too:
 *
 *     @example miniphone
 *     //this is the Panel we'll be adding below
 *     var aboutPanel = Ext.create('Ext.Panel', {
 *         html: 'About this app'
 *     });
 *
 *     //this is the Panel we'll be adding to
 *     var mainPanel = Ext.create('Ext.Panel', {
 *         fullscreen: true,
 *
 *         layout: 'hbox',
 *         defaults: {
 *             flex: 1
 *         },
 *
 *         items: {
 *             html: 'First Panel',
 *             style: 'background-color: #5E99CC;'
 *         }
 *     });
 *
 *     //now we add the first panel inside the second
 *     mainPanel.add(aboutPanel);
 *
 * Here we created three Panels in total. First we made the aboutPanel, which we might use to tell the user a little
 * about the app. Then we create one called mainPanel, which already contains a third Panel in its
 * {@link Ext.Container#cfg-items items} configuration, with some dummy text ("First Panel"). Finally, we add the first
 * panel to the second by calling the {@link Ext.Container#method-add add} method on mainPanel.
 *
 * In this case we gave our mainPanel another hbox layout, but we also introduced some
 * {@link Ext.Container#defaults defaults}. These are applied to every item in the Panel, so in this case every child
 * inside mainPanel will be given a flex: 1 configuration. The effect of this is that when we first render the screen
 * only a single child is present inside mainPanel, so that child takes up the full width available to it. Once the
 * mainPanel.add line is called though, the aboutPanel is rendered inside of it and also given a flex of 1, which will
 * cause it and the first panel to both receive half the full width of the mainPanel.
 *
 * Likewise, it's easy to remove items from a Container:
 *
 *     mainPanel.remove(aboutPanel);
 *
 * After this line is run everything is back to how it was, with the first child panel once again taking up the full
 * width inside mainPanel.
 *
 * ## Further Reading
 *
 * See the [Component & Container Guide](#!/guide/components) for more information, and check out the
 * {@link Ext.Container} class docs also.
 */
Ext.define('Ext.Container', {
    extend: 'Ext.Component',

    alternateClassName: 'Ext.lib.Container',

    requires: [
        'Ext.layout.Layout',
        'Ext.ItemCollection',
        'Ext.behavior.Scrollable',
        'Ext.Mask'
    ],

    xtype: 'container',

    /**
     * @event add
     * Fires whenever item added to the Container
     * @param {Ext.Container} this The Container instance
     * @param {Object} item The item added to the Container
     * @param {Number} index The index of the item within the Container
     */

    /**
     * @event remove
     * Fires whenever item removed from the Container
     * @param {Ext.Container} this The Container instance
     * @param {Object} item The item removed from the Container
     * @param {Number} index The index of the item that was removed
     */

    /**
     * @event move
     * Fires whenever item moved within the Container
     * @param {Ext.Container} this The Container instance
     * @param {Object} item The item moved within the Container
     * @param {Number} toIndex The new index of the item
     * @param {Number} fromIndex The old index of the item
     */

    /**
     * @private
     * @event renderedchange
     * Fires whenever an item is rendered into a container or derendered
     * from a Container
     * @param {Ext.Container} this The Container instance
     * @param {Object} item The item in the Container
     * @param {Boolean} rendered The current rendered status of the item
     */

    /**
     * @event activate
     * Fires whenever item within the Container is activated
     * @param {Ext.Container} this The Container instance
     * @param {Object} newActiveItem The new active item within the container
     * @param {Object} oldActiveItem The old active item within the container
     */

    /**
     * @event deactivate
     * Fires whenever item within the Container is deactivated
     * @param {Ext.Container} this The Container instance
     * @param {Object} newActiveItem The new active item within the container
     * @param {Object} oldActiveItem The old active item within the container
     */

    eventedConfig: {
        /**
         * @cfg {Object/String/Number} activeItem The item from the {@link #cfg-items} collection that will be active first. This is
         * usually only meaningful in a {@link Ext.layout.Card card layout}, where only one item can be active at a
         * time. If passes a string, it will be assumed to be a {@link Ext.ComponentQuery} selector.
         * @accessor
         * @evented
         */
        activeItem: 0,

        /**
         * @cfg {Boolean/String/Object} scrollable
         * Configuration options to make this Container scrollable. Acceptable values are:
         *
         * * 'horizontal', 'vertical', 'both' to enabling scrolling for that direction.
         * * true/false to explicitly enable/disable scrolling.
         *
         * Alternatively, you can give it an object which is then passed to the scroller instance:
         *
         *     scrollable: {
         *         direction: 'vertical',
         *         directionLock: true
         *     }
         *
         * Please look at the {@link Ext.scroll.Scroller} documentation for more example on how to use this.
         * @accessor
         * @evented
         */
        scrollable: null
    },

    config: {
        /**
         * @cfg {String/Object/Boolean} cardSwitchAnimation
         * Animation to be used during transitions of cards.
         * @removed 2.0.0 Please use {@link Ext.layout.Card#animation} instead
         */

        /**
         * @cfg {Object/String} layout Configuration for this Container's layout. Example:
         *
         *     Ext.create('Ext.Container', {
         *         layout: {
         *             type: 'hbox',
         *             align: 'middle'
         *         },
         *         items: [
         *             {
         *                 xtype: 'panel',
         *                 flex: 1,
         *                 style: 'background-color: red;'
         *             },
         *             {
         *                 xtype: 'panel',
         *                 flex: 2,
         *                 style: 'background-color: green'
         *             }
         *         ]
         *     });
         *
         * See the [Layouts Guide](#!/guide/layouts) for more information
         *
         * @accessor
         */
        layout: null,

        /**
         * @cfg {Object} control Enables you to easily control Components inside this Container by listening to their
         * events and taking some action. For example, if we had a container with a nested Disable button, and we
         * wanted to hide the Container when the Disable button is tapped, we could do this:
         *
         *     Ext.create('Ext.Container', {
         *         control: {
         *            'button[text=Disable]': {
         *                tap: 'hideMe'
         *            }
         *         },
         *
         *         hideMe: function() {
         *             this.hide()
         *         }
         *     });
         *
         * We used a {@link Ext.ComponentQuery} selector to listen to the {@link Ext.Button#tap tap} event on any
         * {@link Ext.Button button} anywhere inside the Container that has the {@link Ext.Button#text text} 'Disable'.
         * Whenever a Component matching that selector fires the 'tap' event our hideMe function is called. hideMe is
         * called with scope: this (e.g. 'this' is the Container instance).
         *
         */
        control: {},

        /**
         * @cfg {Object} defaults A set of default configurations to apply to all child Components in this Container.
         * It's often useful to specify defaults when creating more than one items with similar configurations. For
         * example here we can specify that each child is a panel and avoid repeating the xtype declaration for each
         * one:
         *
         *    Ext.create('Ext.Container', {
         *        defaults: {
         *            xtype: 'panel'
         *        },
         *        items: [
         *            {
         *                html: 'Panel 1'
         *            },
         *            {
         *                html: 'Panel 2'
         *            }
         *        ]
         *    });
         *
         * @accessor
         */
        defaults: null,

        /**
         * @cfg {Array/Object} items The child items to add to this Container. This is usually an array of Component
         * configurations or instances, for example:
         *
         *    Ext.create('Ext.Container', {
         *        items: [
         *            {
         *                xtype: 'panel',
         *                html: 'This is an item'
         *            }
         *        ]
         *    });
         * @accessor
         */
        items: null,

        /**
         * @cfg {Boolean} autoDestroy If true, child items will be destroyed as soon as they are {@link #method-remove removed}
         * from this container
         * @accessor
         */
        autoDestroy: true,

        /** @cfg {String} defaultType
         * The default {@link Ext.Component xtype} of child Components to create in this Container when a child item
         * is specified as a raw configuration object, rather than as an instantiated Component.
         * @accessor
         */
        defaultType: null,

        //@private
        useBodyElement: null,

        /**
         * @cfg {Boolean/Object/Ext.Mask/Ext.LoadMask} masked
         * A configuration to allow you to mask this container.
         * You can optionally pass an object block with and xtype of `loadmask`, and an optional `message` value to
         * display a loading mask. Please refer to the {@link Ext.LoadMask} component to see other configurations.
         *
         *     masked: {
         *         xtype: 'loadmask',
         *         message: 'My message'
         *     }
         *
         * Alternatively, you can just call the setter at any time with true/false to show/hide the mask"
         *
         *     setMasked(true); //show the mask
         *     setMasked(false); //hides the mask
         *
         * There are also two convience methods, {@link #method-mask} and {@link #unmask}, to allow you to mask and unmask
         * this container at any time.
         *
         * Remember, the Ext.Viewport is always a container, so if you want to mask your whole application at anytime,
         * can call:
         *
         *     Ext.Viewport.setMasked({
         *         xtype: 'loadmask',
         *         message: 'Hello'
         *     });
         *
         * @accessor
         */
        masked: null,

        /**
         * @cfg {Boolean} modal True to make this Container modal. This will create a mask underneath the Container
         * that covers its parent and does not allow the user to interact with any other Components until this
         * Container is dismissed
         * @accessor
         */
        modal: null,

        /**
         * @cfg {Boolean} hideOnMaskTap When using a {@link #modal} Component, setting this to true will hide the modal
         * mask and the Container when the mask is tapped on
         * @accessor
         */
        hideOnMaskTap: null
    },

    isContainer: true,

    delegateListeners: {
        delegate: '> component',
        centeredchange: 'onItemCenteredChange',
        dockedchange: 'onItemDockedChange',
        floatingchange: 'onItemFloatingChange'
    },

    constructor: function(config) {
        var me = this;

        me._items = me.items = new Ext.ItemCollection();
        me.innerItems = [];

        me.onItemAdd = me.onFirstItemAdd;

        me.callParent(arguments);
    },

    getElementConfig: function() {
        return {
            reference: 'element',
            className: 'x-container',
            children: [{
                reference: 'innerElement',
                className: 'x-inner'
            }]
        };
    },

    /**
     * Changes the {@link #masked} configuration when its setter is called, which will convert the value
     * into a proper object/instance of {@link Ext.Mask}/{@link Ext.LoadMask}. If a mask already exists,
     * it will use that instead.
     */
    applyMasked: function(masked, currentMask) {
        currentMask = Ext.factory(masked, Ext.Mask, currentMask);

        if (currentMask) {
            this.add(currentMask);
        }

        return currentMask;
    },

    /**
     * Convience method which calls {@link #setMasked} with a value of true (to show the mask). For additional
     * functionality, call the {@link #setMasked} function direction (See the {@link #masked} configuration documention
     * for more information).
     */
    mask: function(mask) {
        this.setMasked(mask || true);
    },

    /**
     * Convience method which calls {@link #setMasked} with a value of false (to hide the mask). For additional
     * functionality, call the {@link #setMasked} function direction (See the {@link #masked} configuration documention
     * for more information).
     */
    unmask: function() {
        this.setMasked(false);
    },

    applyModal: function(modal, currentMask) {
        if (!modal && !currentMask) {
            return;
        }

        return Ext.factory(modal, Ext.Mask, currentMask);
    },

    updateModal: function(newModal, oldModal) {
        var listeners = {
            painted: 'refreshModalMask',
            erased: 'destroyModalMask'
        };

        if (newModal) {
            this.on(listeners);
            newModal.on('destroy', 'onModalDestroy', this);
            if (this.getTop() === null && this.getBottom() === null && this.getRight() === null && this.getLeft() === null && !this.getCentered()) {
                this.setTop(0);
                this.setLeft(0);
            }

            if (this.isPainted()) {
                this.refreshModalMask();
            }
        }
        else if (oldModal) {
            oldModal.un('destroy', 'onModalDestroy', this);
            this.un(listeners);
        }
    },

    onModalDestroy: function() {
        this.setModal(null);
    },

    updateHideOnMaskTap : function(hide) {
        var mask = this.getModal();

        if (mask) {
            mask.un('tap', 'hide', this);
        }

        if (hide && mask) {
            mask.on('tap', 'hide', this);
        }
    },

    refreshModalMask: function() {
        var me        = this,
            mask      = me.getModal(),
            container = me.getParent();

        if (!me.painted) {
            me.painted = true;

            if (mask) {
                container.insertBefore(mask, me);
                mask.setZIndex(me.getZIndex() - 1);

                me.updateHideOnMaskTap(me.getHideOnMaskTap());
            }
        }
    },

    destroyModalMask: function() {
        var mask = this.getModal(),
            container = this.getParent();

        if (this.painted) {
            this.painted = false;

            if (mask) {
                mask.un('tap', 'hide', this);
                container.remove(mask, false);
            }
        }
    },

    updateZIndex: function(zIndex) {
        var modal = this.getModal();

        this.callParent(arguments);

        if (modal) {
            modal.setZIndex(zIndex - 1);
        }
    },

    updateBaseCls: function(newBaseCls, oldBaseCls) {
        var me = this,
            ui = me.getUi();

        if (newBaseCls) {
            this.element.addCls(newBaseCls);
            this.innerElement.addCls(newBaseCls, null, 'inner');

            if (ui) {
                this.element.addCls(newBaseCls, null, ui);
            }
        }

        if (oldBaseCls) {
            this.element.removeCls(oldBaseCls);
            this.innerElement.removeCls(newBaseCls, null, 'inner');

            if (ui) {
                this.element.removeCls(oldBaseCls, null, ui);
            }
        }
    },

    updateUseBodyElement: function(useBodyElement) {
        if (useBodyElement) {
            this.bodyElement = this.innerElement.wrap({
                cls: 'x-body'
            });
            this.referenceList.push('bodyElement');
        }
    },

    applyItems: function(items, collection) {
        if (items) {
            var me = this;

            me.getDefaultType();
            me.getDefaults();

            if (me.initialized && collection.length > 0) {
                me.removeAll();
            }

            me.add(items);

            //Don't need to call setActiveItem when Container is first initialized
            if (me.initialized) {
                var activeItem = me.initialConfig.activeItem || me.config.activeItem || 0;

                me.setActiveItem(activeItem);
            }
        }
    },

    /**
     * @private
     */
     applyControl: function(selectors) {
         var selector, key, listener, listeners;

         for (selector in selectors) {
             listeners = selectors[selector];

             for (key in listeners) {
                 listener = listeners[key];

                 if (Ext.isObject(listener)) {
                     listener.delegate = selector;
                 }
             }

             listeners.delegate = selector;

             this.addListener(listeners);
         }

         return selectors;
     },

    /**
     * Initialize layout and event listeners the very first time an item is added
     * @private
     */
    onFirstItemAdd: function() {
        delete this.onItemAdd;

        this.setLayout(new Ext.layout.Layout(this, this.getLayout() || 'default'));

        if (this.innerHtmlElement && !this.getHtml()) {
            this.innerHtmlElement.destroy();
            delete this.innerHtmlElement;
        }

        this.on(this.delegateListeners);

        return this.onItemAdd.apply(this, arguments);
    },


    updateDefaultType: function(defaultType) {
        // Cache the direct reference to the default item class here for performance
        this.defaultItemClass = Ext.ClassManager.getByAlias('widget.' + defaultType);

    },

    applyDefaults: function(defaults) {
        if (defaults) {
            this.factoryItem = this.factoryItemWithDefaults;
            return defaults;
        }
    },

    factoryItem: function(item) {

        return Ext.factory(item, this.defaultItemClass);
    },

    factoryItemWithDefaults: function(item) {

        var me = this,
            defaults = me.getDefaults(),
            instance;

        if (!defaults) {
            return Ext.factory(item, me.defaultItemClass);
        }

        // Existing instance
        if (item.isComponent) {
            instance = item;

            // Apply defaults only if this is not already an item of this container
            if (defaults && item.isInnerItem() && !me.has(instance)) {
                instance.setConfig(defaults, true);
            }
        }
        // Config object
        else {
            if (defaults && !item.ignoreDefaults) {
                // Note:
                // - defaults is only applied to inner items
                // - we merge the given config together with defaults into a new object so that the original object stays intact
                if (!(
                        item.hasOwnProperty('left') &&
                        item.hasOwnProperty('right') &&
                        item.hasOwnProperty('top') &&
                        item.hasOwnProperty('bottom') &&
                        item.hasOwnProperty('docked') &&
                        item.hasOwnProperty('centered')
                    )) {
                    item = Ext.mergeIf({}, item, defaults);
                }
            }

            instance = Ext.factory(item, me.defaultItemClass);
        }

        return instance;
    },

    /**
     * Adds one or more Components to this Container. Example:
     *
     *     var myPanel = Ext.create('Ext.Panel', {
     *         html: 'This will be added to a Container'
     *     });
     *
     *     myContainer.add([myPanel]);
     *
     * @param {Array} newItems The new items to add to the Container
     */
    add: function(newItems) {
        var me = this,
            i, ln, item, newActiveItem;

        newItems = Ext.Array.from(newItems);

        ln = newItems.length;

        for (i = 0; i < ln; i++) {
            item = me.factoryItem(newItems[i]);
            this.doAdd(item);
            if (!newActiveItem && !this.getActiveItem() && this.innerItems.length > 0 && item.isInnerItem()) {
                newActiveItem = item;
            }
        }
        if (newActiveItem) {
            this.setActiveItem(newActiveItem);
        }

        return item;
    },

    /**
     * @private
     * @param item
     */
    doAdd: function(item) {
        var me = this,
            items = me.getItems(),
            index;

        if (!items.has(item)) {
            index = items.length;
            items.add(item);

            if (item.isInnerItem()) {
                me.insertInner(item);
            }

            item.setParent(me);

            me.onItemAdd(item, index);
        }
    },

    /**
     * Removes an item from this Container, optionally destroying it
     * @param {Object} item The item to remove
     * @param {Boolean} destroy Calls the Component's {@link Ext.Component#destroy destroy} method if true
     * @return {Ext.Component} this
     */
    remove: function(item, destroy) {
        var me = this,
            index = me.indexOf(item),
            innerItems = me.getInnerItems();

        if (destroy === undefined) {
            destroy = me.getAutoDestroy();
        }

        if (index !== -1) {
            if (!me.removingAll && innerItems.length > 1 && item === me.getActiveItem()) {
                me.on({
                    activeitemchange: 'doRemove',
                    scope: me,
                    single: true,
                    order: 'after',
                    args: [item, index, destroy]
                });

                me.doResetActiveItem(innerItems.indexOf(item));
            }
            else {
                me.doRemove(item, index, destroy);
                if (innerItems.length === 0) {
                    me.setActiveItem(null);
                }
            }
        }

        return me;
    },

    doResetActiveItem: function(innerIndex) {
        if (innerIndex === 0) {
            this.setActiveItem(1);
        }
        else {
            this.setActiveItem(0);
        }
    },

    doRemove: function(item, index, destroy) {
        var me = this;

        me.items.remove(item);

        if (item.isInnerItem()) {
            me.removeInner(item);
        }

        me.onItemRemove(item, index, destroy);

        item.setParent(null);

        if (destroy) {
            item.destroy();
        }
    },

    /**
     * Removes all items currently in the Container, optionally destroying them all
     * @param {Boolean} destroy If true, {@link Ext.Component#destroy destroys} each removed Component
     * @param {Boolean} everything If true, completely remove all items including docked / centered and floating items
     * @return {Ext.Component} this
     */
    removeAll: function(destroy, everything) {
        var items = this.items,
            ln = items.length,
            i = 0,
            item;

        if (destroy === undefined) {
            destroy = this.getAutoDestroy();
        }

        everything = Boolean(everything);

        // removingAll flag is used so we don't unnecessarily change activeItem while removing all items.
        this.removingAll = true;

        for (; i < ln; i++) {
            item = items.getAt(i);

            if (item && (everything || item.isInnerItem())) {
                this.doRemove(item, i, destroy);

                i--;
                ln--;
            }
        }
        this.setActiveItem(null);

        this.removingAll = false;

        return this;
    },

    /**
     * Returns the Component for a given index in the Container's {@link #property-items}
     * @param {Number} index The index of the Component to return
     * @return {Ext.Component} The item at the specified index, if found
     */
    getAt: function(index) {
        return this.items.getAt(index);
    },

    /**
     * Removes the Component at the specified index:
     *
     *     myContainer.removeAt(0); //removes the first item
     *
     * @param {Number} index The index of the Component to remove
     */
    removeAt: function(index) {
        var item = this.getAt(index);

        if (item) {
            this.remove(item);
        }

        return this;
    },

    /**
     * Removes an inner Component at the specified index:
     *
     *     myContainer.removeInnerAt(0); //removes the first item of the innerItems propety
     *
     * @param {Number} index The index of the Component to remove
     */
    removeInnerAt: function(index) {
        var item = this.getInnerItems()[index];

        if (item) {
            this.remove(item);
        }

        return this;
    },

    /**
     * @private
     */
    has: function(item) {
        return this.getItems().indexOf(item) != -1;
    },

    /**
     * @private
     */
    hasInnerItem: function(item) {
        return this.innerItems.indexOf(item) != -1;
    },

    /**
     * @private
     */
    indexOf: function(item) {
        return this.getItems().indexOf(item);
    },

    /**
     * @private
     * @param item
     * @param index
     */
    insertInner: function(item, index) {
        var items = this.getItems().items,
            innerItems = this.innerItems,
            currentInnerIndex = innerItems.indexOf(item),
            newInnerIndex = -1,
            nextSibling;

        if (currentInnerIndex !== -1) {
            innerItems.splice(currentInnerIndex, 1);
        }

        if (typeof index == 'number') {
            do {
                nextSibling = items[++index];
            } while (nextSibling && !nextSibling.isInnerItem());

            if (nextSibling) {
                newInnerIndex = innerItems.indexOf(nextSibling);
                innerItems.splice(newInnerIndex, 0, item);
            }
        }

        if (newInnerIndex === -1) {
            innerItems.push(item);
            newInnerIndex = innerItems.length - 1;
        }

        if (currentInnerIndex !== -1) {
            this.onInnerItemMove(item, newInnerIndex, currentInnerIndex);
        }

        return this;
    },

    onInnerItemMove: Ext.emptyFn,

    /**
     * @private
     * @param item
     */
    removeInner: function(item) {
        Ext.Array.remove(this.innerItems, item);

        return this;
    },

    /**
     * Adds a child Component at the given index. For example, here's how we can add a new item, making it the first
     * child Component of this Container:
     *
     *     myContainer.insert(0, {xtype: 'panel', html: 'new item'});
     *
     * @param {Number} index The index to insert the Component at
     * @param {Object} item The Component to insert
     */
    insert: function(index, item) {
        var me = this,
            i;

        if (Ext.isArray(item)) {
            for (i = item.length - 1; i >= 0; i--) {
                me.insert(index, item[i]);
            }

            return me;
        }

        item = this.factoryItem(item);

        this.doInsert(index, item);

        return item;
    },

    /**
     * @private
     * @param index
     * @param item
     */
    doInsert: function(index, item) {
        var me = this,
            items = me.items,
            itemsLength = items.length,
            currentIndex, isInnerItem;

        isInnerItem = item.isInnerItem();

        if (index > itemsLength) {
            index = itemsLength;
        }

        if (items[index - 1] === item) {
            return me;
        }

        currentIndex = me.indexOf(item);

        if (currentIndex !== -1) {
            if (currentIndex < index) {
                index -= 1;
            }

            items.removeAt(currentIndex);
        }
        else {
            item.setParent(me);
        }

        items.insert(index, item);

        if (isInnerItem) {
            me.insertInner(item, index);
        }

        if (currentIndex !== -1) {
            me.onItemMove(item, index, currentIndex);
        }
        else {
            me.onItemAdd(item, index);
        }
    },

    /**
     * @private
     */
    insertFirst: function(item) {
        return this.insert(0, item);
    },

    /**
     * @private
     */
    insertLast: function(item) {
        return this.insert(this.getItems().length, item);
    },

    /**
     * @private
     */
    insertBefore: function(item, relativeToItem) {
        var index = this.indexOf(relativeToItem);

        if (index !== -1) {
            this.insert(index, item);
        }
        return this;
    },

    /**
     * @private
     */
    insertAfter: function(item, relativeToItem) {
        var index = this.indexOf(relativeToItem);

        if (index !== -1) {
            this.insert(index + 1, item);
        }
        return this;
    },

    /**
     * @private
     */
    onItemAdd: function(item, index) {
        this.doItemLayoutAdd(item, index);

        if (this.initialized) {
            this.fireEvent('add', this, item, index);
        }
    },

    doItemLayoutAdd: function(item, index) {
        var layout = this.getLayout();

        if (this.isRendered() && item.setRendered(true)) {
            item.fireAction('renderedchange', [this, item, true], 'onItemAdd', layout, { args: [item, index] });
        }
        else {
            layout.onItemAdd(item, index);
        }
    },

    /**
     * @private
     */
    onItemRemove: function(item, index) {
        this.doItemLayoutRemove(item, index);

        this.fireEvent('remove', this, item, index);
    },

    doItemLayoutRemove: function(item, index) {
        var layout = this.getLayout();

        if (this.isRendered() && item.setRendered(false)) {
            item.fireAction('renderedchange', [this, item, false], 'onItemRemove', layout, { args: [item, index, undefined] });
        }
        else {
            layout.onItemRemove(item, index);
        }
    },

    /**
     * @private
     */
    onItemMove: function(item, toIndex, fromIndex) {
        if (item.isDocked()) {
            item.setDocked(null);
        }

        this.doItemLayoutMove(item, toIndex, fromIndex);

        this.fireEvent('move', this, item, toIndex, fromIndex);
    },

    doItemLayoutMove: function(item, toIndex, fromIndex) {
        this.getLayout().onItemMove(item, toIndex, fromIndex);
    },

    /**
     * @private
     */
    onItemCenteredChange: function(item, centered) {
        if (!item.isFloating() && !item.isDocked()) {
            if (centered) {
                this.removeInner(item);
            }
            else {
                this.insertInner(item, this.indexOf(item));
            }
        }

        this.getLayout().onItemCenteredChange(item, centered);
    },

    /**
     * @private
     */
    onItemFloatingChange: function(item, floating) {
        if (!item.isCentered() && !item.isDocked()) {
            if (floating) {
                this.removeInner(item);
            }
            else {
                this.insertInner(item, this.indexOf(item));
            }
        }

        this.getLayout().onItemFloatingChange(item, floating);
    },

    /**
     * @private
     */
    onItemDockedChange: function(item, docked, oldDocked) {
        if (!item.isCentered() && !item.isFloating()) {
            if (docked) {
                this.removeInner(item);
            }
            else {
                this.insertInner(item, this.indexOf(item));
            }
        }

        this.getLayout().onItemDockedChange(item, docked, oldDocked);
    },

    /**
     * Returns all inner {@link #property-items} of this container. `inner` means that the item is not `docked` or
     * `floating`.
     * @return {Array} The inner items of this container.
     */
    getInnerItems: function() {
        return this.innerItems;
    },

    /**
     * Returns all the {@link Ext.Component#docked} items in this container.
     * @return {Array} The docked items of this container
     */
    getDockedItems: function() {
        var items = this.getItems().items,
            dockedItems = [],
            ln = items.length,
            item, i;

        for (i = 0; i < ln; i++) {
            item = items[i];
            if (item.isDocked()) {
                dockedItems.push(item);
            }
        }

        return dockedItems;
    },

    /**
     * @private
     */
    applyActiveItem: function(activeItem, currentActiveItem) {
        var innerItems = this.getInnerItems();

        // Make sure the items are already initialized
        this.getItems();

        // No items left to be active, reset back to 0 on falsy changes
        if (!activeItem && innerItems.length === 0) {
            return 0;
        }
        else if (typeof activeItem == 'number') {
            activeItem = Math.max(0, Math.min(activeItem, innerItems.length - 1));
            activeItem = innerItems[activeItem];

            if (activeItem) {
                return activeItem;
            }
            else if (currentActiveItem) {
                return null;
            }
        }
        else if (activeItem) {
            var item;

            //ComponentQuery selector?
            if (typeof activeItem == 'string') {
                item = this.child(activeItem);

                activeItem = {
                    xtype : activeItem
                };
            }

            if (!item || !item.isComponent) {
                item = this.factoryItem(activeItem);
            }


            if (!this.has(item)) {
                this.add(item);
            }

            return item;
        }
    },

    /**
     * Animates to the supplied activeItem with a specified animation. Currently this only works
     * with a Card layout.  This passed animation will override any default animations on the
     * container, for a single card switch. The animation will be destroyed when complete.
     * @param {Object/Number} activeItem The item or item index to make active
     * @param {Object/Ext.fx.layout.Card} animation Card animation configuration or instance
     */
    animateActiveItem: function(activeItem, animation) {
        var layout = this.getLayout(),
            defaultAnimation;

        if (this.activeItemAnimation) {
            this.activeItemAnimation.destroy();
        }
        this.activeItemAnimation = animation = new Ext.fx.layout.Card(animation);
        if (animation && layout.isCard) {
            animation.setLayout(layout);
            defaultAnimation = layout.getAnimation();
            if (defaultAnimation) {
                defaultAnimation.disable();
                animation.on('animationend', function() {
                    defaultAnimation.enable();
                    animation.destroy();
                }, this);
            }
        }
        return this.setActiveItem(activeItem);
    },

    /**
     * @private
     */
    doSetActiveItem: function(newActiveItem, oldActiveItem) {
        if (oldActiveItem) {
            oldActiveItem.fireEvent('deactivate', oldActiveItem, this, newActiveItem);
        }

        if (newActiveItem) {
            newActiveItem.fireEvent('activate', newActiveItem, this, oldActiveItem);
        }
    },

    /**
     * @private
     */
    setRendered: function(rendered) {
        if (this.callParent(arguments)) {
            var items = this.items.items,
                i, ln;

            for (i = 0,ln = items.length; i < ln; i++) {
                items[i].setRendered(rendered);
            }

            return true;
        }

        return false;
    },

    /**
     * @private
     */
    getScrollableBehavior: function() {
        var behavior = this.scrollableBehavior;

        if (!behavior) {
            behavior = this.scrollableBehavior = new Ext.behavior.Scrollable(this);
        }

        return behavior;
    },

    /**
     * @private
     */
    applyScrollable: function(config) {
        this.getScrollableBehavior().setConfig(config);
        return config;
    },

    doSetScrollable: function() {
        // Used for plugins when they need to reinitialize scroller listeners
    },

    /**
     * Returns an the scrollable instance for this container, which is a {@link Ext.scroll.View} class.
     *
     * Please checkout the documentation for {@link Ext.scroll.View}, {@link Ext.scroll.View#getScroller}
     * and {@link Ext.scroll.Scroller} for more information.
     * @return {Ext.scroll.View} The scroll view
     */
    getScrollable: function() {
        return this.getScrollableBehavior().getScrollView();
    },

    // Used by ComponentQuery to retrieve all of the items
    // which can potentially be considered a child of this Container.
    // This should be overriden by components which have child items
    // that are not contained in items. For example dockedItems, menu, etc
    // @private
    getRefItems: function(deep) {
        var items = this.getItems().items.slice(),
            ln = items.length,
            i, item;

        if (deep) {
            for (i = 0; i < ln; i++) {
                item = items[i];

                if (item.getRefItems) {
                    items = items.concat(item.getRefItems(true));
                }
            }
        }

        return items;
    },

    /**
     * Examines this container's <code>{@link #property-items}</code> <b>property</b>
     * and gets a direct child component of this container.
     * @param {String/Number} component This parameter may be any of the following:
     * <div><ul class="mdetail-params">
     * <li>a <b><code>String</code></b> : representing the <code>itemId</code>
     * or <code>{@link Ext.Component#getId id}</code> of the child component </li>
     * <li>a <b><code>Number</code></b> : representing the position of the child component
     * within the <code>{@link #property-items}</code> <b>property</b></li>
     * </ul></div>
     * <p>For additional information see {@link Ext.util.MixedCollection#get}.
     * @return Ext.Component The component (if found).
     */
    getComponent: function(component) {
        if (Ext.isObject(component)) {
            component = component.getItemId();
        }

        return this.getItems().get(component);
    },

    /**
     * Finds a docked item of this container using a reference, id or an index of its location
     * in {@link #getDockedItems}.
     * @param {String/Number} component The id or index of the component to find
     * @return {Ext.Component/Boolean} The docked component, if found
     */
    getDockedComponent: function(component) {
        if (Ext.isObject(component)) {
            component = component.getItemId();
        }

        var dockedItems = this.getDockedItems(),
            ln = dockedItems.length,
            item, i;

        if (Ext.isNumber(component)) {
            return dockedItems[component];
        }

        for (i = 0; i < ln; i++) {
            item = dockedItems[i];
            if (item.id == component) {
                return item;
            }
        }

        return false;
    },

    /**
     * Retrieves all descendant components which match the passed selector.
     * Executes an Ext.ComponentQuery.query using this container as its root.
     * @param {String} selector Selector complying to an Ext.ComponentQuery selector
     * @return {Array} Ext.Component's which matched the selector
     */
    query: function(selector) {
        return Ext.ComponentQuery.query(selector, this);
    },

    /**
     * Retrieves the first direct child of this container which matches the passed selector.
     * The passed in selector must comply with an Ext.ComponentQuery selector.
     * @param {String} selector An Ext.ComponentQuery selector
     * @return Ext.Component
     */
    child: function(selector) {
        return this.query('> ' + selector)[0] || null;
    },

    /**
     * Retrieves the first descendant of this container which matches the passed selector.
     * The passed in selector must comply with an Ext.ComponentQuery selector.
     * @param {String} selector An Ext.ComponentQuery selector
     * @return Ext.Component
     */
    down: function(selector) {
        return this.query(selector)[0] || null;
    },



    destroy: function() {
        var modal = this.getModal();

        if (modal) {
            modal.destroy();
        }

        this.removeAll(true, true);
        Ext.destroy(this.getScrollable(), this.bodyElement);
        this.callParent();
    }

}, function() {
    this.addMember('defaultItemClass', this);

});



/**
 * @private
 * Base class for iOS and Andorid viewports.
 */
Ext.define('Ext.viewport.Default', {
    extend: 'Ext.Container',

    xtype: 'viewport',

    PORTRAIT: 'portrait',

    LANDSCAPE: 'landscape',

    requires: [
        'Ext.LoadMask'
    ],

    /**
     * @event ready
     * Fires when the Viewport is in the DOM and ready
     * @param {Ext.Viewport} this
     */

    /**
     * @event maximize
     * Fires when the Viewport is maximized
     * @param {Ext.Viewport} this
     */

    /**
     * @event orientationchange
     * Fires when the Viewport orientation has changed
     * @param {Ext.Viewport} this
     * @param {String} newOrientation The new orientation
     * @param {Number} width The width of the Viewport
     * @param {Number} height The height of the Viewport
     */

    config: {
        /**
         * @cfg {Boolean} autoMaximize
         * Whether or not to always automatically maximize the viewport on first load and all subsequent orientation changes.
         *
         * This is set to `false` by default for a number of reasons:
         *
         * - Orientation change performance is drastically reduced when this is enabled, on all devices.
         * - On some devices (mostly Android) this can sometimes cause issues when the default browser zoom setting is changed.
         * - When wrapping your phone in a native shell, you may get a blank screen.
         * - When bookmarked to the homescreen (iOS), you may get a blank screen.
         *
         * @accessor
         */
        autoMaximize: false,

        /**
         * @private
         */
        autoBlurInput: true,

        /**
         * @cfg {Boolean} preventPanning
         * Whether or not to always prevent default panning behavior of the
         * browser's viewport
         * @accessor
         */
        preventPanning: true,

        /**
         * @cfg {Boolean} preventZooming
         * True to attempt to stop zooming when you double tap on the screen on mobile devices,
         * typically HTC devices with HTC Sense UI
         * @accessor
         */
        preventZooming: false,

        /**
         * @cfg
         * @private
         */
        autoRender: true,

        /**
         * @cfg {Object/String} layout Configuration for this Container's layout. Example:
         *
         *    Ext.create('Ext.Container', {
         *        layout: {
         *            type: 'hbox',
         *            align: 'middle'
         *        },
         *        items: [
         *            {
         *                xtype: 'panel',
         *                flex: 1,
         *                style: 'background-color: red;'
         *            },
         *            {
         *                xtype: 'panel',
         *                flex: 2,
         *                style: 'background-color: green'
         *            }
         *        ]
         *    });
         *
         * See the layouts guide for more information
         *
         * Defaults to {@link Ext.layout.Card card}
         * @accessor
         */
        layout: 'card',

        /**
         * @cfg
         * @private
         */
        width: '100%',

        /**
         * @cfg
         * @private
         */
        height: '100%'
    },

    /**
     * @property {Boolean} isReady
     * True if the DOM is ready
     */
    isReady: false,

    isViewport: true,

    isMaximizing: false,

    id: 'ext-viewport',

    isInputRegex: /^(input|textarea|select|a)$/i,

    focusedElement: null,

    /**
     * @private
     */
    fullscreenItemCls: Ext.baseCSSPrefix + 'fullscreen',

    constructor: function(config) {
        var bind = Ext.Function.bind;

        this.doPreventPanning = bind(this.doPreventPanning, this);
        this.doPreventZooming = bind(this.doPreventZooming, this);
        this.doBlurInput = bind(this.doBlurInput, this);

        this.maximizeOnEvents = ['ready', 'orientationchange'];

        this.orientation = this.determineOrientation();
        this.windowWidth = this.getWindowWidth();
        this.windowHeight = this.getWindowHeight();
        this.windowOuterHeight = this.getWindowOuterHeight();

        if (!this.stretchHeights) {
            this.stretchHeights = {};
        }

        this.callParent([config]);

        // Android is handled separately
        if (!Ext.os.is.Android) {
            if (this.supportsOrientation()) {
                this.addWindowListener('orientationchange', bind(this.onOrientationChange, this));
            }
            else {
                this.addWindowListener('resize', bind(this.onResize, this));
            }
        }

        document.addEventListener('focus', bind(this.onElementFocus, this), true);
        document.addEventListener('blur', bind(this.onElementBlur, this), true);

        Ext.onDocumentReady(this.onDomReady, this);

        this.on('ready', this.onReady, this, {single: true});

        this.getEventDispatcher().addListener('component', '*', 'fullscreen', 'onItemFullscreenChange', this);

        return this;
    },

    onDomReady: function() {
        this.isReady = true;
        this.updateSize();
        this.fireEvent('ready', this);
    },

    onReady: function() {
        if (this.getAutoRender()) {
            this.render();
        }
    },

    onElementFocus: function(e) {
        this.focusedElement = e.target;
    },

    onElementBlur: function() {
        this.focusedElement = null;
    },

    render: function() {
        if (!this.rendered) {
            var body = Ext.getBody(),
                clsPrefix = Ext.baseCSSPrefix,
                classList = [],
                osEnv = Ext.os,
                osName = osEnv.name.toLowerCase(),
                browserName = Ext.browser.name.toLowerCase(),
                osMajorVersion = osEnv.version.getMajor(),
                orientation = this.getOrientation();

            this.renderTo(body);

            classList.push(clsPrefix + osEnv.deviceType.toLowerCase());

            if (osEnv.is.iPad) {
                classList.push(clsPrefix + 'ipad');
            }

            classList.push(clsPrefix + osName);
            classList.push(clsPrefix + browserName);

            if (osMajorVersion) {
                classList.push(clsPrefix + osName + '-' + osMajorVersion);
            }

            if (osEnv.is.BlackBerry) {
                classList.push(clsPrefix + 'bb');
            }

            if (Ext.browser.is.Standalone) {
                classList.push(clsPrefix + 'standalone');
            }

            classList.push(clsPrefix + orientation);

            body.addCls(classList);
        }
    },

    applyAutoBlurInput: function(autoBlurInput) {
        var touchstart = (Ext.feature.has.Touch) ? 'touchstart' : 'mousedown';

        if (autoBlurInput) {
            this.addWindowListener(touchstart, this.doBlurInput, false);
        }
        else {
            this.removeWindowListener(touchstart, this.doBlurInput, false);
        }

        return autoBlurInput;
    },

    applyAutoMaximize: function(autoMaximize) {
        if (Ext.browser.is.WebView) {
            autoMaximize = false;
        }
        if (autoMaximize) {
            this.on('ready', 'doAutoMaximizeOnReady', this, { single: true });
            this.on('orientationchange', 'doAutoMaximizeOnOrientationChange', this);
        }
        else {
            this.un('ready', 'doAutoMaximizeOnReady', this);
            this.un('orientationchange', 'doAutoMaximizeOnOrientationChange', this);
        }

        return autoMaximize;
    },

    applyPreventPanning: function(preventPanning) {
        if (preventPanning) {
            this.addWindowListener('touchmove', this.doPreventPanning, false);
        }
        else {
            this.removeWindowListener('touchmove', this.doPreventPanning, false);
        }

        return preventPanning;
    },

    applyPreventZooming: function(preventZooming) {
        var touchstart = (Ext.feature.has.Touch) ? 'touchstart' : 'mousedown';

        if (preventZooming) {
            this.addWindowListener(touchstart, this.doPreventZooming, false);
        }
        else {
            this.removeWindowListener(touchstart, this.doPreventZooming, false);
        }

        return preventZooming;
    },

    doAutoMaximizeOnReady: function() {
        var controller = arguments[arguments.length - 1];

        controller.pause();

        this.isMaximizing = true;

        this.on('maximize', function() {
            this.isMaximizing = false;

            this.updateSize();

            controller.resume();

            this.fireEvent('ready', this);
        }, this, { single: true });

        this.maximize();
    },

    doAutoMaximizeOnOrientationChange: function() {
        var controller = arguments[arguments.length - 1],
            firingArguments = controller.firingArguments;

        controller.pause();

        this.isMaximizing = true;

        this.on('maximize', function() {
            this.isMaximizing = false;

            this.updateSize();

            firingArguments[2] = this.windowWidth;
            firingArguments[3] = this.windowHeight;

            controller.resume();
        }, this, { single: true });

        this.maximize();
    },

    doBlurInput: function(e) {
        var target = e.target,
            focusedElement = this.focusedElement;

        if (focusedElement && !this.isInputRegex.test(target.tagName)) {
            delete this.focusedElement;
            focusedElement.blur();
        }
    },

    doPreventPanning: function(e) {
        e.preventDefault();
    },

    doPreventZooming: function(e) {
        // Don't prevent right mouse event
        if ('button' in e && e.button !== 0) {
            return;
        }

        var target = e.target;

        if (target && target.nodeType === 1 && !this.isInputRegex.test(target.tagName)) {
            e.preventDefault();
        }
    },

    addWindowListener: function(eventName, fn, capturing) {
        window.addEventListener(eventName, fn, Boolean(capturing));
    },

    removeWindowListener: function(eventName, fn, capturing) {
        window.removeEventListener(eventName, fn, Boolean(capturing));
    },

    doAddListener: function(eventName, fn, scope, options) {
        if (eventName === 'ready' && this.isReady && !this.isMaximizing) {
            fn.call(scope);
            return this;
        }

        this.mixins.observable.doAddListener.apply(this, arguments);
    },

    supportsOrientation: function() {
        return Ext.feature.has.Orientation;
    },

    onResize: function() {
        var oldWidth = this.windowWidth,
            oldHeight = this.windowHeight,
            width = this.getWindowWidth(),
            height = this.getWindowHeight(),
            currentOrientation = this.getOrientation(),
            newOrientation = this.determineOrientation();

        // Determine orientation change via resize. BOTH width AND height much change, otherwise
        // this is a keyboard popping up.
        if ((oldWidth !== width && oldHeight !== height) && currentOrientation !== newOrientation) {
            this.fireOrientationChangeEvent(newOrientation, currentOrientation);
        }
    },

    onOrientationChange: function() {
        var currentOrientation = this.getOrientation(),
            newOrientation = this.determineOrientation();

        if (newOrientation !== currentOrientation) {
            this.fireOrientationChangeEvent(newOrientation, currentOrientation);
        }
    },

    fireOrientationChangeEvent: function(newOrientation, oldOrientation) {
        var clsPrefix = Ext.baseCSSPrefix;
        Ext.getBody().replaceCls(clsPrefix + oldOrientation, clsPrefix + newOrientation);

        this.orientation = newOrientation;

        this.updateSize();
        this.fireEvent('orientationchange', this, newOrientation, this.windowWidth, this.windowHeight);
    },

    updateSize: function(width, height) {
        this.windowWidth = width !== undefined ? width : this.getWindowWidth();
        this.windowHeight = height !== undefined ? height : this.getWindowHeight();

        return this;
    },

    waitUntil: function(condition, onSatisfied, onTimeout, delay, timeoutDuration) {
        if (!delay) {
            delay = 50;
        }

        if (!timeoutDuration) {
            timeoutDuration = 2000;
        }

        var scope = this,
            elapse = 0;

        setTimeout(function repeat() {
            elapse += delay;

            if (condition.call(scope) === true) {
                if (onSatisfied) {
                    onSatisfied.call(scope);
                }
            }
            else {
                if (elapse >= timeoutDuration) {
                    if (onTimeout) {
                        onTimeout.call(scope);
                    }
                }
                else {
                    setTimeout(repeat, delay);
                }
            }
        }, delay);
    },

    maximize: function() {
        this.fireMaximizeEvent();
    },

    fireMaximizeEvent: function() {
        this.updateSize();
        this.fireEvent('maximize', this);
    },

    doSetHeight: function(height) {
        Ext.getBody().setHeight(height);

        this.callParent(arguments);
    },

    doSetWidth: function(width) {
        Ext.getBody().setWidth(width);

        this.callParent(arguments);
    },

    scrollToTop: function() {
        window.scrollTo(0, -1);
    },

    /**
     * Retrieves the document width.
     * @return {Number} width in pixels.
     */
    getWindowWidth: function() {
        return window.innerWidth;
    },

    /**
     * Retrieves the document height.
     * @return {Number} height in pixels.
     */
    getWindowHeight: function() {
        return window.innerHeight;
    },

    getWindowOuterHeight: function() {
        return window.outerHeight;
    },

    getWindowOrientation: function() {
        return window.orientation;
    },

    /**
     * Returns the current orientation.
     * @return {String} `portrait` or `landscape`
     */
    getOrientation: function() {
        return this.orientation;
    },

    getSize: function() {
        return {
            width: this.windowWidth,
            height: this.windowHeight
        };
    },

    determineOrientation: function() {
        var portrait = this.PORTRAIT,
            landscape = this.LANDSCAPE;

        if (this.supportsOrientation()) {
            if (this.getWindowOrientation() % 180 === 0) {
                return portrait;
            }

            return landscape;
        }
        else {
            if (this.getWindowHeight() >= this.getWindowWidth()) {
                return portrait;
            }

            return landscape;
        }
    },

    onItemFullscreenChange: function(item) {
        item.addCls(this.fullscreenItemCls);
        this.add(item);
    }
});

/**
 * @private
 * iOS version of viewport.
 */
Ext.define('Ext.viewport.Ios', {
    extend: 'Ext.viewport.Default',

    isFullscreen: function() {
        return this.isHomeScreen();
    },

    isHomeScreen: function() {
        return window.navigator.standalone === true;
    },

    constructor: function() {
        this.callParent(arguments);

        if (this.getAutoMaximize() && !this.isFullscreen()) {
            this.addWindowListener('touchstart', Ext.Function.bind(this.onTouchStart, this));
        }
    },

    maximize: function() {
        if (this.isFullscreen()) {
            return this.callParent();
        }

        var stretchHeights = this.stretchHeights,
            orientation = this.orientation,
            currentHeight = this.getWindowHeight(),
            height = stretchHeights[orientation];

        if (window.scrollY > 0) {
            this.scrollToTop();

            if (!height) {
                stretchHeights[orientation] = height = this.getWindowHeight();
            }

            this.setHeight(height);
            this.fireMaximizeEvent();
        }
        else {
            if (!height) {
                height = this.getScreenHeight();
            }

            this.setHeight(height);

            this.waitUntil(function() {
                this.scrollToTop();
                return currentHeight !== this.getWindowHeight();
            }, function() {
                if (!stretchHeights[orientation]) {
                    height = stretchHeights[orientation] = this.getWindowHeight();
                    this.setHeight(height);
                }

                this.fireMaximizeEvent();
            }, function() {
                height = stretchHeights[orientation] = this.getWindowHeight();
                this.setHeight(height);
                this.fireMaximizeEvent();
            }, 50, 1000);
        }
    },

    getScreenHeight: function() {
        return window.screen[this.orientation === this.PORTRAIT ? 'height' : 'width'];
    },

    onElementFocus: function() {
        if (this.getAutoMaximize() && !this.isFullscreen()) {
            clearTimeout(this.scrollToTopTimer);
        }

        this.callParent(arguments);
    },

    onElementBlur: function() {
        if (this.getAutoMaximize() && !this.isFullscreen()) {
            this.scrollToTopTimer = setTimeout(this.scrollToTop, 500);
        }

        this.callParent(arguments);
    },

    onTouchStart: function() {
        if (this.focusedElement === null) {
            this.scrollToTop();
        }
    },

    scrollToTop: function() {
        window.scrollTo(0, 0);
    }

}, function() {
    if (!Ext.os.is.iOS) {
        return;
    }

    if (Ext.os.version.lt('3.2')) {
        this.override({
            constructor: function() {
                var stretchHeights = this.stretchHeights = {};

                stretchHeights[this.PORTRAIT] = 416;
                stretchHeights[this.LANDSCAPE] = 268;

                return this.callOverridden(arguments);
            }
        });
    }

    if (Ext.os.version.lt('5')) {
        this.override({
            fieldMaskClsTest: '-field-mask',

            doPreventZooming: function(e) {
                var target = e.target;

                if (target && target.nodeType === 1 &&
                    !this.isInputRegex.test(target.tagName) &&
                    target.className.indexOf(this.fieldMaskClsTest) == -1) {
                    e.preventDefault();
                }
            }
        });
    }

    if (Ext.os.is.iPad) {
        this.override({
            isFullscreen: function() {
                return true;
            }
        });
    }
});

/**
 * @private
 * Android version of viewport.
 */
Ext.define('Ext.viewport.Android', {
    extend: 'Ext.viewport.Default',

    constructor: function() {
        this.on('orientationchange', 'doFireOrientationChangeEvent', this, { prepend: true });
        this.on('orientationchange', 'hideKeyboardIfNeeded', this, { prepend: true });

        this.callParent(arguments);

        this.addWindowListener('resize', Ext.Function.bind(this.onResize, this));
    },

    getDummyInput: function() {
        var input = this.dummyInput,
            focusedElement = this.focusedElement,
            box = Ext.fly(focusedElement).getPageBox();

        if (!input) {
            this.dummyInput = input = document.createElement('input');
            input.style.position = 'absolute';
            input.style.opacity = '0';
            document.body.appendChild(input);
        }

        input.style.left = box.left + 'px';
        input.style.top = box.top + 'px';
        input.style.display = '';

        return input;
    },

    doBlurInput: function(e) {
        var target = e.target,
            focusedElement = this.focusedElement,
            dummy;

        if (focusedElement && !this.isInputRegex.test(target.tagName)) {
            dummy = this.getDummyInput();
            delete this.focusedElement;
            dummy.focus();

            setTimeout(function() {
                dummy.style.display = 'none';
            }, 100);
        }
    },

    hideKeyboardIfNeeded: function() {
        var eventController = arguments[arguments.length - 1],
            focusedElement = this.focusedElement;

        if (focusedElement) {
            delete this.focusedElement;
            eventController.pause();

            if (Ext.os.version.lt('4')) {
                focusedElement.style.display = 'none';
            }
            else {
                focusedElement.blur();
            }

            setTimeout(function() {
                focusedElement.style.display = '';
                eventController.resume();
            }, 1000);
        }
    },

    doFireOrientationChangeEvent: function() {
        var eventController = arguments[arguments.length - 1];

        this.orientationChanging = true;

        eventController.pause();

        this.waitUntil(function() {
            return this.getWindowOuterHeight() !== this.windowOuterHeight;
        }, function() {
            this.windowOuterHeight = this.getWindowOuterHeight();
            this.updateSize();

            eventController.firingArguments[2] = this.windowWidth;
            eventController.firingArguments[3] = this.windowHeight;
            eventController.resume();
            this.orientationChanging = false;

        }, function() {
        });

        return this;
    },

    applyAutoMaximize: function(autoMaximize) {
        autoMaximize = this.callParent(arguments);

        this.on('add', 'fixSize', this, { single: true });
        if (!autoMaximize) {
            this.on('ready', 'fixSize', this, { single: true });
            this.onAfter('orientationchange', 'doFixSize', this);
        }
        else {
            this.un('ready', 'fixSize', this);
            this.unAfter('orientationchange', 'doFixSize', this);
        }
    },

    fixSize: function() {
        this.doFixSize();
    },

    doFixSize: function() {
        this.setHeight(this.getWindowHeight());
    },

    determineOrientation: function() {
        return (this.getWindowHeight() >= this.getWindowWidth()) ? this.PORTRAIT : this.LANDSCAPE;
    },

    getActualWindowOuterHeight: function() {
        return Math.round(this.getWindowOuterHeight() / window.devicePixelRatio);
    },

    maximize: function() {
        var stretchHeights = this.stretchHeights,
            orientation = this.orientation,
            height;

        height = stretchHeights[orientation];

        if (!height) {
            stretchHeights[orientation] = height = this.getActualWindowOuterHeight();
        }

        if (!this.addressBarHeight) {
            this.addressBarHeight = height - this.getWindowHeight();
        }

        this.setHeight(height);

        var isHeightMaximized = Ext.Function.bind(this.isHeightMaximized, this, [height]);

        this.scrollToTop();
        this.waitUntil(isHeightMaximized, this.fireMaximizeEvent, this.fireMaximizeEvent);
    },

    isHeightMaximized: function(height) {
        this.scrollToTop();
        return this.getWindowHeight() === height;
    }

}, function() {
    if (!Ext.os.is.Android) {
        return;
    }

    var version = Ext.os.version,
        userAgent = Ext.browser.userAgent,
        // These Android devices have a nasty bug which causes JavaScript timers to be completely frozen
        // when the browser's viewport is being panned.
        isBuggy = /(htc|desire|incredible|ADR6300)/i.test(userAgent) && version.lt('2.3');

    if (isBuggy) {
        this.override({
            constructor: function(config) {
                if (!config) {
                    config = {};
                }

                config.autoMaximize = false;

                this.watchDogTick = Ext.Function.bind(this.watchDogTick, this);

                setInterval(this.watchDogTick, 1000);

                return this.callParent([config]);
            },

            watchDogTick: function() {
                this.watchDogLastTick = Ext.Date.now();
            },

            doPreventPanning: function() {
                var now = Ext.Date.now(),
                    lastTick = this.watchDogLastTick,
                    deltaTime = now - lastTick;

                // Timers are frozen
                if (deltaTime >= 2000) {
                    return;
                }

                return this.callParent(arguments);
            },

            doPreventZooming: function() {
                var now = Ext.Date.now(),
                    lastTick = this.watchDogLastTick,
                    deltaTime = now - lastTick;

                // Timers are frozen
                if (deltaTime >= 2000) {
                    return;
                }

                return this.callParent(arguments);
            }
        });
    }

    if (version.match('2')) {
        this.override({
            onReady: function() {
                this.addWindowListener('resize', Ext.Function.bind(this.onWindowResize, this));

                this.callParent(arguments);
            },

            scrollToTop: function() {
                document.body.scrollTop = 100;
            },

            onWindowResize: function() {
                var oldWidth = this.windowWidth,
                    oldHeight = this.windowHeight,
                    width = this.getWindowWidth(),
                    height = this.getWindowHeight();

                if (this.getAutoMaximize() && !this.isMaximizing && !this.orientationChanging
                    && window.scrollY === 0
                    && oldWidth === width
                    && height < oldHeight
                    && ((height >= oldHeight - this.addressBarHeight) || !this.focusedElement)) {
                        this.scrollToTop();
                }
            },

            fixSize: function() {
                var orientation = this.getOrientation(),
                    outerHeight = window.outerHeight,
                    outerWidth = window.outerWidth,
                    actualOuterHeight;

                // On some Android 2 devices such as the Kindle Fire, outerWidth and outerHeight are reported wrongly
                // when navigating from another page that has larger size.
                if (orientation === 'landscape' && (outerHeight < outerWidth)
                    || orientation === 'portrait' && (outerHeight >= outerWidth)) {
                    actualOuterHeight = this.getActualWindowOuterHeight();
                }
                else {
                    actualOuterHeight = this.getWindowHeight();
                }

                this.waitUntil(function() {
                    return actualOuterHeight > this.getWindowHeight();
                }, this.doFixSize, this.doFixSize, 50, 1000);
            }
        });
    }
    else if (version.gtEq('3.1')) {
        this.override({
            isHeightMaximized: function(height) {
                this.scrollToTop();
                return this.getWindowHeight() === height - 1;
            }
        });
    }
    else if (version.match('3')) {
        this.override({
            isHeightMaximized: function() {
                this.scrollToTop();
                return true;
            }
        })
    }

    if (version.gtEq('4')) {
        this.override({
            doBlurInput: Ext.emptyFn
        });
    }
});

/**
 * This class acts as a factory for environment-specific viewport implementations.
 *
 * Please refer to the {@link Ext.Viewport} documentation about using the global instance.
 * @private
 */
Ext.define('Ext.viewport.Viewport', {
    requires: [
        'Ext.viewport.Ios',
        'Ext.viewport.Android'
    ],

    constructor: function(config) {
        var osName = Ext.os.name,
            viewportName, viewport;

        switch (osName) {
            case 'Android':
                viewportName = 'Android';
                break;

            case 'iOS':
                viewportName = 'Ios';
                break;

            default:
                viewportName = 'Default';
        }

        viewport = Ext.create('Ext.viewport.' + viewportName, config);

        return viewport;
    }
});

// Docs for the singleton instance created by above factory:

/**
 * @class Ext.Viewport
 * @extends Ext.viewport.Default
 * @singleton
 *
 * Ext.Viewport is a instance created when you use {@link Ext#setup}. Because {@link Ext.Viewport} extends from
 * {@link Ext.Container}, it has as {@link #layout} (which defaults to {@link Ext.layout.Card}). This means you
 * can add items to it at any time, from anywhere in your code. The {@link Ext.Viewport} {@link #cfg-fullscreen}
 * configuration is `true` by default, so it will take up your whole screen.
 *
 *     @example raw
 *     Ext.setup({
 *         onReady: function() {
 *             Ext.Viewport.add({
 *                 xtype: 'container',
 *                 html: 'My new container!'
 *             });
 *         }
 *     });
 *
 * If you want to customize anything about this {@link Ext.Viewport} instance, you can do so by adding a property
 * called `viewport` into your {@link Ext#setup} object:
 *
 *     @example raw
 *     Ext.setup({
 *         viewport: {
 *             layout: 'vbox'
 *         },
 *         onReady: function() {
 *             //do something
 *         }
 *     });
 *
 * **Note** if you use {@link Ext#onReady}, this instance of {@link Ext.Viewport} will **not** be created. Though, in most cases,
 * you should **not** use {@link Ext#onReady}.
 */

/**
 * @author Ed Spencer
 * @private
 *
 * Manages the stack of {@link Ext.app.Action} instances that have been decoded, pushes new urls into the browser's
 * location object and listens for changes in url, firing the {@link #change} event when a change is detected.
 *
 * This is tied to an {@link Ext.app.Application Application} instance. The Application performs all of the
 * interactions with the History object, no additional integration should be required.
 */
Ext.define('Ext.app.History', {
    mixins: ['Ext.mixin.Observable'],

    /**
     * @event change
     * Fires when a change in browser url is detected
     * @param {String} url The new url, after the hash (e.g. http://myapp.com/#someUrl returns 'someUrl')
     */

    config: {
        /**
         * @cfg {Array} actions The stack of {@link Ext.app.Action action} instances that have occured so far
         */
        actions: [],

        /**
         * @cfg {Boolean} updateUrl True to automatically update the browser's url when {@link #add} is called
         */
        updateUrl: true,

        /**
         * @cfg {String} token The current token as read from the browser's location object
         */
        token: ''
    },

    constructor: function(config) {
        if (Ext.feature.has.History) {
            window.addEventListener('hashchange', Ext.bind(this.detectStateChange, this));
        }
        else {
            this.setToken(window.location.hash.substr(1));
            setInterval(Ext.bind(this.detectStateChange, this), 100);
        }

        this.initConfig(config);
    },

    /**
     * Adds an {@link Ext.app.Action Action} to the stack, optionally updating the browser's url and firing the
     * {@link #change} event.
     * @param {Ext.app.Action} action The Action to add to the stack
     * @param {Boolean} silent Cancels the firing of the {@link #change} event if true
     */
    add: function(action, silent) {
        this.getActions().push(Ext.factory(action, Ext.app.Action));

        var url = action.getUrl();

        if (this.getUpdateUrl()) {
            // history.pushState({}, action.getTitle(), "#" + action.getUrl());
            this.setToken(url);
            window.location.hash = url;
        }

        if (silent !== true) {
            this.fireEvent('change', url);
        }

        this.setToken(url);
    },

    /**
     * Navigate to the previous active action. This changes the page url.
     */
    back: function() {
        var actions = this.getActions(),
            previousAction = actions[actions.length - 2],
            app = previousAction.getController().getApplication();

        actions.pop();

        app.redirectTo(previousAction.getUrl());
    },

    /**
     * @private
     */
    applyToken: function(token) {
        return token[0] == '#' ? token.substr(1) : token;
    },

    /**
     * @private
     */
    detectStateChange: function() {
        var newToken = this.applyToken(window.location.hash),
            oldToken = this.getToken();

        if (newToken != oldToken) {
            this.onStateChange();
            this.setToken(newToken);
        }
    },

    /**
     * @private
     */
    onStateChange: function() {
        this.fireEvent('change', window.location.hash.substr(1));
    }
});

/**
 * @author Ed Spencer
 *
 * A Profile represents a range of devices that fall under a common category. For the vast majority of apps that use
 * device profiles, the app defines a Phone profile and a Tablet profile. Doing this enables you to easily customize
 * the experience for the different sized screens offered by those device types.
 *
 * Only one Profile can be active at a time, and each Profile defines a simple {@link #isActive} function that should
 * return either true or false. The first Profile to return true from its isActive function is set as your Application's
 * {@link Ext.app.Application#currentProfile current profile}.
 *
 * A Profile can define any number of {@link #models}, {@link #views}, {@link #controllers} and {@link #stores} which
 * will be loaded if the Profile is activated. It can also define a {@link #launch} function that will be called after
 * all of its dependencies have been loaded, just before the {@link Ext.app.Application#launch application launch}
 * function is called.
 *
 * ## Sample Usage
 *
 * First you need to tell your Application about your Profile(s):
 *
 *     Ext.application({
 *         name: 'MyApp',
 *         profiles: ['Phone', 'Tablet']
 *     });
 *
 * This will load app/profile/Phone.js and app/profile/Tablet.js. Here's how we might define the Phone profile:
 *
 *     Ext.define('MyApp.profile.Phone', {
 *         extend: 'Ext.app.Profile',
 *
 *         views: ['Main'],
 *
 *         isActive: function() {
 *             return Ext.os.is.Phone;
 *         }
 *     });
 *
 * The isActive function returns true if we detect that we are running on a phone device. If that is the case the
 * Application will set this Profile active and load the 'Main' view specified in the Profile's {@link #views} config.
 *
 * ## Class Specializations
 *
 * Because Profiles are specializations of an application, all of the models, views, controllers and stores defined
 * in a Profile are expected to be namespaced under the name of the Profile. Here's an expanded form of the example
 * above:
 *
 *     Ext.define('MyApp.profile.Phone', {
 *         extend: 'Ext.app.Profile',
 *
 *         views: ['Main'],
 *         controllers: ['Signup'],
 *         models: ['MyApp.model.Group'],
 *
 *         isActive: function() {
 *             return Ext.os.is.Phone;
 *         }
 *     });
 *
 * In this case, the Profile is going to load *app/view/phone/Main.js*, *app/controller/phone/Signup.js* and
 * *app/model/Group.js*. Notice that in each of the first two cases the name of the profile ('phone' in this case) was
 * injected into the class names. In the third case we specified the full Model name (for Group) so the Profile name
 * was not injected.
 *
 * For a fuller understanding of the ideas behind Profiles and how best to use them in your app, we suggest you read
 * the <a href="#!/guide/profiles">device profiles guide</a>.
 * 
 * @aside guide profiles
 */
Ext.define('Ext.app.Profile', {
    mixins: {
        observable: "Ext.mixin.Observable"
    },

    config: {
        /**
         * @cfg {String} namespace The namespace that this Profile's classes can be found in. Defaults to the lowercased
         * Profile {@link #name}, for example a Profile called MyApp.profile.Phone will by default have a 'phone'
         * namespace, which means that this Profile's additional models, stores, views and controllers will be loaded
         * from the MyApp.model.phone.*, MyApp.store.phone.*, MyApp.view.phone.* and MyApp.controller.phone.* namespaces
         * respectively.
         * @accessor
         */
        namespace: 'auto',

        /**
         * @cfg {String} name The name of this Profile. Defaults to the last section of the class name (e.g. a profile
         * called MyApp.profile.Phone will default the name to 'Phone').
         * @accessor
         */
        name: 'auto',

        /**
         * @cfg {Array} controllers Any additional {@link Ext.app.Application#controllers Controllers} to load for this
         * profile. Note that each item here will be prepended with the Profile namespace when loaded. Example usage:
         *
         *     controllers: [
         *         'Users',
         *         'MyApp.controller.Products'
         *     ]
         *
         * This will load *MyApp.controller.tablet.Users* and *MyApp.controller.Products*.
         * @accessor
         */
        controllers: [],

        /**
         * @cfg {Array} models Any additional {@link Ext.app.Application#models Models} to load for this profile. Note
         * that each item here will be prepended with the Profile namespace when loaded. Example usage:
         *
         *     models: [
         *         'Group',
         *         'MyApp.model.User'
         *     ]
         *
         * This will load *MyApp.model.tablet.Group* and *MyApp.model.User*.
         * @accessor
         */
        models: [],

        /**
         * @cfg {Array} views Any additional {@link Ext.app.Application#views views} to load for this profile. Note
         * that each item here will be prepended with the Profile namespace when loaded. Example usage:
         *
         *     views: [
         *         'Main',
         *         'MyApp.view.Login'
         *     ]
         *
         * This will load *MyApp.view.tablet.Main* and *MyApp.view.Login*.
         * @accessor
         */
        views: [],

        /**
         * @cfg {Array} stores Any additional {@link Ext.app.Application#stores Stores} to load for this profile. Note
         * that each item here will be prepended with the Profile namespace when loaded. Example usage:
         *
         *     stores: [
         *         'Users',
         *         'MyApp.store.Products'
         *     ]
         *
         * This will load *MyApp.store.tablet.Users* and *MyApp.store.Products*.
         * @accessor
         */
        stores: [],

        /**
         * @cfg {Ext.app.Application} application The {@link Ext.app.Application Application} instance that this
         * Profile is bound to. This is set automatically. Read only.
         * @accessor
         */
        application: null
    },

    /**
     * Creates a new Profile instance
     */
    constructor: function(config) {
        this.initConfig(config);

        this.mixins.observable.constructor.apply(this, arguments);
    },

    /**
     * Determines whether or not this Profile is active on the device isActive is executed on. Should return true if
     * this profile is meant to be active on this device, false otherwise. Each Profile should implement this function
     * (the default implementation just returns false).
     * @return {Boolean} True if this Profile should be activated on the device it is running on, false otherwise
     */
    isActive: function() {
        return false;
    },

    /**
     * @method
     * The launch function is called by the {@link Ext.app.Application Application} if this Profile's {@link #isActive}
     * function returned true. This is typically the best place to run any profile-specific app launch code. Example
     * usage:
     *
     *     launch: function() {
     *         Ext.create('MyApp.view.tablet.Main');
     *     }
     */
    launch: Ext.emptyFn,

    /**
     * @private
     */
    applyNamespace: function(name) {
        if (name == 'auto') {
            name = this.getName();
        }

        return name.toLowerCase();
    },

    /**
     * @private
     */
    applyName: function(name) {
        if (name == 'auto') {
            var pieces = this.$className.split('.');
            name = pieces[pieces.length - 1];
        }

        return name;
    },

    /**
     * @private
     * Computes the full class names of any specified model, view, controller and store dependencies, returns them in
     * an object map for easy loading
     */
    getDependencies: function() {
        var allClasses = [],
            format = Ext.String.format,
            appName = this.getApplication().getName(),
            namespace = this.getNamespace(),
            map = {
                model: this.getModels(),
                view: this.getViews(),
                controller: this.getControllers(),
                store: this.getStores()
            },
            classType, classNames, fullyQualified;

        for (classType in map) {
            classNames = [];

            Ext.each(map[classType], function(className) {
                if (Ext.isString(className)) {
                    //we check name === appName to allow MyApp.profile.MyApp to exist
                    if (Ext.isString(className) && (Ext.Loader.getPrefix(className) === "" || className === appName)) {
                        className = appName + '.' + classType + '.' + namespace + '.' + className;
                    }

                    classNames.push(className);
                    allClasses.push(className);
                }
            }, this);

            map[classType] = classNames;
        }

        map.all = allClasses;

        return map;
    }
});
/**
 * @author Ed Spencer
 * @private
 *
 * Represents a single action as {@link Ext.app.Application#dispatch dispatched} by an Application. This is typically
 * generated as a result of a url change being matched by a Route, triggering Application's dispatch function.
 *
 * This is a private class and its functionality and existence may change in the future. Use at your own risk.
 *
 */
Ext.define('Ext.app.Action', {
    config: {
        /**
         * @cfg {Object} scope The scope in which the {@link #action} should be called
         */
        scope: null,

        /**
         * @cfg {Ext.app.Application} application The Application that this Action is bound to
         */
        application: null,

        /**
         * @cfg {Ext.app.Controller} controller The {@link Ext.app.Controller controller} whose {@link #action} should
         * be called
         */
        controller: null,

        /**
         * @cfg {String} action The name of the action on the {@link #controller} that should be called
         */
        action: null,

        /**
         * @cfg {Array} args The set of arguments that will be passed to the controller's {@link #action}
         */
        args: [],

        /**
         * @cfg {String} url The url that was decoded into the controller/action/args in this Action
         */
        url: undefined,
        data: {},
        title: null,

        /**
         * @cfg {Array} beforeFilters The (optional) set of functions to call before the {@link #action} is called.
         * This is usually handled directly by the Controller or Application when an Ext.app.Action instance is
         * created, but is alterable before {@link #resume} is called.
         * @accessor
         */
        beforeFilters: [],

        /**
         * @private
         * Keeps track of which before filter is currently being executed by {@link #resume}
         */
        currentFilterIndex: -1
    },

    constructor: function(config) {
        this.initConfig(config);

        this.getUrl();
    },

    /**
     * Starts execution of this Action by calling each of the {@link #beforeFilters} in turn (if any are specified),
     * before calling the Controller {@link #action}. Same as calling {@link #resume}.
     */
    execute: function() {
        this.resume();
    },

    /**
     * Resumes the execution of this Action (or starts it if it had not been started already). This iterates over all
     * of the configured {@link #beforeFilters} and calls them. Each before filter is called with this Action as the
     * sole argument, and is expected to call action.resume() in order to allow the next filter to be called, or if
     * this is the final filter, the original {@link Ext.app.Controller Controller} function.
     */
    resume: function() {
        var index   = this.getCurrentFilterIndex() + 1,
            filters = this.getBeforeFilters(),
            controller = this.getController(),
            nextFilter = filters[index];

        if (nextFilter) {
            this.setCurrentFilterIndex(index);
            nextFilter.call(controller, this);
        } else {
            controller[this.getAction()].apply(controller, this.getArgs());
        }
    },

    /**
     * @private
     */
    applyUrl: function(url) {
        if (url === null || url === undefined) {
            url = this.urlEncode();
        }

        return url;
    },

    /**
     * @private
     * If the controller config is a string, swap it for a reference to the actuall controller instance
     * @param {String} controller The controller name
     */
    applyController: function(controller) {
        var app = this.getApplication(),
            profile = app.getCurrentProfile();

        if (Ext.isString(controller)) {
            controller = app.getController(controller, profile ? profile.getNamespace() : null);
        }

        return controller;
    },

    /**
     * @private
     */
    urlEncode: function() {
        var controller = this.getController(),
            splits;

        if (controller instanceof Ext.app.Controller) {
            splits = controller.$className.split('.');
            controller = splits[splits.length - 1];
        }

        return controller + "/" + this.getAction();
    }
});
/**
 * @author Ed Spencer
 *
 * @aside guide controllers
 * @aside guide apps_intro
 * @aside guide history_support
 * @aside video mvc-part-1
 * @aside video mvc-part-2
 *
 * Controllers are responsible for responding to events that occur within your app. If your app contains a Logout
 * {@link Ext.Button button} that your user can tap on, a Controller would listen to the Button's tap event and take
 * the appropriate action. It allows the View classes to handle the display of data and the Model classes to handle the
 * loading and saving of data - the Controller is the glue that binds them together.
 *
 * ## Relation to Ext.app.Application
 *
 * Controllers exist within the context of an {@link Ext.app.Application Application}. An Application usually consists
 * of a number of Controllers, each of which handle a specific part of the app. For example, an Application that
 * handles the orders for an online shopping site might have controllers for Orders, Customers and Products.
 *
 * All of the Controllers that an Application uses are specified in the Application's
 * {@link Ext.app.Application#controllers} config. The Application automatically instantiates each Controller and keeps
 * references to each, so it is unusual to need to instantiate Controllers directly. By convention each Controller is
 * named after the thing (usually the Model) that it deals with primarily, usually in the plural - for example if your
 * app is called 'MyApp' and you have a Controller that manages Products, convention is to create a
 * MyApp.controller.Products class in the file app/controller/Products.js.
 *
 * ## Refs and Control
 *
 * The centerpiece of Controllers is the twin configurations {@link #refs} and {@link #cfg-control}. These are used to
 * easily gain references to Components inside your app and to take action on them based on events that they fire.
 * Let's look at {@link #refs} first:
 *
 * ### Refs
 *
 * Refs leverage the powerful {@link Ext.ComponentQuery ComponentQuery} syntax to easily locate Components on your
 * page. We can define as many refs as we like for each Controller, for example here we define a ref called 'nav' that
 * finds a Component on the page with the ID 'mainNav'. We then use that ref in the addLogoutButton beneath it:
 *
 *     Ext.define('MyApp.controller.Main', {
 *         extend: 'Ext.app.Controller',
 *
 *         config: {
 *             refs: {
 *                 nav: '#mainNav'
 *             }
 *         },
 *
 *         addLogoutButton: function() {
 *             this.getNav().add({
 *                 text: 'Logout'
 *             });
 *         }
 *     });
 *
 * Usually, a ref is just a key/value pair - the key ('nav' in this case) is the name of the reference that will be
 * generated, the value ('#mainNav' in this case) is the {@link Ext.ComponentQuery ComponentQuery} selector that will
 * be used to find the Component.
 *
 * Underneath that, we have created a simple function called addLogoutButton which uses this ref via its generated
 * 'getNav' function. These getter functions are generated based on the refs you define and always follow the same
 * format - 'get' followed by the capitalized ref name. In this case we're treating the nav reference as though it's a
 * {@link Ext.Toolbar Toolbar}, and adding a Logout button to it when our function is called. This ref would recognize
 * a Toolbar like this:
 *
 *     Ext.create('Ext.Toolbar', {
 *         id: 'mainNav',
 *
 *         items: [
 *             {
 *                 text: 'Some Button'
 *             }
 *         ]
 *     });
 *
 * Assuming this Toolbar has already been created by the time we run our 'addLogoutButton' function (we'll see how that
 * is invoked later), it will get the second button added to it.
 *
 * ### Advanced Refs
 *
 * Refs can also be passed a couple of additional options, beyond name and selector. These are autoCreate and xtype,
 * which are almost always used together:
 *
 *     Ext.define('MyApp.controller.Main', {
 *         extend: 'Ext.app.Controller',
 *
 *         config: {
 *             refs: {
 *                 nav: '#mainNav',
 *
 *                 infoPanel: {
 *                     selector: 'tabpanel panel[name=fish] infopanel',
 *                     xtype: 'infopanel',
 *                     autoCreate: true
 *                 }
 *             }
 *         }
 *     });
 *
 * We've added a second ref to our Controller. Again the name is the key, 'infoPanel' in this case, but this time we've
 * passed an object as the value instead. This time we've used a slightly more complex selector query - in this example
 * imagine that your app contains a {@link Ext.tab.Panel tab panel} and that one of the items in the tab panel has been
 * given the name 'fish'. Our selector matches any Component with the xtype 'infopanel' inside that tab panel item.
 *
 * The difference here is that if that infopanel does not exist already inside the 'fish' panel, it will be
 * automatically created when you call this.getInfoPanel inside your Controller. The Controller is able to do this
 * because we provided the xtype to instantiate with in the event that the selector did not return anything.
 *
 * ### Control
 *
 * The sister config to {@link #refs} is {@link #cfg-control}. {@link #cfg-control Control} is the means by which your listen
 * to events fired by Components and have your Controller react in some way. Control accepts both ComponentQuery
 * selectors and refs as its keys, and listener objects as values - for example:
 *
 *     Ext.define('MyApp.controller.Main', {
 *         extend: 'Ext.app.Controller',
 *
 *         config: {
 *             control: {
 *                 loginButton: {
 *                     tap: 'doLogin'
 *                 },
 *                 'button[action=logout]': {
 *                     tap: 'doLogout'
 *                 }
 *             },
 *
 *             refs: {
 *                 loginButton: 'button[action=login]'
 *             }
 *         },
 *
 *         doLogin: function() {
 *             //called whenever the Login button is tapped
 *         },
 *
 *         doLogout: function() {
 *             //called whenever any Button with action=logout is tapped
 *         }
 *     });
 *
 * Here we have set up two control declarations - one for our loginButton ref and the other for any Button on the page
 * that has been given the action 'logout'. For each declaration we passed in a single event handler - in each case
 * listening for the 'tap' event, specifying the action that should be called when that Button fires the tap event.
 * Note that we specified the 'doLogin' and 'doLogout' methods as strings inside the control block - this is important.
 *
 * You can listen to as many events as you like in each control declaration, and mix and match ComponentQuery selectors
 * and refs as the keys.
 *
 * ## Routes
 *
 * As of Sencha Touch 2, Controllers can now directly specify which routes they are interested in. This enables us to
 * provide history support within our app, as well as the ability to deeply link to any part of the application that we
 * provide a route for.
 *
 * For example, let's say we have a Controller responsible for logging in and viewing user profiles, and want to make
 * those screens accessible via urls. We could achieve that like this:
 *
 *     Ext.define('MyApp.controller.Users', {
 *         extend: 'Ext.app.Controller',
 *
 *         config: {
 *             routes: {
 *                 'login': 'showLogin',
 *                 'user/:id': 'showUserById'
 *             },
 *
 *             refs: {
 *                 main: '#mainTabPanel'
 *             }
 *         },
 *
 *         //uses our 'main' ref above to add a loginpanel to our main TabPanel (note that
 *         //'loginpanel' is a custom xtype created for this application)
 *         showLogin: function() {
 *             this.getMain().add({
 *                 xtype: 'loginpanel'
 *             });
 *         },
 *
 *         //Loads the User then adds a 'userprofile' view to the main TabPanel
 *         showUserById: function(id) {
 *             MyApp.model.User.load(id, {
 *                 scope: this,
 *                 success: function(user) {
 *                     this.getMain().add({
 *                         xtype: 'userprofile',
 *                         user: user
 *                     });
 *                 }
 *             });
 *         }
 *     });
 *
 * The routes we specified above simply map the contents of the browser address bar to a Controller function to call
 * when that route is matched. The routes can be simple text like the login route, which matches against
 * http://myapp.com/#login, or contain wildcards like the 'user/:id' route, which matches urls like
 * http://myapp.com/#user/123. Whenever the address changes the Controller automatically calls the function specified.
 *
 * Note that in the showUserById function we had to first load the User instance. Whenever you use a route, the
 * function that is called by that route is completely responsible for loading its data and restoring state. This is
 * because your user could either send that url to another person or simply refresh the page, which we wipe clear any
 * cached data you had already loaded. There is a more thorough discussion of restoring state with routes in the
 * application architecture guides.
 *
 * ## Advanced Usage
 *
 * See <a href="#!/guide/controllers">the Controllers guide</a> for advanced Controller usage including before filters
 * and customizing for different devices.
 */
Ext.define('Ext.app.Controller', {
    mixins: {
        observable: "Ext.mixin.Observable"
    },

    config: {
        /**
         * @cfg {Object} refs A collection of named {@link Ext.ComponentQuery ComponentQuery} selectors that makes it
         * easy to get references to key Components on your page. Example usage:
         *
         *     refs: {
         *         main: '#mainTabPanel',
         *         loginButton: '#loginWindow button[action=login]',
         *
         *         infoPanel: {
         *             selector: 'infopanel',
         *             xtype: 'infopanel',
         *             autoCreate: true
         *         }
         *     }
         *
         * The first two are simple ComponentQuery selectors, the third (infoPanel) also passes in the autoCreate and
         * xtype options, which will first run the ComponentQuery to see if a Component matching that selector exists
         * on the page. If not, it will automatically create one using the xtype provided:
         *
         *     someControllerFunction: function() {
         *         //if the info panel didn't exist before, calling its getter will instantiate
         *         //it automatically and return the new instance
         *         this.getInfoPanel().show();
         *     }
         *
         * @accessor
         */
        refs: {},

        /**
         * @cfg {Object} routes Provides a mapping of urls to Controller actions. Whenever the specified url is matched
         * in the address bar, the specified Controller action is called. Example usage:
         *
         *     routes: {
         *         'login': 'showLogin',
         *         'users/:id': 'showUserById'
         *     }
         *
         * The first route will match against http://myapp.com/#login and call the Controller's showLogin function. The
         * second route contains a wildcard (':id') and will match all urls like http://myapp.com/#users/123, calling
         * the showUserById function with the matched ID as the first argument.
         *
         * @accessor
         */
        routes: {},

        /**
         * @cfg {Object} control Provides a mapping of Controller functions that should be called whenever certain
         * Component events are fired. The Components can be specified using {@link Ext.ComponentQuery ComponentQuery}
         * selectors or {@link #refs}. Example usage:
         *
         *     control: {
         *         'button[action=logout]': {
         *             tap: 'doLogout'
         *         },
         *         main: {
         *             activeitemchange: 'doUpdate'
         *         }
         *     }
         *
         * The first item uses a ComponentQuery selector to run the Controller's doLogout function whenever any Button
         * with action=logout is tapped on. The second calls the Controller's doUpdate function whenever the
         * activeitemchange event is fired by the Component referenced by our 'main' ref. In this case main is a tab
         * panel (see {@link #refs} for how to set that reference up).
         *
         * @accessor
         */
        control: {},

        /**
         * @cfg {Object} before Provides a mapping of Controller functions to filter functions that are run before them
         * when dispatched to from a route. These are usually used to run pre-processing functions like authentication
         * before a certain function is executed. They are only called when dispatching from a route. Example usage:
         *
         *     Ext.define('MyApp.controller.Products', {
         *         config: {
         *             before: {
         *                 editProduct: 'authenticate'
         *             },
         *
         *             routes: {
         *                 'product/edit/:id': 'editProduct'
         *             }
         *         },
         *
         *         //this is not directly because our before filter is called first
         *         editProduct: function() {
         *             //... performs the product editing logic
         *         },
         *
         *         //this is run before editProduct
         *         authenticate: function(action) {
         *             MyApp.authenticate({
         *                 success: function() {
         *                     action.resume();
         *                 },
         *                 failure: function() {
         *                     Ext.Msg.alert('Not Logged In', "You can't do that, you're not logged in");
         *                 }
         *             });
         *         }
         *     });
         *
         * @accessor
         */
        before: {},

        /**
         * @cfg {Ext.app.Application} application The Application instance this Controller is attached to. This is
         * automatically provided when using the MVC architecture so should rarely need to be set directly.
         * @accessor
         */
        application: {},

        /**
         * @cfg {String[]} stores The set of stores to load for this Application. Each store is expected to
         * exist inside the *app/store* directory and define a class following the convention
         * AppName.store.StoreName. For example, in the code below, the *AppName.store.Users* class will be loaded.
         * Note that we are able to specify either the full class name (as with *AppName.store.Groups*) or just the
         * final part of the class name and leave Application to automatically prepend *AppName.store.’* to each:
         *
         *     stores: [
         *         'Users',
         *         'AppName.store.Groups',
         *         'SomeCustomNamespace.store.Orders'
         *     ]
         * @accessor
         */
        stores: [],

        /**
         * @cfg {String[]} models The set of models to load for this Application. Each model is expected to exist inside the
         * *app/model* directory and define a class following the convention AppName.model.ModelName. For example, in the
         * code below, the classes *AppName.model.User*, *AppName.model.Group* and *AppName.model.Product* will be loaded.
         * Note that we are able to specify either the full class name (as with *AppName.model.Product*) or just the
         * final part of the class name and leave Application to automatically prepend *AppName.model.* to each:
         *
         *     models: [
         *         'User',
         *         'Group',
         *         'AppName.model.Product',
         *         'SomeCustomNamespace.model.Order'
         *     ]
         * @accessor
         */
        models: [],

        /**
         * @cfg {Array} views The set of views to load for this Application. Each view is expected to exist inside the
         * *app/view* directory and define a class following the convention AppName.view.ViewName. For example, in the
         * code below, the classes *AppName.view.Users*, *AppName.view.Groups* and *AppName.view.Products* will be loaded.
         * Note that we are able to specify either the full class name (as with *AppName.view.Products*) or just the
         * final part of the class name and leave Application to automatically prepend *AppName.view.* to each:
         *
         *     views: [
         *         'Users',
         *         'Groups',
         *         'AppName.view.Products',
         *         'SomeCustomNamespace.view.Orders'
         *     ]
         * @accessor
         */
        views: []
    },

    /**
     * Constructs a new Controller instance
     */
    constructor: function(config) {
        this.initConfig(config);

        this.mixins.observable.constructor.call(this, config);
    },

    /**
     * @cfg
     * Called by the Controller's {@link #application} to initialize the Controller. This is always called before the
     * {@link Ext.app.Application Application} launches, giving the Controller a chance to run any pre-launch logic.
     * See also {@link #launch}, which is called after the {@link Ext.app.Application#launch Application's launch function}
     */
    init: Ext.emptyFn,

    /**
     * @cfg
     * Called by the Controller's {@link #application} immediately after the Application's own
     * {@link Ext.app.Application#launch launch function} has been called. This is usually a good place to run any
     * logic that has to run after the app UI is initialized. See also {@link #init}, which is called before the
     * {@link Ext.app.Application#launch Application's launch function}.
     */
    launch: Ext.emptyFn,

    /**
     * Convenient way to redirect to a new url. See {@link Ext.app.Application#redirectTo} for full usage information
     */
    redirectTo: function(place) {
        return this.getApplication().redirectTo(place);
    },

    /**
     * @private
     * Executes an Ext.app.Action by giving it the correct before filters and kicking off execution
     */
    execute: function(action, skipFilters) {
        action.setBeforeFilters(this.getBefore()[action.getAction()]);
        action.execute();
    },

    /**
     * @private
     * Massages the before filters into an array of function references for each controller action
     */
    applyBefore: function(before) {
        var filters, name, length, i;

        for (name in before) {
            filters = Ext.Array.from(before[name]);
            length  = filters.length;

            for (i = 0; i < length; i++) {
                filters[i] = this[filters[i]];
            }

            before[name] = filters;
        }

        return before;
    },

    /**
     * @private
     */
    applyControl: function(config) {
        this.control(config, this);

        return config;
    },

    /**
     * @private
     */
    applyRefs: function(refs) {

        this.ref(refs);

        return refs;
    },

    /**
     * @private
     * Adds any routes specified in this Controller to the global Application router
     */
    applyRoutes: function(routes) {
        var app    = this instanceof Ext.app.Application ? this : this.getApplication(),
            router = app.getRouter(),
            route, url, config;

        for (url in routes) {
            route = routes[url];

            config = {
                controller: this.$className
            };

            if (Ext.isString(route)) {
                config.action = route;
            } else {
                Ext.apply(config, route);
            }

            router.connect(url, config);
        }

        return routes;
    },

    /**
     * @private
     * As a convenience developers can locally qualify store names (e.g. 'MyStore' vs
     * 'MyApp.store.MyStore'). This just makes sure everything ends up fully qualified
     */
    applyStores: function(stores) {
        return this.getFullyQualified(stores, 'store');
    },

    /**
     * @private
     * As a convenience developers can locally qualify model names (e.g. 'MyModel' vs
     * 'MyApp.model.MyModel'). This just makes sure everything ends up fully qualified
     */
    applyModels: function(models) {
        return this.getFullyQualified(models, 'model');
    },

    /**
     * @private
     * As a convenience developers can locally qualify view names (e.g. 'MyView' vs
     * 'MyApp.view.MyView'). This just makes sure everything ends up fully qualified
     */
    applyViews: function(views) {
        return this.getFullyQualified(views, 'view');
    },

    /**
     * @private
     * Returns the fully qualified name for any class name variant. This is used to find the FQ name for the model,
     * view, controller, store and profiles listed in a Controller or Application.
     * @param {String[]} items The array of strings to get the FQ name for
     * @param {String} namespace If the name happens to be an application class, add it to this namespace
     * @return {String} The fully-qualified name of the class
     */
    getFullyQualified: function(items, namespace) {
        var length  = items.length,
            appName = this.getApplication().getName(),
            name, i;

        for (i = 0; i < length; i++) {
            name = items[i];

            //we check name === appName to allow MyApp.profile.MyApp to exist
            if (Ext.isString(name) && (Ext.Loader.getPrefix(name) === "" || name === appName)) {
                items[i] = appName + '.' + namespace + '.' + name;
            }
        }

        return items;
    },

    /**
     * @private
     */
    control: function(selectors) {
        this.getApplication().control(selectors, this);
    },

    /**
     * @private
     * 1.x-inspired ref implementation
     */
    ref: function(refs) {
        var me = this,
            refName, getterName, selector, info;

        for (refName in refs) {
            selector = refs[refName];
            getterName = "get" + Ext.String.capitalize(refName);

            if (!this[getterName]) {
                if (Ext.isString(refs[refName])) {
                    info = {
                        ref: refName,
                        selector: selector
                    };
                } else {
                    info = refs[refName];
                }

                this[getterName] = function(refName, info) {
                    var args = [refName, info];
                    return function() {
                        return me.getRef.apply(me, args.concat.apply(args, arguments));
                    };
                }(refName, info);
            }

            this.references = this.references || [];
            this.references.push(refName.toLowerCase());
        }
    },

    /**
     * @private
     */
    getRef: function(ref, info, config) {
        this.refCache = this.refCache || {};
        info = info || {};
        config = config || {};

        Ext.apply(info, config);

        if (info.forceCreate) {
            return Ext.ComponentManager.create(info, 'component');
        }

        var me = this,
            cached = me.refCache[ref];

        if (!cached) {
            me.refCache[ref] = cached = Ext.ComponentQuery.query(info.selector)[0];
            if (!cached && info.autoCreate) {
                me.refCache[ref] = cached = Ext.ComponentManager.create(info, 'component');
            }
            if (cached) {
                cached.on('destroy', function() {
                    me.refCache[ref] = null;
                });
            }
        }

        return cached;
    },

    /**
     * @private
     */
    hasRef: function(ref) {
        return this.references && this.references.indexOf(ref.toLowerCase()) !== -1;
    },

}, function() {
});

/**
 * @author Ed Spencer
 * @private
 *
 * Represents a mapping between a url and a controller/action pair. May also contain additional params. This is a
 * private internal class that should not need to be used by end-developer code. Its API and existence are subject to
 * change so use at your own risk.
 *
 * For information on how to use routes we suggest reading the following guides:
 *
 * * <a href="#!/guide/history_support">Using History Support</a>
 * * <a href="#!/guide/apps_intro">Intro to Applications</a>
 * * <a href="#!/guide/controllers">Using Controllers</a>
 *
 */
Ext.define('Ext.app.Route', {

    config: {
        /**
         * @cfg {Object} conditions Optional set of conditions for each token in the url string. Each key should be one
         * of the tokens, each value should be a regex that the token should accept. For example, if you have a Route
         * with a url like "files/:fileName" and you want it to match urls like "files/someImage.jpg" then you can set
         * these conditions to allow the :fileName token to accept strings containing a period ("."):
         *
         *     conditions: {
         *         ':fileName': "[0-9a-zA-Z\.]+"
         *     }
         *
         */
        conditions: {},

        /**
         * @cfg {String} url The url regex to match against. Required
         */
        url: null,

        /**
         * @cfg {String} controller The name of the Controller whose {@link #action} will be called if this route is
         * matched
         */
        controller: null,

        /**
         * @cfg {String} action The name of the action that will be called on the {@link #controller} if this route is
         * matched
         */
        action: null,

        /**
         * @private
         * @cfg {Boolean} initialized Indicates whether or not this Route has been initialized. We don't initialize
         * straight away so as to save unnecessary processing.
         */
        initialized: false
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    /**
     * Attempts to recognize a given url string and return controller/action pair for it
     * @param {String} url The url to recognize
     * @return {Object} The matched data, or false if no match
     */
    recognize: function(url) {
        if (!this.getInitialized()) {
            this.initialize();
        }

        if (this.recognizes(url)) {
            var matches = this.matchesFor(url),
                args    = url.match(this.matcherRegex);

            args.shift();

            return Ext.applyIf(matches, {
                controller: this.getController(),
                action    : this.getAction(),
                historyUrl: url,
                args      : args
            });
        }
    },

    /**
     * @private
     * Sets up the relevant regular expressions used to match against this route
     */
    initialize: function() {
        /*
         * The regular expression we use to match a segment of a route mapping
         * this will recognise segments starting with a colon,
         * e.g. on 'namespace/:controller/:action', :controller and :action will be recognised
         */
        this.paramMatchingRegex = new RegExp(/:([0-9A-Za-z\_]*)/g);

        /*
         * Converts a route string into an array of symbols starting with a colon. e.g.
         * ":controller/:action/:id" => [':controller', ':action', ':id']
         */
        this.paramsInMatchString = this.getUrl().match(this.paramMatchingRegex) || [];

        this.matcherRegex = this.createMatcherRegex(this.getUrl());

        this.setInitialized(true);
    },

    /**
     * @private
     * Returns true if this Route matches the given url string
     * @param {String} url The url to test
     * @return {Boolean} True if this Route recognizes the url
     */
    recognizes: function(url) {
        return this.matcherRegex.test(url);
    },

    /**
     * @private
     * Returns a hash of matching url segments for the given url.
     * @param {String} url The url to extract matches for
     * @return {Object} matching url segments
     */
    matchesFor: function(url) {
        var params = {},
            keys   = this.paramsInMatchString,
            values = url.match(this.matcherRegex),
            length = keys.length,
            i;

        //first value is the entire match so reject
        values.shift();

        for (i = 0; i < length; i++) {
            params[keys[i].replace(":", "")] = values[i];
        }

        return params;
    },

    /**
     * @private
     * Returns an array of matching url segments for the given url.
     * @param {String} url The url to extract matches for
     * @return {Array} matching url segments
     */
    argsFor: function(url) {
        var args   = [],
            keys   = this.paramsInMatchString,
            values = url.match(this.matcherRegex),
            length = keys.length,
            i;

        //first value is the entire match so reject
        values.shift();

        for (i = 0; i < length; i++) {
            args.push(keys[i].replace(':', ""));
            params[keys[i].replace(":", "")] = values[i];
        }

        return params;
    },

    /**
     * @private
     * Constructs a url for the given config object by replacing wildcard placeholders in the Route's url
     * @param {Object} config The config object
     * @return {String} The constructed url
     */
    urlFor: function(config) {
        var url = this.getUrl();

        for (var key in config) {
            url = url.replace(":" + key, config[key]);
        }

        return url;
    },

    /**
     * @private
     * Takes the configured url string including wildcards and returns a regex that can be used to match
     * against a url
     * @param {String} url The url string
     * @return {RegExp} The matcher regex
     */
    createMatcherRegex: function(url) {
        /**
         * Converts a route string into an array of symbols starting with a colon. e.g.
         * ":controller/:action/:id" => [':controller', ':action', ':id']
         */
        var paramsInMatchString = this.paramsInMatchString,
            length = paramsInMatchString.length,
            i, cond, matcher;

        for (i = 0; i < length; i++) {
            cond    = this.getConditions()[paramsInMatchString[i]];
            matcher = Ext.util.Format.format("({0})", cond || "[%a-zA-Z0-9\-\\_\\s,]+");

            url = url.replace(new RegExp(paramsInMatchString[i]), matcher);
        }

        //we want to match the whole string, so include the anchors
        return new RegExp("^" + url + "$");
    }
});
/**
 * @author Ed Spencer
 * @private
 *
 * The Router is an ordered set of route definitions that decode a url into a controller function to execute. Each
 * route defines a type of url to match, along with the controller function to call if it is matched. The Router is
 * usually managed exclusively by an {@link Ext.app.Application Application}, which also uses a
 * {@link Ext.app.History History} instance to find out when the browser's url has changed.
 *
 * Routes are almost always defined inside a {@link Ext.app.Controller Controller}, as opposed to on the Router itself.
 * End-developers should not usually need to interact directly with the Router as the Application and Controller
 * classes manage everything automatically. See the {@link Ext.app.Controller Controller documentation} for more
 * information on specifying routes.
 */
Ext.define('Ext.app.Router', {
    requires: ['Ext.app.Route'],

    config: {
        /**
         * @cfg {Array} routes The set of routes contained within this Router. Read only
         */
        routes: [],

        /**
         * @cfg {Object} defaults Default configuration options for each Route connected to this Router.
         */
        defaults: {
            action: 'index'
        }
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    /**
     * Connects a url-based route to a controller/action pair plus additional params
     * @param {String} url The url to recognize
     */
    connect: function(url, params) {
        params = Ext.apply({url: url}, params || {}, this.getDefaults());
        var route = Ext.create('Ext.app.Route', params);

        this.getRoutes().push(route);

        return route;
    },

    /**
     * Recognizes a url string connected to the Router, return the controller/action pair plus any additional
     * config associated with it
     * @param {String} url The url to recognize
     * @return {Object/undefined} If the url was recognized, the controller and action to call, else undefined
     */
    recognize: function(url) {
        var routes = this.getRoutes(),
            length = routes.length,
            i, result;

        for (i = 0; i < length; i++) {
            result = routes[i].recognize(url);

            if (result !== undefined) {
                return result;
            }
        }

        return undefined;
    },

    /**
     * Convenience method which just calls the supplied function with the Router instance. Example usage:
<pre><code>
Ext.Router.draw(function(map) {
    map.connect('activate/:token', {controller: 'users', action: 'activate'});
    map.connect('home',            {controller: 'index', action: 'home'});
});
</code></pre>
     * @param {Function} fn The fn to call
     */
    draw: function(fn) {
        fn.call(this, this);
    },

    /**
     * @private
     */
    clear: function() {
        this.setRoutes([]);
    }
}, function() {
});

/**
 * @author Ed Spencer
 *
 * @aside guide apps_intro
 * @aside guide first_app
 * @aside video mvc-part-1
 * @aside video mvc-part-2
 *
 * Ext.app.Application defines the set of {@link Ext.data.Model Models}, {@link Ext.app.Controller Controllers},
 * {@link Ext.app.Profile Profiles}, {@link Ext.data.Store Stores} and {@link Ext.Component Views} that an application
 * consists of. It automatically loads all of those dependencies and can optionally specify a {@link #launch} function
 * that will be called when everthing is ready.
 *
 * Sample usage:
 *
 *     Ext.application({
 *         name: 'MyApp',
 *
 *         models: ['User', 'Group'],
 *         stores: ['Users'],
 *         controllers: ['Users'],
 *         views: ['Main', 'ShowUser'],
 *
 *         launch: function() {
 *             Ext.create('MyApp.view.Main');
 *         }
 *     });
 *
 * Creating an Application instance is the only time in Sencha Touch 2 that we don't use Ext.create to create the new
 * instance. Instead, the {@link Ext#application} function instantiates an Ext.app.Application internally,
 * automatically loading the Ext.app.Application class if it is not present on the page already and hooking in to
 * {@link Ext#onReady} before creating the instance itself. An alternative is to use Ext.create inside an Ext.onReady
 * callback, but Ext.application is preferred.
 *
 * ## Dependencies
 *
 * Application follows a simple convention when it comes to specifying the controllers, views, models, stores and
 * profiles it requires. By default it expects each of them to be found inside the *app/controller*, *app/view*,
 * *app/model*, *app/store* and *app/profile* directories in your app - if you follow this convention you can just
 * specify the last part of each class name and Application will figure out the rest for you:
 *
 *     Ext.application({
 *         name: 'MyApp',
 *
 *         controllers: ['Users'],
 *         models: ['User', 'Group'],
 *         stores: ['Users'],
 *         views: ['Main', 'ShowUser']
 *     });
 *
 * The example above will load 6 files:
 *
 * * app/model/User.js
 * * app/model/Group.js
 * * app/store/Users.js
 * * app/controller/Users.js
 * * app/view/Main.js
 * * app/view/ShowUser.js
 *
 * ### Nested Dependencies
 *
 * For larger apps it's common to split the models, views and controllers into subfolders so keep the project
 * organized. This is especially true of views - it's not unheard of for large apps to have over a hundred separate
 * view classes so organizing them into folders can make maintenance much simpler.
 *
 * To specify dependencies in subfolders just use a period (".") to specify the folder:
 *
 *     Ext.application({
 *         name: 'MyApp',
 *
 *         controllers: ['Users', 'nested.MyController'],
 *         views: ['products.Show', 'products.Edit', 'user.Login']
 *     });
 *
 * In this case these 5 files will be loaded:
 *
 * * app/controller/Users.js
 * * app/controller/nested/MyController.js
 * * app/view/products/Show.js
 * * app/view/products/Edit.js
 * * app/view/user/Login.js
 *
 * Note that we can mix and match within each configuration here - for each model, view, controller, profile or store
 * you can specify either just the final part of the class name (if you follow the directory conventions), or the full
 * class name.
 *
 * ### External Dependencies
 *
 * Finally, we can specify application dependencies from outside our application by fully-qualifying the classes we
 * want to load. A common use case for this is sharing authentication logic between multiple applications. Perhaps you
 * have several apps that login via a common user database and you want to share that code between them. An easy way to
 * do this is to create a folder alongside your app folder and then add its contents as dependencies for your app.
 *
 * For example, let's say our shared login code contains a login controller, a user model and a login form view. We
 * want to use all of these in our application:
 *
 *     Ext.Loader.setPath({
 *         'Auth': 'Auth'
 *     });
 *
 *     Ext.application({
 *         views: ['Auth.view.LoginForm', 'Welcome'],
 *         controllers: ['Auth.controller.Sessions', 'Main'],
 *         models: ['Auth.model.User']
 *     });
 *
 * This will load the following files:
 *
 * * Auth/view/LoginForm.js
 * * Auth/controller/Sessions.js
 * * Auth/model/User.js
 * * app/view/Welcome.js
 * * app/controller/Main.js
 *
 * The first three were loaded from outside our application, the last two from the application itself. Note how we can
 * still mix and match application files and external dependency files.
 *
 * Note that to enable the loading of external dependencies we just have to tell the Loader where to find those files,
 * which is what we do with the Ext.Loader.setPath call above. In this case we're telling the Loader to find any class
 * starting with the 'Auth' namespace inside our 'Auth' folder. This means we can drop our common Auth code into our
 * application alongside the app folder and the framework will be able to figure out how to load everything.
 *
 * ## Launching
 *
 * Each Application can define a {@link Ext.app.Application#launch launch} function, which is called as soon as all of
 * your app's classes have been loaded and the app is ready to be launched. This is usually the best place to put any
 * application startup logic, typically creating the main view structure for your app.
 *
 * In addition to the Application launch function, there are two other places you can put app startup logic. Firstly,
 * each Controller is able to define an {@link Ext.app.Controller#init init} function, which is called before the
 * Application launch function. Secondly, if you are using Device Profiles, each Profile can define a
 * {@link Ext.app.Profile#launch launch} function, which is called after the Controller init functions but before the
 * Application launch function.
 *
 * Note that only the active Profile has its launch function called - for example if you define profiles for Phone and
 * Tablet and then launch the app on a tablet, only the Tablet Profile's launch function is called.
 *
 * 1. Controller#init functions called
 * 2. Profile#launch function called
 * 3. Application#launch function called
 * 4. Controller#launch functions called
 *
 * When using Profiles it is common to place most of the bootup logic inside the Profile launch function because each
 * Profile has a different set of views that need to be constructed at startup.
 *
 * ## Adding to Home Screen
 *
 * iOS devices allow your users to add your app to their home screen for easy access. iOS allows you to customize
 * several aspects of this, including the icon that will appear on the home screen and the startup image. These can be
 * specified in the Ext.application setup block:
 *
 *     Ext.application({
 *         name: 'MyApp',
 *
 *         {@link #icon}: 'resources/img/icon.png',
 *         {@link #glossOnIcon}: false,
 *         {@link #phoneStartupScreen}: 'resources/img/phone_startup.png',
 *         {@link #tabletStartupScreen}: 'resources/img/tablet_startup.png'
 *     });
 *
 * When the user adds your app to the home screen, your resources/img/icon.png file will be used as the application
 * icon. We also used the {@link #glossOnIcon} configuration to turn off the gloss effect that is automatically added
 * to icons in iOS. Finally we used the {@link #phoneStartupScreen} and {@link #tabletStartupScreen} configurations to
 * provide the images that will be displayed while your application is starting up. See also {@link #phoneIcon},
 * {@link #tabletIcon} and {@link #statusBarStyle}.
 *
 * ## Find out more
 *
 * If you are not already familiar with writing applications with Sencha Touch 2 we recommend reading the
 * <a href="#!/guide/apps_intro">intro to applications</a> guide, which lays out the core principles of writing apps
 * with Sencha Touch 2.
 */
Ext.define('Ext.app.Application', {
    extend: 'Ext.app.Controller',

    requires: [
        'Ext.app.History',
        'Ext.app.Profile',
        'Ext.app.Router',
        'Ext.app.Action'
    ],

    config: {
        /**
         * @cfg {String/Object} icon Path to the .png image file to use when your app is added to the home screen on an
         * iOS device. When passed in as a String, the same icon will be used for both phone and tablet devices. When
         * passed as an abject, you can specify different sizes like so:
         *
         *     icon: {
         *        57: 'resources/icons/icon.png',
         *        72: 'resources/icons/icon-72.png',
         *        114: 'resources/icons/icon-114.png'
         *     }
         *
         * To set different icons for tablets and phones see the {@link #tabletIcon} and {@link #phoneIcon} configs.
         */

        /**
         * @cfg {String} tabletIcon Path to the .png image file to use when your app is added to the home screen on an
         * iOS **tablet** device (iPad).
         */

        /**
         * @cfg {String} phoneIcon Path to the .png image file to use when your app is added to the home screen on an
         * iOS **phone** device (iPhone or iPod).
         */

        /**
         * @cfg {Boolean} glossOnIcon If set to false, the 'gloss' effect added to home screen {@link #icon icons} on
         * iOS devices will be removed.
         */

        /**
         * @cfg {String} statusBarStyle Allows you to set the style of the status bar when your app is added to the
         * home screen on iOS devices. Defaults to 'black'. Alternative is to set to 'black-translucent', which turns
         * the status bar semi-transparent and overlaps the app content. This is usually not a good option for web apps
         */

        /**
         * @cfg {String} phoneStartupScreen Path to the .png image file that will be displayed while the app is
         * starting up once it has been added to the home screen of an iOS phone device (iPhone or iPod). This .png
         * file should be 320px wide and 460px high.
         */

        /**
         * @cfg {String} tabletStartupScreen Path to the .png image file that will be displayed while the app is
         * starting up once it has been added to the home screen of an iOS tablet device (iPad). This .png file should
         * be 768px wide and 1004px high.
         */

        /**
         * @cfg {Array} profiles The set of profiles to load for this Application. Each profile is expected to
         * exist inside the *app/profile* directory and define a class following the convention
         * AppName.profile.ProfileName. For example, in the code below, the classes *AppName.profile.Phone*
         * and *AppName.profile.Tablet* will be loaded. Note that we are able to specify
         * either the full class name (as with *AppName.profile.Tablet*) or just the final part of the class name
         * and leave Application to automatically prepend *AppName.profile.’* to each:
         *
         *     profiles: [
         *         'Phone',
         *         'AppName.profile.Tablet',
         *         'SomeCustomNamespace.profile.Desktop'
         *     ]
         * @accessor
         */
        profiles: [],

        /**
         * @cfg {Array} controllers The set of controllers to load for this Application. Each controller is expected to
         * exist inside the *app/controller* directory and define a class following the convention
         * AppName.controller.ControllerName. For example, in the code below, the classes *AppName.controller.Users*,
         * *AppName.controller.Groups* and *AppName.controller.Products* will be loaded. Note that we are able to specify
         * either the full class name (as with *AppName.controller.Products*) or just the final part of the class name
         * and leave Application to automatically prepend *AppName.controller.’* to each:
         *
         *     controllers: [
         *         'Users',
         *         'Groups',
         *         'AppName.controller.Products',
         *         'SomeCustomNamespace.controller.Orders'
         *     ]
         * @accessor
         */
        controllers: [],

        /**
         * @cfg {Ext.app.History} history The global {@link Ext.app.History History} instance attached to this
         * Application. Read only
         * @accessor
         */
        history: {},

        /**
         * @cfg {String} name The name of the Application. This should be a single word without spaces or periods
         * because it is used as the Application's global namespace. All classes in your application should be
         * namespaced undef the Application's name - for example if your application name is 'MyApp', your classes
         * should be named 'MyApp.model.User', 'MyApp.controller.Users', 'MyApp.view.Main' etc
         * @accessor
         */
        name: null,

        /**
         * @cfg {String} appFolder The path to the directory which contains all application's classes.
         * This path will be registered via {@link Ext.Loader#setPath} for the namespace specified in the {@link #name name} config.
         * Defaults to 'app'
         * @accessor
         */
        appFolder : 'app',

        /**
         * @cfg {Ext.app.Router} router The global {@link Ext.app.Router Router} instance attached to this Application.
         * Read only.
         * @accessor
         */
        router: {},

        /**
         * @cfg
         * @private
         * Used internally as the collection of instantiated controllers. Use {@link #getController} instead
         * @accessor
         */
        controllerInstances: [],

        /**
         * @cfg
         * @private
         * Used internally as the collection of instantiated profiles
         * @accessor
         */
        profileInstances: [],

        /**
         * @cfg {Ext.app.Profile} currentProfile The {@link Ext.app.Profile Profile} that is currently active for the
         * Application. This is set once, automatically by the Application before launch. Read only.
         * @accessor
         */
        currentProfile: null,

        /**
         * @cfg {Function} launch An optional function that will be called when the Application is ready to be
         * launched. This is normally used to render any initial UI required by your application
         * @accessor
         */
        launch: Ext.emptyFn,

        /**
         * @private
         * @cfg {Boolean} enableLoader Private config to disable loading of Profiles at application construct time.
         * This is used by Sencha's unit test suite to test Application.js in isolation and is likely to be removed
         * in favor of a more pleasing solution by the time you use it.
         * @accessor
         */
        enableLoader: true,

        /**
         * @private
         * @cfg {Boolean} requires An array of extra dependencies, to be required after this application's name config
         * has been processed properly, but before anything else to ensure overrides get executed first
         * @accessor
         */
        requires: []
    },

    /**
     * Constructs a new Application instance
     */
    constructor: function(config) {
        config = config || {};

        Ext.applyIf(config, {
            application: this
        });

        this.initConfig(config);

        //it's common to pass in functions to an application but because they are not predictable config names they
        //aren't ordinarily placed onto this so we need to do it manually
        for (var key in config) {
            this[key] = config[key];
        }



        Ext.require(this.getRequires(), function() {
            if (this.getEnableLoader() !== false) {
                Ext.require(this.getProfiles(), this.onProfilesLoaded, this);
            }
        }, this);
    },

    /**
     * Dispatches a given {@link Ext.app.Action} to the relevant Controller instance. This is not usually called
     * directly by the developer, instead Sencha Touch's History support picks up on changes to the browser's url
     * and calls dispatch automatically.
     * @param {Ext.app.Action} action The action to dispatch
     * @param {Boolean} addToHistory True by default, sets the browser's url to the action's url
     */
    dispatch: function(action, addToHistory) {
        action = action || {};
        Ext.applyIf(action, {
            application: this
        });

        action = Ext.factory(action, Ext.app.Action);

        if (action) {
            var profile    = this.getCurrentProfile(),
                profileNS  = profile ? profile.getNamespace() : undefined,
                controller = this.getController(action.getController(), profileNS);

            if (controller) {
                if (addToHistory !== false) {
                    this.getHistory().add(action, true);
                }

                controller.execute(action);
            }
        }
    },

    /**
     * Redirects the browser to the given url. This only affects the url after the #. You can pass in either a String
     * or a Model instance - if a Model instance is defined its {@link Ext.data.Model#toUrl toUrl} function is called,
     * which returns a string representing the url for that model. Internally, this uses your application's
     * {@link Ext.app.Router Router} to decode the url into a matching controller action and then calls
     * {@link #dispatch}.
     * @param {String/Ext.data.Model} url The String url to redirect to
     */
    redirectTo: function(url) {
        if (Ext.data && Ext.data.Model && url instanceof Ext.data.Model) {
            var record = url;

            url = record.toUrl();
        }

        var decoded = this.getRouter().recognize(url);

        if (decoded) {
            decoded.url = url;
            if (record) {
                decoded.data = {};
                decoded.data.record = record;
            }
            return this.dispatch(decoded);
        }
    },

    /**
     * @private
     * (documented on Controller's control config)
     */
    control: function(selectors, controller) {
        //if the controller is not defined, use this instead (the application instance)
        controller = controller || this;

        var dispatcher = this.getEventDispatcher(),
            refs = (controller) ? controller.getRefs() : {},
            selector, eventName, listener, listeners, ref;

        for (selector in selectors) {
            if (selectors.hasOwnProperty(selector)) {
                listeners = selectors[selector];
                ref = refs[selector];

                //refs can be used in place of selectors
                if (ref) {
                    selector = ref.selector || ref;
                }
                for (eventName in listeners) {
                    listener = listeners[eventName];

                    if (Ext.isString(listener)) {
                        listener = controller[listener];
                    }

                    dispatcher.addListener('component', selector, eventName, listener, controller);
                }
            }
        }
    },

    /**
     * @private
     * Returns the Controller instance for the given controller name
     * @param {String} name The name of the Controller
     * @param {String} profileName Optional profile name. If passed, this is the same as calling
     * getController('profileName.controllerName')
     */
    getController: function(name, profileName) {
        var instances = this.getControllerInstances(),
            appName   = this.getName(),
            format    = Ext.String.format,
            topLevelName;

        if (name instanceof Ext.app.Controller) {
            return name;
        }

        if (instances[name]) {
            return instances[name];
        } else {
            topLevelName = format("{0}.controller.{1}", appName, name);
            profileName  = format("{0}.controller.{1}.{2}", appName, profileName, name);

            return instances[profileName] || instances[topLevelName];
        }
    },

    /**
     * @private
     * Callback that is invoked when all of the configured Profiles have been loaded. Detects the current profile and
     * gathers any additional dependencies from that profile, then loads all of those dependencies.
     */
    onProfilesLoaded: function() {
        var profiles  = this.getProfiles(),
            length    = profiles.length,
            instances = [],
            requires  = this.gatherDependencies(),
            current, i, profileDeps;

        for (i = 0; i < length; i++) {
            instances[i] = Ext.create(profiles[i], {
                application: this
            });

            /*
             * Note that we actually require all of the dependencies for all Profiles - this is so that we can produce
             * a single build file that will work on all defined Profiles. Although the other classes will be loaded,
             * the correct Profile will still be identified and the other classes ignored. While this feels somewhat
             * inefficient, the majority of the bulk of an application is likely to be the framework itself. The bigger
             * the app though, the bigger the effect of this inefficiency so ideally we will create a way to create and
             * load Profile-specific builds in a future release.
             */
            profileDeps = instances[i].getDependencies();
            requires = requires.concat(profileDeps.all);

            if (instances[i].isActive() && !current) {
                current = instances[i];

                this.setCurrentProfile(current);

                this.setControllers(this.getControllers().concat(profileDeps.controller));
                this.setModels(this.getModels().concat(profileDeps.model));
                this.setViews(this.getViews().concat(profileDeps.view));
                this.setStores(this.getStores().concat(profileDeps.store));
            }
        }

        this.setProfileInstances(instances);
        Ext.require(requires, this.loadControllerDependencies, this);
    },

    /**
     * @private
     * Controllers can also specify dependencies, so we grab them all here and require them
     */
    loadControllerDependencies: function() {
        this.instantiateControllers();

        var controllers = this.getControllerInstances(),
            classes = [],
            stores = [],
            i, controller, controllerStores, name;

        for (name in controllers) {
            controller = controllers[name];
            controllerStores = controller.getStores();
            stores = stores.concat(controllerStores);

            classes = classes.concat(controller.getModels().concat(controller.getViews()).concat(controllerStores));
        }

        this.setStores(this.getStores().concat(stores));

        Ext.require(classes, this.onDependenciesLoaded, this);
    },

    /**
     * @private
     * Callback that is invoked when all of the Application, Controller and Profile dependencies have been loaded.
     * Launches the controllers, then the profile and application
     */
    onDependenciesLoaded: function() {
        var me = this,
            profile = this.getCurrentProfile(),
            launcher = this.getLaunch(),
            controllers, name;

        this.instantiateStores();


        controllers = this.getControllerInstances();

        for (name in controllers) {
            controllers[name].init(this);
        }

        if (profile) {
            profile.launch();
        }

        launcher.call(me);

        for (name in controllers) {
                controllers[name].launch(this);
        }

        me.redirectTo(window.location.hash.substr(1));
    },

    /**
     * @private
     * Gathers up all of the previously computed MVCS dependencies into a single array that we can pass to Ext.require
     */
    gatherDependencies: function() {
        var classes = this.getModels().concat(this.getViews()).concat(this.getControllers());

        Ext.each(this.getStores(), function(storeName) {
            if (Ext.isString(storeName)) {
                classes.push(storeName);
            }
        }, this);

        return classes;
    },

    /**
     * @private
     * Should be called after dependencies are loaded, instantiates all of the Stores specified in the {@link #stores}
     * config. For each item in the stores array we make sure the Store is instantiated. When strings are specified,
     * the corresponding app/store/StoreName.js was loaded so we now instantiate a MyApp.store.StoreName, giving it the
     * id StoreName.
     */
    instantiateStores: function() {
        var stores  = this.getStores(),
            length  = stores.length,
            store, storeClass, storeName, splits, i;

        for (i = 0; i < length; i++) {
            store = stores[i];

            if (Ext.data && Ext.data.Store && !(store instanceof Ext.data.Store)) {
                if (Ext.isString(store)) {
                    storeName = store;
                    storeClass = Ext.ClassManager.classes[store];

                    store = {
                        xclass: store
                    };

                    //we don't want to wipe out a configured storeId in the app's Store subclass so need
                    //to check for this first
                    if (storeClass.prototype.defaultConfig.storeId === undefined) {
                        splits = storeName.split('.');
                        store.id = splits[splits.length - 1];
                    }
                }

                stores[i] = Ext.factory(store, Ext.data.Store);
            }
        }

        this.setStores(stores);
    },

    /**
     * @private
     * Called once all of our controllers have been loaded
     */
    instantiateControllers: function() {
        var controllerNames = this.getControllers(),
            instances = {},
            length = controllerNames.length,
            name, i;

        for (i = 0; i < length; i++) {
            name = controllerNames[i];

            instances[name] = Ext.create(name, {
                application: this
            });
        }

        return this.setControllerInstances(instances);
    },

    /**
     * @private
     * As a convenience developers can locally qualify controller names (e.g. 'MyController' vs
     * 'MyApp.controller.MyController'). This just makes sure everything ends up fully qualified
     */
    applyControllers: function(controllers) {
        return this.getFullyQualified(controllers, 'controller');
    },

    /**
     * @private
     * As a convenience developers can locally qualify profile names (e.g. 'MyProfile' vs
     * 'MyApp.profile.MyProfile'). This just makes sure everything ends up fully qualified
     */
    applyProfiles: function(profiles) {
        return this.getFullyQualified(profiles, 'profile');
    },

    /**
     * @private
     * Checks that the name configuration has any whitespace, and trims them if found.
     */
    applyName: function(name) {
        var oldName;
        if (name && name.match(/ /g)) {
            oldName = name;
            name = name.replace(/ /g, "");

        }

        return name;
    },

    /**
     * @private
     * Makes sure the app namespace exists, sets the `app` property of the namespace to this application and sets its
     * loading path (checks to make sure the path hadn't already been set via Ext.Loader.setPath)
     */
    updateName: function(newName) {
        Ext.ClassManager.setNamespace(newName + '.app', this);

        if (!Ext.Loader.config.paths[newName]) {
            Ext.Loader.setPath(newName, this.getAppFolder());
        }
    },

    /**
     * @private
     */
    applyRouter: function(config) {
        return Ext.factory(config, Ext.app.Router, this.getRouter());
    },

    /**
     * @private
     */
    applyHistory: function(config) {
        var history = Ext.factory(config, Ext.app.History, this.getHistory());

        history.on('change', this.onHistoryChange, this);

        return history;
    },

    /**
     * @private
     */
    onHistoryChange: function(url) {
        this.dispatch(this.getRouter().recognize(url), false);
    }
}, function() {
});

/**
 * {@link Ext.Title} is used for the {@link Ext.Toolbar#title} configuration in the {@link Ext.Toolbar} component.
 * @private
 */
Ext.define('Ext.Title', {
    extend: 'Ext.Component',
    xtype: 'title',

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: 'x-title',

        /**
         * @cfg {String} title The title text
         */
        title: ''
    },

    // @private
    updateTitle: function(newTitle) {
        this.setHtml(newTitle);
    }
});

/**
The {@link Ext.Spacer} component is generally used to put space between items in {@link Ext.Toolbar} components.

## Examples

By default the {@link #flex} configuration is set to 1:

    @example miniphone preview
    Ext.create('Ext.Container', {
        fullscreen: true,
        items: [
            {
                xtype : 'toolbar',
                docked: 'top',
                items: [
                    {
                        xtype: 'button',
                        text : 'Button One'
                    },
                    {
                        xtype: 'spacer'
                    },
                    {
                        xtype: 'button',
                        text : 'Button Two'
                    }
                ]
            }
        ]
    });

Alternatively you can just set the {@link #width} configuration which will get the {@link Ext.Spacer} a fixed width:

    @example preview
    Ext.create('Ext.Container', {
        fullscreen: true,
        layout: {
            type: 'vbox',
            pack: 'center',
            align: 'stretch'
        },
        items: [
            {
                xtype : 'toolbar',
                docked: 'top',
                items: [
                    {
                        xtype: 'button',
                        text : 'Button One'
                    },
                    {
                        xtype: 'spacer',
                        width: 50
                    },
                    {
                        xtype: 'button',
                        text : 'Button Two'
                    }
                ]
            },
            {
                xtype: 'container',
                items: [
                    {
                        xtype: 'button',
                        text : 'Change Ext.Spacer width',
                        handler: function() {
                            //get the spacer using ComponentQuery
                            var spacer = Ext.ComponentQuery.query('spacer')[0],
                                from = 10,
                                to = 250;

                            //set the width to a random number
                            spacer.setWidth(Math.floor(Math.random() * (to - from + 1) + from));
                        }
                    }
                ]
            }
        ]
    });

You can also insert multiple {@link Ext.Spacer}'s:

    @example preview
    Ext.create('Ext.Container', {
        fullscreen: true,
        items: [
            {
                xtype : 'toolbar',
                docked: 'top',
                items: [
                    {
                        xtype: 'button',
                        text : 'Button One'
                    },
                    {
                        xtype: 'spacer'
                    },
                    {
                        xtype: 'button',
                        text : 'Button Two'
                    },
                    {
                        xtype: 'spacer',
                        width: 20
                    },
                    {
                        xtype: 'button',
                        text : 'Button Three'
                    }
                ]
            }
        ]
    });
 */
Ext.define('Ext.Spacer', {
    extend: 'Ext.Component',
    alias : 'widget.spacer',

    config: {
        /**
         * @cfg {Number} flex
         * The flex value of this spacer. This defaults to 1, if no width has been set.
         * @accessor
         */
        
        /**
         * @cfg {Number} width
         * The width of this spacer. If this is set, the value of {@link #flex} will be ignored.
         * @accessor
         */
    },

    // @private
    constructor: function(config) {
        config = config || {};

        if (!config.width) {
            config.flex = 1;
        }

        this.callParent([config]);
    }
});

/**
 * A simple class to display a button in Sencha Touch.
 * 
 * There are various different styles of Button you can create by using the {@link #icon},
 * {@link #iconCls}, {@link #iconAlign}, {@link #iconMask}, {@link #ui}, and {@link #text}
 * configurations.
 *
 * ## Simple Button
 *
 * Here is a Button in it's simplest form:
 *
 *     @example miniphone
 *     var button = Ext.create('Ext.Button', {
 *         text: 'Button'
 *     });
 *     Ext.Viewport.add({ xtype: 'container', padding: 10, items: [button] });
 *
 * ## Icons
 *
 * You can also create a Button with just an icon using the {@link #iconCls} configuration:
 *
 *     @example miniphone
 *     var button = Ext.create('Ext.Button', {
 *         iconCls: 'refresh',
 *         iconMask: true
 *     });
 *     Ext.Viewport.add({ xtype: 'container', padding: 10, items: [button] });
 *
 * Note that the {@link #iconMask} configuration is required when you want to use any of the
 * bundled Pictos icons.
 *
 * Here are the included icons available (if {@link Global_CSS#$include-default-icons $include-default-icons}
 * is set to true):
 *
 * - action
 * - add
 * - arrow_down
 * - arrow_left
 * - arrow_right
 * - arrow_up
 * - compose
 * - delete
 * - organize
 * - refresh
 * - reply
 * - search
 * - settings
 * - star
 * - trash
 * - maps
 * - locate
 * - home
 *
 * You can also use other pictos icons by using the {@link Global_CSS#pictos-iconmask pictos-iconmask} mixin in your SASS.
 *
 * ## Badges
 *
 * Buttons can also have a badge on them, by using the {@link #badgeText} configuration:
 *
 *     @example
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         padding: 10,
 *         items: {
 *             xtype: 'button',
 *             text: 'My Button',
 *             badgeText: '2'
 *         }
 *     });
 *
 * ## UI
 *
 * Buttons also come with a range of different default UIs. Here are the included UIs
 * available (if {@link #$include-button-uis $include-button-uis} is set to true):
 *
 * - **normal** - a basic gray button
 * - **back** - a back button
 * - **forward** - a forward button
 * - **round** - a round button
 * - **action** - shaded using the {@link Global_CSS#$base-color $base-color} (dark blue by default)
 * - **decline** - red
 * - **confirm** - green
 *
 * And setting them is very simple:
 *
 *     var uiButton = Ext.create('Ext.Button', {
 *         text: 'My Button',
 *         ui: 'action'
 *     });
 *
 * And how they look:
 *
 *     @example miniphone preview
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         padding: 4,
 *         defaults: {
 *             xtype: 'button',
 *             margin: 5
 *         },
 *         layout: {
 *             type: 'vbox',
 *             align: 'center'
 *         },
 *         items: [
 *             { ui: 'normal', text: 'normal' },
 *             { ui: 'round', text: 'round' },
 *             { ui: 'action', text: 'action' },
 *             { ui: 'decline', text: 'decline' },
 *             { ui: 'confirm', text: 'confirm' }
 *         ]
 *     });
 *
 * Note that the default {@link #ui} is **normal**.
 *
 * You can also use the {@link #sencha-button-ui sencha-button-ui} CSS Mixin to create your own UIs.
 *
 * ## Example
 *
 * This example shows a bunch of icons on the screen in two toolbars. When you click on the center
 * button, it switches the {@link #iconCls} on every button on the page.
 *
 *     @example preview
 *     Ext.createWidget('container', {
 *         fullscreen: true,
 *         layout: {
 *             type: 'vbox',
 *             pack:'center',
 *             align: 'center'
 *         },
 *         items: [
 *             {
 *                 xtype: 'button',
 *                 text: 'Change iconCls',
 *                 handler: function() {
 *                     // classes for all the icons to loop through.
 *                     var availableIconCls = [
 *                         'action', 'add', 'arrow_down', 'arrow_left',
 *                         'arrow_right', 'arrow_up', 'compose', 'delete',
 *                         'organize', 'refresh', 'reply', 'search',
 *                         'settings', 'star', 'trash', 'maps', 'locate',
 *                         'home'
 *                     ];
 *                     // get the text of this button,
 *                     // so we know which button we don't want to change
 *                     var text = this.getText();
 *
 *                     // use ComponentQuery to find all buttons on the page
 *                     // and loop through all of them
 *                     Ext.Array.forEach(Ext.ComponentQuery.query('button'), function(button) {
 *                         // if the button is the change iconCls button, continue
 *                         if (button.getText() == text) {
 *                             return;
 *                         }
 *
 *                         // get the index of the new available iconCls
 *                         var index = availableIconCls.indexOf(button.getIconCls()) + 1;
 *
 *                         // update the iconCls of the button with the next iconCls, if one exists.
 *                         // if not, use the first one
 *                         button.setIconCls(availableIconCls[(index == availableIconCls.length) ? 0 : index]);
 *                     });
 *                 }
 *             },
 *             {
 *                 xtype: 'toolbar',
 *                 docked: 'top',
 *                 defaults: {
 *                     iconMask: true
 *                 },
 *                 items: [
 *                     { xtype: 'spacer' },
 *                     { iconCls: 'action' },
 *                     { iconCls: 'add' },
 *                     { iconCls: 'arrow_down' },
 *                     { iconCls: 'arrow_left' },
 *                     { iconCls: 'arrow_up' },
 *                     { iconCls: 'compose' },
 *                     { iconCls: 'delete' },
 *                     { iconCls: 'organize' },
 *                     { iconCls: 'refresh' },
 *                     { xtype: 'spacer' }
 *                 ]
 *             },
 *             {
 *                 xtype: 'toolbar',
 *                 docked: 'bottom',
 *                 ui: 'light',
 *                 defaults: {
 *                     iconMask: true
 *                 },
 *                 items: [
 *                     { xtype: 'spacer' },
 *                     { iconCls: 'reply' },
 *                     { iconCls: 'search' },
 *                     { iconCls: 'settings' },
 *                     { iconCls: 'star' },
 *                     { iconCls: 'trash' },
 *                     { iconCls: 'maps' },
 *                     { iconCls: 'locate' },
 *                     { iconCls: 'home' },
 *                     { xtype: 'spacer' }
 *                 ]
 *             }
 *         ]
 *     });
 *
 */
Ext.define('Ext.Button', {
    extend: 'Ext.Component',

    xtype: 'button',

    /**
     * @event tap
     * @preventable doTap
     * Fires whenever a button is tapped
     * @param {Ext.Button} this The item added to the Container
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event release
     * @preventable doRelease
     * Fires whenever the button is released
     * @param {Ext.Button} this The item added to the Container
     * @param {Ext.EventObject} e The event object
     */

    cachedConfig: {
        /**
         * @cfg {String} pressedCls
         * The CSS class to add to the Button when it is pressed.
         * @accessor
         */
        pressedCls: Ext.baseCSSPrefix + 'button-pressing',

        /**
         * @cfg {String} badgeCls
         * The CSS class to add to the Button's badge, if it has one.
         * @accessor
         */
        badgeCls: Ext.baseCSSPrefix + 'badge',

        /**
         * @cfg {String} hasBadgeCls
         * The CSS class to add to the Button if it has a badge (note that this goes on the
         * Button element itself, not on the badge element).
         * @private
         * @accessor
         */
        hasBadgeCls: Ext.baseCSSPrefix + 'hasbadge',

        /**
         * @cfg {String} labelCls
         * The CSS class to add to the field's label element.
         * @accessor
         */
        labelCls: Ext.baseCSSPrefix + 'button-label',

        /**
         * @cfg {String} iconMaskCls
         * @private
         * The CSS class to add to the icon element as allowed by {@link #iconMask}.
         * @accessor
         */
        iconMaskCls: Ext.baseCSSPrefix + 'icon-mask',

        /**
         * @cfg {String} iconCls
         * Optional CSS class to add to the icon element. This is useful if you want to use a CSS
         * background image to create your Button icon.
         * @accessor
         */
        iconCls: null
    },

    config: {
        /**
         * @cfg {String} badgeText
         * Optional badge text.
         * @accessor
         */
        badgeText: null,

        /**
         * @cfg {String} text
         * The Button text.
         * @accessor
         */
        text: null,

        /**
         * @cfg {String} icon
         * Url to the icon image to use if you want an icon to appear on your button.
         * @accessor
         */
        icon: null,

        /**
         * @cfg {String} iconAlign
         * The position within the Button to render the icon Options are: `top`, `right`, `bottom`, `left` and `center` (when you have
         * no {@link #text} set).
         * @accessor
         */
        iconAlign: 'left',

        /**
         * @cfg {Number/Boolean} pressedDelay
         * The amount of delay between the tapstart and the moment we add the pressedCls (in milliseconds).
         * Settings this to true defaults to 100ms.
         */
        pressedDelay: 0,

        /**
         * @cfg {Boolean} iconMask
         * Whether or not to mask the icon with the {@link #iconMask} configuration.
         * This is needed if you want to use any of the bundled pictos icons in the Sencha Touch SASS.
         * @accessor
         */
        iconMask: null,

        /**
         * @cfg {Function} handler
         * The handler function to run when the Button is tapped on.
         * @accessor
         */
        handler: null,

        /**
         * @cfg {Object} scope
         * The scope to fire the configured {@link #handler} in.
         * @accessor
         */
        scope: null,

        /**
         * @cfg {String} autoEvent
         * Optional event name that will be fired instead of 'tap' when the Button is tapped on.
         * @accessor
         */
        autoEvent: null,

        /**
         * @cfg {String} ui
         * The ui style to render this button with. The valid default options are:
         * 'normal', 'back', 'round', 'action', 'confirm' and 'forward'.
         * @accessor
         */
        ui: 'normal',

        /**
         * @cfg {String} html The html to put in this button.
         *
         * If you want to just add text, please use the {@link #text} configuration
         */

        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'button'
    },

    template: [
        {
            tag: 'span',
            reference: 'badgeElement',
            hidden: true
        },
        {
            tag: 'span',
            className: Ext.baseCSSPrefix + 'button-icon',
            reference: 'iconElement',
            hidden: true
        },
        {
            tag: 'span',
            reference: 'textElement',
            hidden: true
        }
    ],

    initialize: function() {
        this.callParent();

        this.element.on({
            scope      : this,
            tap        : 'onTap',
            touchstart : 'onPress',
            touchend   : 'onRelease'
        });
    },

    /**
     * @private
     */
    updateBadgeText: function(badgeText) {
        var element = this.element,
            badgeElement = this.badgeElement;

        if (badgeText) {
            badgeElement.show();
            badgeElement.setText(badgeText);
        }
        else {
            badgeElement.hide();
        }

        element[(badgeText) ? 'addCls' : 'removeCls'](this.getHasBadgeCls());
    },

    /**
     * @private
     */
    updateText: function(text) {
        var textElement = this.textElement;
        if (textElement) {
            if (text) {
                textElement.show();
                textElement.setHtml(text);
            }
            else {
                textElement.hide();
            }
        }
    },

    /**
     * @private
     */
    updateHtml: function(html) {
        var textElement = this.textElement;

        if (html) {
            textElement.show();
            textElement.setHtml(html);
        }
        else {
            textElement.hide();
        }
    },

    /**
     * @private
     */
    updateBadgeCls: function(badgeCls, oldBadgeCls) {
        this.badgeElement.replaceCls(oldBadgeCls, badgeCls);
    },

    /**
     * @private
     */
    updateHasBadgeCls: function(hasBadgeCls, oldHasBadgeCls) {
        var element = this.element;

        if (element.hasCls(oldHasBadgeCls)) {
            element.replaceCls(oldHasBadgeCls, hasBadgeCls);
        }
    },

    /**
     * @private
     */
    updateLabelCls: function(labelCls, oldLabelCls) {
        this.textElement.replaceCls(oldLabelCls, labelCls);
    },

    /**
     * @private
     */
    updatePressedCls: function(pressedCls, oldPressedCls) {
        var element = this.element;

        if (element.hasCls(oldPressedCls)) {
            element.replaceCls(oldPressedCls, pressedCls);
        }
    },

    /**
     * @private
     */
    updateIcon: function(icon) {
        var me = this,
            element = me.iconElement;

        if (icon) {
            me.showIconElement();
            element.setStyle('background-image', icon ? 'url(' + icon + ')' : '');
            me.refreshIconAlign();
            me.refreshIconMask();
        }
        else {
            me.hideIconElement();
            me.setIconAlign(false);
        }
    },

    /**
     * @private
     */
    updateIconCls: function(iconCls, oldIconCls) {
        var me = this,
            element = me.iconElement;

        if (iconCls) {
            me.showIconElement();
            element.replaceCls(oldIconCls, iconCls);
            me.refreshIconAlign();
            me.refreshIconMask();
        }
        else {
            me.hideIconElement();
            me.setIconAlign(false);
        }
    },

    /**
     * @private
     */
    updateIconAlign: function(alignment, oldAlignment) {
        var element = this.element,
            baseCls = Ext.baseCSSPrefix + 'iconalign-';

        if (!this.getText()) {
            alignment = "center";
        }

        element.removeCls(baseCls + "center");
        element.removeCls(baseCls + oldAlignment);
        if (this.getIcon() || this.getIconCls()) {
            element.addCls(baseCls + alignment);
        }
    },

    refreshIconAlign: function() {
        this.updateIconAlign(this.getIconAlign());
    },

    /**
     * @private
     */
    updateIconMaskCls: function(iconMaskCls, oldIconMaskCls) {
        var element = this.iconElement;

        if (this.getIconMask()) {
            element.replaceCls(oldIconMaskCls, iconMaskCls);
        }
    },

    /**
     * @private
     */
    updateIconMask: function(iconMask) {
        this.iconElement[iconMask ? "addCls" : "removeCls"](this.getIconMaskCls());
    },

    refreshIconMask: function() {
        this.updateIconMask(this.getIconMask());
    },

    applyAutoEvent: function(autoEvent) {
        var me = this;

        if (typeof autoEvent == 'string') {
            autoEvent = {
                name : autoEvent,
                scope: me.scope || me
            };
        }

        return autoEvent;
    },

    /**
     * @private
     */
    updateAutoEvent: function(autoEvent) {
        var name  = autoEvent.name,
            scope = autoEvent.scope;

        this.setHandler(function() {
            scope.fireEvent(name, scope, this);
        });

        this.setScope(scope);
    },

    /**
     * Used by icon and iconCls configurations to hide the icon element.
     * We do this because Tab needs to change the visibility of the icon, not make
     * it display:none
     * @private
     */
    hideIconElement: function() {
        this.iconElement.hide();
    },

    /**
     * Used by icon and iconCls configurations to show the icon element.
     * We do this because Tab needs to change the visibility of the icon, not make
     * it display:node
     * @private
     */
    showIconElement: function() {
        this.iconElement.show();
    },

    /**
     * We override this to check for '{ui}-back'. This is because if you have a UI of back, you need to actually add two class names.
     * The ui class, and the back class:
     *
     * `ui: 'action-back'` would turn into:
     *
     * `class="x-button-action x-button-back"`
     *
     * But `ui: 'action' would turn into:
     *
     * `class="x-button-action"`
     *
     * So we just split it up into an array and add both of them as a UI, when it has `back`.
     * @private
     */
    applyUi: function(config) {
        if (config && Ext.isString(config)) {
            var array  = config.split('-');
            if (array && (array[1] == "back" || array[1] == "forward")) {
                return array;
            }
        }

        return config;
    },

    getUi: function() {
        //Now that the UI can sometimes be an array, we need to check if it an array and return the proper value.
        var ui = this._ui;
        if (Ext.isArray(ui)) {
            return ui.join('-');
        }
        return ui;
    },

    applyPressedDelay: function(delay) {
        if (Ext.isNumber(delay)) {
            return delay;
        }
        return (delay) ? 100 : 0;
    },

    // @private
    onPress: function() {
        var me = this,
            element = me.element,
            pressedDelay = me.getPressedDelay(),
            pressedCls = me.getPressedCls();

        if (!me.getDisabled()) {
            if (pressedDelay > 0) {
                me.pressedTimeout = setTimeout(function() {
                    delete me.pressedTimeout;
                    if (element) {
                        element.addCls(pressedCls);
                    }
                }, pressedDelay);
            }
            else {
                element.addCls(pressedCls);
            }
        }
    },

    // @private
    onRelease: function(e) {
        this.fireAction('release', [this, e], 'doRelease');
    },

    // @private
    doRelease: function(me, e) {
        if (!me.getDisabled()) {
            if (me.hasOwnProperty('pressedTimeout')) {
                clearTimeout(me.pressedTimeout);
                delete me.pressedTimeout;
            }
            else {
                me.element.removeCls(me.getPressedCls());
            }
        }
    },

    // @private
    onTap: function(e) {
        if (this.getDisabled()) {
            return false;
        }

        this.fireAction('tap', [this, e], 'doTap');
    },

    /**
     * @private
     */
    doTap: function(me, e) {
        var handler = me.getHandler(),
            scope = me.getScope() || me;

        if (!handler) {
            return;
        }

        if (typeof handler == 'string') {
            handler = scope[handler];
        }

        //this is done so if you hide the button in the handler, the tap event will not fire on the new element
        //where the button was.
        e.preventDefault();

        handler.apply(scope, arguments);
    }
}, function() {
});

/**
 * @class Ext.util.LineSegment
 *
 * Utility class that represents a line segment, constructed by two {@link Ext.util.Point}
 */
Ext.define('Ext.util.LineSegment', {
    requires: ['Ext.util.Point'],

    /**
     * Creates new LineSegment out of two points.
     * @param {Ext.util.Point} point1
     * @param {Ext.util.Point} point2
     */
    constructor: function(point1, point2) {
        var Point = Ext.util.Point;

        this.point1 = Point.from(point1);
        this.point2 = Point.from(point2);
    },

    /**
     * Returns the point where two lines intersect.
     * @param {Ext.util.LineSegment} lineSegment The line to intersect with.
     * @return {Ext.util.Point}
     */
    intersects: function(lineSegment) {
        var point1 = this.point1,
            point2 = this.point2,
            point3 = lineSegment.point1,
            point4 = lineSegment.point2,
            x1 = point1.x,
            x2 = point2.x,
            x3 = point3.x,
            x4 = point4.x,
            y1 = point1.y,
            y2 = point2.y,
            y3 = point3.y,
            y4 = point4.y,
            d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4),
            xi, yi;

        if (d == 0) {
            return null;
        }

        xi = ((x3 - x4) * (x1 * y2 - y1 * x2) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d;
        yi = ((y3 - y4) * (x1 * y2 - y1 * x2) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d;

        if (xi < Math.min(x1, x2) || xi > Math.max(x1, x2)
            || xi < Math.min(x3, x4) || xi > Math.max(x3, x4)
            || yi < Math.min(y1, y2) || yi > Math.max(y1, y2)
            || yi < Math.min(y3, y4) || yi > Math.max(y3, y4)) {
            return null;
        }

        return new Ext.util.Point(xi, yi);
    },

    /**
     * Returns string representation of the line. Useful for debugging.
     * @return {String} For example `Point[12,8] Point[0,0]`
     */
    toString: function() {
        return this.point1.toString() + " " + this.point2.toString();
    }
});

/**
 * @private
 */
Ext.define('Ext.field.Input', {
    extend: 'Ext.Component',
    xtype : 'input',

    /**
     * @event clearicontap
     * Fires whenever the clear icon is tapped
     * @param {Ext.field.Input} this
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event masktap
     * @preventable doMaskTap
     * Fires whenever a mask is tapped
     * @param {Ext.field.Input} this
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event focus
     * @preventable doFocus
     * Fires whenever the input get focus
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event blur
     * @preventable doBlur
     * Fires whenever the input loses focus
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event click
     * Fires whenever the input is clicked
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event keyup
     * Fires whenever keyup is detected
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event paste
     * Fires whenever paste is detected
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event mousedown
     * Fires whenever the input has a mousedown occur
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @property {String} tag The el tag
     * @private
     */
    tag: 'input',

    cachedConfig: {
        /**
         * @cfg {String} cls The className to be applied to this input
         * @accessor
         */
        cls: Ext.baseCSSPrefix + 'form-field',

        /**
         * @cfg {String} focusCls The CSS class to use when the field receives focus
         * @accessor
         */
        focusCls: Ext.baseCSSPrefix + 'field-focus',

        // @private
        maskCls: Ext.baseCSSPrefix + 'field-mask',

        /**
         * True to use a mask on this field, or `auto` to automatically select when you should use it.
         * @cfg {String/Boolean} useMask
         * @private
         * @accessor
         */
        useMask: 'auto',

        /**
         * @cfg {String} type The type attribute for input fields -- e.g. radio, text, password, file (defaults
         * to 'text'). The types 'file' and 'password' must be used to render those field types currently -- there are
         * no separate Ext components for those.
         * @accessor
         */
        type: 'text',

        /**
         * @cfg {Boolean} checked <tt>true</tt> if the checkbox should render initially checked (defaults to <tt>false</tt>)
         * @accessor
         */
        checked: false
    },

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'field-input',

        /**
         * @cfg {String} name The field's HTML name attribute
         * <b>Note</b>: this property must be set if this field is to be automatically included with
         * {@link Ext.form.Panel#method-submit form submit()}.
         * @accessor
         */
        name: null,

        /**
         * @cfg {Mixed} value A value to initialize this field with (defaults to undefined).
         * @accessor
         */
        value: null,

        /**
         * @property {Boolean} <tt>True</tt> if the field currently has focus.
         * @accessor
         */
        isFocused: false,

        /**
         * @cfg {Number} tabIndex The tabIndex for this field. Note this only applies to fields that are rendered,
         * not those which are built via applyTo (defaults to undefined).
         * @accessor
         */
        tabIndex: null,

        /**
         * @cfg {String} placeHolder A string value displayed in the input (if supported) when the control is empty.
         * @accessor
         */
        placeHolder: null,

        /**
         * @cfg {Number} minValue The minimum value that this Number field can accept (defaults to undefined, e.g. no minimium)
         * @accessor
         */
        minValue: null,

        /**
         * @cfg {Number} maxValue The maximum value that this Number field can accept (defaults to undefined, e.g. no maximum)
         * @accessor
         */
        maxValue: null,

        /**
         * @cfg {Number} stepValue The amount by which the field is incremented or decremented each time the spinner is tapped.
         * Defaults to undefined, which means that the field goes up or down by 1 each time the spinner is tapped
         * @accessor
         */
        stepValue: null,

        /**
         * @cfg {Number} maxLength The maximum number of permitted input characters (defaults to 0).
         * @accessor
         */
        maxLength: null,

        /**
         * True to set the field's DOM element autocomplete attribute to "on", false to set to "off". Defaults to undefined, leaving the attribute unset
         * @cfg {Boolean} autoComplete
         * @accessor
         */
        autoComplete: null,

        /**
         * True to set the field's DOM element autocapitalize attribute to "on", false to set to "off". Defaults to undefined, leaving the attribute unset
         * @cfg {Boolean} autoCapitalize
         * @accessor
         */
        autoCapitalize: null,

        /**
         * True to set the field DOM element autocorrect attribute to "on", false to set to "off". Defaults to undefined, leaving the attribute unset.
         * @cfg {Boolean} autoCorrect
         * @accessor
         */
        autoCorrect: null,

        /**
         * True to set the field DOM element readonly attribute to "true". Defaults to undefined, leaving the attribute unset.
         * @cfg {Boolean} readOnly
         * @accessor
         */
        readOnly: null,

        /**
         * Sets the field DOM element maxRows attribute. Defaults to undefined, leaving the attribute unset.
         * @cfg {Number} maxRows
         * @accessor
         */
        maxRows: null,

        /**
         * @cfg {String} pattern The value for the HTML5 pattern attribute.
         * You can use this to change which keyboard layout will be used.
         *
         *     Ext.define('Ux.field.Pattern', {
         *         extend : 'Ext.field.Text',
         *         xtype  : 'patternfield',
         *         
         *         config : {
         *             component : {
         *                 pattern : '[0-9]*'
         *             }
         *         }
         *     });
         *
         * Even though it extends Ext.field.Text, it will display the number keyboard.
         *
         * @accessor
         */
        pattern: null,

        /**
         * @cfg {Boolean} disabled True to disable the field (defaults to false).
         * <p>Be aware that conformant with the <a href="http://www.w3.org/TR/html401/interact/forms.html#h-17.12.1">HTML specification</a>,
         * disabled Fields will not be {@link Ext.form.Panel#method-submit submitted}.</p>
         * @accessor
         */

        /**
         * <p>The value that the Field had at the time it was last focused. This is the value that is passed
         * to the {@link Ext.field.Text#change} event which is fired if the value has been changed when the Field is blurred.</p>
         * <p><b>This will be undefined until the Field has been visited.</b> Compare {@link #originalValue}.</p>
         * @cfg {Mixed} startValue
         * @accessor
         */
        startValue: false
    },

    /**
     * @cfg {String/Number} originalValue The original value when the input is rendered
     * @private
     */

    // @private
    getTemplate: function() {
        var items = [
            {
                reference: 'input',
                tag: this.tag
            },
            {
                reference: 'clearIcon',
                cls: 'x-clear-icon'
            }
        ];

        items.push({
            reference: 'mask',
            classList: [this.config.maskCls]
        });

        return items;
    },

    initElement: function() {
        var me = this;

        me.callParent();

        me.input.on({
            scope: me,

            keyup    : 'onKeyUp',
            focus    : 'onFocus',
            blur     : 'onBlur',
            paste    : 'onPaste'
        });

        me.mask.on({
            tap: 'onMaskTap',
            scope: me
        });

        if (me.clearIcon) {
            me.clearIcon.on({
                tap: 'onClearIconTap',
                scope: me
            });
        }
    },

    applyUseMask: function(useMask) {
        if (useMask === 'auto') {
            useMask = Ext.os.is.iOS && Ext.os.version.lt('5');
        }

        return Boolean(useMask);
    },

    /**
     * Updates the useMask configuration
     */
    updateUseMask: function(newUseMask) {
        this.mask[newUseMask ? 'show' : 'hide']();
    },

    updatePattern : function (pattern) {
        this.updateFieldAttribute('pattern', pattern);
    },

    /**
     * Helper method to update a specified attribute on the fieldEl, or remove the attribute all together
     * @private
     */
    updateFieldAttribute: function(attribute, newValue) {
        var input = this.input;

        if (newValue) {
            input.dom.setAttribute(attribute, newValue);
        } else {
            input.dom.removeAttribute(attribute);
        }
    },

    /**
     * Updates the {@link #cls} configuration
     */
    updateCls: function(newCls, oldCls) {
        this.input.addCls(Ext.baseCSSPrefix + 'input-el');
        this.input.replaceCls(oldCls, newCls);
    },

    /**
     * Updates the type attribute with the {@link #type} configuration
     * @private
     */
    updateType: function(newType, oldType) {
        var prefix = Ext.baseCSSPrefix + 'input-';

        this.input.replaceCls(prefix + oldType, prefix + newType);
        this.updateFieldAttribute('type', newType);
    },

    /**
     * Updates the name attribute with the {@link #name} configuration
     * @private
     */
    updateName: function(newName) {
        this.updateFieldAttribute('name', newName);
    },

    /**
     * Returns the field data value
     * @return {Mixed} value The field value
     */
    getValue: function() {
        var input = this.input;

        if (input) {
            this._value = input.dom.value;
        }

        return this._value;
    },

    // @private
    applyValue: function(value) {
        return (Ext.isEmpty(value)) ? '' : value;
    },

    /**
     * Updates the {@link #value} configuration
     * @private
     */
    updateValue: function(newValue) {
        var input = this.input;

        if (input) {
            input.dom.value = newValue;
        }
    },

    setValue: function(newValue) {
        var oldValue = this._value;

        this.updateValue(this.applyValue(newValue));

        newValue = this.getValue();

        if (String(newValue) != String(oldValue) && this.initialized) {
            this.onChange(this, newValue, oldValue);
        }

        return this;
    },


    /**
     * Updates the tabIndex attribute with the {@link #tabIndex} configuration
     * @private
     */
    updateTabIndex: function(newTabIndex) {
        this.updateFieldAttribute('tabIndex', newTabIndex);
    },

    // @private
    testAutoFn: function(value) {
        return [true, 'on'].indexOf(value) !== -1;
    },


    /**
     * Updates the maxlength attribute with the {@link #maxLength} configuration
     * @private
     */
    updateMaxLength: function(newMaxLength) {
        this.updateFieldAttribute('maxlength', newMaxLength);
    },

    /**
     * Updates the placeholder attribute with the {@link #placeHolder} configuration
     * @private
     */
    updatePlaceHolder: function(newPlaceHolder) {
        this.updateFieldAttribute('placeholder', newPlaceHolder);
    },

    // @private
    applyAutoComplete: function(autoComplete) {
        return this.testAutoFn(autoComplete);
    },

    /**
     * Updates the autocomplete attribute with the {@link #autoComplete} configuration
     * @private
     */
    updateAutoComplete: function(newAutoComplete) {
        var value = newAutoComplete ? 'on' : 'off';
        this.updateFieldAttribute('autocomplete', value);
    },

    // @private
    applyAutoCapitalize: function(autoCapitalize) {
        return this.testAutoFn(autoCapitalize);
    },

    /**
     * Updates the autocapitalize attribute with the {@link #autoCapitalize} configuration
     * @private
     */
    updateAutoCapitalize: function(newAutoCapitalize) {
        var value = newAutoCapitalize ? 'on' : 'off';
        this.updateFieldAttribute('autocapitalize', value);
    },

    // @private
    applyAutoCorrect: function(autoCorrect) {
        return this.testAutoFn(autoCorrect);
    },

    /**
     * Updates the autocorrect attribute with the {@link #autoCorrect} configuration
     * @private
     */
    updateAutoCorrect: function(newAutoCorrect) {
        var value = newAutoCorrect ? 'on' : 'off';
        this.updateFieldAttribute('autocorrect', value);
    },

    /**
     * Updates the min attribute with the {@link #minValue} configuration
     * @private
     */
    updateMinValue: function(newMinValue) {
        this.updateFieldAttribute('min', newMinValue);
    },

    /**
     * Updates the max attribute with the {@link #maxValue} configuration
     * @private
     */
    updateMaxValue: function(newMaxValue) {
        this.updateFieldAttribute('max', newMaxValue);
    },

    /**
     * Updates the step attribute with the {@link #stepValue} configuration
     * @private
     */
    updateStepValue: function(newStepValue) {
        this.updateFieldAttribute('step', newStepValue);
    },

    // @private
    checkedRe: /^(true|1|on)/i,

    /**
     * Returns the checked value of this field
     * @return {Mixed} value The field value
     */
    getChecked: function() {
        var el = this.input,
            checked;

        if (el) {
            checked = el.dom.checked;
            this._checked = checked;
        }

        return checked;
    },

    // @private
    applyChecked: function(checked) {
        return !!this.checkedRe.test(String(checked));
    },

    setChecked: function(newChecked) {
        this.updateChecked(this.applyChecked(newChecked));
        this._checked = newChecked;
    },

    /**
     * Updates the autocorrect attribute with the {@link #autoCorrect} configuration
     * @private
     */
    updateChecked: function(newChecked) {
        this.input.dom.checked = newChecked;
    },

    /**
     * Updates the readonly attribute with the {@link #readOnly} configuration
     * @private
     */
    updateReadOnly: function(readOnly) {
        this.updateFieldAttribute('readonly', readOnly);
    },


    updateMaxRows: function(newRows) {
        this.updateFieldAttribute('rows', newRows);
    },

    doSetDisabled: function(disabled) {
        this.callParent(arguments);

        this.input.dom.disabled = disabled;

        if (!disabled) {
            this.blur();
        }
    },

    /**
     * <p>Returns true if the value of this Field has been changed from its original value.
     * Will return false if the field is disabled or has not been rendered yet.</p>
     */
    isDirty: function() {
        if (this.getDisabled()) {
            return false;
        }

        return String(this.getValue()) !== String(this.originalValue);
    },

    /**
     * Resets the current field value to the original value.
     */
    reset: function() {
        this.setValue(this.originalValue);
    },

    // @private
    onMaskTap: function(e) {
        this.fireAction('masktap', [this, e], 'doMaskTap');
    },

    // @private
    doMaskTap: function(me, e) {
        if (me.getDisabled()) {
            return false;
        }

        me.maskCorrectionTimer = Ext.defer(me.showMask, 1000, me);
        me.hideMask();
    },

    // @private
    showMask: function(e) {
        if (this.mask) {
            this.mask.setStyle('display', 'block');
        }
    },

    // @private
    hideMask: function(e) {
        if (this.mask) {
            this.mask.setStyle('display', 'none');
        }
    },

    /**
     * Attempts to set the field as the active input focus.
     * @return {Ext.field.Input} this
     */
    focus: function() {
        var me = this,
            el = me.input;

        if (el && el.dom.focus) {
            el.dom.focus();
        }
        return me;
    },

    /**
     * Attempts to forcefully blur input focus for the field.
     * @return {Ext.field.Input} this
     */
    blur: function() {
        var me = this,
            el = this.input;

        if (el && el.dom.blur) {
            el.dom.blur();
        }
        return me;
    },

    /**
     * Attempts to forcefully select all the contents of the input field.
     * @return {Ext.field.Input} this
     */
    select: function() {
        var me = this,
            el = me.input;

        if (el && el.dom.setSelectionRange) {
            el.dom.setSelectionRange(0, 9999);
        }
        return me;
    },

    onFocus: function(e) {
        this.fireAction('focus', [e], 'doFocus');
    },

    // @private
    doFocus: function(e) {
        var me = this;

        if (me.mask) {
            if (me.maskCorrectionTimer) {
                clearTimeout(me.maskCorrectionTimer);
            }
            me.hideMask();
        }

        if (!me.getIsFocused()) {
            me.setIsFocused(true);
            me.setStartValue(me.getValue());
        }
    },

    onBlur: function(e) {
        this.fireAction('blur', [e], 'doBlur');
    },

    // @private
    doBlur: function(e) {
        var me         = this,
            value      = me.getValue(),
            startValue = me.getStartValue();

        me.setIsFocused(false);

        if (String(value) != String(startValue)) {
            me.onChange(me, value, startValue);
        }

        me.showMask();
    },

    // @private
    onClearIconTap: function(e) {
        this.fireEvent('clearicontap', this, e);

        //focus the field after cleartap happens, but only on android.
        //this is to stop the keyboard from hiding. TOUCH-2064
        if (Ext.os.is.Android) {
            this.focus();
        }
    },

    onClick: function(e) {
        this.fireEvent('click', e);
    },

    onChange: function(me, value, startValue) {
        this.fireEvent('change', me, value, startValue);
    },

    onKeyUp: function(e) {
        this.fireEvent('keyup', e);
    },

    onPaste: function(e) {
        this.fireEvent('paste', e);
    },

    onMouseDown: function(e) {
        this.fireEvent('mousedown', e);
    }
});

/**
 * @class Ext.Decorator
 * @extend Ext.Component
 *
 * In a few words, a Decorator is a Component that wraps around another Component. A typical example of a Decorator is a
 * {@link Ext.field.Field Field}. A form field is nothing more than a decorator around another component, and gives the
 * component a label, as well as extra styling to make it look good in a form.
 *
 * A Decorator can be thought of as a lightweight Container that has only one child item, and no layout overhead.
 * The look and feel of decorators can be styled purely in CSS.
 *
 * Another powerful feature that Decorator provides is config proxying. For example: all config items of a
 * {@link Ext.slider.Slider Slider} also exist in a {@link Ext.field.Slider Slider Field} for API convenience.
 * The {@link Ext.field.Slider Slider Field} simply proxies all corresponding getters and setters
 * to the actual {@link Ext.slider.Slider Slider} instance. Writing out all the setters and getters to do that is a tedious task
 * and a waste of code space. Instead, when you sub-class Ext.Decorator, all you need to do is to specify those config items
 * that you want to proxy to the Component using a special 'proxyConfig' class property. Here's how it may look like
 * in a Slider Field class:
 *
 *     Ext.define('My.field.Slider', {
 *         extend: 'Ext.Decorator',
 *
 *         config: {
 *             component: {
 *                 xtype: 'slider'
 *             }
 *         },
 *
 *         proxyConfig: {
 *             minValue: 0,
 *             maxValue: 100,
 *             increment: 1
 *         }
 *
 *         // ...
 *     });
 *
 * Once `My.field.Slider` class is created, it will have all setters and getters methods for all items listed in `proxyConfig`
 * automatically generated. These methods all proxy to the same method names that exist within the Component instance.
 */
Ext.define('Ext.Decorator', {
    extend: 'Ext.Component',

    isDecorator: true,

    config: {
        /**
         * @cfg {Object} component The config object to factory the Component that this Decorator wraps around
         */
        component: {}
    },

    statics: {
        generateProxySetter: function(name) {
            return function(value) {
                var component = this.getComponent();
                component[name].call(component, value);

                return this;
            }
        },
        generateProxyGetter: function(name) {
            return function() {
                var component = this.getComponent();
                return component[name].call(component);
            }
        }
    },

    onClassExtended: function(Class, members) {
        if (!members.hasOwnProperty('proxyConfig')) {
            return;
        }

        var ExtClass = Ext.Class,
            proxyConfig = members.proxyConfig,
            config = members.config;

        members.config = (config) ? Ext.applyIf(config, proxyConfig) : proxyConfig;

        var name, nameMap, setName, getName;

        for (name in proxyConfig) {
            if (proxyConfig.hasOwnProperty(name)) {
                nameMap = ExtClass.getConfigNameMap(name);
                setName = nameMap.set;
                getName = nameMap.get;

                members[setName] = this.generateProxySetter(setName);
                members[getName] = this.generateProxyGetter(getName);
            }
        }
    },

    // @private
    applyComponent: function(config) {
        return Ext.factory(config, Ext.Component);
    },

    // @private
    updateComponent: function(newComponent, oldComponent) {
        if (oldComponent) {
            if (this.isRendered() && oldComponent.setRendered(false)) {
                oldComponent.fireAction('renderedchange', [this, oldComponent, false],
                    'doUnsetComponent', this, { args: [oldComponent] });
            }
            else {
                this.doUnsetComponent(oldComponent);
            }
        }

        if (newComponent) {
            if (this.isRendered() && newComponent.setRendered(true)) {
                newComponent.fireAction('renderedchange', [this, newComponent, true],
                    'doSetComponent', this, { args: [newComponent] });
            }
            else {
                this.doSetComponent(newComponent);
            }
        }
    },

    // @private
    doUnsetComponent: function(component) {
        if (component.renderElement.dom) {
            this.innerElement.dom.removeChild(component.renderElement.dom);
        }
    },

    // @private
    doSetComponent: function(component) {
        if (component.renderElement.dom) {
            this.innerElement.dom.appendChild(component.renderElement.dom);
        }
    },

    // @private
    setRendered: function(rendered) {
        var component;

        if (this.callParent(arguments)) {
            component = this.getComponent();

            if (component) {
                component.setRendered(rendered);
            }

            return true;
        }

        return false;
    },

    // @private
    setDisabled: function(disabled) {
        this.callParent(arguments);
        this.getComponent().setDisabled(disabled);
    },

    destroy: function() {
        Ext.destroy(this.getComponent());
        this.callParent();
    }
});

/**
 * @aside video tabs-toolbars
 *
 * {@link Ext.Toolbar}s are most commonly used as docked items as within a {@link Ext.Container}. They can be docked either `top` or `bottom` using the {@link #docked} configuration.
 *
 * They allow you to insert items (normally {@link Ext.Button buttons}) and also add a {@link #title}.
 *
 * The {@link #defaultType} of {@link Ext.Toolbar} is {@link Ext.Button}.
 *
 * You can alterntively use {@link Ext.TitleBar} if you want the title to automatically adjust the size of its items.
 *
 * ## Examples
 *
 *     @example miniphone preview
 *     Ext.create('Ext.Container', {
 *         fullscreen: true,
 *         layout: {
 *             type: 'vbox',
 *             pack: 'center'
 *         },
 *         items: [
 *             {
 *                 xtype : 'toolbar',
 *                 docked: 'top',
 *                 title: 'My Toolbar'
 *             },
 *             {
 *                 xtype: 'container',
 *                 defaults: {
 *                     xtype: 'button',
 *                     margin: '10 10 0 10'
 *                 },
 *                 items: [
 *                     {
 *                         text: 'Toggle docked',
 *                         handler: function() {
 *                             var toolbar = Ext.ComponentQuery.query('toolbar')[0],
 *                                 newDocked = (toolbar.getDocked() == 'top') ? 'bottom' : 'top';
 *
 *                             toolbar.setDocked(newDocked);
 *                         }
 *                     },
 *                     {
 *                         text: 'Toggle UI',
 *                         handler: function() {
 *                             var toolbar = Ext.ComponentQuery.query('toolbar')[0],
 *                                 newUi = (toolbar.getUi() == 'light') ? 'dark' : 'light';
 *
 *                             toolbar.setUi(newUi);
 *                         }
 *                     },
 *                     {
 *                         text: 'Change title',
 *                         handler: function() {
 *                             var toolbar = Ext.ComponentQuery.query('toolbar')[0],
 *                                 titles = ['My Toolbar', 'Ext.Toolbar', 'Configurations are awesome!', 'Beautiful.'],
                                   //internally, the title configuration gets converted into a {@link Ext.Title} component,
                                   //so you must get the title configuration of that component
 *                                 title = toolbar.getTitle().getTitle(),
 *                                 newTitle = titles[titles.indexOf(title) + 1] || titles[0];
 *
 *                             toolbar.setTitle(newTitle);
 *                         }
 *                     }
 *                 ]
 *             }
 *         ]
 *     });
 *
 * ## Notes
 *
 * You must use a HTML5 doctype for {@link #docked} `bottom` to work. To do this, simply add the following code to the HTML file:
 *
 *     <!doctype html>
 *
 * So your index.html file should look a little like this:
 *
 *     <!doctype html>
 *     <html>
 *         <head>
 *             <title>MY application title</title>
 *             ...
 *
 */
Ext.define('Ext.Toolbar', {
    extend: 'Ext.Container',
    xtype : 'toolbar',

    requires: [
        'Ext.Button',
        'Ext.Title',
        'Ext.Spacer'
    ],

    // private
    isToolbar: true,

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'toolbar',

        /**
         * @cfg {String} ui
         * The ui for this {@link Ext.Toolbar}. Either 'light' or 'dark'. Cou can create more UIs by using using the CSS Mixin {@link #sencha-toolbar-ui}
         * @accessor
         */
        ui: 'dark',

        /**
         * @cfg {String/Ext.Title} title
         * The title of the toolbar.
         * @accessor
         */
        title: null,

        /**
         * @cfg {String} defaultType
         * The default xtype to create.
         * @accessor
         */
        defaultType: 'button',

        /**
         * @cfg {String} docked
         * The docked position for this {@link Ext.Toolbar}.
         * If you specify `left` or `right`, the {@link #layout} configuration will automatically change to a `vbox`. It's also
         * recommended to adjust the {@link #width} of the toolbar if you do this.
         * @accessor
         */

        /**
         * @cfg {Object/String} layout Configuration for this Container's layout. Example:
         *
         *    Ext.create('Ext.Container', {
         *        layout: {
         *            type: 'hbox',
         *            align: 'middle'
         *        },
         *        items: [
         *            {
         *                xtype: 'panel',
         *                flex: 1,
         *                style: 'background-color: red;'
         *            },
         *            {
         *                xtype: 'panel',
         *                flex: 2,
         *                style: 'background-color: green'
         *            }
         *        ]
         *    });
         *
         * See the layouts guide for more information
         *
         * Please note, if you set the {@link #docked} configuration to `left` or `right`, the default layout will change from the
         * `hbox` to a `vbox`.
         *
         * @accessor
         */
        layout: {
            type: 'hbox',
            align: 'center'
        }
    },

    constructor: function(config) {
        config = config || {};

        if (config.docked == "left" || config.docked == "right") {
            config.layout = {
                type: 'vbox',
                align: 'stretch'
            };
        }

        this.callParent([config]);
    },

    // @private
    applyTitle: function(title) {
        if (typeof title == 'string') {
            title = {
                title: title,
                centered: true
            };
        }

        return Ext.factory(title, Ext.Title, this.getTitle());
    },

    // @private
    updateTitle: function(newTitle, oldTitle) {
        if (newTitle) {
            this.add(newTitle);
            this.getLayout().setItemFlex(newTitle, 1);
        }

        if (oldTitle) {
            oldTitle.destroy();
        }
    },

    /**
     * Shows the title if it exists.
     */
    showTitle: function() {
        var title = this.getTitle();

        if (title) {
            title.show();
        }
    },

    /**
     * Hides the title if it exists.
     */
    hideTitle: function() {
        var title = this.getTitle();

        if (title) {
            title.hide();
        }
    }

    /**
     * Returns an {@link Ext.Title} component.
     * @member Ext.Toolbar
     * @method getTitle
     * @return {Ext.Title}
     */

    /**
     * Use this to update the {@link #title} configuration.
     * @member Ext.Toolbar
     * @method setTitle
     * @param {String/Ext.Title} title You can either pass a String, or a config/instance of Ext.Title
     */

}, function() {
});


/**
 * @aside guide floating_components
 *
 * Panels are most useful as Overlays - containers that float over your application. They contain extra styling such
 * that when you {@link #showBy} another component, the container will appear in a rounded black box with a 'tip'
 * pointing to a reference component.
 *
 * If you don't need this extra functionality, you should use {@link Ext.Container} instead. See the
 * [Overlays example](#!/example/overlays) for more use cases.
 *
 *      @example miniphone preview
 *
 *      var button = Ext.create('Ext.Button', {
 *           text: 'Button',
 *           id: 'rightButton'
 *      });
 *
 *      Ext.create('Ext.Container', {
 *          fullscreen: true,
 *          items: [
 *              {
 *                   docked: 'top',
 *                   xtype: 'titlebar',
 *                   items: [
 *                       button
 *                   ]
 *               }
 *          ]
 *      });
 *
 *      Ext.create('Ext.Panel', {
 *          html: 'Floating Panel',
 *          left: 0,
 *          padding: 10
 *      }).showBy(button);
 *
 */
Ext.define('Ext.Panel', {
    extend: 'Ext.Container',
    requires: ['Ext.util.LineSegment'],

    alternateClassName: 'Ext.lib.Panel',

    xtype: 'panel',

    isPanel: true,

    config: {
        baseCls: Ext.baseCSSPrefix + 'panel',

        /**
         * @cfg {Number/Boolean/String} bodyPadding
         * A shortcut for setting a padding style on the body element. The value can either be
         * a number to be applied to all sides, or a normal css string describing padding.
         * @deprecated 2.0.0
         */
        bodyPadding: null,

        /**
         * @cfg {Number/Boolean/String} bodyMargin
         * A shortcut for setting a margin style on the body element. The value can either be
         * a number to be applied to all sides, or a normal css string describing margins.
         * @deprecated 2.0.0
         */
        bodyMargin: null,

        /**
         * @cfg {Number/Boolean/String} bodyBorder
         * A shortcut for setting a border style on the body element. The value can either be
         * a number to be applied to all sides, or a normal css string describing borders.
         * @deprecated 2.0.0
         */
        bodyBorder: null
    },

    getElementConfig: function() {
        var config = this.callParent();

        config.children.push({
            reference: 'tipElement',
            className: 'x-anchor',
            hidden: true
        });

        return config;
    },

    applyBodyPadding: function(bodyPadding) {
        if (bodyPadding === true) {
            bodyPadding = 5;
        }

        if (bodyPadding) {
            bodyPadding = Ext.dom.Element.unitizeBox(bodyPadding);
        }

        return bodyPadding;
    },

    updateBodyPadding: function(newBodyPadding) {
        this.element.setStyle('padding', newBodyPadding);
    },

    applyBodyMargin: function(bodyMargin) {
        if (bodyMargin === true) {
            bodyMargin = 5;
        }

        if (bodyMargin) {
            bodyMargin = Ext.dom.Element.unitizeBox(bodyMargin);
        }

        return bodyMargin;
    },

    updateBodyMargin: function(newBodyMargin) {
        this.element.setStyle('margin', newBodyMargin);
    },

    applyBodyBorder: function(bodyBorder) {
        if (bodyBorder === true) {
            bodyBorder = 1;
        }

        if (bodyBorder) {
            bodyBorder = Ext.dom.Element.unitizeBox(bodyBorder);
        }

        return bodyBorder;
    },

    updateBodyBorder: function(newBodyBorder) {
        this.element.setStyle('border-width', newBodyBorder);
    },

    alignTo: function(component) {
        var tipElement = this.tipElement;

        tipElement.hide();

        if (this.currentTipPosition) {
            tipElement.removeCls('x-anchor-' + this.currentTipPosition);
        }

        this.callParent(arguments);

        var LineSegment = Ext.util.LineSegment,
            alignToElement = component.isComponent ? component.renderElement : component,
            element = this.renderElement,
            alignToBox = alignToElement.getPageBox(),
            box = element.getPageBox(),
            left = box.left,
            top = box.top,
            right = box.right,
            bottom = box.bottom,
            centerX = left + (box.width / 2),
            centerY = top + (box.height / 2),
            leftTopPoint = { x: left, y: top },
            rightTopPoint = { x: right, y: top },
            leftBottomPoint = { x: left, y: bottom },
            rightBottomPoint = { x: right, y: bottom },
            boxCenterPoint = { x: centerX, y: centerY },
            alignToCenterX = alignToBox.left + (alignToBox.width / 2),
            alignToCenterY = alignToBox.top + (alignToBox.height / 2),
            alignToBoxCenterPoint = { x: alignToCenterX, y: alignToCenterY },
            centerLineSegment = new LineSegment(boxCenterPoint, alignToBoxCenterPoint),
            offsetLeft = 0,
            offsetTop = 0,
            tipSize, tipWidth, tipHeight, tipPosition, tipX, tipY;

        tipElement.setVisibility(false);
        tipElement.show();
        tipSize = tipElement.getSize();
        tipWidth = tipSize.width;
        tipHeight = tipSize.height;

        if (centerLineSegment.intersects(new LineSegment(leftTopPoint, rightTopPoint))) {
            tipX = Math.min(Math.max(alignToCenterX, left + tipWidth), right - (tipWidth));
            tipY = top;
            offsetTop = tipHeight + 10;
            tipPosition = 'top';
        }
        else if (centerLineSegment.intersects(new LineSegment(leftTopPoint, leftBottomPoint))) {
            tipX = left;
            tipY = Math.min(Math.max(alignToCenterY + (tipWidth / 2), tipWidth * 1.6), bottom - (tipWidth / 2.2));
            offsetLeft = tipHeight + 10;
            tipPosition = 'left';
        }
        else if (centerLineSegment.intersects(new LineSegment(leftBottomPoint, rightBottomPoint))) {
            tipX = Math.min(Math.max(alignToCenterX, left + tipWidth), right - tipWidth);
            tipY = bottom;
            offsetTop = -tipHeight - 10;
            tipPosition = 'bottom';
        }
        else if (centerLineSegment.intersects(new LineSegment(rightTopPoint, rightBottomPoint))) {
            tipX = right;
            tipY = Math.max(Math.min(alignToCenterY - tipHeight, bottom - tipWidth * 1.3), tipWidth / 2);
            offsetLeft = -tipHeight - 10;
            tipPosition = 'right';
        }

        if (tipX || tipY) {
            this.currentTipPosition = tipPosition;
            tipElement.addCls('x-anchor-' + tipPosition);
            tipElement.setLeft(tipX - left);
            tipElement.setTop(tipY - top);
            tipElement.setVisibility(true);

            this.setLeft(this.getLeft() + offsetLeft);
            this.setTop(this.getTop() + offsetTop);
        }
    }
});

/**
 * A general sheet class. This renderable container provides base support for orientation-aware transitions for popup or
 * side-anchored sliding Panels.
 *
 * In most cases, you should use {@link Ext.ActionSheet}, {@link Ext.MessageBox}, {@link Ext.picker.Picker} or {@link Ext.picker.Date}.
 */
Ext.define('Ext.Sheet', {
    extend: 'Ext.Panel',

    xtype: 'sheet',

    requires: ['Ext.fx.Animation'],

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'sheet',

        /**
         * @cfg
         * @inheritdoc
         */
        modal: true,

        /**
         * @cfg {Boolean} centered
         * Whether or not this component is absolutely centered inside its container
         * @accessor
         * @evented
         */
        centered: true,

        /**
         * @cfg {Boolean} stretchX True to stretch this sheet horizontally.
         */
        stretchX: null,

        /**
         * @cfg {Boolean} stretchY True to stretch this sheet vertically.
         */
        stretchY: null,

        /**
         * @cfg {String} enter
         * The viewport side used as the enter point when shown (top, bottom, left, right)
         * Applies to sliding animation effects only. Defaults to 'bottom'
         */
        enter: 'bottom',

        /**
         * @cfg {String} exit
         * The viewport side used as the exit point when hidden (top, bottom, left, right)
         * Applies to sliding animation effects only. Defaults to 'bottom'
         */
        exit: 'bottom',

        /**
         * @cfg
         * @inheritdoc
         */
        showAnimation: !Ext.os.is.Android2 ? {
            type: 'slideIn',
            duration: 250,
            easing: 'ease-out'
        } : null,

        /**
         * @cfg
         * @inheritdoc
         */
        hideAnimation: !Ext.os.is.Android2 ? {
            type: 'slideOut',
            duration: 250,
            easing: 'ease-in'
        } : null
    },

    applyHideAnimation: function(config) {
        var exit = this.getExit(),
            direction = exit;

        if (exit === null) {
            return null;
        }

        if (config === true) {
            config = {
                type: 'slideOut'
            };
        }
        if (Ext.isString(config)) {
            config = {
                type: config
            };
        }
        var anim = Ext.factory(config, Ext.fx.Animation);

        if (anim) {
            if (exit == 'bottom') {
                direction = 'down';
            }
            if (exit == 'top') {
                direction = 'up';
            }
            anim.setDirection(direction);
        }
        return anim;
    },

    applyShowAnimation: function(config) {
        var enter = this.getEnter(),
            direction = enter;

        if (enter === null) {
            return null;
        }

        if (config === true) {
            config = {
                type: 'slideIn'
            };
        }
        if (Ext.isString(config)) {
            config = {
                type: config
            };
        }
        var anim = Ext.factory(config, Ext.fx.Animation);

        if (anim) {
            if (enter == 'bottom') {
                direction = 'down';
            }
            if (enter == 'top') {
                direction = 'up';
            }
            anim.setBefore({
                display: null
            });
            anim.setReverse(true);
            anim.setDirection(direction);
        }
        return anim;
    },

    updateStretchX: function(newStretchX) {
        this.getLeft();
        this.getRight();

        if (newStretchX) {
            this.setLeft(0);
            this.setRight(0);
        }
    },

    updateStretchY: function(newStretchY) {
        this.getTop();
        this.getBottom();

        if (newStretchY) {
            this.setTop(0);
            this.setBottom(0);
        }
    }
});

/**
 * @private
 */
Ext.define('Ext.field.TextAreaInput', {
    extend: 'Ext.field.Input',
    xtype : 'textareainput',

    tag: 'textarea'
});

/**
 * @aside guide forms
 *
 * Field is the base class for all form fields used in Sencha Touch. It provides a lot of shared functionality to all
 * field subclasses (for example labels, simple validation, {@link #clearIcon clearing} and tab index management), but
 * is rarely used directly. Instead, it is much more common to use one of the field subclasses:
 *
 *     xtype            Class
 *     ---------------------------------------
 *     textfield        {@link Ext.field.Text}
 *     numberfield      {@link Ext.field.Number}
 *     textareafield    {@link Ext.field.TextArea}
 *     hiddenfield      {@link Ext.field.Hidden}
 *     radiofield       {@link Ext.field.Radio}
 *     checkboxfield    {@link Ext.field.Checkbox}
 *     selectfield      {@link Ext.field.Select}
 *     togglefield      {@link Ext.field.Toggle}
 *     fieldset         {@link Ext.form.FieldSet}
 *
 * Fields are normally used within the context of a form and/or fieldset. See the {@link Ext.form.Panel FormPanel}
 * and {@link Ext.form.FieldSet FieldSet} docs for examples on how to put those together, or the list of links above
 * for usage of individual field types. If you wish to create your own Field subclasses you can extend this class,
 * though it is sometimes more useful to extend {@link Ext.field.Text} as this provides additional text entry
 * functionality.
 */
Ext.define('Ext.field.Field', {
    extend: 'Ext.Decorator',
    alternateClassName: 'Ext.form.Field',
    xtype: 'field',
    requires: [
        'Ext.field.Input'
    ],

    /**
     * Set to true on all Ext.field.Field subclasses. This is used by {@link Ext.form.Panel#getValues} to determine which
     * components inside a form are fields.
     * @property isField
     * @type Boolean
     */
    isField: true,

    // @private
    isFormField: true,

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'field',

        /**
         * The label of this field
         * @cfg {String} label
         * @accessor
         */
        label: null,

        /**
         * @cfg {String} labelAlign The position to render the label relative to the field input.
         * Available options are: 'top', 'left', 'bottom' and 'right'
         * Defaults to 'left'
         * @accessor
         */
        labelAlign: 'left',

        /**
         * @cfg {Number/String} labelWidth The width to make this field's label.
         * @accessor
         */
        labelWidth: '30%',

        /**
         * @cfg {Boolean} labelWrap True to allow the label to wrap. If set to false, the label will be truncated with
         * an ellipsis.
         * @accessor
         */
        labelWrap: false,

        /**
         * @cfg {Boolean} clearIcon True to use a clear icon in this field
         * @accessor
         */
        clearIcon: null,

        /**
         * @cfg {Boolean} required True to make this field required. Note: this only causes a visual indication.
         * Doesn't prevent user from submitting the form.
         * @accessor
         */
        required: false,

        /**
         * <p>The label Element associated with this Field. <b>Only available if a {@link #label} is specified.</b></p>
<p>This has been deprecated.
         * @type Ext.Element
         * @property labelEl
         * @deprecated 2.0
         */

        /**
         * @cfg {String} inputType The type attribute for input fields -- e.g. radio, text, password, file (defaults
         * to 'text'). The types 'file' and 'password' must be used to render those field types currently -- there are
         * no separate Ext components for those.
         * This is now deprecated. Please use 'input.type' instead.
         * @deprecated 2.0
         * @accessor
         */
        inputType: null,

        /**
         * @cfg {String} name The field's HTML name attribute.
         * <b>Note</b>: this property must be set if this field is to be automatically included with
         * {@link Ext.form.Panel#method-submit form submit()}.
         * @accessor
         */
        name: null,

        /**
         * @cfg {Mixed} value A value to initialize this field with.
         * @accessor
         */
        value: null,

        /**
         * @cfg {Number} tabIndex The tabIndex for this field. Note this only applies to fields that are rendered,
         * not those which are built via applyTo.
         * @accessor
         */
        tabIndex: null

        /**
         * @cfg {Object} component The inner component for this field.
         */

        /**
         * @cfg {Boolean} fullscreen
         * @hide
         */
    },

    cachedConfig: {
        /**
         * @cfg {String} labelCls Optional CSS class to add to the Label element
         * @accessor
         */
        labelCls: null,

        /**
         * @cfg {String} requiredCls The className to be applied to this Field when the {@link #required} configuration is set to true
         * @accessor
         */
        requiredCls: Ext.baseCSSPrefix + 'field-required',

        /**
         * @cfg {String} inputCls CSS class to add to the input element of this fields {@link #component}
         */
        inputCls: null,

        bubbleEvents: ['action']
    },

    /**
     * @cfg {Boolean} isFocused
     * True if this field is currently focused,
     * @private
     */

    getElementConfig: function() {
        var prefix = Ext.baseCSSPrefix;

        return {
            reference: 'element',
            className: 'x-container',
            children: [
                {
                    reference: 'label',
                    cls: prefix + 'form-label',
                    children: [{
                        reference: 'labelspan',
                        tag: 'span'
                    }]
                },
                {
                    reference: 'innerElement',
                    cls: prefix + 'component-outer'
                }
            ]
        };
    },

    // @private
    updateLabel: function(newLabel, oldLabel) {
        var renderElement = this.renderElement,
            prefix = Ext.baseCSSPrefix;

        if (newLabel) {
            this.labelspan.setHtml(newLabel);
            renderElement.addCls(prefix + 'field-labeled');
        } else {
            renderElement.removeCls(prefix + 'field-labeled');
        }
    },

    // @private
    updateLabelAlign: function(newLabelAlign, oldLabelAlign) {
        var renderElement = this.renderElement,
            prefix = Ext.baseCSSPrefix;

        if (newLabelAlign) {
            renderElement.addCls(prefix + 'label-align-' + newLabelAlign);

            if (newLabelAlign == "top" || newLabelAlign == "bottom") {
                this.label.setWidth('100%');
            } else {
                this.updateLabelWidth(this.getLabelWidth());
            }
        }

        if (oldLabelAlign) {
            renderElement.removeCls(prefix + 'label-align-' + oldLabelAlign);
        }
    },

    // @private
    updateLabelCls: function(newLabelCls, oldLabelCls) {
        if (newLabelCls) {
            this.label.addCls(newLabelCls);
        }

        if (oldLabelCls) {
            this.label.removeCls(oldLabelCls);
        }
    },

    // @private
    updateLabelWidth: function(newLabelWidth) {
        var labelAlign = this.getLabelAlign();

        if (newLabelWidth) {
            if (labelAlign == "top" || labelAlign == "bottom") {
                this.label.setWidth('100%');
            } else {
                this.label.setWidth(newLabelWidth);
            }
        }
    },

    // @private
    updateLabelWrap: function(newLabelWrap, oldLabelWrap) {
        var cls = Ext.baseCSSPrefix + 'form-label-nowrap';

        if (!newLabelWrap) {
            this.addCls(cls);
        } else {
            this.removeCls(cls);
        }
    },

    /**
     * Updates the {@link #required} configuration
     * @private
     */
    updateRequired: function(newRequired) {
        this.renderElement[newRequired ? 'addCls' : 'removeCls'](this.getRequiredCls());
    },

    /**
     * Updates the {@link #required} configuration
     * @private
     */
    updateRequiredCls: function(newRequiredCls, oldRequiredCls) {
        if (this.getRequired()) {
            this.renderElement.replaceCls(oldRequiredCls, newRequiredCls);
        }
    },

    // @private
    initialize: function() {
        var me = this;
        me.callParent();

        me.doInitValue();
    },

    /**
     * @private
     */
    doInitValue: function() {
        /**
         * @property {Mixed} originalValue
         * The original value of the field as configured in the {@link #value} configuration.
         * setting is <code>true</code>.
         */
        this.originalValue = this.getInitialConfig().value;
    },

    /**
     * Resets the current field value back to the original value on this field when it was created.
     *
     *     // This will create a field with an original value
     *     var field = Ext.Viewport.add({
     *         xtype: 'textfield',
     *         value: 'first value'
     *     });
     *
     *     // Update the value
     *     field.setValue('new value');
     *
     *     // Now you can reset it back to the `first value`
     *     field.reset();
     *
     * @return {Ext.field.Field} this
     */
    reset: function() {
        this.setValue(this.originalValue);

        return this;
    },

    /**
     * <p>Returns true if the value of this Field has been changed from its {@link #originalValue}.
     * Will return false if the field is disabled or has not been rendered yet.</p>
     * @return {Boolean} True if this field has been changed from its original value (and
     * is not disabled), false otherwise.
     */
    isDirty: function() {
        return false;
    }
}, function() {
});

/**
 * @aside guide forms
 *
 * The text field is the basis for most of the input fields in Sencha Touch. It provides a baseline of shared
 * functionality such as input validation, standard events, state management and look and feel. Typically we create
 * text fields inside a form, like this:
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         fullscreen: true,
 *         items: [
 *             {
 *                 xtype: 'fieldset',
 *                 title: 'Enter your name',
 *                 items: [
 *                     {
 *                         xtype: 'textfield',
 *                         label: 'First Name',
 *                         name: 'firstName'
 *                     },
 *                     {
 *                         xtype: 'textfield',
 *                         label: 'Last Name',
 *                         name: 'lastName'
 *                     }
 *                 ]
 *             }
 *         ]
 *     });
 *
 * This creates two text fields inside a form. Text Fields can also be created outside of a Form, like this:
 *
 *     Ext.create('Ext.field.Text', {
 *         label: 'Your Name',
 *         value: 'Ed Spencer'
 *     });
 *
 * ## Configuring
 *
 * Text field offers several configuration options, including {@link #placeHolder}, {@link #maxLength},
 * {@link #autoComplete}, {@link #autoCapitalize} and {@link #autoCorrect}. For example, here is how we would configure
 * a text field to have a maximum length of 10 characters, with placeholder text that disappears when the field is
 * focused:
 *
 *     Ext.create('Ext.field.Text', {
 *         label: 'Username',
 *         maxLength: 10,
 *         placeHolder: 'Enter your username'
 *     });
 *
 * The autoComplete, autoCapitalize and autoCorrect configs simply set those attributes on the text field and allow the
 * native browser to provide those capabilities. For example, to enable auto complete and auto correct, simply
 * configure your text field like this:
 *
 *     Ext.create('Ext.field.Text', {
 *         label: 'Username',
 *         autoComplete: true,
 *         autoCorrect: true
 *     });
 *
 * These configurations will be picked up by the native browser, which will enable the options at the OS level.
 *
 * Text field inherits from {@link Ext.field.Field}, which is the base class for all fields in Sencha Touch and provides
 * a lot of shared functionality for all fields, including setting values, clearing and basic validation. See the
 * {@link Ext.field.Field} documentation to see how to leverage its capabilities.
 */
Ext.define('Ext.field.Text', {
    extend: 'Ext.field.Field',
    xtype: 'textfield',
    alternateClassName: 'Ext.form.Text',

    /**
     * @event focus
     * Fires when this field receives input focus
     * @param {Ext.field.Text} this This field
     * @param {Ext.event.Event} e
     */

    /**
     * @event blur
     * Fires when this field loses input focus
     * @param {Ext.field.Text} this This field
     * @param {Ext.event.Event} e
     */

    /**
     * @event paste
     * Fires when this field is pasted.
     * @param {Ext.field.Text} this This field
     * @param {Ext.event.Event} e
     */

    /**
     * @event mousedown
     * Fires when this field receives a mousedown
     * @param {Ext.field.Text} this This field
     * @param {Ext.event.Event} e
     */

    /**
     * @event keyup
     * @preventable doKeyUp
     * Fires when a key is released on the input element
     * @param {Ext.field.Text} this This field
     * @param {Ext.event.Event} e
     */

    /**
     * @event clearicontap
     * @preventable doClearIconTap
     * Fires when the clear icon is tapped
     * @param {Ext.field.Text} this This field
     * @param {Ext.event.Event} e
     */

    /**
     * @event change
     * Fires just before the field blurs if the field value has changed
     * @param {Ext.field.Text} this This field
     * @param {Mixed} newValue The new value
     * @param {Mixed} oldValue The original value
     */

    /**
     * @event action
     * @preventable doAction
     * Fires whenever the return key or go is pressed. FormPanel listeners
     * for this event, and submits itself whenever it fires. Also note
     * that this event bubbles up to parent containers.
     * @param {Ext.field.Text} this This field
     * @param {Mixed} e The key event object
     */

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        ui: 'text',

        /**
         * @cfg
         * @inheritdoc
         */
        clearIcon: true,

        /**
         * @cfg {String} placeHolder A string value displayed in the input (if supported) when the control is empty.
         * @accessor
         */
        placeHolder: null,

        /**
         * @cfg {Number} maxLength The maximum number of permitted input characters.
         * @accessor
         */
        maxLength: null,

        /**
         * True to set the field's DOM element autocomplete attribute to "on", false to set to "off".
         * @cfg {Boolean} autoComplete
         * @accessor
         */
        autoComplete: null,

        /**
         * True to set the field's DOM element autocapitalize attribute to "on", false to set to "off".
         * @cfg {Boolean} autoCapitalize
         * @accessor
         */
        autoCapitalize: null,

        /**
         * True to set the field DOM element autocorrect attribute to "on", false to set to "off".
         * @cfg {Boolean} autoCorrect
         * @accessor
         */
        autoCorrect: null,

        /**
         * True to set the field DOM element readonly attribute to true.
         * @cfg {Boolean} readOnly
         * @accessor
         */
        readOnly: null,

        /**
         * @cfg {Object} component The inner component for this field, which defaults to an input text.
         * @accessor
         */
        component: {
            xtype: 'input',
            type : 'text'
        }
    },

    // @private
    initialize: function() {
        var me = this;

        me.callParent();

        me.getComponent().on({
            scope: this,

            keyup       : 'onKeyUp',
            change      : 'onChange',
            focus       : 'onFocus',
            blur        : 'onBlur',
            paste       : 'onPaste',
            mousedown   : 'onMouseDown',
            clearicontap: 'onClearIconTap'
        });

        // set the originalValue of the textfield, if one exists
        me.originalValue = me.originalValue || "";
        me.getComponent().originalValue = me.originalValue;

        me.syncEmptyCls();
    },

    syncEmptyCls: function() {
        var empty = (this._value) ? this._value.length : false,
            cls = Ext.baseCSSPrefix + 'empty';

        if (empty) {
            this.removeCls(cls);
        } else {
            this.addCls(cls);
        }
    },

    // @private
    updateValue: function(newValue) {
        var component  = this.getComponent(),
            // allows newValue to be zero but not undefined, null or an empty string (other falsey values)
            valueValid = newValue !== undefined && newValue !== null && newValue !== '';

        if (component) {
            component.setValue(newValue);
        }

        this[valueValid ? 'showClearIcon' : 'hideClearIcon']();

        this.syncEmptyCls();
    },

    getValue: function() {
        var me = this;

        me._value = me.getComponent().getValue();

        me.syncEmptyCls();

        return me._value;
    },

    // @private
    updatePlaceHolder: function(newPlaceHolder) {
        this.getComponent().setPlaceHolder(newPlaceHolder);
    },

    // @private
    updateMaxLength: function(newMaxLength) {
        this.getComponent().setMaxLength(newMaxLength);
    },

    // @private
    updateAutoComplete: function(newAutoComplete) {
        this.getComponent().setAutoComplete(newAutoComplete);
    },

    // @private
    updateAutoCapitalize: function(newAutoCapitalize) {
        this.getComponent().setAutoCapitalize(newAutoCapitalize);
    },

    // @private
    updateAutoCorrect: function(newAutoCorrect) {
        this.getComponent().setAutoCorrect(newAutoCorrect);
    },

    // @private
    updateReadOnly: function(newReadOnly) {
        if (newReadOnly) {
            this.hideClearIcon();
        } else {
            this.showClearIcon();
        }

        this.getComponent().setReadOnly(newReadOnly);
    },

    // @private
    updateInputType: function(newInputType) {
        var component = this.getComponent();
        if (component) {
            component.setType(newInputType);
        }
    },

    // @private
    updateName: function(newName) {
        var component = this.getComponent();
        if (component) {
            component.setName(newName);
        }
    },

    // @private
    updateTabIndex: function(newTabIndex) {
        var component = this.getComponent();
        if (component) {
            component.setTabIndex(newTabIndex);
        }
    },

    /**
     * Updates the {@link #inputCls} configuration on this fields {@link #component}
     * @private
     */
    updateInputCls: function(newInputCls, oldInputCls) {
        var component = this.getComponent();
        if (component) {
            component.replaceCls(oldInputCls, newInputCls);
        }
    },

    doSetDisabled: function(disabled) {
        var me = this;

        me.callParent(arguments);

        var component = me.getComponent();
        if (component) {
            component.setDisabled(disabled);
        }

        if (disabled) {
            me.hideClearIcon();
        } else {
            me.showClearIcon();
        }
    },

    // @private
    showClearIcon: function() {
        var me         = this,
            value      = me.getValue(),
            // allows value to be zero but not undefined, null or an empty string (other falsey values)
            valueValid = value !== undefined && value !== null && value !== '';

        if (me.getClearIcon() && !me.getDisabled() && !me.getReadOnly() && valueValid) {
            me.element.addCls(Ext.baseCSSPrefix + 'field-clearable');
        }

        return me;
    },

    // @private
    hideClearIcon: function() {
        if (this.getClearIcon()) {
            this.element.removeCls(Ext.baseCSSPrefix + 'field-clearable');
        }
    },

    onKeyUp: function(e) {
        this.fireAction('keyup', [this, e], 'doKeyUp');
    },

    /**
     * Called when a key has been pressed in the `<input>`
     * @private
     */
    doKeyUp: function(me, e) {
        // getValue to ensure that we are in sync with the dom
        var value      = me.getValue(),
            // allows value to be zero but not undefined, null or an empty string (other falsey values)
            valueValid = value !== undefined && value !== null && value !== '';

        this[valueValid ? 'showClearIcon' : 'hideClearIcon']();

        if (e.browserEvent.keyCode === 13) {
            me.fireAction('action', [me, e], 'doAction');
        }
    },

    doAction: function() {
        this.blur();
    },

    onClearIconTap: function(e) {
        this.fireAction('clearicontap', [this, e], 'doClearIconTap');
    },

    // @private
    doClearIconTap: function(me, e) {
        me.setValue('');

        //sync with the input
        me.getValue();
    },

    onChange: function(me, value, startValue) {
        me.fireEvent('change', this, value, startValue);
    },

    onFocus: function(e) {
        this.isFocused = true;
        this.fireEvent('focus', this, e);
    },

    onBlur: function(e) {
        var me = this;

        this.isFocused = false;

        me.fireEvent('blur', me, e);

        setTimeout(function() {
            me.isFocused = false;
        }, 50);
    },

    onPaste: function(e) {
        this.fireEvent('paste', this, e);
    },

    onMouseDown: function(e) {
        this.fireEvent('mousedown', this, e);
    },

    /**
     * Attempts to set the field as the active input focus.
     * @return {Ext.field.Text} This field
     */
    focus: function() {
        this.getComponent().focus();
        return this;
    },

    /**
     * Attempts to forcefully blur input focus for the field.
     * @return {Ext.field.Text} This field
     */
    blur: function() {
        this.getComponent().blur();
        return this;
    },

    /**
     * Attempts to forcefully select all the contents of the input field.
     * @return {Ext.field.Text} this
     */
    select: function() {
        this.getComponent().select();
        return this;
    },

    reset: function() {
        this.getComponent().reset();

        //we need to call this to sync the input with this field
        this.getValue();

        this[this._value ? 'showClearIcon' : 'hideClearIcon']();
    },

    isDirty: function() {
        var component = this.getComponent();
        if (component) {
            return component.isDirty();
        }
        return false;
    }
});


/**
 * @aside guide forms
 *
 * Creates an HTML textarea field on the page. This is useful whenever you need the user to enter large amounts of text
 * (i.e. more than a few words). Typically, text entry on mobile devices is not a pleasant experience for the user so
 * it's good to limit your use of text areas to only those occasions when freeform text is required or alternative
 * input methods like select boxes or radio buttons are not possible. Text Areas are usually created inside forms, like
 * this:
 *
 *     @example
 *     Ext.create('Ext.form.Panel', {
 *         fullscreen: true,
 *         items: [
 *             {
 *                 xtype: 'fieldset',
 *                 title: 'About you',
 *                 items: [
 *                     {
 *                         xtype: 'textfield',
 *                         label: 'Name',
 *                         name: 'name'
 *                     },
 *                     {
 *                         xtype: 'textareafield',
 *                         label: 'Bio',
 *                         maxRows: 4,
 *                         name: 'bio'
 *                     }
 *                 ]
 *             }
 *         ]
 *     });
 *
 * In the example above we're creating a form with a {@link Ext.field.Text text field} for the user's name and a text
 * area for their bio. We used the {@link #maxRows} configuration on the text area to tell it to grow to a maximum of 4
 * rows of text before it starts using a scroll bar inside the text area to scroll the text.
 *
 * We can also create a text area outside the context of a form, like this:
 *
 * This creates two text fields inside a form. Text Fields can also be created outside of a Form, like this:
 *
 *     Ext.create('Ext.field.TextArea', {
 *         label: 'About You',
 *         {@link #placeHolder}: 'Tell us about yourself...'
 *     });
 */
Ext.define('Ext.field.TextArea', {
    extend: 'Ext.field.Text',
    xtype: 'textareafield',
    requires: ['Ext.field.TextAreaInput'],
    alternateClassName: 'Ext.form.TextArea',

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        ui: 'textarea',

        /**
         * @cfg
         * @inheritdoc
         */
        autoCapitalize: false,

        /**
         * @cfg
         * @inheritdoc
         */
        component: {
            xtype: 'textareainput'
        },

        /**
         * @cfg {Number} maxRows The maximum number of lines made visible by the input.
         * @accessor
         */
        maxRows: null
    },

    // @private
    updateMaxRows: function(newRows) {
        this.getComponent().setMaxRows(newRows);
    },

    doSetHeight: function(newHeight) {
        this.callParent(arguments);
        var component = this.getComponent();
        component.input.setHeight(newHeight);
    },

    doSetWidth: function(newWidth) {
        this.callParent(arguments);
        var component = this.getComponent();
        component.input.setWidth(newWidth);
    },

    /**
     * Called when a key has been pressed in the `<input>`
     * @private
     */
    doKeyUp: function(me) {
        // getValue to ensure that we are in sync with the dom
        var value = me.getValue();

        // show the {@link #clearIcon} if it is being used
        me[value ? 'showClearIcon' : 'hideClearIcon']();
    }
});

/**
 * Utility class for generating different styles of message boxes. The framework provides a global singleton
 * {@link Ext.Msg} for common usage which you should use in most cases.
 *
 * If you want to use {@link Ext.MessageBox} directly, just think of it as a modal {@link Ext.Container}.
 *
 * Note that the MessageBox is asynchronous. Unlike a regular JavaScript `alert` (which will halt browser execution),
 * showing a MessageBox will not cause the code to stop. For this reason, if you have code that should only run _after_
 * some user feedback from the MessageBox, you must use a callback function (see the `fn` configuration option parameter
 * for the {@link #method-show show} method for more details).
 *
 *     @example preview
 *     Ext.Msg.alert('Title', 'The quick brown fox jumped over the lazy dog.', Ext.emptyFn);
 *
 * Checkout {@link Ext.Msg} for more examples.
 *
 */
Ext.define('Ext.MessageBox', {
    extend  : 'Ext.Sheet',
    requires: [
        'Ext.Toolbar',
        'Ext.field.Text',
        'Ext.field.TextArea'
    ],

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        ui: 'dark',

        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'msgbox',

        /**
         * @cfg {String} iconCls
         * CSS class for the icon. The icon should be 40px x 40px.
         * @accessor
         */
        iconCls: null,

        /**
         * @cfg
         * @inheritdoc
         */
        showAnimation: {
            type: 'popIn',
            duration: 250,
            easing: 'ease-out'
        },

        /**
         * @cfg
         * @inheritdoc
         */
        hideAnimation: {
            type: 'popOut',
            duration: 250,
            easing: 'ease-out'
        },

        /**
         * Override the default zIndex so it is normally always above floating components.
         */
        zIndex: 999,

        /**
         * @cfg {Number} defaultTextHeight
         * The default height in pixels of the message box's multiline textarea if displayed.
         * @accessor
         */
        defaultTextHeight: 75,

        /**
         * @cfg {String} title
         * The title of this {@link Ext.MessageBox}.
         * @accessor
         */
        title: null,

        /**
         * @cfg {Array/Object} buttons
         * An array of buttons, or an object of a button to be displayed in the toolbar of this {@link Ext.MessageBox}.
         */
        buttons: null,

        /**
         * @cfg {String} message
         * The message to be displayed in the {@link Ext.MessageBox}.
         * @accessor
         */
        message: null,

        /**
         * @cfg {String} msg
         * The message to be displayed in the {@link Ext.MessageBox}.
         * @removed 2.0.0 Please use {@link #message} instead.
         */

        /**
         * @cfg {Object} prompt
         * The configuration to be passed if you want an {@link Ext.field.Text} or {@link Ext.field.TextArea} field
         * in your {@link Ext.MessageBox}.
         *
         * Pass an object with the property "multiline" with a value of true, if you want the prompt to use a TextArea.
         *
         * Alternatively, you can just pass in an object which has an xtype/xclass of another component.
         *
         *     prompt: {
         *         xtype: 'textarea',
         *         value: 'test'
         *     }
         *
         * @accessor
         */
        prompt: null,

        /**
         * @cfg
         * @inheritdoc
         */
        layout: {
            type: 'vbox',
            pack: 'center'
        }
    },

    statics: {
        OK    : {text: 'OK',     itemId: 'ok',  ui: 'action'},
        YES   : {text: 'Yes',    itemId: 'yes', ui: 'action'},
        NO    : {text: 'No',     itemId: 'no'},
        CANCEL: {text: 'Cancel', itemId: 'cancel'},

        INFO    : Ext.baseCSSPrefix + 'msgbox-info',
        WARNING : Ext.baseCSSPrefix + 'msgbox-warning',
        QUESTION: Ext.baseCSSPrefix + 'msgbox-question',
        ERROR   : Ext.baseCSSPrefix + 'msgbox-error',

        OKCANCEL: [
            {text: 'Cancel', itemId: 'cancel'},
            {text: 'OK',     itemId: 'ok',  ui : 'action'}
        ],
        YESNOCANCEL: [
            {text: 'Cancel', itemId: 'cancel'},
            {text: 'No',     itemId: 'no'},
            {text: 'Yes',    itemId: 'yes', ui: 'action'}
        ],
        YESNO: [
            {text: 'No',  itemId: 'no'},
            {text: 'Yes', itemId: 'yes', ui: 'action'}
        ]
    },

    constructor: function(config) {
        config = config || {};

        if (config.hasOwnProperty('promptConfig')) {

            Ext.applyIf(config, {
                prompt: config.promptConfig
            });

            delete config.promptConfig;
        }

        if (config.hasOwnProperty('multiline') || config.hasOwnProperty('multiLine')) {
            config.prompt = config.prompt || {};
            Ext.applyIf(config.prompt, {
                multiLine: config.multiline || config.multiLine
            });

            delete config.multiline;
            delete config.multiLine;
        }

        this.defaultAllowedConfig = {};
        var allowedConfigs = ['ui', 'showAnimation', 'hideAnimation', 'title', 'message', 'prompt', 'iconCls', 'buttons', 'defaultTextHeight'],
            ln = allowedConfigs.length,
            i, allowedConfig;

        for (i = 0; i < ln; i++) {
            allowedConfig = allowedConfigs[i];
            this.defaultAllowedConfig[allowedConfig] = this.defaultConfig[allowedConfig];
        }

        this.callParent([config]);
    },

    /**
     * Creates a new {@link Ext.Toolbar} instance using {@link Ext#factory}
     * @private
     */
    applyTitle: function(config) {
        if (typeof config == "string") {
            config = {
                title: config
            };
        }

        Ext.applyIf(config, {
            docked: 'top',
            cls   : this.getBaseCls() + '-title'
        });

        return Ext.factory(config, Ext.Toolbar, this.getTitle());
    },

    /**
     * Adds the new {@link Ext.Toolbar} instance into this container
     * @private
     */
    updateTitle: function(newTitle) {
        if (newTitle) {
            this.add(newTitle);
        }
    },

    /**
     * Adds the new {@link Ext.Toolbar} instance into this container
     * @private
     */
    updateButtons: function(newButtons) {
        var me = this;

        if (newButtons) {
            if (me.buttonsToolbar) {
                me.buttonsToolbar.removeAll();
                me.buttonsToolbar.setItems(newButtons);
            } else {
                me.buttonsToolbar = Ext.create('Ext.Toolbar', {
                    docked     : 'bottom',
                    defaultType: 'button',
                    layout     : {
                        type: 'hbox',
                        pack: 'center'
                    },
                    ui         : me.getUi(),
                    cls        : me.getBaseCls() + '-buttons',
                    items      : newButtons
                });

                me.add(me.buttonsToolbar);
            }
        }
    },

    /**
     * @private
     */
    applyMessage: function(config) {
        config = {
            html : config,
            cls  : this.getBaseCls() + '-text'
        };

        return Ext.factory(config, Ext.Component, this._message);
    },

    /**
     * @private
     */
    updateMessage: function(newMessage) {
        if (newMessage) {
            this.add(newMessage);
        }
    },

    getMessage: function() {
        if (this._message) {
            return this._message.getHtml();
        }

        return null;
    },

    /**
     * @private
     */
    applyIconCls: function(config) {
        config = {
            xtype : 'component',
            docked: 'left',
            width : 40,
            height: 40,
            baseCls: Ext.baseCSSPrefix + 'icon',
            hidden: (config) ? false : true,
            cls: config
        };

        return Ext.factory(config, Ext.Component, this._iconCls);
    },

    /**
     * @private
     */
    updateIconCls: function(newIconCls, oldIconCls) {
        var me = this;

        //ensure the title and button elements are added first
        this.getTitle();
        this.getButtons();

        if (newIconCls) {
            this.add(newIconCls);
        } else {
            this.remove(oldIconCls);
        }
    },

    getIconCls: function() {
        var icon = this._iconCls,
            iconCls;

        if (icon) {
            iconCls = icon.getCls();
            return (iconCls) ? iconCls[0] : null;
        }

        return null;
    },

    /**
     * @private
     */
    applyPrompt: function(prompt) {
        if (prompt) {
            var config = {
                label: false
            };

            if (Ext.isObject(prompt)) {
                Ext.apply(config, prompt);
            }

            if (config.multiLine) {
                config.height = Ext.isNumber(config.multiLine) ? parseFloat(config.multiLine) : this.getDefaultTextHeight();
                return Ext.factory(config, Ext.field.TextArea, this.getPrompt());
            } else {
                return Ext.factory(config, Ext.field.Text, this.getPrompt());
            }
        }

        return prompt;
    },

    /**
     * @private
     */
    updatePrompt: function(newPrompt, oldPrompt) {
        if (newPrompt) {
            this.add(newPrompt);
        }

        if (oldPrompt) {
            this.remove(oldPrompt);
        }
    },

    // @private
    // pass `fn` config to show method instead
    onClick: function(button) {
        if (button) {
            var config = button.config.userConfig || {},
                initialConfig = button.getInitialConfig(),
                prompt = this.getPrompt();

            if (typeof config.fn == 'function') {
                this.on({
                    hiddenchange: function() {
                        config.fn.call(
                            config.scope || null,
                            initialConfig.itemId || initialConfig.text,
                            prompt ? prompt.getValue() : null,
                            config
                        );
                    },
                    single: true,
                    scope: this
                });
            }

            if (config.input) {
                config.input.dom.blur();
            }
        }

        this.hide();
    },

    /**
     * Displays the {@link Ext.MessageBox} with a specified configuration. All
     * display functions (e.g. {@link #method-prompt}, {@link #alert}, {@link #confirm})
     * on MessageBox call this function internally, although those calls
     * are basic shortcuts and do not support all of the config options allowed here.
     *
     * Example usage:
     *
     *     Ext.Msg.show({
     *        title: 'Address',
     *        message: 'Please enter your address:',
     *        width: 300,
     *        buttons: Ext.MessageBox.OKCANCEL,
     *        multiLine: true,
     *        prompt : { maxlength : 180, autocapitalize : true },
     *        fn: function(buttonId) {
     *            console.log('You pressed the "' + buttonId + '" button.');
     *        }
     *     });
     *
     * @param {Object} config An object with the following config options:
     *
     * @param {Object/Array} config.buttons
     * A button config object or Array of the same(e.g., `Ext.MessageBox.OKCANCEL` or `{text:'Foo', itemId:'cancel'}`),
     * or false to not show any buttons.
     *
     * Defaults to: `false`
     *
     * @param {String} config.cls
     * A custom CSS class to apply to the message box's container element.
     *
     * @param {Function} config.fn
     * A callback function which is called when the dialog is dismissed by clicking on the configured buttons.
     *
     * @param {String} config.fn.buttonId The itemId of the button pressed, one of: 'ok', 'yes', 'no', 'cancel'.
     * @param {String} config.fn.value Value of the input field if either `prompt` or `multiline` option is true.
     * @param {Object} config.fn.opt The config object passed to show.
     *
     * @param {Number} config.width
     * A fixed width for the MessageBox.
     *
     * Defaults to: `auto`
     *
     * @param {Number} config.height
     * A fixed height for the MessageBox.
     *
     * Defaults to: `auto`
     *
     * @param {Object} config.scope
     * The scope of the callback function
     *
     * @param {String} config.icon
     * A CSS class that provides a background image to be used as the body icon for the dialog
     * (e.g. Ext.MessageBox.WARNING or 'custom-class').
     *
     * @param {Boolean} config.modal
     * False to allow user interaction with the page while the message box is displayed.
     *
     * Defaults to: `true`
     *
     * @param {String} config.message
     * A string that will replace the existing message box body text.
     * Defaults to the XHTML-compliant non-breaking space character `&#160;`.
     *
     * @param {Number} config.defaultTextHeight
     * The default height in pixels of the message box's multiline textarea if displayed.
     *
     * Defaults to: `75`
     *
     * @param {Boolean} config.prompt
     * True to prompt the user to enter single-line text. Please view the {@link Ext.MessageBox#method-prompt} documentation in {@link Ext.MessageBox}.
     * for more information.
     *
     * Defaults to: `false`
     *
     * @param {Boolean} config.multiline
     * True to prompt the user to enter multi-line text.
     *
     * Defaults to: `false`
     *
     * @param {String} config.title
     * The title text.
     *
     * @param {String} config.value
     * The string value to set into the active textbox element if displayed.
     *
     * @return {Ext.MessageBox} this
     */
    show: function(initialConfig) {
        //if it has not been added to a container, add it to the Viewport.
        if (!this.getParent() && Ext.Viewport) {
            Ext.Viewport.add(this);
        }

        if (!initialConfig) {
            return this.callParent();
        }

        var config = Ext.Object.merge({}, {
            value: ''
        }, initialConfig);

        var buttons        = initialConfig.buttons || Ext.MessageBox.OK || [],
            buttonBarItems = [],
            userConfig     = initialConfig;

        Ext.each(buttons, function(buttonConfig) {
            if (!buttonConfig) {
                return;
            }

            buttonBarItems.push(Ext.apply({
                userConfig: userConfig,
                scope     : this,
                handler   : 'onClick'
            }, buttonConfig));
        }, this);

        config.buttons = buttonBarItems;

        if (config.promptConfig) {
        }
        config.prompt = (config.promptConfig || config.prompt) || null;

        if (config.multiLine) {
            config.prompt = config.prompt || {};
            config.prompt.multiLine = config.multiLine;
            delete config.multiLine;
        }

        config = Ext.merge({}, this.defaultAllowedConfig, config);

        this.setConfig(config);

        var prompt = this.getPrompt();
        if (prompt) {
            prompt.setValue(initialConfig.value || '');
        }

        this.callParent();

        return this;
    },

    /**
     * Displays a standard read-only message box with an OK button (comparable to the basic JavaScript alert prompt). If
     * a callback function is passed it will be called after the user clicks the button, and the itemId of the button
     * that was clicked will be passed as the only parameter to the callback.
     *
     * @param {String} title The title bar text
     *
     * @param {String} message The message box body text
     *
     * @param {Function} fn
     * A callback function which is called when the dialog is dismissed by clicking on the configured buttons.
     *
     * @param {String} fn.buttonId The itemId of the button pressed, one of: 'ok', 'yes', 'no', 'cancel'.
     * @param {String} fn.value Value of the input field if either `prompt` or `multiline` option is true.
     * @param {Object} fn.opt The config object passed to show.
     *
     * @param {Object} scope The scope (`this` reference) in which the callback is executed.
     * Defaults to: the browser window
     *
     * @return {Ext.MessageBox} this
     */
    alert: function(title, message, fn, scope) {
        return this.show({
            title       : title || '',
            message     : message || '',
            buttons     : Ext.MessageBox.OK,
            promptConfig: false,
            fn          : function() {
                if (fn) {
                    fn.apply(scope, arguments);
                }
            },
            scope: scope
        });
    },

    /**
     * Displays a confirmation message box with Yes and No buttons (comparable to JavaScript's confirm). If a callback
     * function is passed it will be called after the user clicks either button, and the id of the button that was
     * clicked will be passed as the only parameter to the callback (could also be the top-right close button).
     *
     * @param {String} title The title bar text
     *
     * @param {String} message The message box body text
     *
     * @param {Function} fn
     * A callback function which is called when the dialog is dismissed by clicking on the configured buttons.
     *
     * @param {String} fn.buttonId The itemId of the button pressed, one of: 'ok', 'yes', 'no', 'cancel'.
     * @param {String} fn.value Value of the input field if either `prompt` or `multiline` option is true.
     * @param {Object} fn.opt The config object passed to show.
     *
     * @param {Object} scope The scope (`this` reference) in which the callback is executed.
     *
     * Defaults to: the browser window
     *
     * @return {Ext.MessageBox} this
     */
    confirm: function(title, message, fn, scope) {
        return this.show({
            title       : title || '',
            message     : message || '',
            buttons     : Ext.MessageBox.YESNO,
            promptConfig: false,
            scope       : scope,
            fn: function() {
                if (fn) {
                    fn.apply(scope, arguments);
                }
            }
        });
    },

    /**
     * Displays a message box with OK and Cancel buttons prompting the user to enter some text (comparable to
     * JavaScript's prompt). The prompt can be a single-line or multi-line textbox. If a callback function is passed it
     * will be called after the user clicks either button, and the id of the button that was clicked (could also be the
     * top-right close button) and the text that was entered will be passed as the two parameters to the callback.
     *
     * Example usage:
     *
     *     Ext.Msg.prompt(
     *         'Welcome!',
     *         'What\'s your name going to be today?',
     *         function (buttonId, value) {
     *             console.log(value)
     *         },
     *         null,
     *         false,
     *         null,
     *         { autoCapitalize : true, placeHolder : 'First-name please...' }
     *     );
     *
     * @param {String} title The title bar text
     *
     * @param {String} message The message box body text
     *
     * @param {Function} fn
     * A callback function which is called when the dialog is dismissed by clicking on the configured buttons.
     *
     * @param {String} fn.buttonId The itemId of the button pressed, one of: 'ok', 'yes', 'no', 'cancel'.
     * @param {String} fn.value Value of the input field if either `prompt` or `multiline` option is true.
     * @param {Object} fn.opt The config object passed to show.
     *
     * @param {Object} scope The scope (`this` reference) in which the callback is executed.
     *
     * Defaults to: the browser window.
     *
     * @param {Boolean/Number} multiLine True to create a multiline textbox using the defaultTextHeight property,
     * or the height in pixels to create the textbox.
     *
     * Defaults to: `false`
     *
     * @param {String} value Default value of the text input element.
     *
     * @param {Object} prompt
     * The configuration for the prompt. See the {@link Ext.MessageBox#cfg-prompt prompt} documentation in {@link Ext.MessageBox}
     * for more information.
     *
     * Defaults to: `true`
     *
     * @return {Ext.MessageBox} this
     */
    prompt: function(title, message, fn, scope, multiLine, value, prompt) {
        return this.show({
            title    : title || '',
            message  : message || '',
            buttons  : Ext.MessageBox.OKCANCEL,
            scope    : scope,
            prompt   : prompt || true,
            multiLine: multiLine,
            value    : value,
            fn: function() {
                if (fn) {
                    fn.apply(scope, arguments);
                }
            }
        });
    }
}, function(MessageBox) {

    Ext.onSetup(function() {
        /**
         * @class Ext.Msg
         * @extends Ext.MessageBox
         * @singleton
         *
         * A global shared singleton instance of the {@link Ext.MessageBox} class.
         *
         * Allows for simple creation of various different alerts and notifications.
         *
         * To change any cofigurations on this singleton instance, you must change the
         * defaultAllowedConfig object.  For example to remove all animations on Msg:
         *
         * Ext.Msg.defaultAllowedConfig.showAnimation = false;
         * Ext.Msg.defaultAllowedConfig.hideAnimation = false;
         *
         * ## Examples
         *
         * ### Alert
         * Use the {@link #alert} method to show a basic alert:
         *
         *     @example preview
         *     Ext.Msg.alert('Title', 'The quick brown fox jumped over the lazy dog.', Ext.emptyFn);
         *
         * ### Prompt
         * Use the {@link #method-prompt} method to show an alert which has a textfield:
         *
         *     @example preview
         *     Ext.Msg.prompt('Name', 'Please enter your name:', function(text) {
         *         // process text value and close...
         *     });
         *
         * ### Confirm
         * Use the {@link #confirm} method to show a confirmation alert (shows yes and no buttons).
         *
         *     @example preview
         *     Ext.Msg.confirm("Confirmation", "Are you sure you want to do that?", Ext.emptyFn);
         */
        Ext.Msg = new MessageBox;
    });
});


/**
 * {@link Ext.TitleBar}'s are most commonly used as a docked item within an {@link Ext.Container}.
 *
 * The main difference between a {@link Ext.TitleBar} and an {@link Ext.Toolbar} is that
 * the {@link #title} configuration is **always** centered horiztonally in a {@link Ext.TitleBar} between
 * any items aligned left or right.
 *
 * You can also give items of a {@link Ext.TitleBar} an `align` configuration of `left` or `right`
 * which will dock them to the `left` or `right` of the bar.
 *
 * ## Examples
 *
 *     @example preview
 *     Ext.Viewport.add({
 *         xtype: 'titlebar',
 *         docked: 'top',
 *         title: 'Navigation',
 *         items: [
 *             {
 *                 iconCls: 'add',
 *                 iconMask: true,
 *                 align: 'left'
 *             },
 *             {
 *                 iconCls: 'home',
 *                 iconMask: true,
 *                 align: 'right'
 *             }
 *         ]
 *     });
 *
 *     Ext.Viewport.setStyleHtmlContent(true);
 *     Ext.Viewport.setHtml('This shows the title being centered and buttons using align <i>left</i> and <i>right</i>.');
 *
 * <br />
 *
 *     @example preview
 *     Ext.Viewport.add({
 *         xtype: 'titlebar',
 *         docked: 'top',
 *         title: 'Navigation',
 *         items: [
 *             {
 *                 align: 'left',
 *                 text: 'This button has a super long title'
 *             },
 *             {
 *                 iconCls: 'home',
 *                 iconMask: true,
 *                 align: 'right'
 *             }
 *         ]
 *     });
 *
 *     Ext.Viewport.setStyleHtmlContent(true);
 *     Ext.Viewport.setHtml('This shows how the title is automatically moved to the right when one of the aligned buttons is very wide.');
 *
 * <br />
 *
 *     @example preview
 *     Ext.Viewport.add({
 *         xtype: 'titlebar',
 *         docked: 'top',
 *         title: 'A very long title',
 *         items: [
 *             {
 *                 align: 'left',
 *                 text: 'This button has a super long title'
 *             },
 *             {
 *                 align: 'right',
 *                 text: 'Another button'
 *             }
 *         ]
 *     });
 *
 *     Ext.Viewport.setStyleHtmlContent(true);
 *     Ext.Viewport.setHtml('This shows how the title and buttons will automatically adjust their size when the width of the items are too wide..');
 *
 * The {@link #defaultType} of Toolbar's is {@link Ext.Button button}.
 */
Ext.define('Ext.TitleBar', {
    extend: 'Ext.Container',
    xtype: 'titlebar',

    requires: [
        'Ext.Button',
        'Ext.Title',
        'Ext.Spacer',
        'Ext.util.SizeMonitor'
    ],

    // private
    isToolbar: true,

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'toolbar',

        /**
         * @cfg
         * @inheritdoc
         */
        cls: Ext.baseCSSPrefix + 'navigation-bar',

        /**
         * @cfg {String} ui
         * Style options for Toolbar. Either 'light' or 'dark'.
         * @accessor
         */
        ui: 'dark',

        /**
         * @cfg {String} title
         * The title of the toolbar.
         * @accessor
         */
        title: null,

        /**
         * @cfg {String} defaultType
         * The default xtype to create.
         * @accessor
         */
        defaultType: 'button',

        /**
         * @cfg
         * @hide
         */
        layout: {
            type: 'hbox'
        },

        /**
         * @cfg {Array/Object} items The child items to add to this TitleBar. The {@link #defaultType} of
         * a TitleBar is {@link Ext.Button}, so you do not need to specify an `xtype` if you are adding
         * buttons.
         *
         * You can also give items a `align` configuration which will align the item to the `left` or `right` of
         * the TitleBar.
         * @accessor
         */
        items: []
    },

    /**
     * The max button width in this toolbar
     * @private
     */
    maxButtonWidth: '40%',

    constructor: function() {
        this.refreshTitlePosition = Ext.Function.createThrottled(this.refreshTitlePosition, 50, this);

        this.callParent(arguments);
    },

    beforeInitialize: function() {
        this.applyItems = this.applyInitialItems;
    },

    initialize: function() {
        delete this.applyItems;

        this.add(this.initialItems);
        delete this.initialItems;

        this.on({
            painted: 'refreshTitlePosition',
            single: true
        });
    },

    applyInitialItems: function(items) {
        var me = this,
            defaults = me.getDefaults() || {};

        me.initialItems = items;

        me.leftBox = me.add({
            xtype: 'container',
            style: 'position: relative',
            layout: {
                type: 'hbox',
                align: 'center'
            },
            listeners: {
                resize: 'refreshTitlePosition',
                scope: me
            }
        });

        me.spacer = me.add({
            xtype: 'component',
            style: 'position: relative',
            flex: 1,
            listeners: {
                resize: 'refreshTitlePosition',
                scope: me
            }
        });

        me.rightBox = me.add({
            xtype: 'container',
            style: 'position: relative',
            layout: {
                type: 'hbox',
                align: 'center'
            },
            listeners: {
                resize: 'refreshTitlePosition',
                scope: me
            }
        });

        me.titleComponent = me.add({
            xtype: 'title',
            hidden: defaults.hidden,
            centered: true
        });

        me.doAdd = me.doBoxAdd;
        me.remove = me.doBoxRemove;
        me.doInsert = me.doBoxInsert;
    },

    doBoxAdd: function(item) {
        if (item.config.align == 'right') {
            this.rightBox.add(item);
        }
        else {
            this.leftBox.add(item);
        }
    },

    doBoxRemove: function(item) {
        if (item.config.align == 'right') {
            this.rightBox.remove(item);
        }
        else {
            this.leftBox.remove(item);
        }
    },

    doBoxInsert: function(index, item) {
        if (item.config.align == 'right') {
            this.rightBox.add(item);
        }
        else {
            this.leftBox.add(item);
        }
    },

    getMaxButtonWidth: function() {
        var value = this.maxButtonWidth;

        //check if it is a percentage
        if (Ext.isString(this.maxButtonWidth)) {
            value = parseInt(value.replace('%', ''), 10);
            value = Math.round((this.element.getWidth() / 100) * value);
        }

        return value;
    },

    refreshTitlePosition: function() {
        var titleElement = this.titleComponent.renderElement;

        titleElement.setWidth(null);
        titleElement.setLeft(null);

        //set the min/max width of the left button
        var leftBox = this.leftBox,
            leftButton = leftBox.down('button'),
            singleButton = leftBox.getItems().getCount() == 1,
            leftBoxWidth, maxButtonWidth;

        if (leftButton && singleButton) {
            if (leftButton.getWidth() == null) {
                leftButton.renderElement.setWidth('auto');
            }

            leftBoxWidth = leftBox.renderElement.getWidth();
            maxButtonWidth = this.getMaxButtonWidth();

            if (leftBoxWidth > maxButtonWidth) {
                leftButton.renderElement.setWidth(maxButtonWidth);
            }
        }

        var spacerBox = this.spacer.renderElement.getPageBox(),
            titleBox = titleElement.getPageBox(),
            widthDiff = titleBox.width - spacerBox.width,
            titleLeft = titleBox.left,
            titleRight = titleBox.right,
            halfWidthDiff, leftDiff, rightDiff;

        if (widthDiff > 0) {
            titleElement.setWidth(spacerBox.width);
            halfWidthDiff = widthDiff / 2;
            titleLeft += halfWidthDiff;
            titleRight -= halfWidthDiff;
        }

        leftDiff = spacerBox.left - titleLeft;
        rightDiff = titleRight - spacerBox.right;

        if (leftDiff > 0) {
            titleElement.setLeft(leftDiff);
        }
        else if (rightDiff > 0) {
            titleElement.setLeft(-rightDiff);
        }

        titleElement.repaint();
    },

    // @private
    updateTitle: function(newTitle) {
        this.titleComponent.setTitle(newTitle);

        if (this.isPainted()) {
            this.refreshTitlePosition();
        }
    }
});

/**
 * @filename Fileup.js
 * 
 * @name File uploading
 * @fileOverview File uploading component based on Ext.Button
 *
 * @author Constantine V. Smirnov kostysh(at)gmail.com
 * @date 20120801
 * @version 1.0
 * @license GNU GPL v3.0
 *
 * @requires Sencha Touch 2.0
 * 
 */

/**
 * @event beforesubmit
 * Fired before when file uploading is started
 * @param {Object} 
 */

/**
 * @event submit
 * Fired when file uploading is started
 * @param {Object} 
 */

Ext.define('Ext.ux.Fileup', {
    extend: 'Ext.Button',
    xtype: 'fileupload',
    
    template: [
        
        // Default button elements (do not change!)
        {
            tag: 'span',
            reference: 'badgeElement',
            hidden: true
        },
        {
            tag: 'span',
            className: Ext.baseCSSPrefix + 'button-icon',
            reference: 'iconElement',
            hidden: true
        },
        {
            tag: 'span',
            reference: 'textElement',
            hidden: true
        },
        
        // Custom inline elements
        {
            tag: 'iframe',
            reference: 'iframeElement',
            height: 0,
            width: 0,
            frameborder: 0,
            name: 'fileUploadIframe',
            loading: 0
        },
        {
            tag: 'form',
            reference: 'formElement',
            target: 'fileUploadIframe',
            method: 'post',
            enctype: 'multipart/form-data',
            action: null,
            hidden: false,            
            
            children: [
                {
                    tag: 'input',
                    reference: 'base64CommandElement',
                    type: 'hidden',
                    name: 'base64',
                    value: false,
                    tabindex: -1
                },
                {
                    tag: 'input',
                    reference: 'urlCommandElement',
                    type: 'hidden',
                    name: 'url',
                    value: false,
                    tabindex: -1
                },
                {
                    tag: 'input',
                    reference: 'fileElement',
                    type: 'file',
                    name: 'userfile',
                    tabindex: -1,
                    hidden: false,
                    style: 'opacity:0;position:absolute;height:100%;width:100%;left:0px;top:0px;'
                }
            ]
        }
    ],       

    config: {
        
        /**
         * @cfg {string} name Input element name, check on server part for $_FILES['userfile']
         */        
        name: 'userfile',
        
        /**
         * @cfg {string/boolean} loadingText Loading maks text message (null for disable)
         */
        loadingText: 'Uploading, please wait...',
        
        /**
         * @cfg {boolean/object} callbacks Callbacks configuration for succes and failure
         * 
         * ...
         * callbacks: {
         *     success: function(response) {
         *         console.log('Success', response);
         *     },
         *     failure: function(error, response) {
         *         console.log('Failure', error);
         *     }
         * }
         * 
         */
        callbacks: null,
        
        /**
         * @cfg {boolean} autoUpload Automatic upload file on onchange event
         */
        autoUpload: true,
        
        /**
         * @cfg {string} actionUrl Server side script URL
         */
        actionUrl: null,
        
        /**
         * @cfg {object/boolean} subscribe External event configuration
         * 
         * from component config
         * ...
         * subscribe: {
         *     scope: externalObject,
         *     event: 'ontap'
         * }
         * 
         * and from controller:
         * ...
         * fileFormObj.setSubscribe({
         *     scope: this.getExternalObject(),
         *     event: 'ontap'
         * });
         */
        subscribe: false, // Subscribe to external events
        
        /**
         * @cfg {boolean} returnBase64Data Command for server to return encoded image with base64 algorifm
         */
        returnBase64Data: false,
        
        /**
         * @cfg {boolean} returnUrl Command for server to return direct path to loaded file on web
         */
        returnUrl: false
    },

    /**
     * @private
     */ 
    initialize: function() {
        var me = this;
                
        me.fileElement.dom.onchange = Ext.Function.bind(me.onChanged, 
                                                        me, 
                                                       [me.fileElement]);
        
        me.formElement.dom.onreset = Ext.Function.bind(me.onReset, 
                                                       me, 
                                                      [me.formElement]);
        
        me.iframeElement.dom.onload = Ext.Function.bind(me.onIframeLoad, 
                                                        me, 
                                                       [me.iframeElement]);
        me.on({
            scope: me,
            submit: me.onSubmit
        });
        
        me.callParent();
    },
    
    /**
     * Validate callbacks
     * @private
     */
    applyCallbacks: function(config) {
        if (Ext.isObject(config) && 
            Ext.isFunction(config.success) &&
            Ext.isFunction(config.failure)) {
            
            return config;
        } else {
            
            return {
                success: Ext.emptyFn,
                failure: Ext.emptyFn
            };
        }
    },
    
    /**
     * Setup success and failure event handlers
     * @private
     */
    updateCallbacks: function(newConfig, oldConfig) {
        var me = this;
        
        if (oldConfig) {
            me.un({
                success: oldConfig.success,
                failure: oldConfig.failure
            });
        }
        
        me.on({
            scope: me,
            success: newConfig.success,
            failure: newConfig.failure
        }); 
    },
    
    /**
     * @private
     */
    updateReturnBase64Data: function(command) {
        if (command) {
            this.base64CommandElement.dom.setAttribute('value', true);
        } else {
            this.base64CommandElement.dom.setAttribute('value', false);
        }
    },
    
    /**
     * @private
     */
    updateReturnUrl: function(command) {
        if (command) {
            this.urlCommandElement.dom.setAttribute('value', true);
        } else {
            this.urlCommandElement.dom.setAttribute('value', false);
        }
    },
    
    /**
     * @private
     */
    updateSubscribe: function(newConfig, oldConfig) {
        if (Ext.isObject(oldConfig)) {
            newConfig.scope.un(oldConfig.event,
                               this.doAutoUpload,
                               oldConfig.scope);
        }
        
        if (Ext.isObject(newConfig) &&
            Ext.isObject(newConfig.scope) &&
            Ext.isString(newConfig.event)) {
            
            newConfig.scope.on(newConfig.event,
                               this.doAutoUpload,
                               newConfig.scope);
        } 
    },
    
    /**
     * @private
     */
    updateActionUrl: function(newUrl) {
        if (newUrl) {
            this.formElement.dom.setAttribute('action', newUrl);
        }
    },
    
    /**
     * @private
     */
    updateName: function(newName) {
        this.fileElement.dom.setAttribute('name', newName);
    },
    
    /**
     * @private
     */
    onReset: function() {
        this.setBadgeText(null);
    },
    
    /**
     * @private
     */
    onChanged: function() {
        var value = this.fileElement.dom.value;
        var fileName = value.slice(value.lastIndexOf('\\')+1);
        this.setBadgeText(Ext.util.Format.ellipsis(fileName, 16));
        
        if (this.getAutoUpload()) {
            this.doAutoUpload();
        }
    },
    
    /**
     * @private
     */
    doAutoUpload: function() {
        var config = this.getCallbacks();
        
        if (Ext.isObject(config)) {
            this.submit(config);
        }        
    },
    
    /**
     * Submit selected files to server
     * @method
     */
    submit: function() {
        var me = this; 
        
        if (!me.formElement.dom.action) {
            Ext.Logger.warn('Form action not defined');
            return;            
        }
        
        // Do not alow submit while uploading in process
        if (me.iframeElement.dom.loading == 1) {
            return;
        }
            
        if (!me.fileElement.dom.value) {
                
            // Open file selecting dialog
            me.fileElement.dom.click();
            return;
        }
            
        return me.fireAction('beforesubmit', [me], 'doSubmit');
    },
    
    /**
     * @private
     */
    doSubmit: function() {
        this.fireEvent('submit');
    },
    
    /**
     * @private
     */
    onSubmit: function() {
        
        // Set up loading mode for iframe
        this.iframeElement.dom.setAttribute('loading', 1);
        
        if (this.getLoadingText()) {
            
            // Show uplading mask
            Ext.Viewport.setMasked({
                xtype: 'loadmask',
                message: this.getLoadingText()
            });
        }
            
        
        // Submit form
        this.formElement.dom.submit();
    },
    
    /**
     * @private
     */
    onIframeLoad: function(iframe) {
        var me = this;
        var loading = parseInt(iframe.dom.getAttribute('loading'));        
        
        if (loading !== 0) {
            iframe.dom.setAttribute('loading', 0);
            
            // Hide uploading mask
            Ext.Viewport.setMasked(false);
            
            // Get server response from iframe
            var response = iframe.dom.contentDocument.body.textContent;
            
            // Failure flag
            var fail = false;
            
            // Process loaded content            
            try {
                var responseDecoded = Ext.decode(response);
            } catch(e) {
                
                if (iframe.dom.contentDocument.title.search('404') >= 0) {
                    me.fireEvent('failure', {
                        title: 'Server response',
                        message: '404 Not Found',
                        time: new Date()
                    }, response); 
                } else {
                    me.fireEvent('failure', e, response);
                }                
                
                fail = true;
            }
            
            if (fail) {
                return;
            }            
            
            if (responseDecoded.success == true) {
                me.fireAction('success', [responseDecoded], 'doResetForm');                
            } else {
                me.fireEvent('failure', {
                    title: 'Server response',
                    message: response.error || 'Unknown error',
                    time: new Date()
                }, responseDecoded);
            }
            
        }
    },
    
    /**
     * @private
     */
    doResetForm: function() {
        
        // Reset form
        this.formElement.dom.reset();
    },
    
    /**
     * File form reset
     * @method
     */
    reset: this.doResetForm
});

/**
 * This is a simple way to add an image of any size to your application and have it participate in the layout system
 * like any other component. This component typically takes between 1 and 3 configurations - a {@link #src}, and
 * optionally a {@link #height} and a {@link #width}:
 *
 *     @example miniphone
 *     var img = Ext.create('Ext.Img', {
 *         src: 'http://www.sencha.com/assets/images/sencha-avatar-64x64.png',
 *         height: 64,
 *         width: 64
 *     });
 *     Ext.Viewport.add(img);
 *
 * It's also easy to add an image into a panel or other container using its xtype:
 *
 *     @example miniphone
 *     Ext.create('Ext.Panel', {
 *         fullscreen: true,
 *         layout: 'hbox',
 *         items: [
 *             {
 *                 xtype: 'image',
 *                 src: 'http://www.sencha.com/assets/images/sencha-avatar-64x64.png',
 *                 flex: 1
 *             },
 *             {
 *                 xtype: 'panel',
 *                 flex: 2,
 *                 html: 'Sencha Inc.<br/>1700 Seaport Boulevard Suite 120, Redwood City, CA'
 *             }
 *         ]
 *     });
 *
 * Here we created a panel which contains an image (a profile picture in this case) and a text area to allow the user
 * to enter profile information about themselves. In this case we used an {@link Ext.layout.HBox hbox layout} and
 * flexed the image to take up one third of the width and the text area to take two thirds of the width. See the
 * {@link Ext.layout.HBox hbox docs} for more information on flexing items.
 */
Ext.define('Ext.Img', {
    extend: 'Ext.Component',
    xtype: ['image', 'img'],

    /**
     * @event tap
     * Fires whenever the component is tapped
     * @param {Ext.Img} this The Image instance
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event load
     * Fires when the image is loaded
     * @param {Ext.Img} this The Image instance
     * @param {Ext.EventObject} e The event object
     */

    /**
     * @event error
     * Fires if an error occured when trying to load the image
     * @param {Ext.Img} this The Image instance
     * @param {Ext.EventObject} e The event object
     */

    config: {
        /**
         * @cfg {String} src The source of this image
         * @accessor
         */
        src: null,

        /**
         * @cfg
         * @inheritdoc
         */
        baseCls : Ext.baseCSSPrefix + 'img',

        /**
         * @cfg {String} imageCls The CSS class to be used when {@link #mode} is not set to 'background'
         * @accessor
         */
        imageCls : Ext.baseCSSPrefix + 'img-image',

        /**
         * @cfg {String} backgroundCls The CSS class to be used when {@link #mode} is set to 'background'
         * @accessor
         */
        backgroundCls : Ext.baseCSSPrefix + 'img-background',

        /**
         * @cfg {String} mode If set to 'background', uses a background-image CSS property instead of an
         * `<img>` tag to display the image.
         */
        mode: 'background'
    },

    beforeInitialize: function() {
        var me = this;
        me.onLoad = Ext.Function.bind(me.onLoad, me);
        me.onError = Ext.Function.bind(me.onError, me);
    },

    initialize: function() {
        var me = this;
        me.callParent();

        me.relayEvents(me.renderElement, '*');

        me.element.on({
            tap: 'onTap',
            scope: me
        });
    },

    hide: function() {
        this.callParent();
        this.hiddenSrc = this.hiddenSrc || this.getSrc();
        this.setSrc(null);
    },

    show: function() {
        this.callParent();
        if (this.hiddenSrc) {
            this.setSrc(this.hiddenSrc);
            delete this.hiddenSrc;
        }
    },

    updateMode: function(mode) {
        var me            = this,
            imageCls      = me.getImageCls(),
            backgroundCls = me.getBackgroundCls();

        if (mode === 'background') {
            if (me.imageElement) {
                me.imageElement.destroy();
                delete me.imageElement;
                me.updateSrc(me.getSrc());
            }

            me.replaceCls(imageCls, backgroundCls);
        } else {
            me.imageElement = me.element.createChild({ tag: 'img' });

            me.replaceCls(backgroundCls, imageCls);
        }
    },

    updateImageCls : function (newCls, oldCls) {
        this.replaceCls(oldCls, newCls);
    },

    updateBackgroundCls : function (newCls, oldCls) {
        this.replaceCls(oldCls, newCls);
    },

    onTap: function(e) {
        this.fireEvent('tap', this, e);
    },

    onAfterRender: function() {
        this.updateSrc(this.getSrc());
    },

    /**
     * @private
     */
    updateSrc: function(newSrc) {
        var me = this,
            dom;

        if (me.getMode() === 'background') {
            dom = this.imageObject || new Image();
        }
        else {
            dom = me.imageElement.dom;
        }

        this.imageObject = dom;

        dom.setAttribute('src', Ext.isString(newSrc) ? newSrc : '');
        dom.addEventListener('load', me.onLoad, false);
        dom.addEventListener('error', me.onError, false);
    },

    detachListeners: function() {
        var dom = this.imageObject;

        if (dom) {
            dom.removeEventListener('load', this.onLoad, false);
            dom.removeEventListener('error', this.onError, false);
        }
    },

    onLoad : function(e) {
        this.detachListeners();

        if (this.getMode() === 'background') {
            this.element.dom.style.backgroundImage = 'url("' + this.imageObject.src + '")';
        }

        this.fireEvent('load', this, e);
    },

    onError : function(e) {
        this.detachListeners();
        this.fireEvent('error', this, e);
    },

    doSetWidth: function(width) {
        var sizingElement = (this.getMode() === 'background') ? this.element : this.imageElement;

        sizingElement.setWidth(width);

        this.callParent(arguments);
    },

    doSetHeight: function(height) {
        var sizingElement = (this.getMode() === 'background') ? this.element : this.imageElement;

        sizingElement.setHeight(height);

        this.callParent(arguments);
    },

    destroy: function() {
        this.detachListeners();

        Ext.destroy(this.imageObject);
        delete this.imageObject;

        this.callParent();
    }
});

/**
 * Used in the {@link Ext.tab.Bar} component. This shouldn't be used directly, instead use
 * {@link Ext.tab.Bar} or {@link Ext.tab.Panel}.
 * @private
 */
Ext.define('Ext.tab.Tab', {
    extend: 'Ext.Button',
    xtype: 'tab',
    alternateClassName: 'Ext.Tab',

    // @private
    isTab: true,

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'tab',

        /**
         * @cfg {String} pressedCls
         * The CSS class to be applied to a Tab when it is pressed. Defaults to 'x-tab-pressed'.
         * Providing your own CSS for this class enables you to customize the pressed state.
         * @accessor
         */
        pressedCls: Ext.baseCSSPrefix + 'tab-pressed',

        /**
         * @cfg {String} activeCls
         * The CSS class to be applied to a Tab when it is active. Defaults to 'x-tab-active'.
         * Providing your own CSS for this class enables you to customize the active state.
         * @accessor
         */
        activeCls: Ext.baseCSSPrefix + 'tab-active',

        /**
         * @cfg {Boolean} active
         * Set this to true to have the tab be active by default.
         * @accessor
         */
        active: false,

        /**
         * @cfg {String} title
         * The title of the card that this tab is bound to.
         * @accessor
         */
        title: '&nbsp;'
    },

    // We need to override this so the iconElement is properly hidden using visibilty
    // when we render it.
    template: [
        {
            tag: 'span',
            reference: 'badgeElement',
            hidden: true
        },
        {
            tag: 'span',
            className: Ext.baseCSSPrefix + 'button-icon',
            reference: 'iconElement',
            style: 'visibility: hidden !important'
        },
        {
            tag: 'span',
            reference: 'textElement',
            hidden: true
        }
    ],

    updateIconCls : function(newCls, oldCls) {
        this.callParent([newCls, oldCls]);

        if (oldCls) {
            this.removeCls('x-tab-icon');
        }

        if (newCls) {
            this.addCls('x-tab-icon');
        }
    },

    /**
     * @event activate
     * Fires when a tab is activated
     * @param {Ext.tab.Tab} this
     */

    /**
     * @event deactivate
     * Fires when a tab is deactivated
     * @param {Ext.tab.Tab} this
     */

    updateTitle: function(title) {
        this.setText(title);
    },

    hideIconElement: function() {
        this.iconElement.dom.style.setProperty('visibility', 'hidden', '!important');
    },

    showIconElement: function() {
        this.iconElement.dom.style.setProperty('visibility', 'visible', '!important');
    },

    updateActive: function(active, oldActive) {
        var activeCls = this.getActiveCls();
        if (active && !oldActive) {
            this.element.addCls(activeCls);
            this.fireEvent('activate', this);
        } else if (oldActive) {
            this.element.removeCls(activeCls);
            this.fireEvent('deactivate', this);
        }
    }
}, function() {
    this.override({
        activate: function() {
            this.setActive(true);
        },

        deactivate: function() {
            this.setActive(false);
        }
    });
});

Ext.define('Fileup.controller.Main', {
    extend: 'Ext.app.Controller',
    
    requires: [
        'Ext.MessageBox',
        'Ext.Img'
    ],
    
    config: {
        refs: {
            'fileBtn': '#fileBtn',
            'welcome': '#welcome'
        },
        
        control: {
            fileBtn: {
                initialize: 'onFileBtnInit',
                submit: 'onFileBtnSubmit'
            }
        }
    },
    
    onFileBtnInit: function(fileBtn) {
        var me = this;
        
        console.log('Init');
        
        fileBtn.setCallbacks({
            scope: me,
            success: me.onFileUploadSuccess,
            failure: me.onFileUploadFailure
        });
    },
    
    onFileBtnSubmit: function() {
        console.log('Submit');
    },
    
    onFileUploadSuccess: function(response) {
        console.log('Success');
        
        var loaded = Ext.getCmp('loadedImage');
        
        if (loaded) {
            loaded.destroy();
        }
        
        var image = Ext.create('Ext.Img', {
            id: 'loadedImage',
            width: 250,
            height: 200,
            src: response.base64,
            style: 'background-size: contain; margin-top: 20px; border-radius: 15px;'
        });
        
        var wlc = Ext.getCmp('welcome');
        wlc.add(image);
        image.show('fadeIn');
        
        Ext.Msg.alert('File upload', 'Success!');
    },
    
    onFileUploadFailure: function() {
        console.log('Failure');
        Ext.Msg.alert('File upload', 'Failure!');
    }
});
/**
 * Ext.tab.Bar is used internally by {@link Ext.tab.Panel} to create the bar of tabs that appears at the top of the tab
 * panel. It's unusual to use it directly, instead see the {@link Ext.tab.Panel tab panel docs} for usage instructions.
 *
 * Used in the {@link Ext.tab.Panel} component to display {@link Ext.tab.Tab} components.
 *
 * @private
 */
Ext.define('Ext.tab.Bar', {
    extend: 'Ext.Toolbar',
    alternateClassName: 'Ext.TabBar',
    xtype : 'tabbar',

    requires: ['Ext.tab.Tab'],

    config: {
        /**
         * @cfg
         * @inheritdoc
         */
        baseCls: Ext.baseCSSPrefix + 'tabbar',

        // @private
        defaultType: 'tab',

        // @private
        layout: {
            type: 'hbox',
            align: 'middle'
        }
    },

    eventedConfig: {
        /**
         * @cfg {Number/String/Ext.Component} activeTab
         * The initially activated tab. Can be specified as numeric index,
         * component ID or as the component instance itself.
         * @accessor
         * @evented
         */
        activeTab: null
    },

    /**
     * @event tabchange
     * Fired when active tab changes.
     * @param {Ext.tab.Bar} this
     * @param {Ext.tab.Tab} newTab The new Tab
     * @param {Ext.tab.Tab} oldTab The old Tab
     */

    initialize: function() {
        var me = this;
        me.callParent();

        me.on({
            tap: 'onTabTap',

            delegate: '> tab',
            scope   : me
        });
    },

    // @private
    onTabTap: function(tab) {
        this.setActiveTab(tab);
    },

    /**
     * @private
     */
    applyActiveTab: function(newActiveTab, oldActiveTab) {
        if (!newActiveTab && newActiveTab !== 0) {
            return;
        }

        var newTabInstance = this.parseActiveTab(newActiveTab);

        if (!newTabInstance) {
            return;
        }
        return newTabInstance;
    },

    /**
     * @private
     * When docked to the top, pack left, when on the bottom pack center
     */
    doSetDocked: function(newDocked) {
        var layout = this.getLayout(),
            pack   = newDocked == 'bottom' ? 'center' : 'left';

        //layout isn't guaranteed to be instantiated so must test
        if (layout.isLayout) {
            layout.setPack(pack);
        } else {
            layout.pack = (layout && layout.pack) ? layout.pack : pack;
        }
    },

    /**
     * @private
     * Sets the active tab
     */
    doSetActiveTab: function(newTab, oldTab) {
        if (newTab) {
            newTab.setActive(true);
        }

        //Check if the parent is present, if not it is destroyed
        if (oldTab && oldTab.parent) {
            oldTab.setActive(false);
        }
    },

    /**
     * @private
     * Parses the active tab, which can be a number or string
     */
    parseActiveTab: function(tab) {
        //we need to call getItems to initialize the items, otherwise they will not exist yet.
        if (typeof tab == 'number') {
            return this.getInnerItems()[tab];
        }
        else if (typeof tab == 'string') {
            tab = Ext.getCmp(tab);
        }
        return tab;
    }
});

/**
 * @aside guide tabs
 * @aside video tabs-toolbars
 *
 * Tab Panels are a great way to allow the user to switch between several pages that are all full screen. Each
 * Component in the Tab Panel gets its own Tab, which shows the Component when tapped on. Tabs can be positioned at
 * the top or the bottom of the Tab Panel, and can optionally accept title and icon configurations.
 *
 * Here's how we can set up a simple Tab Panel with tabs at the bottom. Use the controls at the top left of the example
 * to toggle between code mode and live preview mode (you can also edit the code and see your changes in the live
 * preview):
 *
 *     @example miniphone preview
 *     Ext.create('Ext.TabPanel', {
 *         fullscreen: true,
 *         tabBarPosition: 'bottom',
 *
 *         defaults: {
 *             styleHtmlContent: true
 *         },
 *
 *         items: [
 *             {
 *                 title: 'Home',
 *                 iconCls: 'home',
 *                 html: 'Home Screen'
 *             },
 *             {
 *                 title: 'Contact',
 *                 iconCls: 'user',
 *                 html: 'Contact Screen'
 *             }
 *         ]
 *     });
 * One tab was created for each of the {@link Ext.Panel panels} defined in the items array. Each tab automatically uses
 * the title and icon defined on the item configuration, and switches to that item when tapped on. We can also position
 * the tab bar at the top, which makes our Tab Panel look like this:
 *
 *     @example miniphone preview
 *     Ext.create('Ext.TabPanel', {
 *         fullscreen: true,
 *
 *         defaults: {
 *             styleHtmlContent: true
 *         },
 *
 *         items: [
 *             {
 *                 title: 'Home',
 *                 html: 'Home Screen'
 *             },
 *             {
 *                 title: 'Contact',
 *                 html: 'Contact Screen'
 *             }
 *         ]
 *     });
 *
 */
Ext.define('Ext.tab.Panel', {
    extend: 'Ext.Container',
    xtype : 'tabpanel',
    alternateClassName: 'Ext.TabPanel',

    requires: ['Ext.tab.Bar'],

    config: {
        /**
         * @cfg {String} ui
         * Sets the UI of this component.
         * Available values are: `light` and `dark`.
         * @accessor
         */
        ui: 'dark',

        /**
         * @cfg {Object} tabBar
         * An Ext.tab.Bar configuration.
         * @accessor
         */
        tabBar: true,

        /**
         * @cfg {String} tabBarPosition
         * The docked position for the {@link #tabBar} instance.
         * Possible values are 'top' and 'bottom'.
         * @accessor
         */
        tabBarPosition: 'top',

        /**
         * @cfg layout
         * @inheritdoc
         */
        layout: {
            type: 'card',
            animation: {
                type: 'slide',
                direction: 'left'
            }
        },

        /**
         * @cfg cls
         * @inheritdoc
         */
        cls: Ext.baseCSSPrefix + 'tabpanel'

        /**
         * @cfg {Boolean/String/Object} scrollable
         * @accessor
         * @hide
         */

        /**
         * @cfg {Boolean/String/Object} scroll
         * @hide
         */
    },

    delegateListeners: {
        delegate: '> component',
        centeredchange: 'onItemCenteredChange',
        dockedchange: 'onItemDockedChange',
        floatingchange: 'onItemFloatingChange',
        disabledchange: 'onItemDisabledChange'
    },

    initialize: function() {
        this.callParent();

        this.on({
            order: 'before',
            activetabchange: 'doTabChange',
            delegate: '> tabbar',
            scope   : this
        });

    },

    /**
     * Tab panels should not be scrollable. Instead, you should add scrollable to any item that
     * you want to scroll.
     * @private
     */
    applyScrollable: function() {
        return false;
    },

    /**
     * Updates the Ui for this component and the {@link #tabBar}.
     */
    updateUi: function(newUi, oldUi) {
        this.callParent(arguments);

        if (this.initialized) {
            this.getTabBar().setUi(newUi);
        }
    },

    /**
     * @private
     */
    doSetActiveItem: function(newActiveItem, oldActiveItem) {
        if (newActiveItem) {
            var items = this.getInnerItems(),
                oldIndex = items.indexOf(oldActiveItem),
                newIndex = items.indexOf(newActiveItem),
                reverse = oldIndex > newIndex,
                animation = this.getLayout().getAnimation(),
                tabBar = this.getTabBar(),
                oldTab = tabBar.parseActiveTab(oldIndex),
                newTab = tabBar.parseActiveTab(newIndex);

            if (animation && animation.setReverse) {
                animation.setReverse(reverse);
            }

            this.callParent(arguments);

            if (newIndex != -1) {
                this.forcedChange = true;
                tabBar.setActiveTab(newIndex);
                this.forcedChange = false;

                if (oldTab) {
                    oldTab.setActive(false);
                }

                if (newTab) {
                    newTab.setActive(true);
                }
            }
        }
    },

    /**
     * Updates this container with the new active item.
     */
    doTabChange: function(tabBar, newTab) {
        var oldActiveItem = this.getActiveItem(),
            newActiveItem;

        this.setActiveItem(tabBar.indexOf(newTab));
        newActiveItem = this.getActiveItem();
        return this.forcedChange || oldActiveItem !== newActiveItem;
    },

    /**
     * Creates a new {@link Ext.tab.Bar} instance using {@link Ext#factory}.
     * @private
     */
    applyTabBar: function(config) {
        if (config === true) {
            config = {};
        }

        if (config) {
            Ext.applyIf(config, {
                ui: this.getUi(),
                docked: this.getTabBarPosition()
            });
        }

        return Ext.factory(config, Ext.tab.Bar, this.getTabBar());
    },

    /**
     * Adds the new {@link Ext.tab.Bar} instance into this container.
     * @private
     */
    updateTabBar: function(newTabBar) {
        if (newTabBar) {
            this.add(newTabBar);
            this.setTabBarPosition(newTabBar.getDocked());
        }
    },

    /**
     * Updates the docked position of the {@link #tabBar}.
     * @private
     */
    updateTabBarPosition: function(position) {
        var tabBar = this.getTabBar();
        if (tabBar) {
            tabBar.setDocked(position);
        }
    },

    onItemAdd: function(card) {
        var me = this;

        if (!card.isInnerItem()) {
            return me.callParent(arguments);
        }

        var tabBar = me.getTabBar(),
            initialConfig = card.getInitialConfig(),
            tabConfig = initialConfig.tab || {},
            tabTitle = (card.getTitle) ? card.getTitle() : initialConfig.title,
            tabIconCls = (card.getIconCls) ? card.getIconCls() : initialConfig.iconCls,
            tabHidden = (card.getHidden) ? card.getHidden() : initialConfig.hidden,
            tabDisabled = (card.getDisabled) ? card.getDisabled() : initialConfig.disabled,
            tabBadgeText = (card.getBadgeText) ? card.getBadgeText() : initialConfig.badgeText,
            innerItems = me.getInnerItems(),
            index = innerItems.indexOf(card),
            tabs = tabBar.getItems(),
            activeTab = tabBar.getActiveTab(),
            currentTabInstance = (tabs.length >= innerItems.length) && tabs.getAt(index),
            tabInstance;

        if (tabTitle && !tabConfig.title) {
            tabConfig.title = tabTitle;
        }

        if (tabIconCls && !tabConfig.iconCls) {
            tabConfig.iconCls = tabIconCls;
        }

        if (tabHidden && !tabConfig.hidden) {
            tabConfig.hidden = tabHidden;
        }

        if (tabDisabled && !tabConfig.disabled) {
            tabConfig.disabled = tabDisabled;
        }

        if (tabBadgeText && !tabConfig.badgeText) {
            tabConfig.badgeText = tabBadgeText;
        }


        tabInstance = Ext.factory(tabConfig, Ext.tab.Tab, currentTabInstance);

        if (!currentTabInstance) {
            tabBar.insert(index, tabInstance);
        }

        card.tab = tabInstance;

        me.callParent(arguments);

        if (!activeTab && activeTab !== 0) {
            tabBar.setActiveTab(tabBar.getActiveItem());
        }
    },

    /**
     * If an item gets enabled/disabled and it has an tab, we should also enable/disable that tab
     * @private
     */
    onItemDisabledChange: function(item, newDisabled) {
        if (item && item.tab) {
            item.tab.setDisabled(newDisabled);
        }
    },

    // @private
    onItemRemove: function(item, index) {
        this.getTabBar().remove(item.tab, this.getAutoDestroy());

        this.callParent(arguments);
    }
}, function() {
});

Ext.define('Fileup.view.Main', {
    extend: 'Ext.tab.Panel',
    xtype: 'main',
    
    requires: [
        'Ext.TitleBar',
        'Ext.Button',
        'Ext.ux.Fileup'
    ],
    
    config: {
        tabBarPosition: 'bottom',

        items: [
            {
                id: 'welcome',
                title: 'Welcome',
                iconCls: 'home',
                scrollable: true,
                styleHtmlContent: true,
                
                layout: {
                    type: 'vbox',
                    align: 'center'
                },
                
                items: [
                    {
                        docked: 'top',
                        xtype: 'titlebar',
                        title: 'File uploading component'
                    },
                    
                    {
                        id: 'fileBtn',
                        xtype: 'fileupload',
                        iconCls: 'download',
                        iconMask: true,
                        ui: 'confirm',
                        text: 'File dialog',
                        padding: 20,
                        actionUrl: 'getfile.php',
                        returnBase64Data: true
                        
                        // For success and failure callbacks setup look into controller
                    }
                ]
            },
            
            {
                title: 'About',
                iconCls: 'info',
                layout: 'fit',
                styleHtmlContent: true,
                html: '<p><strong>File-uploading-component-for-Sencha-Touch demo</strong></p>' +
                      '<p>Version: 1.0</p>' +
                      '<p>Author: Constantine Smirnov, <a href="http://mindsaur.com">http://mindsaur.com</a></p>' +
                      '<p>License: GNU GPL v3.0</p>' +
                      '<p>GitHub: <a href="https://github.com/kostysh/File-uploading-component-for-Sencha-Touch">File-uploading-component-for-Sencha-Touch</a></p>',
                scrollable: 'vertical'
            }
        ]
    }
});

// Setup path for custom components in app.js
Ext.Loader.setPath({
    'Ext.ux': '../src/ux'
});

Ext.application({
    name: 'Fileup',

    requires: [
        'Ext.MessageBox'
    ],

    views: ['Main'],
    
    controllers: ['Main'],

    icon: {
        '57': 'resources/icons/Icon.png',
        '72': 'resources/icons/Icon~ipad.png',
        '114': 'resources/icons/Icon@2x.png',
        '144': 'resources/icons/Icon~ipad@2x.png'
    },

    isIconPrecomposed: true,

    startupImage: {
        '320x460': 'resources/startup/320x460.jpg',
        '640x920': 'resources/startup/640x920.png',
        '768x1004': 'resources/startup/768x1004.png',
        '748x1024': 'resources/startup/748x1024.png',
        '1536x2008': 'resources/startup/1536x2008.png',
        '1496x2048': 'resources/startup/1496x2048.png'
    },

    launch: function() {
        // Destroy the #appLoadingIndicator element
        Ext.fly('appLoadingIndicator').destroy();

        // Initialize the main view
        Ext.Viewport.add(Ext.create('Fileup.view.Main'));
    },

    onUpdated: function() {
        Ext.Msg.confirm(
            "Application Update",
            "This application has just successfully been updated to the latest version. Reload now?",
            function(buttonId) {
                if (buttonId === 'yes') {
                    window.location.reload();
                }
            }
        );
    }
});

