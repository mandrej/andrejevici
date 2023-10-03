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
    values: { year: [], tags: [], model: [], lens: [], email: [] },
  }),
  getters: {
    // values getters
    tagsValues: (state) => {
      return state.values.tags.map((obj) => obj.value);
    },
    modelValues: (state) => {
      return state.values.model.map((obj) => obj.value);
    },
    lensValues: (state) => {
      return state.values.lens.map((obj) => obj.value);
    },
    emailValues: (state) => {
      return state.values.email.map((obj) => obj.value);
    },
    nickCount: (state) => {
      return state.values.email.map((obj) => {
        return { value: emailNick(obj.value), count: obj.count };
      });
    },
    nickValues: (state) => {
      return state.values.email.map((obj) => emailNick(obj.value));
    },
    yearValues: (state) => {
      return state.values.year.map((obj) => obj.value);
    },
  },
  actions: {
    async yearCount() {
      const q = query(countersCol, where("field", "==", "year"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const find = this.values.year.find((el) => el.value === d.value);
        if (find) {
          find.count = d.count;
        } else {
          this.values.year.push({ value: d.value, count: d.count });
        }
      });
      this.values.year.sort((a, b) => {
        return b.value - a.value;
      });
    },
    async emailCount() {
      const q = query(countersCol, where("field", "==", "email"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const find = this.values.email.find((el) => el.value === d.value);
        if (find) {
          find.count = d.count;
        } else {
          this.values.email.push({
            value: d.value,
            count: d.count,
          });
        }
      });
      this.values.email.sort((a, b) => {
        return b.count - a.count;
      });
    },
    async tagsCount() {
      const q = query(countersCol, where("field", "==", "tags"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const find = this.values.tags.find((el) => el.value === d.value);
        if (find) {
          find.count = d.count;
        } else {
          this.values.tags.push({ value: d.value, count: d.count });
        }
      });
      this.values.tags.sort((a, b) => {
        return a.value - b.value;
      });
    },
    async modelCount() {
      const q = query(countersCol, where("field", "==", "model"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const find = this.values.model.find((el) => el.value === d.value);
        if (find) {
          find.count = d.count;
        } else {
          this.values.model.push({ value: d.value, count: d.count });
        }
      });
      this.values.model.sort((a, b) => {
        return b.count - a.count;
      });
    },
    async lensCount() {
      const q = query(countersCol, where("field", "==", "lens"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const find = this.values.lens.find((el) => el.value === d.value);
        if (find) {
          find.count = d.count;
        } else {
          this.values.lens.push({ value: d.value, count: d.count });
        }
      });
      this.values.lens.sort((a, b) => {
        return b.count - a.count;
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
        // this.values[field] = dict[field];
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
    addNewTag(val) {
      this.values.tags.push({
        count: 1,
        value: val,
      });
    },
    addNewEmail(val) {
      this.values.email.push({
        count: 1,
        value: val,
      });
    },
    addNewModel(val) {
      this.values.model.push({
        count: 1,
        value: val,
      });
    },
    addNewLens(val) {
      this.values.lens.push({
        count: 1,
        value: val,
      });
    },
  },
  persist: {
    key: "v",
    paths: ["values", "tagsToApply"],
  },
});
