import { defineStore } from "pinia";
import { db, storage } from "../boot/fire";
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
  startAfter,
} from "firebase/firestore";
import {
  ref as storageRef,
  deleteObject,
  getDownloadURL,
} from "firebase/storage";
import { CONFIG, thumbName, thumbUrl } from "../helpers";

const photosRef = collection(db, "Photo");
const countersRef = collection(db, "Counter");

export const useCrudStore = defineStore("crud", {
  state: () => ({
    uploaded: [],
    objects: [],
    current: {},
    values: { year: [], tags: [], model: [], lens: [], email: [] },
    last: {},
    showEdit: false,
  }),
  actions: {
    async fetch() {
      this.objects = [];
      const q = query(photosRef, orderBy("date", "desc"), limit(CONFIG.limit));
      const querySnapshot = await getDocs(q);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      console.log("last", lastVisible);
      // const next = query(
      //   photosRef,
      //   orderBy("date", "desc"),
      //   startAfter(lastVisible),
      //   limit(CONFIG.limit)
      // );

      querySnapshot.forEach(async (it) => {
        // it.data() is never undefined for query doc snapshots
        let _ref,
          _err = 0;
        const record = it.data();
        if (!record.url) {
          _ref = storageRef(storage, record.filename);
          record.url = await getDownloadURL(_ref);
          _err++;
        }
        if (!record.thumb) {
          if (process.env.DEV) {
            _ref = storageRef(storage, thumbName(record.filename));
            record.thumb = await getDownloadURL(_ref);
          } else {
            record.thumb = thumbUrl(record.filename);
          }
          // _err++;
        }
        this.objects.push(record);
        if (_err > 0) {
          const photoRef = doc(db, "Photo", record.filename);
          await updateDoc(photoRef, record);
        }
      });
    },
    async getLast() {
      const q = query(countersRef, orderBy("date", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        this.last = doc.data();
      });
    },
    async counters2store() {
      this.values = { year: [], tags: [], model: [], lens: [], email: [] };
      const q = query(countersRef);
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        for (const field of CONFIG.photo_filter) {
          if (d.field === field) {
            this.values[field].push({ value: d.value, count: d.count });
          }
        }
      });
    },
    async photos2counters2store() {
      const q = query(photosRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const val = { year: [], tags: [], model: [], lens: [], email: [] };
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        for (const field of CONFIG.photo_filter) {
          if (field === "tags") {
            for (const tag of d[field]) {
              val[field].push(tag);
            }
          } else if (d[field]) {
            val[field].push("" + d[field]);
          }
        }
      });
      const counts = {};
      const dict = {};
      for (const field of CONFIG.photo_filter) {
        counts[field] = {};
        dict[field] = [];
        for (const it of val[field]) {
          counts[field][it] = counts[field][it] ? counts[field][it] + 1 : 1;
        }
        for (const [key, count] of Object.entries(counts[field])) {
          dict[field].push({ value: `${key}`, count: count });
        }
        this.values[field] = dict[field];
        // write down
        let id, counterRef;
        for (const obj of dict[field]) {
          id = ["Photo", field, obj.value].join("||");
          counterRef = doc(db, "Counter", id);
          await setDoc(
            counterRef,
            {
              count: obj.count,
              field: field,
              value: obj.value,
            },
            { merge: true }
          );
        }
      }
    },
    async increase(id, field, val) {
      const [find] = this.values[field].filter((it) => it.value === val);
      if (find) {
        find.count++;
      } else {
        this.values[field].push({
          count: 1,
          value: val,
        });
      }

      const counterRef = doc(db, "Counter", id);
      const oldDoc = await getDoc(counterRef);
      if (oldDoc.exists()) {
        const old = oldDoc.data();
        await updateDoc(counterRef, {
          count: old.count + 1,
        });
      } else {
        await setDoc(
          counterRef,
          {
            count: 1,
            field: field,
            value: val,
          },
          { merge: true }
        );
      }
    },
    async increaseCounters(newData) {
      for (const field of CONFIG.photo_filter) {
        if (newData[field] && newData.date) {
          if (field === "tags") {
            for (const tag of newData[field]) {
              const id = ["Photo", field, tag].join("||");
              this.increase(id, field, tag);
            }
          } else {
            const id = ["Photo", field, newData[field]].join("||");
            this.increase(id, field, "" + newData[field]);
          }
        }
      }
    },
    async decrease(id, field, val) {
      let find, count;
      const idx = this.values[field].findIndex((it) => it.value === val);
      if (idx >= 0) {
        find = this.values[field][idx];
        count = find.count - 1;
        if (count <= 0) {
          this.values[field].splice(idx, 1);
        } else {
          find = this.values[field][idx];
          find.count = count;
        }
      }

      const counterRef = doc(db, "Counter", id);
      const oldDoc = await getDoc(counterRef);
      if (oldDoc.exists()) {
        const old = oldDoc.data();
        if (old.count - 1 <= 0) {
          await deleteDoc(counterRef);
        } else {
          await updateDoc(counterRef, {
            count: old.count - 1,
          });
        }
      }
    },
    async decreaseCounters(oldData) {
      for (const field of CONFIG.photo_filter) {
        if (oldData[field]) {
          if (field === "tags") {
            for (const tag of oldData[field]) {
              const id = ["Photo", field, tag].join("||");
              this.decrease(id, field, tag);
            }
          } else {
            const id = ["Photo", field, oldData[field]].join("||");
            this.decrease(id, field, "" + oldData[field]);
          }
        }
      }
    },
  },
  persist: {
    key: "a",
    paths: ["values", "uploaded", "objects", "last"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
