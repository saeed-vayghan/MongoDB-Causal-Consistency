const express = require('express');
const { MongoClient } = require('mongodb');

const apiRoutes = require('./routes.js');

// Setup mongodb clients
const uri = 'mongodb://root:example@mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0&authSource=admin';
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000,
  loggerLevel: 'debug'
});

// Setup router
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

// Starting server
async function startServer() {
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB replica set');

    const db = client.db('testdb');
    const collection = db.collection('testCollection');

    app.locals.mongo = {}
    app.locals.mongo.client = client
    app.locals.mongo.db = db
    app.locals.mongo.collection = collection

    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });

  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

startServer();