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
  deleteDoc,
  startAfter,
} from "firebase/firestore";
import {
  ref as storageRef,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  CONFIG,
  thumbName,
  thumbUrl,
  emailNick,
  removeByProperty,
} from "../helpers";
import notify from "../helpers/notify";
import pushMessage from "../helpers/push";
import { useValuesStore } from "./values";
import { useBucketStore } from "./bucket";
import { useAuthStore } from "./auth";

const photosRef = collection(db, "Photo");

export const useCrudStore = defineStore("crud", {
  state: () => ({
    find: {},
    uploaded: [],
    objects: [],
    next: null,
    current: {},
    last: {},
    since: "",

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
        this.objects.push(it.data());
      });
      this.error = this.objects.length === 0 ? 0 : null;
      // this.updateObjects(response.data);
      this.busy = false;
      if (process.env.DEV)
        console.log("FETCHED FOR " + invoked + " " + JSON.stringify(this.find));
    },
    async saveRecord(obj) {
      const docRef = doc(db, "Photo", obj.filename);
      const valuesStore = useValuesStore();
      const bucketStore = useBucketStore();
      if (obj.thumb) {
        const oldDoc = await getDoc(docRef);
        valuesStore.decreaseValues(oldDoc.data());
        await setDoc(docRef, obj, { merge: true });
        if (this.objects && this.objects.length) {
          const idx = this.objects.findIndex(
            (item) => item.filename === obj.filename
          );
          if (idx > -1) this.objects.splice(idx, 1, obj);
          notify({ message: `${obj.filename} updated` });
        }
        valuesStore.increaseValues(obj);
      } else {
        // set thumbnail url = publish
        if (process.env.DEV) {
          const thumbRef = storageRef(storage, thumbName(obj.filename));
          obj.thumb = await getDownloadURL(thumbRef);
        } else {
          obj.thumb = thumbUrl(obj.filename);
        }
        // save everything
        await setDoc(docRef, obj, { merge: true });
        if (this.objects && this.objects.length) {
          const idx = this.objects.findIndex(
            (item) => item.filename === obj.filename
          );
          if (idx > -1) this.objects.splice(idx, 0, obj);
        }
        // delete uploaded
        const idx = this.uploaded.findIndex(
          (item) => item.filename === obj.filename
        );
        if (idx > -1) this.uploaded.splice(idx, 1);

        bucketStore.diff(obj.size);
        valuesStore.increaseValues(obj);

        // api.put("edit", obj).then((response) => {
        //   const obj = response.data.rec;
        //   const diff = { verb: "add", size: obj.size };
        //   // addRecord
        //   const dates = this.objects.map((item) => item.date);
        //   const idx = dates.findIndex((date) => date < obj.date);
        //   this.objects.splice(idx, 0, obj);

        //   this.deleteUploaded(obj);
        //   this.bucketInfo(diff);
        // });
      }
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
        valuesStore.decreaseValues(data);
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
      let q, querySnapshot;
      const auth = useAuthStore();
      const constraints = [orderBy("date", "desc"), limit(1)];
      if (auth.user && auth.user.isAuthorized) {
        q = query(
          photosRef,
          where("email", "==", auth.user.email),
          ...constraints
        );
      } else {
        q = query(photosRef, ...constraints);
      }
      querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      querySnapshot.forEach(async (it) => {
        const rec = it.data();
        if (auth.user && auth.user.isAuthorized) {
          rec.href = "/list?nick=" + emailNick(rec.email);
        } else {
          rec.href = "/list?year=" + rec.year;
        }
        this.last = rec;
      });
    },
    async getSince() {
      const q = query(photosRef, orderBy("date", "asc"), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      querySnapshot.forEach(async (it) => {
        const rec = it.data();
        this.since = rec.year;
      });
    },
  },
  persist: {
    key: "a",
    paths: ["uploaded", "objects", "last", "since", "next", "current"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
