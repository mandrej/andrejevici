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
            .then(async (response) => {
            const promises = [];
            response.responses.forEach((resp, idx) => {
                if (resp && idx < registrationTokens.length) {
                    if (!resp.success) {
                        promises.push(tokenDispacher(registrationTokens[idx], false, 'n/a'));
                    }
                    else {
                        promises.push(tokenDispacher(registrationTokens[idx], true, text));
                    }
                }
            });
            if (promises.length === 0) {
                res.status(200).send('No active subscribers found');
                logger.info(`No active subscribers found. No message sent`);
                return;
            }
            await Promise.all(promises);
        });
    }
    catch (error) {
        logger.error('Error sending multicast message:', error);
        res.status(500).json({ error: error.message });
    }
});
const tokenDispacher = async (token, status, msg) => {
    if (token === undefined)
        return;
    const docRef = (0, firestore_1.getFirestore)().collection('Device').doc(token);
    const doc = await docRef.get();
    const data = doc.data();
    let text = 'successfully sent';
    if (status) {
        logger.info(`Message sent to ${data?.email}`);
    }
    else {
        const diff = Date.now() - data?.timestamp.toMillis();
        text = 'removed token age ' + Math.floor(diff / 86400000);
        logger.info(`Removed token for ${data?.email} age ` + Math.floor(diff / 86400000));
        await docRef.delete();
    }
    await (0, firestore_1.getFirestore)().collection('Message').add({
        email: data?.email,
        message: msg,
        status: status,
        text: text,
        timestamp: firestore_1.FieldValue.serverTimestamp(),
    });
};
