# Local File Inclusion LFI (PHP)

## Local File Inclusion (LFI)

The Local File Inclusion (LFI) vulnerability is a web-app security flaw that lets an attacker view files they normally shouldn't be able to see. This happens because the developer’s code allows a user to view a specific image or display a particular file by passing a value in a certain parameter. That, of course, is a problem , an attacker could read files beyond those they’re permitted to access. We’ll go over this in detail now.

***

### PHP code vulnerable to LFI.

```php
<?php

    $file = $_GET['file'];
    include($file);  

?>
```

Now an attacker can use something like this:

```shell
http://localhost:8000/meta.php?file=../../../../../../../../../etc/passwd
```

so The Attacker can view the `/etc/passwd` file or read configuration files. Like SSH Prv Keys `/home/*/.ssh/id_rsa`

### How To

#### Whitelist Approach

Only allows specifically approved files in `$Allow_Pages` Array Can Display on Web App And With `in_array` Function in PHP that we used to compare the file the user is trying to read with the list of allowed files.

**Also We Can Use Input Validation with `basename()`**

removes any directory path components, preventing directory traversal attacks

**PHP.INI**

Also We Can Disable allow\_url\_include in PHP.ini File To prevent (RFI)

```
allow_url_include = Off
```

## Secure Code:

```php
<?php
    if(isset($_GET['file'])){
        $Allow_Pages = ['home.php' , 'bla.php' , 'demo.txt'];
        $file = basename($_GET['file']);

        if(in_array($file , $Allow_Pages)){
                include($file);
        }else{
            echo "\n[+] File : ". $file; 
            echo "[!] Not Allowed! Try Harder To Hacke Me!";
        }
    }
?>
```
