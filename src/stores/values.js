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
  writeBatch,
} from "firebase/firestore";
import notify from "../helpers/notify";
import { CONFIG, emailNick } from "../helpers";

const photosCol = collection(db, "Photo");
const countersCol = collection(db, "Counter");

const counterId = (field, value) => {
  return ["Photo", field, value].join("||");
};

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
    // withCount
    yearWithCount: (state) => {
      const ret = [];
      for (const year of Object.keys(state.values.year).reverse()) {
        ret.push({ value: year, count: state.values.year[year] });
      }
      return ret;
    },
    nickWithCount: (state) => {
      const emails = byCountReverse(state, "email");
      return Object.keys(emails)
        .filter((key) => emails[key] > 0)
        .reduce((obj, key) => {
          obj[emailNick(key)] = emails[key];
          return obj;
        }, {});
    },
    tagsWithCount: (state) => {
      return Object.keys(state.values.tags)
        .sort()
        .filter((key) => state.values.tags[key] > 0)
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
      querySnapshot.forEach((d) => {
        const obj = d.data();
        this.values[field][obj.value] = obj.count;
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
      querySnapshot.forEach((d) => {
        const obj = d.data();
        for (const field of CONFIG.photo_filter) {
          if (field === "tags") {
            for (const tag of obj[field]) {
              if (val[field][tag]) {
                val[field][tag]++;
              } else {
                val[field][tag] = 1;
              }
            }
          } else if (obj[field]) {
            if (val[field][obj[field]]) {
              val[field][obj[field]]++;
            } else {
              val[field][obj[field]] = 1;
            }
          }
        }
      });
      // write to database
      let id, counterRef;
      for (const field of CONFIG.photo_filter) {
        for (const [key, count] of Object.entries(val[field])) {
          id = counterId(field, key);
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
      if (process.env.DEV)
        console.log("increase " + id, this.values[field][val]);
    },
    async increaseValues(newData) {
      for (const field of CONFIG.photo_filter) {
        if (newData[field] && newData.date) {
          if (field === "tags") {
            for (const tag of newData[field]) {
              const id = counterId(field, tag);
              this.increase(id, field, tag);
            }
          } else {
            const id = counterId(field, newData[field]);
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
        if (process.env.DEV)
          console.log("decrease " + id, this.values[field][val]);
      }
    },
    async decreaseValues(oldData) {
      for (const field of CONFIG.photo_filter) {
        if (oldData[field]) {
          if (field === "tags") {
            for (const tag of oldData[field]) {
              const id = counterId(field, tag);
              this.decrease(id, field, tag);
            }
          } else {
            const id = counterId(field, oldData[field]);
            this.decrease(id, field, "" + oldData[field]);
          }
        }
      }
    },
    async removeUnusedTags() {
      // delete from store
      let id, counterRef;
      for (const [value, count] of Object.entries(this.values.tags)) {
        if (count <= 0) {
          try {
            id = counterId("tags", value);
            counterRef = doc(db, "Counter", id);
            await deleteDoc(counterRef);
          } catch (e) {
          } finally {
            delete this.values.tags[value];
          }
        }
      }
      // delete from database
      const q = query(countersCol, where("field", "==", "tags"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (d) => {
        const obj = d.data();
        if (obj.count <= 0) {
          try {
            id = counterId("tags", obj.value);
            counterRef = doc(db, "Counter", id);
            await deleteDoc(counterRef);
          } catch (e) {
          } finally {
            delete this.values.tags[obj.value];
          }
        }
      });
    },
    async renameValue(field, oldValue, newValue) {
      // Prepare batch for photo updates
      const batch = writeBatch(db);
      const filter =
        field === "tags"
          ? where(field, "array-contains-any", [oldValue])
          : where(field, "==", oldValue);
      const q = query(photosCol, filter, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((d) => {
        const photoRef = doc(db, "Photo", d.id);
        if (field === "tags") {
          const obj = d.data();
          const idx = obj.tags.indexOf(oldValue);
          obj.tags.splice(idx, 1, newValue);
          batch.update(photoRef, { [field]: obj.tags });
        } else {
          batch.update(photoRef, { [field]: newValue });
        }
      });

      // Commit batch for photos
      await batch.commit();

      // Update counters
      const oldRef = doc(db, "Counter", counterId(field, oldValue));
      const newRef = doc(db, "Counter", counterId(field, newValue));
      const counter = await getDoc(oldRef);
      const obj = counter.data();

      await setDoc(
        newRef,
        {
          count: obj.count,
          field: field,
          value: newValue,
        },
        { merge: true }
      );
      await deleteDoc(oldRef);

      // Update store
      this.values[field][newValue] = obj.count;
      delete this.values[field][oldValue];
    },
    addNewField(val, field) {
      this.values[field][val] = 1;
    },
  },
  persist: {
    key: "c",
    paths: ["values", "tagsToApply"],
  },
});
