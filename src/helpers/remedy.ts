import { db, storage } from "../firebase";
import type { DocumentReference, DocumentSnapshot } from "firebase/firestore";
import {
  doc,
  query,
  getDocs,
  deleteDoc,
  getDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import {
  ref as storageRef,
  listAll,
  getMetadata,
  getDownloadURL,
} from "firebase/storage";
import CONFIG from "../../config";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useValuesStore } from "../stores/values";
import { useUserStore } from "../stores/user";
import { reFilename, counterId } from "../helpers";
import router from "../router";
import { counterCollection, photoCollection } from "../helpers/collections";

import notify from "./notify";
import type { PhotoType, ValuesState } from "./models";

import readExif from "./exif";

const app = useAppStore();
const meta = useValuesStore();
const auth = useUserStore();
const { uploaded } = storeToRefs(app);
const { user } = storeToRefs(auth);

/**
 * Fixes photos in the database by populating missing dimensions.
 *
 * @return {Promise<void>} A promise that resolves when the photos are fixed.
 */
export const fix = async () => {
  notify({
    message: "Finding records missing dimensions...",
    timeout: 0,
    spinner: true,
    group: "fix-dim",
  });

  try {
    const q = query(photoCollection);
    const querySnapshot = await getDocs(q);

    const toFix = querySnapshot.docs.filter((doc) => {
      const data = doc.data();
      // Check if dim is missing, null, or an empty array
      return !data.dim || (Array.isArray(data.dim) && data.dim.length === 0);
    });

    if (toFix.length === 0) {
      notify({
        type: "positive",
        message: "No records missing dimensions",
        icon: "check",
        group: "fix-dim",
      });
      return;
    }

    notify({
      message: `Found ${toFix.length} records to fix. Processing...`,
      timeout: 0,
      spinner: true,
      group: "fix-dim",
    });

    let fixedCount = 0;
    let errorCount = 0;
    const batchLimit = 400;
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of toFix) {
      const filename = docSnap.id;
      try {
        const _ref = storageRef(storage, filename);
        const url = await getDownloadURL(_ref);
        const exif = await readExif(url);

        if (exif && exif.dim) {
          batch.update(docSnap.ref, { dim: exif.dim });
          count++;
          fixedCount++;

          if (count >= batchLimit) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        } else {
          console.warn(`Could not find dimensions for ${filename}`);
          errorCount++;
        }
      } catch (e) {
        console.error(`Failed to process ${filename}:`, e);
        errorCount++;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    notify({
      type: fixedCount > 0 ? "positive" : "warning",
      message: `Fixed ${fixedCount} records. ${errorCount > 0 ? `Errors: ${errorCount}` : ""}`,
      icon: fixedCount > 0 ? "check" : "warning",
      timeout: 5000,
      group: "fix-dim",
    });
  } catch (error) {
    notify({
      type: "negative",
      message:
        "Failed to run fix: " +
        (error instanceof Error ? error.message : String(error)),
      group: "fix-dim",
    });
  }
};

/**
 * Gets the storage data for a file.
 *
 * @param {string} filename - The name of the file.
 * @return {Promise<PhotoType | null>} A promise that resolves to an object containing the storage data, or null if the file does not exist.
 */
const getStorageData = async (filename: string) => {
  try {
    const _ref = storageRef(storage, filename);
    const downloadURL = await getDownloadURL(_ref);
    const metadata = await getMetadata(_ref);
    if (downloadURL) {
      return {
        url: downloadURL,
        filename: filename,
        size: metadata.size || 0,
        email: user.value?.email,
        nick: user.value?.nick,
      };
    } else {
      throw new Error(`Failed to get download URL for file: ${filename}`);
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Gets the missing thumbnails.
 *
 * @return {Promise<void>} A promise that resolves when the missing thumbnails are found.
 */
export const missingThumbnails = async () => {
  notify({
    group: "thumbnails",
    message: `Please wait`,
    spinner: true,
    timeout: 0,
  });

  const photoMap = new Map<string, string[]>();
  const thumbSet = new Set<string>();
  const allowedExts = [".jpg", ".jpeg", ".png"];

  const photoRefs = await listAll(storageRef(storage, ""));
  photoRefs.items.forEach((r) => {
    const match = r.name.match(reFilename);
    if (!match) return;
    const [, name, ext] = match;
    if (name && ext && allowedExts.includes(ext.toLowerCase())) {
      const list = photoMap.get(name) || [];
      list.push(r.name);
      photoMap.set(name, list);
    }
  });

  const thumbRefs = await listAll(storageRef(storage, CONFIG.thumbnails));
  thumbRefs.items.forEach((r) =>
    thumbSet.add(r.name.replace(CONFIG.thumbSuffix, "")),
  );

  const missing = Array.from(photoMap.keys())
    .filter((x) => !thumbSet.has(x))
    .sort();

  const promises: Array<Promise<DocumentSnapshot>> = [];
  missing.forEach((name) => {
    const filenames = photoMap.get(name);
    filenames?.forEach((filename) => {
      const docRef = doc(photoCollection, filename);
      promises.push(getDoc(docRef));
    });
  });

  let hit = 0;
  const results = await Promise.allSettled(promises);
  let message: string = "";
  results.forEach((it) => {
    if (it.status === "fulfilled") {
      if (it.value.exists()) {
        const data = it.value.data();
        const filename = it.value.id.replace(/\.[^.]+$/, "");
        message += `${data?.date} ${filename}<br/>`;
        hit++;
      }
    } else {
      notify({
        group: "thumbnails",
        type: "negative",
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: "close" }],
        timeout: 0,
      });
    }
  });

  if (hit > 0) {
    notify({
      group: "thumbnails",
      message: message,
      timeout: 0,
      actions: [{ icon: "close" }],
      html: true,
      multiLine: true,
    });
  } else {
    notify({
      group: "thumbnails",
      type: "positive",
      message: "No missing thumbnails",
      icon: "check",
    });
  }
};

/**
 * Gets the mismatched files.
 *
 * @return {Promise<void>} A promise that resolves when the mismatched files are found.
 */
export const mismatch = async () => {
  notify({
    group: "mismatch",
    message: `Please wait`,
    timeout: 0,
    spinner: true,
  });

  const [storageResult, firestoreResult] = await Promise.all([
    listAll(storageRef(storage, "")),
    getDocs(query(photoCollection)),
  ]);

  const bucketNames = new Set(storageResult.items.map((r) => r.name));
  const storageNames = new Set(firestoreResult.docs.map((d) => d.id));
  const uploadedFilenames = new Set(uploaded.value.map((it) => it.filename));

  // Files in storage but not in firestore (orphaned files)
  const missingRecords = Array.from(bucketNames).filter(
    (name) => !storageNames.has(name) && !uploadedFilenames.has(name),
  );

  // Records in firestore but not in storage (broken links)
  const missingFiles = Array.from(storageNames).filter(
    (name) => !bucketNames.has(name),
  );

  if (missingFiles.length > 0) {
    await Promise.all(
      missingFiles.map((name) => deleteDoc(doc(photoCollection, name))),
    );
    notify({
      group: "mismatch",
      message: `${missingFiles.length} records deleted from firestore that doesn't have image reference`,
      type: "negative",
    });
  }

  if (missingRecords.length > 0) {
    const promises = missingRecords.map((name) => getStorageData(name));
    const results = await Promise.all(promises);
    results.forEach((it) => {
      uploaded.value.push(it as PhotoType);
    });

    notify({
      group: "mismatch",
      type: "negative",
      message: `${missingRecords.length} files uploaded to bucket, but doesn't have record in firestore.<br>
      Resolve mismatched files either by publish or delete.`,
      actions: [
        {
          label: "Resolve",
          handler: () => {
            void router.push({ path: "/add" });
          },
        },
      ],
      multiLine: true,
      html: true,
      timeout: 0,
    });
  }

  if (missingRecords.length === 0 && missingFiles.length === 0) {
    notify({
      group: "mismatch",
      type: "positive",
      message: `All good. Nothing to resolve`,
      icon: "check",
    });
  }
};

/**
 * Removes unused tags from the database.
 *
 * @return {Promise<void>} A promise that resolves when the unused tags are removed.
 */
export const removeUnusedTags = async (): Promise<void> => {
  // delete from store
  let id, counterRef: DocumentReference;
  for (const [value, count] of Object.entries(meta.values.tags)) {
    if (typeof count === "number" && count <= 0) {
      try {
        id = counterId("tags", value);
        counterRef = doc(counterCollection, id);
        deleteDoc(counterRef);
      } finally {
        delete meta.values.tags[value];
      }
    }
  }
  // delete from database
  const q = query(counterCollection, where("field", "==", "tags"));
  const querySnapshot = await getDocs(q);

  // Use for...of loop instead of forEach to properly handle async operations
  for (const d of querySnapshot.docs) {
    const obj = d.data();
    if (obj.count <= 0) {
      try {
        const id = counterId("tags", obj.value);
        const counterRef = doc(counterCollection, id);
        deleteDoc(counterRef);
      } finally {
        delete meta.values.tags[obj.value];
      }
    }
  }
};

/**
 * Renames a value in the database.
 *
 * @param {keyof ValuesState['values']} field - The field to be renamed.
 * @param {string} oldValue - The old value to be renamed.
 * @param {string} newValue - The new value to be renamed.
 * @return {Promise<void>} A promise that resolves when the value is renamed.
 */
export const renameValue = async (
  field: keyof ValuesState["values"],
  oldValue: string,
  newValue: string,
): Promise<void> => {
  const batchLimit = 498;
  const operations: Promise<void>[] = [];
  let batch = writeBatch(db);
  let count = 0;

  const commitBatch = () => {
    operations.push(batch.commit());
    batch = writeBatch(db);
    count = 0;
  };

  // Parallelize reads
  const filter =
    field === "tags"
      ? where(field, "array-contains-any", [oldValue])
      : where(field, "==", oldValue);
  const q = query(photoCollection, filter);
  const oldRef = doc(counterCollection, counterId(field, oldValue));

  const [querySnapshot, counterSnapshot] = await Promise.all([
    getDocs(q),
    getDoc(oldRef),
  ]);

  // Update photos
  querySnapshot.forEach((d) => {
    const photoRef = doc(photoCollection, d.id);

    if (field === "tags") {
      const obj = d.data();
      // Ensure tags exists and is an array
      if (Array.isArray(obj.tags)) {
        const idx = obj.tags.indexOf(oldValue);
        if (idx > -1) {
          obj.tags.splice(idx, 1, newValue);
          batch.update(photoRef, { [field]: obj.tags });
          count++;
        }
      }
    } else {
      batch.update(photoRef, { [field]: newValue });
      count++;
    }

    if (count >= batchLimit) {
      commitBatch();
    }
  });

  // Update counters
  if (counterSnapshot.exists()) {
    const newRef = doc(counterCollection, counterId(field, newValue));
    const obj = counterSnapshot.data();

    // Ensure we have space for counter operations
    if (count >= batchLimit - 2) {
      commitBatch();
    }

    batch.set(
      newRef,
      {
        count: obj.count,
        field: field,
        value: newValue,
      },
      { merge: true },
    );
    batch.delete(oldRef);
    count += 2;

    // Update store
    if (meta.values[field]) {
      meta.values[field][newValue] = obj.count;
      delete meta.values[field][oldValue];
    }
  }

  if (count > 0) {
    commitBatch();
  }

  await Promise.all(operations);
};
