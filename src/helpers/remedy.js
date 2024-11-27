import { db, storage } from "../boot/fire";
import {
  doc,
  collection,
  query,
  orderBy,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  listAll,
  getMetadata,
  getDownloadURL,
} from "firebase/storage";
import { has } from "lodash";
import { textSlug, sliceSlug } from "../helpers";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import { emailNick } from ".";
import router from "../router";
import notify from "./notify";

const app = useAppStore();
const auth = useUserStore();
const photosCol = collection(db, "Photo");

export const fix = async () => {
  let num = 0;
  const q = query(photosCol, orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach(async (it) => {
    const rec = it.data();
    if (!has(rec, "text")) {
      const docRef = doc(db, "Photo", rec.filename);
      const slug = textSlug(rec.headline);
      rec.text = sliceSlug(slug);
      notify({
        message: `Fixed ${++num} records`,
        group: "fix",
      });
      await setDoc(docRef, rec, { merge: true });
    }
  });
  if (num === 0) {
    notify({
      message: `No records to fix`,
      group: "fix",
    });
  }
};

const getStorageData = (filename) => {
  return new Promise(async (resolve, reject) => {
    const _ref = storageRef(storage, filename);
    const downloadURL = await getDownloadURL(_ref);
    const metadata = await getMetadata(_ref);
    if (downloadURL) {
      resolve({
        url: downloadURL,
        filename: filename,
        size: metadata.size || 0,
        email: auth.user.email,
        nick: emailNick(auth.user.email),
      });
    } else {
      reject;
    }
  });
};

export const mismatch = async () => {
  notify({
    message: `Please wait`,
    timeout: 0,
    actions: [{ icon: "close" }],
    group: "mismatch",
  });
  const bucketNames = [];
  const storageNames = [];
  const uploadedFilenames = app.uploaded.length
    ? app.uploaded.map((it) => it.filename)
    : [];
  const refs = await listAll(storageRef(storage, ""));
  for (let r of refs.items) {
    bucketNames.push(r.name);
  }
  const q = query(photosCol);
  const snapshot = await getDocs(q);
  snapshot.forEach((doc) => {
    storageNames.push(doc.id);
  });

  bucketNames.sort();
  storageNames.sort();

  let missing;
  let promises = [];
  if (bucketNames.length >= storageNames.length) {
    // uploaded to bucket but no record in firestore
    missing = bucketNames.filter((x) => storageNames.indexOf(x) === -1);
    for (let name of missing) {
      if (uploadedFilenames.indexOf(name) === -1) {
        promises.push(getStorageData(name));
      }
    }
    if (promises.length > 0) {
      Promise.all(promises).then((results) => {
        results.forEach((it) => {
          app.uploaded.push(it);
        });
      });
      notify({
        type: "negative",
        message: `${promises.length} files uploaded to bucket, but doesn't have record in firestore.<br>
        Resolve mismathed files either by publish or delete.`,
        actions: [
          {
            label: "Resolve",
            handler: () => {
              router.push({ path: "/add" });
            },
          },
        ],
        multiLine: true,
        html: true,
        type: "warning",
        timeout: 0,
        group: "mismatch",
      });
    } else {
      notify({ message: `All good. Nothing to reslove`, group: "mismatch" });
    }
  } else {
    // records with no image reference
    missing = storageNames.filter((x) => bucketNames.indexOf(x) === -1);
    for (let name of missing) {
      const docRef = doc(db, "Photo", name);
      await deleteDoc(docRef);
    }
    notify({
      message: `${missing.length} records deleted from firestore that doesn't have image reference`,
      type: "negative",
      group: "mismatch",
    });
  }
};
