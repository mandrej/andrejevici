/* eslint-disable comma-dangle */
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const TOPIC = "newimages";

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.notify = onRequest(
  {
    timeoutSeconds: 120,
    region: ["us-central1"],
    cors: ["https://andrejevici.web.app", "http://localhost:9200"],
  },
  async (req, res) => {
    const registrationTokens = [];
    const text = req.body.text;
    if (text.length === 0) res.send("No message error");
    const msg = {
      topic: TOPIC,
      data: {
        title: "Andrejevici",
        body: text,
        link: "https://andrejevici.web.app/",
      },
    };

    const query = getFirestore().collection("Device");
    const querySnapshot = await query.get();
    if (querySnapshot.size === 0) res.status(200).send("No subscribers error");

    querySnapshot.forEach((docSnap) => {
      registrationTokens.push(docSnap.id);
    });

    if (registrationTokens.length > 0) {
      const tokens = await unsubscribe(registrationTokens);
      if (tokens.length > 0) {
        getMessaging()
          .send(msg)
          .then((response) => {
            logger.info("send response:", response);
            res.write(response);
          })
          .catch((error) => {
            logger.error(error);
            res.write(error);
          })
          .finally(() => {
            res.end();
          });
      } else {
        res.status(200).send("All tokens expired");
      }
    } else {
      res.status(200).send("No subscribers");
    }
  }
);

const unsubscribe = async (tokens) => {
  const resp = await getMessaging().unsubscribeFromTopic(tokens, TOPIC);
  resp.errors.forEach((it) => {
    if (
      it.error.code === "messaging/invalid-registration-token" ||
      it.error.code === "messaging/registration-token-not-registered"
    ) {
      removeToken(tokens[it.index]);
      tokens.splice(it.index, 1);
    }
  });
  if (tokens.length > 0) {
    await getMessaging().subscribeToTopic(tokens, TOPIC);
  }
  return tokens;
};

const removeToken = async (token) => {
  if (token === undefined) return;
  const docRef = getFirestore().collection("Device").doc(token);
  const doc = await docRef.get();
  logger.info(`Remove token for ${doc.data().email}`);
  await docRef.delete();
};
