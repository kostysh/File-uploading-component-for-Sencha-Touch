<?php
$uploaddir = '../../trash/';//your-path-to-upload

$response = new stdClass();

try {
    if ($_FILES['userfile']['error'] !== UPLOAD_ERR_OK) {

        if ($_SERVER['REQUEST_METHOD'] == 'POST' && 
            empty($_POST) &&
            empty($_FILES) && 
            $_SERVER['CONTENT_LENGTH'] > 0) {

            $displayMaxSize = ini_get('post_max_size');

            switch (substr($displayMaxSize, -1)) {
                case 'G':
                    $displayMaxSize = $displayMaxSize * 1024;
                case 'M':
                    $displayMaxSize = $displayMaxSize * 1024;
                case 'K':
                    $displayMaxSize = $displayMaxSize * 1024;
            }

            $errMessage = 'Your file is too large. ' . 
                    $_SERVER[CONTENT_LENGTH] . 
                    ' bytes exceeds the maximum size of ' . 
                    $displayMaxSize . ' bytes.';            
        } else {
            switch ($_FILES['userfile']['error']) {
                case UPLOAD_ERR_INI_SIZE:
                    $errMessage = "The uploaded file exceeds the upload_max_filesize directive in php.ini";
                    break;
                case UPLOAD_ERR_FORM_SIZE:
                    $errMessage = "The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form";
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $errMessage = "The uploaded file was only partially uploaded";
                    break;
                case UPLOAD_ERR_NO_FILE:
                    $errMessage = "No file was uploaded";
                    break;
                case UPLOAD_ERR_NO_TMP_DIR:
                    $errMessage = "Missing a temporary folder";
                    break;
                case UPLOAD_ERR_CANT_WRITE:
                    $errMessage = "Failed to write file to disk";
                    break;
                case UPLOAD_ERR_EXTENSION:
                    $errMessage = "File upload stopped by extension";
                    break;

                default:
                    $errMessage = "Unknown upload error";
                    break;
            }
        }

        $response->success = false;
        $response->message = $errMessage;

    } else {    
        $uploadfile = $uploaddir . basename($_FILES['userfile']['name']);

        if (is_uploaded_file($_FILES['userfile']['tmp_name']) && 
            move_uploaded_file($_FILES['userfile']['tmp_name'], $uploadfile)) {

            $response->success = true;
        } else {
            $response->success = false;
            $response->message = 'File was uploaded but not saved on server';
        }    
    }
} catch (Exception $e) {
    $response->success = false;
    $response->message = $e->getMessage();
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($response);
exit;
?>
