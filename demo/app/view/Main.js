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
                        html: 'You can upload file to server'
                    },
                    
                    {
                        itemId: 'fileBtn',
                        xtype: 'fileupload',
                        autoUpload: false,
                        url: 'src/php/getfile.php'
                        
                        // For success and failure callbacks setup look into controller
                    },
                    
                    {
                        html: 'Or just load locally as DataUrl (for images)',
                        style: 'margin-top: 10px;'
                    },
                    
                    {
                        itemId: 'fileLoadBtn',
                        xtype: 'fileupload',
                        autoUpload: true,
                        loadAsDataUrl: true,
                        states: {
                            browse: {
                                text: 'Browse and load'
                            },
                            ready: {
                                text: 'Load'
                            },

                            uploading: {
                                text: 'Loading',
                                loading: true
                            }
                        }
                        
                        // For success and failure callbacks setup look into controller
                    },
                    
                    {
                        itemId: 'loadedImage',
                        xtype: 'img',
                        width: '80%',
                        height: '200px',
                        style: 'margin-top:15px;'
                    }
                ]
            },
            
            {
                title: 'About',
                iconCls: 'info',
                layout: 'fit',
                styleHtmlContent: true,
                html: '<p><strong>File-uploading-component-for-Sencha-Touch</strong></p>' +
                      '<p>Version: 2.0</p>' +
                      '<p>Author: Constantine Smirnov, <a href="http://mindsaur.com">http://mindsaur.com</a></p>' +
                      '<p>License: GNU GPL v3.0</p>' +
                      '<p>GitHub: <a href="https://github.com/kostysh/File-uploading-component-for-Sencha-Touch">File-uploading-component-for-Sencha-Touch</a></p>',
                scrollable: 'vertical'
            }
        ]
    }
});
