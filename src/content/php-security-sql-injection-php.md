# SQL injection (PHP)

***

### PHP code vulnerable to SQL injection.

```php
<?php
    include "conect.php";

    $id = $_GET['input'];

    $qy = $con->prepare("SELECT username, email FROM users WHERE id=$id");

    $qy->execute();
    $users = $qy->fetch();
    $count = $qy->rowCount();
    
    echo "email is : " . $users['email'] . "<br>";
    echo "username is : " . $users['username'];

?>
```

***

### Secure PHP Code Explanation

```php
$qy = $con->prepare("SELECT username, email FROM users WHERE id=$id");
```

In this code, there was a problem: we were taking the `id` directly from the **GET request** without any validation. The issue here is that any user could inject a malicious SQL query and even **drop the entire database** easily.

To solve this, we need to use **prepared statements**.

```php
$qy = $con->prepare("SELECT username, email FROM users WHERE id = ?");
```

The `?` is a **parameter placeholder** in prepared statements. It's a fundamental security feature that prevents SQL injection.

#### What the `?` does:

The `?` creates a **placeholder** for data that will be supplied later, keeping the SQL structure separate from the actual values.

The second problem in the code was that there was **no check to ensure** the user actually provides a value in `$_GET['input']`. This could cause **unexpected errors** that should be handled properly instead of being displayed to the user.

The third thing we need to ensure is that the **ID actually exists** in the database. We can check this using `$count = $qy->rowCount();`, which returns the number of rows from our query. If no rows are returned, that means no result exists — so instead of showing an error, we can display a friendly message like “User not found”.

> Additional Security Improvements: We Can Use `htmlspecialchars()` Fucntion when outputting data to prevent XSS attacks I Talk About It In This Video => <https://www.youtube.com/watch?v=1gbaS6uZ-d8>

***

#### Secure Code:

```php
<?php
include "conect.php";

if (isset($_GET['input']) || !empty($_GET['input'])) {

    $id = $_GET['input'];

    $qy = $con->prepare("SELECT username, email FROM users WHERE id = ?");
    $qy->execute([$id]);

    $users = $qy->fetch();
    $count = $qy->rowCount();

    if ($count > 0) {
        echo "email is : " . htmlspecialchars($users['email']);
        echo "<br>";
        echo "username is : " . htmlspecialchars($users['username']);
    } else {
        echo "User not found";
    }

} else {
    echo "[!] Missing 'input' Parameter In URL";
}
?>
```
