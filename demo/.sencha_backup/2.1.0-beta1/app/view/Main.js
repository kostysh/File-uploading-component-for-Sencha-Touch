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
                      '<p>Version: 1.0.1</p>' +
                      '<p>Author: Constantine Smirnov, <a href="http://mindsaur.com">http://mindsaur.com</a></p>' +
                      '<p>License: GNU GPL v3.0</p>' +
                      '<p>GitHub: <a href="https://github.com/kostysh/File-uploading-component-for-Sencha-Touch">File-uploading-component-for-Sencha-Touch</a></p>',
                scrollable: 'vertical'
            }
        ]
    }
});
