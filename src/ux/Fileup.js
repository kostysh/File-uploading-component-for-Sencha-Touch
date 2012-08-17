/**
 * @filename Fileup.js
 * 
 * @name File uploading
 * @fileOverview File uploading component based on Ext.Button
 *
 * @author Constantine V. Smirnov kostysh(at)gmail.com
 * @date 20120817
 * @version 1.0.1
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
