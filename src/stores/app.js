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
  setDoc,
  deleteDoc,
  startAfter,
  onSnapshot,
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
  changedByProperty,
  textSlug,
  sliceSlug,
} from "../helpers";
import notify from "../helpers/notify";
import { useValuesStore } from "./values";
import { useUserStore } from "./user";

const bucketRef = doc(db, "Bucket", "total");
const photosCol = collection(db, "Photo");
const getRec = (snapshot) => {
  /** Only for queryset where limit=1 */
  const [doc] = snapshot.docs;
  return doc.data();
};

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
    unsubscribe: null,
    current: {},
    currentFileName: null,
    last: {},
    since: "",

    busy: false,
    refresh: false,
    error: null,
    showEdit: false,
    showConfirm: false,
    showCarousel: false,
  }),
  getters: {
    record: (state) => {
      return {
        count: state.objects.length,
      };
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
    async bucketRead() {
      const docSnap = await getDoc(bucketRef);
      if (docSnap.exists()) {
        this.bucket = docSnap.data();
      }
    },
    async bucketDiff(num) {
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
    async bucketBuild() {
      const res = {
        count: 0,
        size: 0,
      };
      const q = query(photosCol, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        querySnapshot.forEach((d) => {
          res.count++;
          res.size += d.data().size;
        });
      }
      this.bucket = { ...res };
      await setDoc(bucketRef, this.bucket, { merge: true });
      notify({ message: `Bucket size calculated` });
    },
    async fetchRecords(reset = false, invoked = "") {
      this.error = null;
      if (this.busy) {
        if (process.env.DEV) console.log("SKIPPED FOR " + invoked);
        return;
      }
      const filters = Object.entries(this.find).map(([key, val]) => {
        if (key === "tags") {
          return where(key, "array-contains-any", val);
        } else if (key === "text") {
          const slug = textSlug(val);
          const arr = sliceSlug(slug);
          return where(key, "array-contains-any", arr);
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
      const q = query(photosCol, ...constraints);

      this.busy = true;
      try {
        if (this.unsubscribe) this.unsubscribe();
        if (reset) this.objects.length = 0;

        // SNAPSHOT
        this.unsubscribe = onSnapshot(q, (querySnapshot) => {
          querySnapshot.forEach((d) => {
            if (this.objects.map((e) => e.filename).indexOf(d.id) === -1) {
              this.objects.push(d.data());
            }
          });
          const next = querySnapshot.docs[querySnapshot.docs.length - 1];
          if (next && next.id) {
            next.id === this.next ? (this.next = null) : (this.next = next.id);
          } else {
            this.next = null;
            this.error = this.objects.length === 0 ? "empty" : null;
          }
        });
      } catch (err) {
        this.error = err.message;
      }

      this.busy = false;
      if (process.env.DEV)
        console.log("FETCHED FOR " + invoked + " " + JSON.stringify(this.find));
    },
    async saveRecord(obj) {
      const docRef = doc(db, "Photo", obj.filename);
      const meta = useValuesStore();
      if (obj.thumb) {
        const oldDoc = await getDoc(docRef);
        meta.decreaseValues(oldDoc.data());
        const slug = textSlug(obj.headline);
        obj.text = sliceSlug(slug);
        await setDoc(docRef, obj, { merge: true });

        changedByProperty(this.objects, "filename", obj);
        meta.increaseValues(obj);
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
        changedByProperty(this.objects, "filename", obj, 0);
        // delete uploaded
        removeByProperty(this.uploaded, "filename", obj.filename);

        this.bucketDiff(obj.size);
        meta.increaseValues(obj);
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
        const meta = useValuesStore();
        this.bucketDiff(-data.size);
        meta.decreaseValues(data);
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        });
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
      }
    },
    async getLast() {
      let q, querySnapshot, rec;
      const auth = useUserStore();
      const constraints = [orderBy("date", "desc"), limit(1)];
      q = query(photosCol, ...constraints);
      querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        rec = getRec(querySnapshot);
        const obj = { year: rec.year, month: rec.month };
        rec.href = "/list?" + new URLSearchParams(obj).toString();
      } else {
        return null;
      }

      // if (auth.user && auth.user.isAuthorized) {
      //   q = query(
      //     photosCol,
      //     where("email", "==", auth.user.email),
      //     ...constraints
      //   );
      //   querySnapshot = await getDocs(q);
      //   if (!querySnapshot.empty) {
      //     rec = getRec(querySnapshot);
      //     const diff = Date.parse(rec.date) - +new Date();
      //     if (diff < CONFIG.activeUser) {
      //       rec.href = "/list?nick=" + emailNick(rec.email);
      //     }
      //   }
      // }
      this.last = rec;
    },
    async getSince() {
      const q = query(photosCol, orderBy("date", "asc"), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      querySnapshot.forEach((d) => {
        const obj = d.data();
        this.since = obj.year;
      });
    },
  },
  persist: {
    key: "a",
    paths: [
      "bucket",
      "find",
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
