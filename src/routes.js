const { ReadPreference } = require('mongodb');
const moment = require('moment');
const uuid = require('uuid');

const express = require('express');
const router = express.Router();


// Basic Operations
router.get('/users', async (req, res) => {
  const collection = req.app.locals.mongo.collection;
  const documents = await collection.find({}).toArray();
  return res.json({ documents });
});

router.post('/users', async (req, res) => {
  const collection = req.app.locals.mongo.collection;
  const result = await collection.insertOne({ name: 'name', value: 'value' });
  return res.json({ insertedId: result.insertedId });
});

router.delete('/users', async (req, res) => {
  const collection = req.app.locals.mongo.collection;
  const result = await collection.deleteMany({});
  return res.json(result);
});


// write-concern
router.post('/write-concern', async (req, res) => {
  const collection = req.app.locals.mongo.collection;

  /**
   * Default writeConcern waits until all replia nodes get the update (replica_0 delay_in_sec + replicate_1 delay_in_sec + ...)
   * w: 1 --> acknowledgment that the write operation has propagated to a specified number of mongod instances
   * w: 'majority' --> consider a replica set with 3 voting members, Primary-Secondary-Secondary (P-S-S). For this replica set, calculated majority is two
   */
  const writeConcern = {
    w: 'majority', // or you could use a custom write concern level
  };

  try {
    console.log('======== (write-concern) Start Time:', moment().format('HH:mm:ss'));
    const _id = req.query.id || uuid.v7()
    const res0 = await collection.insertOne({ _id, key: 'val' }, { writeConcern });
    console.log('======== (write-concern) Document inserted:', res0);
    console.log('======== (write-concern) End Time:', moment().format('HH:mm:ss'));

  } catch (error) {
    console.error('Error:', error);
  }

  res.json({ ok: 'ok' });
});

// read-concern
router.get('/read-concern', async (req, res) => {
  const collection = req.app.locals.mongo.collection;

  /**
   * local: Returns the most recent data available for the node that receives the read operation. This is the default behavior. (immediate response)
   * 
   * majority: Returns the data that has been acknowledged by the majority of the replica set. (majority of nodes have the data, immediate response)
   * Having a cluster of 3 nodes, if only one node has the requested document, then db returns null immediately, because 2 nodes out of 3 nodes do not have the data. 
   * 
   * linearizable: Ensures the data is acknowledged by most members and guarantees the read data reflects the latest acknowledged write. (Waits until getting response from the majority of nodes)
   * Having a cluster of 3 nodes, if only one node has the requested document, then db waits until at least 2 nodes (majority) have the data. 
   */
  const readConcern = {
    level: 'local',
  };

  try {
    console.log('======== (read-concern) Start Time:', moment().format('HH:mm:ss'));
    const result = await collection.findOne({ _id: req.query.id }, { readConcern, readPreference: 'primary' });
    console.log('======== (read-concern) Document read:', result);
    console.log('======== (read-concern) End Time:', moment().format('HH:mm:ss'));

    res.json({ result });

  } catch (error) {
    console.error('Error:', error);
  }
});


// causal-consistency
router.post('/causal-consistency', async (req, res) => {
  const client = req.app.locals.mongo.client
  const db = req.app.locals.mongo.db

  // Enable causal consistency
  const collection = db.collection('testCollection', { readConcern: { level: 'majority' }, readPreference: ReadPreference.SECONDARY });

  // Start a session for User A
  const sessionA = client.startSession({ causalConsistency: true });

  try {
    sessionA.startTransaction();

    const commentA = {
      comment_id: "comment_id_1",
      user: "UserA",
      text: "This is Comment A",
      replies: [],
      timestamp: new Date()
    };

    console.log('===== (sessionA) Insert', moment().format('HH:mm:ss'))
    await collection.insertOne(commentA, { session: sessionA });
    console.log('===== (sessionA) Insert done', moment().format('HH:mm:ss'))

    // Read previous write, even from a secondary!
    console.log('===== (sessionA) Read', moment().format('HH:mm:ss'))
    const comments = await collection.find({}, { session: sessionA }).toArray();
    console.log('===== (sessionA) Read done', moment().format('HH:mm:ss'), comments)

    console.log('===== (sessionA) commit', moment().format('HH:mm:ss'))
    await sessionA.commitTransaction();
    console.log('===== (sessionA) commit done', moment().format('HH:mm:ss'))

  } catch (transactionError) {
    console.log('Transaction error:', transactionError);
    await sessionA.abortTransaction();
  } finally {
    sessionA.endSession();
  }

  // Start a session for User B to reply to Comment A
  const sessionB = client.startSession({ causalConsistency: true });

  try {
    sessionB.startTransaction();

    const replyB = {
      reply_id: "reply456",
      user: "UserB",
      text: "This is Reply B",
      timestamp: new Date()
    };

    console.log('===== (sessionB) Update', moment().format('HH:mm:ss'))
    await collection.updateOne(
      { comment_id: "comment_id_1" },
      { $push: { replies: replyB } },
      { session: sessionB }
    );
    console.log('===== (sessionB) Update done', moment().format('HH:mm:ss'))

    // Read previous write, even from a secondary!
    console.log('===== (sessionB) Read', moment().format('HH:mm:ss'))
    const comments = await collection.find({}, { session: sessionB }).toArray();
    console.log('===== (sessionB) Read done', moment().format('HH:mm:ss'), comments)


    console.log('===== (sessionB) commit', moment().format('HH:mm:ss'))
    await sessionB.commitTransaction();
    console.log('===== (sessionB) commit done', moment().format('HH:mm:ss'))

  } catch (transactionError) {
    console.log('Transaction error:', transactionError);
    await sessionB.abortTransaction();
  } finally {
    sessionB.endSession();
  }

  // Start a session for User C to load comments
  const sessionC = client.startSession({ causalConsistency: true });

  try {
    sessionC.startTransaction();

    console.log('===== (sessionC) Read', moment().format('HH:mm:ss'))
    const comments = await collection.find({}, { session: sessionC }).toArray();
    console.log('===== (sessionC) Read done', moment().format('HH:mm:ss'), comments)

  } catch (findError) {
    console.log('Find error:', findError);
  } finally {
    sessionC.endSession();
  }

  res.json({ status: 'ok' });
});

module.exports = router;