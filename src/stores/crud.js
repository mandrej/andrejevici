import { defineStore } from "pinia";
import { db } from "../boot/fire";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import readExif from "../helpers/exif";

const photosRef = collection(db, "Photo");
const counterRef = collection(db, "Counter");

export const useCrudStore = defineStore("crud", {
  state: () => ({
    uploaded: [],
    objects: [],
  }),
  actions: {
    async populate(name, url) {
      const exif = await readExif(url);
      await setDoc(doc(db, "Photo", name), {
        url: url,
        ...exif,
      });
      if (exif.model && exif.date) {
        const id = "Photo||model||" + exif.model;
        const docRef = doc(db, "Counter", id);
        const oldDoc = await getDoc(docRef);
        if (oldDoc.exists()) {
          const old = oldDoc.data();
          await updateDoc(docRef, {
            count: old.count + 1,
            url: exif.date > old.date ? url : old.url,
            date: exif.date > old.date ? exif.date : old.date,
          });
        } else {
          await setDoc(
            docRef,
            {
              count: 1,
              field: "model",
              value: exif.model,
              kind: "Photo",
              url: url,
              date: exif.date,
            },
            { merge: true }
          );
        }
      }
    },
    async fetch() {
      this.objects = [];
      const q = query(photosRef, orderBy("date", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        // console.log(doc.id, " => ", doc.data());
        this.objects.push(doc.data());
      });
    },
    async stat() {},
  },
  persist: {
    key: "a",
    paths: ["uploaded", "objects"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
