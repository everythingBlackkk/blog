# What is GraphQL ?

<figure><img src="./images/articles/web-development-and-technologies-what-is-graphql/01.png" alt=""><figcaption></figcaption></figure>

## 1. What Is GraphQL (Technical Explanation + Comparison with REST)

#### Technical Definition

**GraphQL** is a **query language** designed to interact with **APIs**, allowing the client to **specify exactly the data it needs** from the server.\
The client writes a query using GraphQL syntax, and the server responds with data in **JSON** format that matches the structure of the request.

In contrast, with a **REST API**:

* The client calls **fixed endpoints** (such as `/users` or `/posts`) using HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
* The structure of the returned data is **predefined by the server**, meaning the client cannot control it.

<figure><img src="./images/articles/web-development-and-technologies-what-is-graphql/02.png" alt=""><figcaption></figcaption></figure>

***

### 2. Practical Comparison Between GraphQL and REST

Let’s take a practical example.

Imagine you have an application that needs to display a **user** and their **posts**.

#### In REST:

You would need to make two requests:

```http
GET /users/1
```

Result:

```json
{
  "id": 1,
  "name": "Ramy",
  "email": "ramy@example.com"
}
```

Then:

```http
GET /users/1/posts
```

Result:

```json
[
  { "id": 101, "title": "My first post" },
  { "id": 102, "title": "GraphQL is cool" }
]
```

* Multiple requests are required to retrieve nested data (Request Overhead).
* The server may return more data than the client actually needs.

***

#### In GraphQL:

Instead, you can send **a single POST request** to `/graphql`:

```json
{
  "query": "{ user(id: 1) { name posts { title } } }"
}
```

Result:

```json
{
  "data": {
    "user": {
      "name": "Ramy",
      "posts": [
        { "title": "My first post" },
        { "title": "GraphQL is cool" }
      ]
    }
  }
}
```

* Only one request is needed.
* The response contains exactly the requested fields.
* The data structure matches the query structure.

<figure><img src="./images/articles/web-development-and-technologies-what-is-graphql/03.png" alt=""><figcaption></figcaption></figure>

***

### 3. Internal Execution Stages of GraphQL

The execution process inside any GraphQL server goes through **four main stages**, which distinguishes it from REST (where the endpoint code runs directly).

> Some Resource ->&#x20;
>
> * <https://graphql.org/learn/execution/>
> * <https://graphql.org/learn/validation/>

<figure><img src="./images/articles/web-development-and-technologies-what-is-graphql/04.png" alt=""><figcaption></figcaption></figure>

### 1. **Parsing**

When the server receives a GraphQL query,\
the first thing it does is **analyze and understand it**.\
It takes the query text (which is just a string) and converts it into a structured format called an **AST (Abstract Syntax Tree)**.\
That helps the server understand what each part of the query means.

In REST, the server doesn’t do that , it just reads the URL and parameters directly.

***

#### 2. **Validation**

After understanding the query, the server checks if everything the client asked for **actually exists in the Schema**.\
So if the query asks for `user` or `email`, it makes sure those fields are really defined in the system.\
It also checks that the **data types** are correct (like number, string, etc.).

In REST, there’s no such validation , because the response is fixed and already known.

***

#### 3. **Execution**

Now comes the real work.\
GraphQL starts running the query.\
Each part (or field) of the query is handled by a small function called a **Resolver**.\
Every field has its own resolver.\
For example:

* The `user` resolver fetches the user’s info.
* The `posts` resolver fetches that user’s posts.

In REST, the entire thing is handled in one go inside a single endpoint (like `/users/1`).

***

#### 4. **Response Formatting**

After all the resolvers finish and bring back the data,\
the server collects everything and returns it as **JSON**,\
in the **exact same structure** that the client asked for in the query.

In REST, the response is usually fixed and written manually, not shaped by what the client requests.

***

#### Simple Example

In REST:

```php
if ($_SERVER['REQUEST_URI'] === '/users/1') {
  $user = getUserById(1);
  echo json_encode($user);
}
```

Each endpoint has a fixed code that returns specific data.

In GraphQL:

```php
$resolvers = [
  'Query' => [
    'user' => function ($root, $args) {
      return getUserById($args['id']);
    }
  ],
  'User' => [
    'posts' => function ($user) {
      return getPostsByUserId($user['id']);
    }
  ]
];
```

Here, the server runs **a function (resolver) for every part of the query**,\
and then combines all those results into one final JSON response.

***

### 4. Technical Comparison: Communication Approach

| Aspect                           | REST                                   | GraphQL                                              |
| -------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| **Number of Endpoints**          | Many (`/users`, `/posts`, `/comments`) | Single endpoint (`/graphql`)                         |
| **HTTP Methods**                 | `GET`, `POST`, `PUT`, `DELETE`         | Usually one `POST` with the query text               |
| **Data Shape Control**           | Controlled by the server               | Controlled by the client                             |
| **Overfetching (extra data)**    | Common                                 | Eliminated                                           |
| **Underfetching (missing data)** | Common, requires extra requests        | Avoided, since queries can include everything needed |
| **Real-time Updates**            | Requires custom WebSockets             | Built-in via `Subscriptions`                         |
| **Documentation**                | Written manually                       | Automatically generated from the Schema              |

***

### 5. Practical Comparison (Create / Update Operations)

#### Creating a New User in REST:

```http
POST /users
Content-Type: application/json

{
  "name": "Ramy",
  "email": "ramy@example.com"
}
```

Response:

```json
{
  "id": 1,
  "name": "Ramy",
  "email": "ramy@example.com"
}
```

***

#### Same Operation in GraphQL (Mutation):

```json
{
  "query": "mutation { createUser(name: \"Ramy\", email: \"ramy@example.com\") { id name email } }"
}
```

Response:

```json
{
  "data": {
    "createUser": {
      "id": 1,
      "name": "Ramy",
      "email": "ramy@example.com"
    }
  }
}
```

**Difference:**

* In REST, the operation type is determined by the HTTP method.
* In GraphQL, the operation type is specified in the query itself (`mutation`).

***

### 6. Under the Hood (Internal Technical Components)

| Component                | Technical Role                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| **Parser**               | Converts the query string into an AST using a lexer and parser.      |
| **Validator**            | Ensures that the query matches the Schema (types, names, arguments). |
| **Executor**             | Executes resolvers for each field in depth-first order.              |
| **Type System**          | Enforces strict typing for inputs and outputs.                       |
| **Introspection System** | Allows querying the Schema itself (self-documenting).                |

***

### 7. Core Components of GraphQL

#### 1. **Schema**

The **Schema** is the heart of GraphQL.\
It defines the **data types** the server can return and their relationships.\
Schemas are written in **SDL (Schema Definition Language)**.

Example:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post]
}

type Post {
  id: ID!
  title: String!
  content: String
}
```

This defines two types: `User` and `Post`.

***

#### 2. **Types**

Built-in scalar types supported by GraphQL:

* `Int` → Integer
* `Float` → Floating-point number
* `String` → Text
* `Boolean` → True or False
* `ID` → Unique identifier (like a primary key)

***

#### 3. **Query**

Used to **fetch data** (equivalent to `GET` in REST).

Example:

```graphql
query {
  user(id: 1) {
    name
    email
  }
}
```

***

#### 4. **Mutation**

Used to **modify, add, or delete data** (similar to `POST`, `PUT`, or `DELETE` in REST).

Example:

```graphql
mutation {
  createUser(name: "Ramy", email: "ramy@example.com") {
    id
    name
  }
}
```

***

#### 5. **Resolver**

The function or logic that **fetches data from the source** (database, API, file, etc.) when a Query or Mutation is executed.

Example (in JavaScript):

```js
const resolvers = {
  Query: {
    user: (_, { id }) => getUserFromDB(id),
  },
  Mutation: {
    createUser: (_, args) => createUserInDB(args),
  }
}
```

***

#### 6. **Subscription**

Provides **real-time updates** (similar to WebSockets).

Example:

```graphql
subscription {
  newPost {
    id
    title
  }
}
```

When a new post is created, all clients subscribed to `newPost` will receive an instant update.

***

#### 7. **Directives**

Special instructions that control how data is returned.

Example:

```graphql
{
  user(id: 1) {
    name
    email @include(if: $showEmail)
  }
}
```

If `$showEmail` is true, the email field will be included; if false, it will be omitted.

***

### Thank you all! I hope you enjoyed the article. If you have any questions, I’m here to help. 

#### Remember My name : everythingBlackkk 

Made by ❤

Github : <https://github.com/everythingBlackkk>

Linkedin : [www.linkedin.com/in/everythingblackkk](http://www.linkedin.com/in/everythingblackkk)

X : <https://x.com/0xblackkk>

Youtube : <https://www.youtube.com/@everythingBlackkk>
