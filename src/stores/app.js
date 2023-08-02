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
  listAll,
  getMetadata,
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
// import pushMessage from "../helpers/push";
import { useValuesStore } from "./values";
import { useAuthStore } from "./auth";

const bucketRef = doc(db, "Bucket", "total");
const photosRef = collection(db, "Photo");

export const useAppStore = defineStore("app", {
  state: () => ({
    bucket: {
      size: 0,
      count: 0,
    },

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
    hasmore: (state) => {
      return { count: state.objects.length, more: Boolean(state.next) };
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
    // bucket
    async read() {
      const docSnap = await getDoc(bucketRef);
      this.bucket = { ...docSnap.data() };
    },
    async diff(num) {
      if (num > 0) {
        this.bucket.size += num;
        this.bucket.count++;
      } else {
        this.bucket.size -= num;
        this.bucket.count--;
      }
      if (this.bucket.count <= 0) {
        this.bucket.size = 0;
        this.bucket.count = 0;
      }
      await setDoc(bucketRef, this.bucket, { merge: true });
    },
    async scretch() {
      const res = {
        count: 0,
        size: 0,
      };
      const q = query(photosRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        querySnapshot.forEach(async (it) => {
          res.count++;
          res.size += it.data().size;
        });
      }
      this.bucket = { ...res };
      await setDoc(bucketRef, res, { merge: true });
      // notify({ message: `Bucket size and count recalculated` });
    },
    async mismatch() {
      const auth = useAuthStore();
      const refs = await listAll(storageRef(storage, ""));
      for (let r of refs.items) {
        const meta = await getMetadata(r);
        if (meta.contentType === "image/jpeg") {
          const find = await getDoc(doc(db, "Photo", meta.name));
          if (!find.exists()) {
            const downloadURL = await getDownloadURL(r);
            this.uploaded.push({
              url: downloadURL,
              filename: meta.name,
              size: meta.size,
              email: auth.user.email,
              nick: emailNick(auth.user.email),
            });
          }
        }
      }
      return this.uploaded.length > 0;
    },
    // bucket
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
      const constraints = [...filters, orderBy("date", "desc")];
      if (reset) this.next = null;
      if (this.next) {
        const cursor = await getDoc(doc(db, "Photo", this.next));
        constraints.push(startAfter(cursor));
      }
      constraints.push(limit(CONFIG.limit));
      const q = query(photosRef, ...constraints);
      this.error = null;
      this.busy = true;

      const querySnapshot = await getDocs(q);
      if (reset) this.objects.length = 0;
      querySnapshot.forEach((it) => {
        this.objects.push(it.data());
      });

      const next = querySnapshot.docs[querySnapshot.docs.length - 1];
      if (next && next.id) {
        next.id === this.next ? (this.next = null) : (this.next = next.id);
      } else {
        this.next = null;
      }
      this.error = this.objects.length === 0 ? 0 : null;
      this.busy = false;
      if (process.env.DEV)
        console.log("FETCHED FOR " + invoked + " " + JSON.stringify(this.find));
    },
    async saveRecord(obj) {
      const docRef = doc(db, "Photo", obj.filename);
      const valuesStore = useValuesStore();
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

        this.diff(obj.size);
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

        this.diff(-data.size);
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
    paths: [
      "bucket",
      "uploaded",
      "objects",
      "last",
      "since",
      "next",
      "current",
    ],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
