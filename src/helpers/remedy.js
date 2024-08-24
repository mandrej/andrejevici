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
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import router from "../router";
import notify from "./notify";

const app = useAppStore();
const auth = useUserStore();
const photosCol = collection(db, "Photo");

export const fix = async () => {
  const test = ["ш", "ђ", "љ", "џ", "ћ", "ч", "ж"];
  const q = query(photosCol, orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;

  querySnapshot.forEach(async (it) => {
    const rec = it.data();

    const docRef = doc(db, "Photo", rec.filename);
    await updateDoc(docRef, { done: false });

    const headline = rec.headline.toLowerCase();
    for (const c of test) {
      if (headline.indexOf(c) !== -1) {
        const docRef = doc(db, "Photo", rec.filename);
        const slug = textSlug(rec.headline);
        rec.text = sliceSlug(slug);
        await setDoc(docRef, rec, { merge: true });
        // const data = {
        //   done: deleteField(),
        // };
        // await updateDoc(docRef, data);
        notify({ message: slug });
      }
    }
  });
};

export const mismatch = async () => {
  notify({
    message: `Please wait`,
    timeout: 0,
    actions: [{ icon: "close", color: "white" }],
    group: "mismatch",
  });
  let result = 0;
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
  notify({
    message: `There are ${bucketNames.length} files in bucket and ${storageNames.length} records in firestore`,
    timeout: 0,
    actions: [{ icon: "close", color: "white" }],
    group: "mismatch",
  });

  let missing;
  if (bucketNames.length >= storageNames.length) {
    // uploaded to bucket but no record in firestore
    missing = bucketNames.filter((x) => storageNames.indexOf(x) === -1);
    for (let name of missing) {
      if (uploadedFilenames.indexOf(name) === -1) {
        const _ref = storageRef(storage, name);
        const metadata = await getMetadata(_ref);
        const downloadURL = await getDownloadURL(_ref);
        app.uploaded.push({
          url: downloadURL,
          filename: name,
          size: metadata.size,
          email: auth.user.email,
          nick: emailNick(auth.user.email),
        });
        result++;
      }
    }
    if (result > 0) {
      notify({
        message: `${result} files uploaded to bucket, but doesn't have record in firestore.<br>
        Resolve mismathed files either by publish or delete.`,
        actions: [
          {
            label: "Resolve",
            color: "white",
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
      type: "warning",
      group: "mismatch",
    });
  }
};
