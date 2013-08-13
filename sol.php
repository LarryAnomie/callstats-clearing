<?php

if (!isset($_GET['url']) ||
    !preg_match('/10\.2\.21\.132/', $_GET['url'])) {

    echo "error!";
    exit;

}

header('Content-Type: text/xml');
echo file_get_contents($_GET['url']);

?>
