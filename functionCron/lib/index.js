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
exports.cronCounters = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/scheduler");
// import PromisePool from 'es6-promise-pool'
const logger = __importStar(require("firebase-functions/logger"));
(0, app_1.initializeApp)();
const counterId = (field, value) => {
    return `${field}_${value}`;
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
exports.cronCounters = (0, scheduler_1.onSchedule)('every day 02:00', async () => {
    logger.log('Get new value');
    const newValues = await buildCounters();
    logger.log('Delete old value');
    const query = (0, firestore_1.getFirestore)().collection('Counter');
    const querySnapshot = await query.get();
    querySnapshot.forEach((doc) => {
        (0, firestore_1.getFirestore)().collection('Counter').doc(doc.id).delete();
    });
    logger.log('Write new value');
    for (const field in newValues) {
        for (const [key, count] of Object.entries(newValues[field])) {
            (0, firestore_1.getFirestore)()
                .collection('Counter')
                .doc(counterId(field, key))
                .set({ field, value: key, count });
        }
    }
});
