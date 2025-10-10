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
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_2 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
exports.notify = (0, https_1.onRequest)(
// : Cloud Functions can be configured with a maximum timeout of 540 seconds (9 minutes)
{
    timeoutSeconds: 540,
    region: ['us-central1'],
    cors: ['https://andrejevici.web.app', 'http://localhost:9200'],
}, async (req, res) => {
    const registrationTokens = [];
    const text = req.body.text;
    const query = (0, firestore_1.getFirestore)().collection('Device');
    const querySnapshot = await query.get();
    querySnapshot.forEach((docSnap) => {
        registrationTokens.push(docSnap.id);
    });
    if (registrationTokens.length === 0) {
        res.status(200).send('No subscribers found error');
        return;
    }
    const message = {
        tokens: registrationTokens,
        data: {
            title: 'Andrejevici',
            body: text,
            link: 'https://andrejevici.web.app/',
        },
    };
    try {
        (0, messaging_1.getMessaging)()
            .sendEachForMulticast(message)
            .then((response) => {
            const failedTokens = [];
            const successTokens = [];
            response.responses.forEach((resp, idx) => {
                if (resp && idx < registrationTokens.length) {
                    if (!resp.success) {
                        failedTokens.push(registrationTokens[idx]);
                    }
                    else {
                        successTokens.push(registrationTokens[idx]);
                    }
                }
            });
            if (failedTokens.length > 0) {
                failedTokens.forEach(async (token) => await removeToken(token));
            }
            if (successTokens.length > 0) {
                successTokens.forEach(async (token) => await messageSent(token, text));
            }
            else if (successTokens.length === 0) {
                res.status(200).send('No active subscribers found');
                logger.info(`No active subscribers found. No message sent`);
            }
        });
    }
    catch (error) {
        logger.error('Error sending multicast message:', error);
        res.status(500).json({ error: error.message });
    }
});
const removeToken = async (token) => {
    if (token === undefined)
        return;
    const docRef = (0, firestore_1.getFirestore)().collection('Device').doc(token);
    const doc = await docRef.get();
    const data = doc.data();
    const diff = Date.now() - data?.timestamp;
    logger.info(`Removed token for ${data?.email} age ` + Math.floor(diff / 86400000));
    await docRef.delete();
    await (0, firestore_1.getFirestore)()
        .collection('Message')
        .add({
        email: data?.email,
        text: '-',
        status: 'removed token age ' + Math.floor(diff / 86400000),
        timestamp: firestore_2.Timestamp.fromDate(new Date()),
    });
};
const messageSent = async (token, text) => {
    if (token === undefined)
        return;
    const docRef = (0, firestore_1.getFirestore)().collection('Device').doc(token);
    const doc = await docRef.get();
    const data = doc.data();
    logger.info(`Message sent to ${data?.email}`);
    await (0, firestore_1.getFirestore)()
        .collection('Message')
        .add({
        email: data?.email,
        text: text,
        status: 'successfully sent',
        timestamp: firestore_2.Timestamp.fromDate(new Date()),
    });
};
