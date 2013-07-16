File uploading component for Sencha Touch
=========================================

Ext.Button based component for uploading files in Sencha Touch apps

Author: Constantine V. Smirnov, kostysh(at)gmail.com, http://mindsaur.com    
License: GNU GPL v3.0    
Current version: 2.0.1    
ST2 version: 2.1.1    
Sencha Cmd: v3.0.2.288

Versions:
=========
- 2.0.1 Added uploading request signing feature, custom response decoder, configurable success response codes
- 2.0
- [1.0.2](https://github.com/kostysh/File-uploading-component-for-Sencha-Touch/tree/1.0.2) Fixed issue with multiple Fileup components on one page
- 1.0.1 Bugs fixes  
- 1.0 Initial release  

Features:
=========
- Select file from local source
- Load selected file as dataUrl
- Upload selected file to server
- Loading spinner on button
- Uploading progress displayed on badge
- Uploading error handling
- Uploading request signing feature
- Custom response decoder
- Configurable success response codes
- Custom styles for component using SASS

Notes:
=============
This component can works in two modes (switched by loadAsDataUrl config):
1) Load local files as dataUrl. 
Will be useful if you want to load a local file. For example you can load
image and display it inside dom or store it into localStorage.
2) Upload files to server (you should also setup a server part)
Current PHP version of server part located in src/php folder (getfile.php)
 
Server response format (JSON):
{
     success: true,// or false
     message: ''// error message if success === false
}
 
Component has three states:
1) Browse: Initial state, you can browse and select file
2) Ready: File selected and ready for load or upload
3) Uploading: File loading or uploading in process

You can configure these states (add custom text and styles).
Looking for SASS file in src/ux/sass folder.

Installing:
===========
- Place src/php to your server (you can write your own version of this script)
- Create folder for uploads on your server and make this folder writable
- Configure getfile.php (second line, path to your folder for uploads)  
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

            //Fileup configuration for "Load local file" mode
            {
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
                        loading: true// Enable loading spinner on button
                    }
                }
            },

            //Fileup configuration for "Upload file" mode
            {
                itemId: 'fileBtn',
                xtype: 'fileupload',
                autoUpload: false,
                url: 'src/php/getfile.php'
            }
        ]
        
- Enable or disable auto upload of file via component config:
<!-- language: lang-js -->
        
        autoUpload: true,
                
- Listen for success/failure or loadsuccess/loadfailure events:
<!-- language: lang-js -->
        
        fileBtn.on({
            success: 'yourFileUploadSuccessHandler',
            failure: 'yourFileUploadFailureHandler'
        });
        
Live demo: 
==========
http://mindsaur.com/demo/fileupload
