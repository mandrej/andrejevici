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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronBucket = exports.cronCounters = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const es6_promise_pool_1 = __importDefault(require("es6-promise-pool"));
const logger = __importStar(require("firebase-functions/logger"));
(0, app_1.initializeApp)();
const delimiter = '||'; // for counter id
const counterId = (field, value) => {
    return `Photo${delimiter}${field}${delimiter}${value}`; // FIXME Photo is hard coded
};
// Build new counters
const buildCounters = async () => {
    const newValues = {
        year: {},
        tags: {},
        model: {},
        lens: {},
        email: {},
        nick: {},
    };
    const query = (0, firestore_1.getFirestore)().collection('Photo').orderBy('date', 'desc');
    const querySnapshot = await query.get();
    querySnapshot.forEach((doc) => {
        const obj = doc.data();
        Object.keys(newValues).forEach((field) => {
            if (field === 'tags') {
                const tags = Array.isArray(obj.tags) ? obj.tags : [];
                for (const tag of tags) {
                    newValues.tags[tag] = (newValues.tags[tag] ?? 0) + 1;
                }
            }
            else {
                const val = obj[field];
                if (val !== undefined && val !== null && val !== '') {
                    newValues[field][val] =
                        (newValues[field][val] ?? 0) + 1;
                }
            }
        });
    });
    return newValues;
};
// 5PM America/Los_Angeles = 2AM Europe/Paris
exports.cronCounters = (0, scheduler_1.onSchedule)({ schedule: '0 17 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' }, async () => {
    logger.log('cronCounters START');
    const newValues = await buildCounters();
    const query = (0, firestore_1.getFirestore)().collection('Counter');
    const querySnapshot = await query.get();
    // Delete existing counters using PromisePool
    const docsToDelete = querySnapshot.docs;
    let deleteIndex = 0;
    const deleteProducer = () => {
        if (deleteIndex >= docsToDelete.length) {
            return undefined;
        }
        const doc = docsToDelete[deleteIndex];
        deleteIndex++;
        if (!doc) {
            return undefined;
        }
        return (0, firestore_1.getFirestore)().collection('Counter').doc(doc.id).delete();
    };
    const deletePool = new es6_promise_pool_1.default(deleteProducer, 10);
    await deletePool.start();
    logger.log(`cronCounters deleted ${deleteIndex} existing counters`);
    // Create an array of all write operations
    const writeOperations = [];
    for (const field in newValues) {
        for (const [key, count] of Object.entries(newValues[field])) {
            writeOperations.push({ field, key, count });
        }
    }
    // Generator function to create promises for the pool
    let operationIndex = 0;
    const promiseProducer = () => {
        if (operationIndex >= writeOperations.length) {
            return undefined;
        }
        const operation = writeOperations[operationIndex];
        operationIndex++;
        if (!operation) {
            return undefined;
        }
        const { field, key, count } = operation;
        return (0, firestore_1.getFirestore)()
            .collection('Counter')
            .doc(counterId(field, key))
            .set({ field, value: key, count });
    };
    // Create and execute the promise pool with concurrency of 5
    const pool = new es6_promise_pool_1.default(promiseProducer, 5);
    await pool.start();
    logger.log(`cronCounters created ${operationIndex} new counters`);
});
// 6PM America/Los_Angeles = 3AM Europe/Paris
exports.cronBucket = (0, scheduler_1.onSchedule)({ schedule: '0 18 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' }, async () => {
    logger.log('Get new value');
    const res = {
        count: 0,
        size: 0,
    };
    const query = (0, firestore_1.getFirestore)().collection('Photo').orderBy('date', 'desc');
    const querySnapshot = await query.get();
    querySnapshot.forEach((doc) => {
        const obj = doc.data();
        res.count++;
        res.size += obj.size;
    });
    logger.log('Write new value');
    (0, firestore_1.getFirestore)().collection('Bucket').doc('total').set(res);
});
