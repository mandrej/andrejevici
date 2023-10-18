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
  { cors: [/andrejevici\.web\.app/, "localhost"] },
  async (req, res) => {
    const text = req.body.text.trim();
    if (text.length === 0) res.send("No message error");

    const msg = {
      notification: {
        title: "Notification from Andrejevici",
        body: text,
      },
    };
    const query = getFirestore().collection("User").where("token", "!=", "no");
    const querySnapshot = await query.get();
    if (querySnapshot.size === 0) res.send("No subscribers error");

    querySnapshot.forEach((documentSnapshot) => {
      msg.token = documentSnapshot.data().token;
      getMessaging()
        .send(msg)
        .then((response) => {
          logger.info(response);
          res.end();
        })
        .catch((error) => {
          if (error.code == "messaging/registration-token-not-registered") {
            removeToken(documentSnapshot.token);
          } else {
            logger.error(error);
          }
        });
    });
  }
);

const removeToken = async (token) => {
  const query = getFirestore().collection("User").where("token", "==", token);
  const querySnapshot = await query.get();
  querySnapshot.forEach(async (documentSnapshot) => {
    const docRef = getFirestore().doc("User/" + documentSnapshot.id);
    await docRef.update({
      token: "no",
      ask_push: true,
      allow_push: false,
    });
    logger.info("Expired token deleted");
  });
};
