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
const countersRef = collection(db, "Counter");

export const useCrudStore = defineStore("crud", {
  state: () => ({
    uploaded: [],
    objects: [],
    current: {},
    values: {},
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
          countersRef,
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
      console.log(result);
      this.values = result;
    },
    async increase(counterRef, newData, field, val) {
      const oldDoc = await getDoc(counterRef);
      if (oldDoc.exists()) {
        const old = oldDoc.data();
        await updateDoc(counterRef, {
          count: old.count + 1,
          url: newData.date > old.date ? newData.url : old.url,
          date: newData.date > old.date ? newData.date : old.date,
        });
        // const find =
        //   this.values[field] &&
        //   this.values[field].filter((it) => it.value === val);
        // if (find) {
        //   find.count = find.count + 1;
        //   find.date = newData.date > find.date ? newData.date : find.date;
        //   find.url = newData.date > find.date ? newData.url : find.url;
        // }
        // console.log(this.values);
      } else {
        await setDoc(
          counterRef,
          {
            count: 1,
            field: field,
            value: val,
            kind: "Photo",
            url: newData.url,
            date: newData.date,
          },
          { merge: true }
        );
        // this.values[field].push({
        //   count: 1,
        //   date: newData.date,
        //   url: newData.url,
        //   value: val,
        // });
      }
    },
    async increaseCounters(newData) {
      for (const field of CONFIG.photo_filter) {
        if (newData[field] && newData.date) {
          if (field === "tags") {
            for (const tag of newData[field]) {
              const id = ["Photo", field, tag].join("||");
              const counterRef = doc(db, "Counter", id);
              this.increase(counterRef, newData, field, tag);
            }
          } else {
            const id = ["Photo", field, newData[field]].join("||");
            const counterRef = doc(db, "Counter", id);
            this.increase(counterRef, newData, field, newData[field]);
          }
        }
      }
    },
    async decrease(counterRef, operator, field, val) {
      const counterSnap = await getDoc(counterRef);
      const counter = counterSnap.data();

      const res = [];
      const q = query(
        photosRef,
        where(field, operator, val),
        orderBy("date", "asc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        res.push(doc.data());
      });
      if (res.length === 1) {
        await updateDoc(counterRef, {
          count: counter.count - 1,
          url: res[0].url,
          date: res[0].date,
        });
      } else {
        await deleteDoc(counterRef);
      }
    },
    async decreaseCounters(oldData) {
      for (const field of CONFIG.photo_filter) {
        if (oldData[field]) {
          if (field === "tags") {
            for (const tag of oldData[field]) {
              const id = ["Photo", field, tag].join("||");
              const counterRef = doc(db, "Counter", id);
              this.decrease(counterRef, "array-contains", field, tag);
            }
          } else {
            const id = ["Photo", field, oldData[field]].join("||");
            const counterRef = doc(db, "Counter", id);
            this.decrease(counterRef, "==", field, oldData[field]);
          }
        }
      }
    },
  },
  persist: {
    key: "a",
    paths: ["values", "uploaded", "objects"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
