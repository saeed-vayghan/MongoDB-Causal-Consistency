#!/bin/bash

sleep 10

echo "Initializing MongoDB Replica Set"
mongosh --host mongo1:27017 -u root -p example --authenticationDatabase admin --eval 'rs.initiate({
  _id : "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})'