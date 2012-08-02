File-uploading-component-for-Sencha-Touch
=========================================

Ext.Button based component for uploading files in Sencha Touch apps without page refresh 

Author: Constantine V. Smirnov, kostysh(at)gmail.com, http://mindsaur.com    
License: GNU GPL v3.0    
Current version: 1.0    
ST2 version: 2.1.0 Beta1    
ST2 SDK Tools: 2.0.0 Beta 3

Versions:
=========
1.0 Initial release 

Features:
=========
- File uploading without page refresh  
- Autoupload  
- Subscribe upload feature to external event  
- Custom styling (same to Ext.Button component styling)  
- File name as button badge  
- Android (4.0 up) browser support as regular   
- Google Chrome for desktop and mobile
- iOS Safari browser support from version 6.0 (not tested on mobile)  

Known issues:
=============
- Strange behaviour on Google Chrome mobile (page reload after image selected)  
- Android browser for ICS crashes while large images loading  

Installing:
===========
- Place src/php to your server (you can write your own version of this script)
- Place src to your app folder;
- Configure custom path for custom components: 
<!-- language: lang-js -->
        
        Ext.Loader.setPath({
            'Ext.ux': '[..path..]src/ux'
        });
        
- Require Fileup in app.js or inside current view:
<!-- language: lang-js -->
        
        requires: ['Ext.ux.Fileup']
        
- Insert component into view:
<!-- language: lang-js -->
        
        items: [
            {
                id: 'fileBtn',
                xtype: 'fileupload',
                iconCls: 'download',
                iconMask: true,
                text: 'File dialog',
                padding: 20,
                actionUrl: '../src/php/getfile.php',// Url of getfile.php
                returnBase64Data: true
            }
        ]
        
- Setup base64 and returnUrl options via component config:
<!-- language: lang-js -->
        
        returnBase64Data: true,// or false
        returnUrl: true
        
- Enable or disable auto upload of file via component config:
<!-- language: lang-js -->
        
        autoUpload: true,// If false you can use fileBtn.submit(); method
                
- Setup submit callbacks via config or inside controller (see demo):
<!-- language: lang-js -->
        
        var fileBtn = Ext.getCmp('fileBtn');
        fileBtn.setCallbacks({
            scope: this,
            success: this.onFileUploadSuccess,
            failure: this.onFileUploadFailure
        });
        
- On uploading success use response object.
        
Live demo: 
==========
http://mindsaur.com/demo/fileupload