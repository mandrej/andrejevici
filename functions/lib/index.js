"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = void 0;
/* eslint-disable comma-dangle */
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const TOPIC = 'newimages';
(0, app_1.initializeApp)();
exports.notify = (0, https_1.onRequest)({
    timeoutSeconds: 120,
    region: ['us-central1'],
    cors: ['https://andrejevici.web.app', 'http://localhost:9200'],
}, async (req, res) => {
    const registrationTokens = [];
    const text = req.body.text;
    if (!text || text.length === 0) {
        res.send('No message error');
        return;
    }
    const msg = {
        topic: TOPIC,
        data: {
            title: 'Andrejevici',
            body: text,
            link: 'https://andrejevici.web.app/',
        },
    };
    const query = (0, firestore_1.getFirestore)().collection('Device');
    const querySnapshot = await query.get();
    if (querySnapshot.size === 0) {
        res.status(200).send('No subscribers error');
        return;
    }
    querySnapshot.forEach((docSnap) => {
        registrationTokens.push(docSnap.id);
    });
    if (registrationTokens.length > 0) {
        const tokens = await unsubscribe(registrationTokens);
        if (tokens.length > 0) {
            (0, messaging_1.getMessaging)()
                .send(msg)
                .then((response) => {
                logger.info('send response:', response);
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
        else {
            res.status(200).send('All tokens expired');
        }
    }
    else {
        res.status(200).send('No subscribers');
    }
});
const unsubscribe = async (tokens) => {
    const resp = await (0, messaging_1.getMessaging)().unsubscribeFromTopic(tokens, TOPIC);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resp.errors.forEach((it) => {
        const token = tokens[it.index];
        if (token !== undefined &&
            (it.error.code === 'messaging/invalid-registration-token' ||
                it.error.code === 'messaging/registration-token-not-registered')) {
            removeToken(token);
            tokens.splice(it.index, 1);
        }
    });
    if (tokens.length > 0) {
        await (0, messaging_1.getMessaging)().subscribeToTopic(tokens, TOPIC);
    }
    return tokens;
};
const removeToken = async (token) => {
    if (token === undefined)
        return;
    const docRef = (0, firestore_1.getFirestore)().collection('Device').doc(token);
    const doc = await docRef.get();
    logger.info(`Remove token for ${doc.data()?.email}`);
    await docRef.delete();
};
