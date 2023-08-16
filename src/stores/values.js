import { defineStore } from "pinia";
import { db } from "../boot/fire";
import {
  doc,
  collection,
  query,
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
    values: { year: [], tags: [], model: [], lens: [], email: [] },
  }),
  getters: {
    // values getters
    tagsValues: (state) => {
      const res = state.values.tags.sort((a, b) => {
        return b.count - a.count;
      });
      return res.map((obj) => obj.value);
    },
    modelValues: (state) => {
      const res = state.values.model.sort((a, b) => {
        return b.count - a.count;
      });
      return res.map((obj) => obj.value);
    },
    lensValues: (state) => {
      const res = state.values.lens.sort((a, b) => {
        return b.count - a.count;
      });
      return res.map((obj) => obj.value);
    },
    nickValues: (state) => {
      const res = state.values.email.sort((a, b) => {
        return b.count - a.count;
      });
      return res.map((obj) => emailNick(obj.value));
    },
    emailValues: (state) => {
      const res = state.values.email.sort((a, b) => {
        return b.count - a.count;
      });
      return res.map((obj) => obj.value);
    },
    yearValues: (state) => {
      const res = state.values.year.sort((a, b) => {
        return b.value - a.value;
      });
      return res.map((obj) => obj.value);
    },
    // for Index page only
    yearCountValues: (state) => {
      const res = state.values.year.sort((a, b) => {
        return b.value - a.value;
      });
      return res.map((obj) => {
        return { value: obj.value, count: obj.count };
      });
    },
    nickCountValues: (state) => {
      const res = state.values.email.sort((a, b) => {
        return b.count - a.count;
      });
      return res.map((obj) => {
        return { value: emailNick(obj.value), count: obj.count };
      });
    },
    tagsCountValues: (state) => {
      const res = state.values.tags.sort((a, b) => {
        return b.count - a.count;
      });
      return res.map((obj) => {
        return { value: obj.value, count: obj.count };
      });
    },
  },
  actions: {
    async countersRead() {
      this.values = { year: [], tags: [], model: [], lens: [], email: [] };
      const q = query(countersCol);
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
    async countersBuild() {
      notify({
        message: `Please wait`,
        timeout: 0,
        actions: [{ icon: "close", color: "white" }],
        group: "build",
      });
      const q = query(photosCol, orderBy("date", "desc"));
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
        notify({ message: `Values for ${field} updated` });
      }
      notify({
        message: `All done`,
        timeout: 0,
        actions: [{ icon: "close", color: "white" }],
        group: "build",
      });
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
  },
  persist: {
    key: "v",
    paths: ["values"],
  },
});
