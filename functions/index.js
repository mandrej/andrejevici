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
const TOPIC = "newimages";

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
    const registrationTokens = [];
    const text = req.body.text;
    if (text.length === 0) res.send("No message error");
    const msg = {
      topic: TOPIC,
      notification: {
        title: "Andrejevici",
        body: text,
      },
    };

    const query = getFirestore().collection("User").where("token", "!=", "no");
    const querySnapshot = await query.get();
    if (querySnapshot.size === 0) res.status(200).send("No subscribers error");

    querySnapshot.forEach((docSnap) => {
      registrationTokens.push(docSnap.data().token);
    });

    getMessaging()
      .subscribeToTopic(registrationTokens, TOPIC)
      .then((response) => {
        response.errors.forEach((it) => {
          if (it.error.code === "messaging/registration-token-not-registered") {
            logger.info(it.error.code, it.index);
            removeToken(registrationTokens[it.index]);
            registrationTokens.splice(it.index, 1);
          }
        });
        // logger.info("Successfully subscribed to topic:", response);
      })
      .catch((error) => {
        logger.info("Error subscribing to topic:", error);
      });

    if (registrationTokens.length === 0) {
      res.status(200).send("No subscribers error");
    } else {
      getMessaging()
        .send(msg)
        .then((response) => {
          logger.info(response);
          res.write(response);
        })
        .catch((error) => {
          logger.error(error);
          res.write(error);
        })
        .finally(() => {
          res.end();
        });
    }
  }
);

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
