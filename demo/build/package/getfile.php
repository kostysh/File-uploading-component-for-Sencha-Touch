<?php
$uploaddir = 'trash/';
$uploadfile = $uploaddir . basename($_FILES['userfile']['name']);

header('Content-Type: application/json; charset=utf-8');

$response = new stdClass();

if (is_uploaded_file($_FILES['userfile']['tmp_name']) && 
    move_uploaded_file($_FILES['userfile']['tmp_name'], $uploadfile)) {
    
    $response->success = true;
    
    /**
     * 
     * Use your uploaded file here as you want
     * 
     */
    
    if ($_REQUEST['base64'] == 'true' && getimagesize($uploadfile)) {
        
        // Encode image content with base64
        $response->base64 = 'data:' . $_FILES['userfile']['type'] . ';base64,' .
                            base64_encode(file_get_contents($uploadfile));
        
    } 
    
    if ($_REQUEST['url'] == 'true') {
        
        $new_file_url = 'new/file/url/on/web';
        
        /**
         * 
         * And now, move file to 'new/file/url/on/web' here
         * 
         */
        
        // Return a direct url to new file place
        $response->url = $new_file_url . '/' . $_FILES['userfile']['name'];
    }
    
} else {
    $response->success = false;
    $response->files = $_FILES;
    $response->request = $_REQUEST;
}

echo json_encode($response);
exit;
?>
