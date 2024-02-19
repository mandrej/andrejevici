import { defineStore } from "pinia";
import { db } from "../boot/fire";
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import notify from "../helpers/notify";
import { CONFIG, emailNick } from "../helpers";

const photosCol = collection(db, "Photo");
const countersCol = collection(db, "Counter");

export const useValuesStore = defineStore("meta", {
  state: () => ({
    tagsToApply: [],
    values: { year: {}, tags: {}, model: {}, lens: {}, email: {} },
  }),
  getters: {
    // values getters
    tagsValues: (state) => {
      return Object.keys(state.values.tags);
    },
    modelValues: (state) => {
      return Object.keys(state.values.model);
    },
    lensValues: (state) => {
      return Object.keys(state.values.lens);
    },
    emailValues: (state) => {
      return Object.keys(state.values.email);
    },
    nickValues: (state) => {
      return Object.keys(state.values.email).map((el) => emailNick(el));
    },
    yearValues: (state) => {
      return Object.keys(state.values.year).reverse();
    },
    // for Index-Page
    yearWithCount: (state) => {
      const ret = [];
      for (const [value, count] of Object.entries(state.values.year)) {
        ret.push({ value: value, count: count });
      }
      ret.sort((a, b) => b.value - a.value);
      return ret;
    },
    nickWithCount: (state) => {
      const ret = [];
      for (const [value, count] of Object.entries(state.values.email)) {
        ret.push({ value: emailNick(value), count: count });
      }
      return ret;
    },
    tagsWithCount: (state) => {
      const ret = [];
      for (const [value, count] of Object.entries(state.values.tags)) {
        ret.push({ value: value, count: count });
      }
      ret.sort((a, b) => b.value - a.value);
      return ret;
    },
  },
  actions: {
    async yearCount() {
      const q = query(countersCol, where("field", "==", "year"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        this.values.year[d.value] = d.count;
      });
    },
    async emailCount() {
      const q = query(countersCol, where("field", "==", "email"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        this.values.email[d.value] = d.count;
      });
    },
    async tagsCount() {
      const q = query(countersCol, where("field", "==", "tags"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        this.values.tags[d.value] = d.count;
      });
    },
    async modelCount() {
      const q = query(countersCol, where("field", "==", "model"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        this.values.model[d.value] = d.count;
      });
    },
    async lensCount() {
      const q = query(countersCol, where("field", "==", "lens"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        this.values.lens[d.value] = d.count;
      });
    },
    async countersBuild() {
      notify({
        message: `Please wait`,
        timeout: 0,
        actions: [{ icon: "close", color: "white" }],
        group: "build",
      });
      const q = query(photosCol, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const val = { year: {}, tags: {}, model: {}, lens: {}, email: {} };
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        for (const field of CONFIG.photo_filter) {
          if (field === "tags") {
            for (const tag of d[field]) {
              if (val[field][tag]) {
                val[field][tag]++;
              } else {
                val[field][tag] = 1;
              }
            }
          } else if (d[field]) {
            if (val[field][d[field]]) {
              val[field][d[field]]++;
            } else {
              val[field][d[field]] = 1;
            }
          }
        }
      });
      // write to database
      let id, counterRef;
      for (const field of CONFIG.photo_filter) {
        for (const [key, count] of Object.entries(val[field])) {
          id = ["Photo", field, key].join("||");
          counterRef = doc(db, "Counter", id);
          await setDoc(
            counterRef,
            {
              count: count,
              field: field,
              value: key,
            },
            { merge: true }
          );
          // renew old counters
          this.values[field] = { ...this.values[field], ...val[field] };
        }
        notify({
          message: `Values for ${field} updated`,
          group: "build",
          timeout: 0,
        });
      }
      notify({
        message: `All done`,
        timeout: 0,
        actions: [{ icon: "close", color: "white" }],
        group: "build",
      });
    },
    async increase(id, field, val) {
      let find = this.values[field][val];
      if (find) {
        find++;
      } else {
        this.values[field][val] = 1;
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
    async increaseValues(newData) {
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
      let find = this.values[field][val];
      if (find) {
        find--;
        if (find <= 0) {
          delete this.values[field][val];
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
    async decreaseValues(oldData) {
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
    addNewTag(val) {
      this.values.tags[val] = 1;
    },
    addNewEmail(val) {
      this.values.email[val] = 1;
    },
    addNewModel(val) {
      this.values.model[val] = 1;
    },
    addNewLens(val) {
      this.values.lens[val] = 1;
    },
  },
  persist: {
    key: "v",
    paths: ["values", "tagsToApply"],
  },
});
