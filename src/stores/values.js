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

const byCountReverse = (state, field) => {
  return Object.entries(state.values[field])
    .sort(([, a], [, b]) => b - a)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
};

export const useValuesStore = defineStore("meta", {
  state: () => ({
    tagsToApply: [],
    values: { year: {}, tags: {}, model: {}, lens: {}, email: {} },
  }),
  getters: {
    // values getters
    tagsValues: (state) => {
      return Object.keys(state.values.tags).sort();
    },
    modelValues: (state) => {
      return Object.keys(byCountReverse(state, "model"));
    },
    lensValues: (state) => {
      return Object.keys(byCountReverse(state, "lens"));
    },
    emailValues: (state) => {
      return Object.keys(byCountReverse(state, "email"));
    },
    nickValues: (state) => {
      const ret = [];
      const emails = byCountReverse(state, "email");
      Object.keys(emails).forEach((key) => {
        ret.push(emailNick(key));
      });
      return ret;
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
      const ret = {};
      const emails = byCountReverse(state, "email");
      Object.keys(emails).forEach((key) => {
        ret[emailNick(key)] = emails[key];
      });
      return ret;
    },
    tagsWithCount: (state) => {
      return Object.keys(state.values.tags)
        .sort()
        .reduce((obj, key) => {
          obj[key] = state.values.tags[key];
          return obj;
        }, {});
    },
  },
  actions: {
    async fieldCount(field) {
      const q = query(countersCol, where("field", "==", field));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        this.values[field][d.value] = d.count;
      });
    },
    async countersBuild() {
      notify({
        message: `Please wait`,
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
        });
      }
      notify({
        message: `All done`,
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
    addNewField(val, field) {
      this.values[field][val] = 1;
    },
  },
  persist: {
    key: "v",
    paths: ["values", "tagsToApply"],
  },
});
