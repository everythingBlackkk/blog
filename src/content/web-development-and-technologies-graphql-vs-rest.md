# GraphQL VS REST

## 1. Introduction: REST vs. GraphQL

REST has been the standard for designing web APIs over the past decade, offering beneficial concepts such as structured access to resources and stateless servers. However, **REST APIs have proven to be too inflexible** to keep up with the rapidly changing requirements of the clients accessing them. GraphQL was specifically developed to cope with the need for **more flexibility and efficiency** in client-server interaction and solves many inefficiencies experienced when developers interact with REST APIs.

While REST is a strict specification, today most APIs are labeled as "restful" even if they don't fully adhere to the true specification.

### 2. Shortcomings of REST APIs: The Blogging Example

The video uses the example of a simple blogging application to demonstrate the differences, specifically focusing on rendering a user’s profile screen that requires three pieces of information:

1. The user's first name.
2. All posts the user has created.
3. The last three followers of the user.

#### The REST Implementation

To fulfill these three requirements using a REST API, a client would typically need to hit **three different endpoints**:

1. `/users/:id`: To get information about the specific user.
2. `/users/:id/posts`: To return all posts for that user.
3. `/users/:id/followers`: To get back all the followers of that user.

> I This This Photo Explane waht i need to say&#x20;

<figure><img src="./images/articles/web-development-and-technologies-graphql-vs-rest/01.png" alt=""><figcaption></figcaption></figure>

The Problems with REST: Over-fetching and Under-fetching

The necessity of using multiple requests highlights two major inefficiencies:

**A. Over-fetching**

In a REST flow, when fetching data for a user profile, the server often responds with **all the information it has stored** about that resource, even if the client only needs a small piece of it.

* **User Data Example:** When hitting `/users/:id`, the application might only need the user’s name, but it also downloads irrelevant additional data like the user’s address or birthday.
* **Followers Example:** The app only wants the names of the *last three* followers, but the request might download hundreds or thousands of followers associated with that user.

**Over-fetching** means downloading unnecessary data, thus exhausting the user’s data plan with information that is not required at that specific time.

<figure><img src="./images/articles/web-development-and-technologies-graphql-vs-rest/02.png" alt=""><figcaption></figcaption></figure>

**B. Under-fetching (and the N+1 Problem)**

Because a single REST endpoint often does not return all the necessary information, clients are forced to send multiple requests to gather the required data. This problem is called **under-fetching**.

Under-fetching can escalate into the **N+1 requests problem**. This occurs when a client fetches a list of items (the '1' request), but then needs more information for *each* item, requiring one additional dedicated request for every item (the 'N' requests).

<figure><img src="./images/articles/web-development-and-technologies-graphql-vs-rest/03.png" alt=""><figcaption></figcaption></figure>

#### C. Lack of Flexibility

While a developer could design a REST API to expose data specifically tailored for a particular profile screen, this approach is not ideal for modern applications. If the design on the front end changes, requiring more or less data, the **backend API must also be adjusted**. This kills productivity, notably slows down the ability to iterate quickly on the product, and makes incorporating user feedback difficult.

### 3. The GraphQL Solution

GraphQL addresses these problems by enabling flexibility and efficiency through a different architecture.

#### Single Endpoint and Single Request

With GraphQL, there is **only a single endpoint** used by all clients to retrieve data from the server. Consequently, the client only sends **one single request** to the server, and the server responds with all the information needed.

#### Defining Data Requirements

The client sends a POST request that includes a **query in the body**. This query explicitly describes **all the data requirements** of the client.

For the blogging example, the query would ask for the user by a particular ID and specify *only* the data points required: the name, the titles of the posts, and the names of the last three followers.

#### Server Response

When the server receives the query, it processes and resolves it to fetch **exactly the data specified**. The server packages this data into a JSON object, which is returned to the client. According to the official GraphQL specification, the root field of this response JSON object is called `data`.

### 4. High-Level Benefits of GraphQL

Beyond solving the technical issues of over- and under-fetching, GraphQL provides several other advantages:

#### A. Enabling Rapid Iteration

Thanks to the flexible nature of GraphQL, changes made on the client side (front end) **do not require extra work on the server**. This allows for faster feedback cycles and rapid product iterations, eliminating the need to adjust the backend API every time the front-end design is updated.

#### B. Fine-Grained Insights and Performance Monitoring

* **Usage Insights:** Since each client specifies *exactly* what information it is interested in, GraphQL allows developers to gain a deep, \*\* fine-grained understanding\*\* of how the available data is being used. This insight is useful for evolving the API and safely **deprecating specific fields** that are no longer requested by any client.
* **Performance Monitoring:** GraphQL uses **resolver functions** to collect the data requested by a client. By instrumenting and measuring the performance of these resolvers, developers can gain crucial insights about **bottlenecks** in their system.

#### C. Strong Type System and Schema Definition Language

GraphQL has a **strong type system** that defines the capabilities of the API. All types exposed in the API are written down in a **schema** using the **GraphQL Schema Definition Language**.

* **Contract:** This schema serves as a **contract** between the client and the server, defining exactly how a client can access the data.
* **Independent Development:** Once the schema is defined, the front-end and back-end teams can work independently without further communication, as both are aware of the definite structure of the data sent over the network.
* **Mocking Data:** Front-end teams can easily test their applications by **mocking** the required data structures based on the defined schema before the server is fully ready.
