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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
(0, app_1.initializeApp)();
// Cache singletons – avoids repeated SDK look-ups on every invocation
let _db;
let _messaging;
const db = () => (_db ?? (_db = (0, firestore_1.getFirestore)()));
const messaging = () => (_messaging ?? (_messaging = (0, messaging_1.getMessaging)()));
exports.notify = (0, https_1.onRequest)(
// : Cloud Functions can be configured with a maximum timeout of 540 seconds (9 minutes)
{
    timeoutSeconds: 540,
    region: ['us-central1'],
    cors: [
        'https://andrejevici.web.app',
        'https://andrejevici.firebaseapp.com', // (Highly recommended in case users access via firebaseapp.com)
        'http://localhost:5173',
    ],
}, async (req, res) => {
    logger.info('Notify request received', { body: req.body });
    try {
        const text = req.body.text;
        if (!text) {
            res.status(400).send('No message text provided');
            return;
        }
        // Fetch only the fields we need from Device docs
        const querySnapshot = await db().collection('Device').select('email', 'timestamp').get();
        if (querySnapshot.empty) {
            res.status(200).json([]);
            return;
        }
        // Build token list and cache device data in one pass
        const registrationTokens = [];
        const deviceData = new Map();
        querySnapshot.forEach((docSnap) => {
            registrationTokens.push(docSnap.id);
            deviceData.set(docSnap.id, docSnap.data());
        });
        const message = {
            tokens: registrationTokens,
            data: {
                title: 'Andrejevici',
                body: text,
                link: 'https://andrejevici.web.app/',
            },
        };
        let response;
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            logger.info('Running in emulator environment. Mocking multicast messaging response.', {
                message,
            });
            response = {
                responses: registrationTokens.map(() => ({
                    success: true,
                    messageId: 'mock-message-id-' + Math.random().toString(36).substring(2, 9),
                })),
                successCount: registrationTokens.length,
                failureCount: 0,
            };
        }
        else {
            response = await messaging().sendEachForMulticast(message);
        }
        // Collect all Firestore writes into batched operations
        const MAX_BATCH = 500;
        const ops = [];
        const results = [];
        response.responses.forEach((resp, idx) => {
            if (!resp || idx >= registrationTokens.length)
                return;
            const token = registrationTokens[idx];
            if (!token)
                return;
            const data = deviceData.get(token);
            const email = data?.email || '';
            let statusText;
            let days;
            if (resp.success) {
                statusText = `sent successfully`;
            }
            else {
                const diff = Date.now() - (data?.timestamp?.toMillis() ?? Date.now());
                days = Math.floor(diff / 86400000);
                statusText = `removed expired token ${days} days old`;
                // Queue delete of stale token
                ops.push((batch) => {
                    batch.delete(db().collection('Device').doc(token));
                });
            }
            results.push({
                from: req.body.from || '',
                to: email,
                status: resp.success,
                ...(days !== undefined ? { days } : {}),
            });
            // Queue Message log entry
            ops.push((batch) => {
                batch.set(db().collection('Message').doc(), {
                    from: req.body.from || '',
                    to: email,
                    message: text,
                    status: resp.success,
                    text: statusText,
                    timestamp: firestore_1.FieldValue.serverTimestamp(),
                });
            });
        });
        if (ops.length === 0) {
            res.status(200).json([]);
            logger.info('No active subscribers found. No message sent');
            return;
        }
        // Commit all writes in parallel batches of 500
        const batchPromises = [];
        for (let i = 0; i < ops.length; i += MAX_BATCH) {
            const batch = db().batch();
            const chunk = ops.slice(i, i + MAX_BATCH);
            for (const op of chunk) {
                op(batch);
            }
            batchPromises.push(batch.commit());
        }
        await Promise.all(batchPromises);
        res.status(200).json(results);
    }
    catch (error) {
        logger.error('Error sending multicast message:', error);
        res.status(500).json({ error: error.message });
    }
});
