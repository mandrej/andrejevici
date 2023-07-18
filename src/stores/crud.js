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
  getDocs,
  updateDoc,
  deleteDoc,
  startAfter,
} from "firebase/firestore";
import {
  ref as storageRef,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { CONFIG, thumbName, thumbUrl, removeByProperty } from "../helpers";
import notify from "../helpers/notify";
import pushMessage from "../helpers/push";
import { useValuesStore } from "./values";
import { useBucketStore } from "./bucket";

const photosRef = collection(db, "Photo");

export const useCrudStore = defineStore("crud", {
  state: () => ({
    find: {},
    uploaded: [],
    objects: [],
    next: null,
    current: {},
    last: {},

    busy: false,
    showEdit: false,
    showConfirm: false,
    showCarousel: false,
  }),
  getters: {
    counter: (state) => {
      return { count: state.objects.length, more: state.next };
    },
    groupObjects: (state) => {
      const groups = [];
      for (let i = 0; i < state.objects.length; i += CONFIG.group) {
        groups.push(state.objects.slice(i, i + CONFIG.group));
      }
      return groups;
    },
  },
  actions: {
    async fetchRecords(reset = false, invoked = "") {
      if (this.busy) {
        if (process.env.DEV) console.log("SKIPPED FOR " + invoked);
        return;
      }
      const filters = Object.entries(this.find).map(([key, val]) => {
        if (key === "tags") {
          return where("tags", "array-contains-any", val);
        } else {
          return where(key, "==", val);
        }
      });
      // console.log(filters);
      const constraints = [
        ...filters,
        orderBy("date", "desc"),
        limit(CONFIG.limit),
      ];
      if (this.next) {
        constraints.push(startAfter(doc(db, "Photo", this.next)));
      }
      const q = query(photosRef, ...constraints);
      this.error = null;
      this.busy = true;
      const querySnapshot = await getDocs(q);
      this.next = querySnapshot.docs[querySnapshot.docs.length - 1];
      // console.log(this.next.id);
      if (reset) this.resetObjects(); // late reset

      querySnapshot.forEach(async (it) => {
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
          _err++;
        }

        this.objects.push(record);
        if (_err > 0) {
          await updateDoc(doc(db, "Photo", it.id), record);
          console.log("updateDoc");
        }
      });
      this.error = this.objects.length === 0 ? 0 : null;
      // this.updateObjects(response.data);
      this.busy = false;
      if (process.env.DEV)
        console.log("FETCHED FOR " + invoked + " " + JSON.stringify(this.find));
    },
    async deleteRecord(obj) {
      notify({
        group: `${obj.filename}`,
        message: `About to delete`,
      });
      if (obj.thumb) {
        const docRef = doc(db, "Photo", obj.filename);
        const docSnap = await getDoc(docRef);
        const data = docSnap.data();
        const stoRef = storageRef(storage, obj.filename);
        const thumbRef = storageRef(storage, thumbName(obj.filename));
        await deleteDoc(docRef);
        await deleteObject(stoRef);
        await deleteObject(thumbRef);

        removeByProperty(this.objects, "filename", obj.filename);
        const valuesStore = useValuesStore();
        const bucketStore = useBucketStore();

        bucketStore.diff(-data.size);
        valuesStore.decreaseCounters(data);
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        });
        //   .catch((err) => {
        //     notify({
        //       group: `${obj.filename}`,
        //       type: "negative",
        //       message: "Failed to delete.",
        //     });
      } else {
        const stoRef = storageRef(storage, obj.filename);
        const thumbRef = storageRef(storage, thumbName(obj.filename));
        await deleteObject(stoRef);
        await deleteObject(thumbRef);

        removeByProperty(this.uploaded, "filename", obj.filename);
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        });
        //   .catch((err) => {
        //     notify({
        //       group: `${obj.filename}`,
        //       type: "negative",
        //       message: "Failed to delete.",
        //     });
      }
    },
    resetObjects() {
      this.objects.length = 0;
      this.next = null;
    },
    // updateObjects(data) {
    //   this.objects = [...this.objects, ...data.objects];
    //   this.next = data._next;
    // },
    async getLast() {
      const q = query(photosRef, orderBy("date", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      querySnapshot.forEach(async (it) => {
        let _err = 0,
          _ref;
        const record = it.data();
        if (!record.thumb) {
          if (process.env.DEV) {
            _ref = storageRef(storage, thumbName(record.filename));
            record.thumb = await getDownloadURL(_ref);
          } else {
            record.thumb = thumbUrl(record.filename);
          }
          _err++;
        }
        if (_err > 0) {
          await updateDoc(doc(db, "Photo", it.id), record);
          console.log("updateDoc");
        }
        record.href = "/list&year=" + record.year;
        this.last = record;
      });
    },
  },
  persist: {
    key: "a",
    paths: ["uploaded", "objects", "last", "next", "current"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
