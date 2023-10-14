/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const sendPromise = (token, text) => {
  return new Promise((resolve, reject) => {
    const msg = {
      notification: {
        title: "Notification from Andrejevici",
        body: text,
      },
      token: token,
    };
    getMessaging()
      .send(msg)
      .then((response) => {
        resolve(response);
      });
  });
};

exports.send = onRequest(async (req, res) => {
  const promises = [];
  const period = 3 * 30 * 24 * 3600 * 1000; // 3 months
  const now = +new Date();
  const text = req.query.text;
  const query = getFirestore()
    .collection("Subscriber")
    .where("at", ">=", now - period);
  const querySnapshot = await query.get();
  querySnapshot.forEach((documentSnapshot) => {
    promises.push(sendPromise(documentSnapshot.id, text));
  });

  Promise.all(promises)
    .then((results) => {
      results.forEach((it) => {
        logger.info(it);
        res.send(it);
      });
    })
    .catch((err) => {
      logger.error(err);
    });
});
