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
exports.generateThumbnail = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const storage_2 = require("firebase-functions/v2/storage");
const logger = __importStar(require("firebase-functions/logger"));
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
(0, app_1.initializeApp)();
// Cache singletons – avoids repeated SDK look-ups on every invocation
let _db;
let _storage;
const db = () => (_db ?? (_db = (0, firestore_1.getFirestore)()));
const storage = () => (_storage ?? (_storage = (0, storage_1.getStorage)()));
const THUMB_SIZE = 400;
const THUMB_PREFIX = 'thumbnails/';
const THUMB_SUFFIX = `_${THUMB_SIZE}x${THUMB_SIZE}.jpeg`;
const THUMB_CACHE_CONTROL = 'public, max-age=604800';
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const LOCKS_COLLECTION = 'thumbnailLocks';
/**
 * Acquires a Firestore distributed lock for the given file path.
 * Returns true if the lock was successfully claimed, false if another
 * instance already holds it (duplicate trigger — safe to skip).
 *
 * The lock document is keyed by a sanitised version of the file path so
 * concurrent Cloud Function instances processing the same upload will race
 * on the Firestore transaction and only one will proceed.
 */
const acquireLock = async (filePath) => {
    const lockId = filePath.replace(/\//g, '_').replace(/\./g, '-');
    const lockRef = db().collection(LOCKS_COLLECTION).doc(lockId);
    try {
        await db().runTransaction(async (tx) => {
            const snap = await tx.get(lockRef);
            if (snap.exists) {
                // Another instance is already processing this file
                throw new Error('LOCK_EXISTS');
            }
            tx.set(lockRef, {
                filePath,
                startedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        return true;
    }
    catch (err) {
        if (err instanceof Error && err.message === 'LOCK_EXISTS') {
            return false;
        }
        throw err;
    }
};
/** Releases the lock so the file can be retried if processing failed. */
const releaseLock = async (filePath) => {
    const lockId = filePath.replace(/\//g, '_').replace(/\./g, '-');
    await db().collection(LOCKS_COLLECTION).doc(lockId).delete();
};
exports.generateThumbnail = (0, storage_2.onObjectFinalized)({
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
}, async (event) => {
    const filePath = event.data.name ?? '';
    const contentType = event.data.contentType ?? '';
    const bucketName = event.data.bucket;
    // Skip if not an image, unless contentType is vaguely defined or empty. We also check the extension below safely.
    if (contentType &&
        !contentType.startsWith('image/') &&
        contentType !== 'application/octet-stream') {
        logger.info(`Skipping non-image file based on content type: ${filePath} (${contentType})`);
        return;
    }
    const ext = path.extname(filePath).toLowerCase();
    // Skip unsupported extensions
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        logger.info(`Skipping unsupported extension: ${ext}`);
        return;
    }
    // Skip files already inside the thumbnails folder to avoid infinite loops
    if (filePath.startsWith(THUMB_PREFIX)) {
        logger.info(`Skipping already-thumbnail file: ${filePath}`);
        return;
    }
    // Acquire distributed lock — guards against duplicate trigger executions
    // that can occur when multiple images are uploaded simultaneously
    const locked = await acquireLock(filePath);
    if (!locked) {
        logger.info(`Skipping duplicate trigger for: ${filePath} — already being processed`);
        return;
    }
    const fileName = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    // Build the destination path: thumbnails/<original-dir>/<filename>_400x400.jpeg
    const thumbSubDir = dir === '.' ? THUMB_PREFIX : `${THUMB_PREFIX}${dir}/`;
    const thumbFileName = `${fileName}${THUMB_SUFFIX}`;
    const thumbFilePath = `${thumbSubDir}${thumbFileName}`;
    logger.info(`Generating thumbnail for ${filePath} -> ${thumbFilePath}`);
    const bucket = storage().bucket(bucketName);
    try {
        // Stream-based pipeline: Storage read → sharp → Storage write
        // Eliminates two temp-file disk round-trips for maximum speed
        const sourceStream = bucket.file(filePath).createReadStream();
        const transformer = (0, sharp_1.default)({ failOn: 'none' })
            .resize(THUMB_SIZE, THUMB_SIZE, {
            fit: 'cover',
            position: 'centre',
        })
            .jpeg({ quality: 85, progressive: true });
        const destFile = bucket.file(thumbFilePath);
        const destStream = destFile.createWriteStream({
            resumable: false, // small file — skip resumable overhead
            public: true,
            metadata: {
                contentType: 'image/jpeg',
                cacheControl: THUMB_CACHE_CONTROL,
                metadata: {
                    originalFile: filePath,
                    generatedBy: 'generateThumbnail',
                },
            },
        });
        await new Promise((resolve, reject) => {
            sourceStream.on('error', reject);
            transformer.on('error', reject);
            destStream.on('error', reject);
            destStream.on('finish', resolve);
            sourceStream.pipe(transformer).pipe(destStream);
        });
        logger.info(`Thumbnail uploaded to ${thumbFilePath}`);
    }
    catch (error) {
        logger.error(`Error generating thumbnail for ${filePath}:`, error);
        throw error;
    }
    finally {
        // Release the lock so failed files can be retried
        await releaseLock(filePath).catch((e) => logger.warn(`Failed to release lock for ${filePath}:`, e));
    }
});
