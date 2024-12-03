#!/bin/bash

# Wait for MongoDB to start
until mongo --eval "print(\"waited for connection\")"
do
    sleep 1
done

# Initialize replica set
mongo --eval 'rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb:27017" }
  ]
})'

# Create indexes
mongo gape_mvp --eval '
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });
db.sessions.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });
'
