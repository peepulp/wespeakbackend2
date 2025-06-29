# Backend WeSpeak
This project is the [express](http://expressjs.com) api server of WeSpeak organization.

## Features
* **Registration/Login**. There are four types of authentication methods implemented:
    * With email: uses the [email-verification](https://www.npmjs.com/package/email-verification) library.
    * Facebook: [passport-facebook](https://github.com/jaredhanson/passport-facebook).
    * Google: [passport-google](https://github.com/jaredhanson/passport-google-oauth2).
    * Twitter: [passport-twitter](https://github.com/jaredhanson/passport-twitter).
> Note that Facebook, Google and Twitter registration/login processes uses [passport](https://www.npmjs.com/package/passport).
* **Authentication**: JSON Web Token.
* **Data validation**: all the database collections have their corresponding [mongoose](http://mongoosejs.com) schema in a *models* module.
* **Good code styling**: [eslint](https://eslint.org) and [eslint-plugin-node](https://www.npmjs.com/package/eslint-plugin-node) are included.
* **Changelog**: automatic features and bugfixes tracking in a [changelog](https://github.com/commitizen/cz-conventional-changelog) file.


## Project structure
This server has a great folders structure. Tree command output `tree -d`:
```
.
├── src
│   ├── config
│   ├── routes
│   └── models
└── test
```
* **config**: contains 3 JSONs to differenciate the different environments: dev (development), stg (staging) and pro (production).
* **routes**: have all the routes splitted in different files by functionality (users, authentication, socialNetworksAuth, ...).
* **models**: exports a factory containing all the models of the application.


## Getting started

* Install dependencies
```
npm install
```
* Set up the configuration requred
    * Social networks authentication: you will need to create a developer account in Facebook, Google and Twitter respectively.
    * Node-email-verification: it is required to add a valid email and password to use the SMTP service (Remember not to upload sensitive information to github).
> Note that you have to provide all the required environment variables: BASE_URL, MONGO_URL, JWT_TOKEN, NEV_EMAIL, NEV_PASSWORD, NODE_ENV, PORT.

* Set up MySQL
    * Create file mysql/mysql_config.js based on mysql/mysql_config_example.js
    * Create wespeakwelisten database
    * Run `mysql < mysql/table_setup.mysql`
    * Run `node mysql/insert_sample_data.js`
    
* Server launching options:
1. In a production and staging environment.

```
npm run start
```

2. Development environment: restart server when modifying any file and save.

```
npm run start-dev
```
3. Development environment: debuggin. After using the following command attach to the proces in the port 9229 for being able to inspect the code.
```
npm run start--dev-debug
```



## Available API Endpoints

**JWT Auth**

Many of the endpoints require a JWT auth token which can be generated as such:

```
JWT.sign({"_id":"5f8f2c902d069d77d79d6517"}, 'super-secret-token')
```

The ``_id`` should be the ID of the user from mongodb.
 
Then you can add the generated token to the headers of any request as such

```
Authorization: Bearer <JWT Key from above>
```

Alternatively, you can use the Login endpoint below under "Authentication" to get the JWT token.

**Users**

Path: /api/users 

All endpoints here require JWT authorization as above.

This API allows one to get information on a user two different ways

By ID as such:

```
GET /api/users/<userId>
```

For this endpoint, you can only request the ID of the same user id in your JWT auth JSON

Or by email as such:

```
GET /api/users/?email=<user_escaped_email>
```

This endpoint can be used to look up any user by email.

Both endpoints then return the user hash directly from the DB as such:

```
{
    "_id": "5f8f2c902d069d77d79d6517",
    "name": "Paul",
    "email": "pebrinic@gmail.com",
    "password": "$2a$10$x4eMBU7.sj8PD2IHN7/Nlu.XMaUq669fnYDVsVruJVR5zuUKYvWyS",
    "verificationToken": "AXbbJHDyZhV7jikaQ9PfHdUlUcGdvwW5A80vJ4TXhb2KKees",
    "__v": 0
}
```

**Authentication**

Path: /api/auth

Endpoints:

```
POST /api/auth/login
``` 

This endpoint allows a user to login

example POST data:
```
{
    "email":"pebrinic@gmail.com",
    "password": "password",
    "name": "paul"
}
```
Example response:
```
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InBlYnJpbmljQGdtYWlsLmNvbSIsIm5hbWUiOiJQYXVsIiwiaWF0IjoxNjAzMjIwNTQwLCJleHAiOjE2MDU4MTI1NDB9.smr6zSH8AEx2txY613b9mZMuCoG-7Q_5ZfBsQRpHZ3A",
    "message": "Login successful",
    "name": "Paul",
    "email": "pebrinic@gmail.com"
}
```

Then the above JWT token can be use for any other endpoints

```
POST /api/auth/register
``` 

```
GET /api/auth/me
``` 

This endpoint does not require any data, just the JWT authorization header

Example response:
```
{
    "email": "pebrinic@gmail.com",
    "name": "Paul",
    "iat": 1603220695,
    "exp": 1605812695
}
```

```
GET /api/auth/changepassword
``` 

This endpoint displays an HTML change password form for the logged in user.

This is designed to be clicked on from an email generated by the ```/api/auth/resetpassword``` endpoint below.

```
POST /api/auth/changepassword
``` 

This is the POST endpoint for the above change password form

```
POST /api/auth/resetpassword
```

Example POST data:

```
{
    "email":"pebrinic@gmail.com"
}
```

This will generate an email and then display the text "Change password"

```
GET /api/auth/email-verification
```
This endpoint is used for email verification. When a new user registers using the
register endpoint an email is generated that they then click on which links to this endpoint and will
mark the email as verified in the database.

Example request:
```
GET http://3.236.22.64:3000/api/auth/email-verification?verificationToken=<token generated at registration>
```

Example response:

"User verification success"


The following APIs are used for authentication against these various social platforms.

```
GET /api/auth/facebook
```

```
GET /api/auth/facebook/callback
```

```
GET /api/auth/google
```

```
GET /api/auth/google/callback
```

```
GET /api/auth/twitter
```

```
GET /api/auth/twitter/callback
```

**Data**

Path: /api/data


This API gets data stored in the wespeakwelisten MySQL database.

```
GET /api/data/companies
```

Returns a list of company data, all in JSON format.

```
GET /api/data/companies/<companyId>
```

Returns statistics and data chart for a given company (currently random).

```
GET /api/data/complaints
```

Returns a list of complaint data, all in JSON format.

```
POST /api/data/complaints/insert
```

Inserts a new complaint into the database. Accepts the following body fields:

- subject: Complaint issue
- author: User writing the complaint
- topic: Hashtag representing generalized problem in the complaint
- mood: Representation of how severe complaint is. Must be either "ok", "slightly_mad", or "on_fire"
- companyId: ID of company the complaint is linked to
- content: More detailed description of complaint

```
GET /api/data/replies/<complaintId>
```

Returns a list of replies for a given complaint.

```
POST /api/data/replies/insert
```

Inserts a new reply into the database. Accepts the following body fields:

- complaintId: ID of complaint the reply is linked to
- content: Body of reply

```
GET /api/data/images/<complaintId>
```

Gets images linked to a given complaint.
