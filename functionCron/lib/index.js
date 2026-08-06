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
exports.cronBucket = exports.cronCounters = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
(0, app_1.initializeApp)();
// Cache singleton – avoids repeated SDK look-ups
let _db;
const db = () => (_db ?? (_db = (0, firestore_1.getFirestore)()));
const COUNTER_FIELDS = [
    'kind',
    'year',
    'tags',
    'model',
    'lens',
    'email',
    'nick',
];
const delimiter = '||'; // for counter id
const counterId = (field, value) => {
    return `${field}${delimiter}${value}`.replace(/\//g, '%2F');
};
/** Commit an array of write-batch operations in chunks of up to 500. */
const commitBatches = async (ops) => {
    const MAX_BATCH = 500;
    const promises = [];
    for (let i = 0; i < ops.length; i += MAX_BATCH) {
        const batch = db().batch();
        const chunk = ops.slice(i, i + MAX_BATCH);
        for (const op of chunk) {
            op(batch);
        }
        promises.push(batch.commit());
    }
    await Promise.all(promises);
};
// Build new counters — only fetches the fields we need
const buildCounters = async () => {
    const newValues = {
        kind: {},
        year: {},
        tags: {},
        model: {},
        lens: {},
        email: {},
        nick: {},
    };
    // select() fetches only the listed fields, drastically reducing data transfer
    const querySnapshot = await db()
        .collection('Photo')
        .select(...COUNTER_FIELDS)
        .get();
    querySnapshot.forEach((doc) => {
        const obj = doc.data();
        for (const field of COUNTER_FIELDS) {
            if (field === 'tags') {
                const tags = Array.isArray(obj.tags) ? obj.tags : [];
                for (const tag of tags) {
                    newValues.tags[tag] = (newValues.tags[tag] ?? 0) + 1;
                }
            }
            else {
                const val = obj[field];
                if (val !== undefined && val !== null && val !== '') {
                    newValues[field][val] = (newValues[field][val] ?? 0) + 1;
                }
            }
        }
    });
    return newValues;
};
// 5PM America/Los_Angeles = 2AM Europe/Paris
exports.cronCounters = (0, scheduler_1.onSchedule)({ schedule: '0 17 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' }, async () => {
    logger.log('cronCounters START');
    // Run buildCounters and fetch existing counters in parallel
    const [newValues, existingSnapshot] = await Promise.all([
        buildCounters(),
        db().collection('Counter').get(),
    ]);
    // Delete all existing counters using batched writes
    const deleteOps = existingSnapshot.docs.map((doc) => (batch) => {
        batch.delete(doc.ref);
    });
    await commitBatches(deleteOps);
    logger.log(`cronCounters deleted ${deleteOps.length} existing counters`);
    // Create new counters using batched writes
    const counterRef = db().collection('Counter');
    const writeOps = [];
    for (const field of COUNTER_FIELDS) {
        for (const [key, count] of Object.entries(newValues[field])) {
            const docRef = counterRef.doc(counterId(field, key));
            writeOps.push((batch) => {
                batch.set(docRef, { field, value: key, count });
            });
        }
    }
    await commitBatches(writeOps);
    logger.log(`cronCounters created ${writeOps.length} new counters`);
});
// 6PM America/Los_Angeles = 3AM Europe/Paris
exports.cronBucket = (0, scheduler_1.onSchedule)({ schedule: '0 18 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' }, async () => {
    logger.log('cronBucket START');
    const res = {
        count: 0,
        size: 0,
    };
    // Only fetch the 'size' field — no need to download full documents
    const querySnapshot = await db().collection('Photo').select('size').get();
    querySnapshot.forEach((doc) => {
        res.count++;
        res.size += doc.data().size ?? 0;
    });
    await db().collection('Bucket').doc('total').set(res);
    logger.log(`cronBucket done: ${res.count} photos, ${res.size} bytes`);
});
