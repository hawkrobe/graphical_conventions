'use strict';
const _ = require('lodash');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const mongodb = require('mongodb');
const path = require('path');
const sendPostRequest = require('request').post;
const colors = require('colors/safe');

const app = express();
const ObjectID = mongodb.ObjectID;
const MongoClient = mongodb.MongoClient;
const port = 6001;
const mongoCreds = require('./auth.json');
const mongoURL = `mongodb://${mongoCreds.user}:${mongoCreds.password}@localhost:27017/`;
const handlers = {};

function makeMessage(text) {
  return `${colors.blue('[store]')} ${text}`;
}

function log(text) {
  console.log(makeMessage(text));
}

function error(text) {
  console.error(makeMessage(text));
}

function failure(response, text) {
  const message = makeMessage(text);
  console.error(message);
  return response.status(500).send(message);
}

function success(response, text) {
  const message = makeMessage(text);
  console.log(message);
  return response.send(message);
}

function mongoConnectWithRetry(delayInMilliseconds, callback) {
  MongoClient.connect(mongoURL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  }, (err, connection) => {
    if (err) {
      console.error(`Error connecting to MongoDB: ${err}`);
      setTimeout(() => mongoConnectWithRetry(delayInMilliseconds, callback), delayInMilliseconds);
    } else {
      log('connected succesfully to mongodb');
      callback(connection);
    }
  }
  );
}

function markAnnotation(collection, gameid, sketchid) {
  collection.updateOne({ _id: sketchid }, {
    $push: { games: gameid },
    $inc: { numGames: 1 }
  }, function (err, items) {
    if (err) {
      console.log(`error marking annotation data: ${err}`);
    } else {
      console.log(`successfully marked annotation. result: ${JSON.stringify(items)}`);
    }
  });
};

function serve() {

  mongoConnectWithRetry(2000, (connection) => {

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.post('/db/insert', (request, response) => {
      if (!request.body) {
        return failure(response, '/db/insert needs post request body');
      }
      console.log(`got request to insert into ${request.body.colname}`);

      const databaseName = request.body.dbname;
      const collectionName = request.body.colname;
      if (!collectionName) {
        return failure(response, '/db/insert needs collection');
      }
      if (!databaseName) {
        return failure(response, '/db/insert needs database');
      }
      const database = connection.db(databaseName);
      // Add collection if it doesn't already exist
      if (!database.collection(collectionName)) {
        console.log('creating collection ' + collectionName);
        database.createCollection(collectionName);
      }

      const collection = database.collection(collectionName);

      const data = _.omit(request.body, ['colname', 'dbname']);
      // log(`inserting data: ${JSON.stringify(data)}`);
      collection.insert(data, (err, result) => {
        if (err) {
          return failure(response, `error inserting data: ${err}`);
        } else {
          return success(response, `successfully inserted data. result: ${JSON.stringify(result)}`);
        }
      });
    });

    app.post('/db/getstims', (request, response) => {
      if (!request.body) {
        return failure(response, '/db/getstims needs post request body');
      }
      console.log(`got request to get stims from ${request.body.dbname}/${request.body.colname}`);

      const databaseName = request.body.dbname;
      const collectionName = request.body.colname;
      if (!collectionName) {
        return failure(response, '/db/getstims needs collection');
      }
      if (!databaseName) {
        return failure(response, '/db/getstims needs database');
      }

      const database = connection.db(databaseName);
      const collection = database.collection(collectionName);

      // sort by number of times previously served up and take the first
      collection.aggregate([
        { $addFields: { numGames: { $size: '$games' } } },
        { $sort: { numGames: 1 } },
        { $limit: 1 }
      ]).toArray((err, results) => {
        if (err) {
          console.log(err);
        } else {
            // Immediately mark as annotated so others won't get it too

          markAnnotation(collection, request.body.gameid, results[0]['_id']);
          response.send(results[0]);
        }
      });
    });

    app.listen(port, () => {
      log(`running at http://localhost:${port}`);
    });

  });

}

serve();
