import { defineStore } from "pinia";
import { db } from "../boot/fire";
import {
  doc,
  collection,
  query,
  where,
  limit,
  orderBy,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { CONFIG } from "../helpers";

const photosRef = collection(db, "Photo");
const counersRef = collection(db, "Counter");

export const useCrudStore = defineStore("crud", {
  state: () => ({
    uploaded: [],
    objects: [],
    current: {},
    counters: {},
  }),
  actions: {
    async fetch() {
      this.objects = [];
      const q = query(photosRef, orderBy("date", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        this.objects.push(doc.data());
      });
    },
    async scretchCounters() {
      const result = {};
      for (const field of CONFIG.photo_filter) {
        const q = query(
          counersRef,
          where("kind", "==", "Photo"),
          where("field", "==", field),
          orderBy("count", "desc")
        );
        const res = [];
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const d = doc.data();
          res.push({
            value: d.value,
            count: d.count,
            date: d.date,
            url: d.url, // was filename
          });
        });
        if (res.length) {
          result[field] = res;
        }
      }
      this.counters = result;
    },
    async increaseCounters(newData) {
      for (const field of CONFIG.photo_filter) {
        if (newData[field] && newData.date) {
          const id = ["Photo", field, newData[field]].join("||");
          const docRef = doc(db, "Counter", id);
          const oldDoc = await getDoc(docRef);
          if (oldDoc.exists()) {
            const old = oldDoc.data();
            await updateDoc(docRef, {
              count: old.count + 1,
              url: newData.date > old.date ? newData.url : old.url,
              date: newData.date > old.date ? newData.date : old.date,
            });
          } else {
            await setDoc(
              docRef,
              {
                count: 1,
                field: field,
                value: newData[field],
                kind: "Photo",
                url: newData.url,
                date: newData.date,
              },
              { merge: true }
            );
          }
        }
      }
    },
    async decreaseCounters(oldData) {
      for (const field of CONFIG.photo_filter) {
        if (oldData[field]) {
          const id = ["Photo", field, oldData[field]].join("||");
          const counterRef = doc(db, "Counter", id);
          const counterSnap = await getDoc(counterRef);
          const counter = counterSnap.data();

          const q = query(
            photosRef,
            where(field, "==", oldData[field]),
            orderBy("date", "desc"),
            limit(1)
          );
          const res = [];
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            res.push(doc.data());
          });
          if (res.length === 1) {
            await updateDoc(counterRef, {
              count: counter.count - 1,
              date: res[0].date,
              url: res[0].url,
            });
          } else {
            await deleteDoc(counterRef);
          }
        }
      }
    },
  },
  persist: {
    key: "c",
    paths: ["counters", "uploaded", "objects"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
