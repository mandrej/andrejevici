/* eslint-disable comma-dangle */
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

exports.notify = onRequest(
  {
    timeoutSeconds: 120,
    region: ["us-central1"],
    cors: [/andrejevici\.web\.app/, "localhost"],
  },
  async (req, res) => {
    const promises = [];
    const text = req.body.text.trim();
    if (text.length === 0) res.send("No message error");

    const query = getFirestore().collection("User").where("token", "!=", "no");
    const querySnapshot = await query.get();
    if (querySnapshot.size === 0) res.status(200).send("No subscribers error");

    querySnapshot.forEach((docSnap) => {
      promises.push(messagePromise(text, docSnap.data().token));
    });

    Promise.all(promises)
      .then((results) => {
        results.forEach((it) => {
          logger.info(it);
          res.write(it);
        });
      })
      .catch((error) => {
        // on first rejected promise
        logger.info(error);
        res.write(error);
      })
      .finally(() => {
        res.end();
      });
  }
);

const messagePromise = (text, token) => {
  return new Promise((resolve, reject) => {
    const msg = {
      data: {
        title: "Notification from Andrejevici",
        body: text,
        link: "http://andrejevici.web.app/",
      },
      token: token,
    };

    getMessaging()
      .send(msg)
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        if (error.code == "messaging/registration-token-not-registered") {
          removeToken(msg.token);
          resolve(msg.token);
        } else {
          reject(error);
        }
      });
  });
};

const removeToken = async (token) => {
  if (token === undefined) return;
  const query = getFirestore().collection("User").where("token", "==", token);
  const querySnapshot = await query.get();
  querySnapshot.forEach(async (docSnap) => {
    const docRef = getFirestore().doc("User/" + docSnap.id);
    await docRef.update({
      token: "no",
      ask_push: true,
      allow_push: false,
    });
    logger.info(`Expired token deleted for ${docSnap.data().email}`);
  });
};
