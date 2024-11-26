# NodeJS React

This project was created as part of Maximilian's Schwarzmuller's NodeJS - The Complete Guide course.
This specific project follows the NodeJS Complete Guide project currently in this repo, and uses
Node and React, separating out the UI elements from the Complete Guide into a React front end,
and makes use of REST APIs, JWT, async-await, and websockets to emit updates to other instances
of the app.

## Installing MongoDB

https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/

```
brew tap mongodb/brew
brew update
brew install mongodb-community@8.0
npm i mongodb
```

Brew installs an x86 version of mongodb, so download the latest macOS ARM version from...
https://www.mongodb.com/try/download/community-edition/releases

Install in ~/mongodb, then...

```
cd /usr/local/Cellar/mongodb-community/8.0.1/bin
sudo cp -p ~/mongodb/bin/* .
sudo chgrp admin *
```

## Starting MongoDB

```
mongod --config /usr/local/etc/mongod.conf --fork
```

## Stopping MongoDB

```
mongosh
db.shutdownServer()
```

## Sample MongoDB usage

https://www.mongodb.com/docs/manual/tutorial/manage-users-and-roles/
https://www.mongodb.com/docs/manual/crud/

## Creating a root user

```
use admin
db.createUser(
  {
    user: "root",
    pwd: passwordPrompt(), // or cleartext password
    roles: [
      { role: "userAdminAnyDatabase", db: "admin" },
      { role: "readWriteAnyDatabase", db: "admin" }
    ]
  }
)
```

## Creating a non-root user

```
use messages
db.createUser(
  {
    user: "udemy",
    pwd:  "udemy",
    roles: [ { role: "readWrite", db: "messages" } ]
  }
)
db.getUsers()
db.getUser('udemy')
db.grantRolesToUser(
    "udemy",
    [
      { role: "readWrite", db: "messages" }
    ]
)
db.revokeRolesFromUser(
    "udemy",
    [
      { role: "readWrite", db: "udemy" }
    ]
)
db.dropUser('udemy')
```
