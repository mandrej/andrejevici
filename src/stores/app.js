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
  updateDoc,
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
  textSlug,
  sliceSlug,
} from "../helpers";
import router from "../router";
import notify from "../helpers/notify";
import { useValuesStore } from "./values";
import { useUserStore } from "./user";

const bucketRef = doc(db, "Bucket", "total");
const photosCol = collection(db, "Photo");

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
        querySnapshot.forEach((it) => {
          res.count++;
          res.size += it.data().size;
        });
      }
      this.bucket = { ...res };
      await setDoc(bucketRef, this.bucket, { merge: true });
      notify({ message: `Bucket size calculated` });
    },
    async mismatch() {
      notify({
        message: `Please wait`,
        timeout: 0,
        actions: [{ icon: "close", color: "white" }],
        group: "mismatch",
      });
      let result = 0;
      const bucketNames = [];
      const storageNames = [];
      const auth = useUserStore();
      const uploadedFilenames = this.uploaded.length
        ? this.uploaded.map((it) => it.filename)
        : [];
      const refs = await listAll(storageRef(storage, ""));
      for (let r of refs.items) {
        bucketNames.push(r.name);
      }
      const q = query(photosCol);
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        storageNames.push(doc.id);
      });

      bucketNames.sort();
      storageNames.sort();
      // uploaded to bucket but no record in firestore
      const missing = bucketNames.filter((x) => storageNames.indexOf(x) === -1);
      for (let name of missing) {
        if (uploadedFilenames.indexOf(name) === -1) {
          const _ref = storageRef(storage, name);
          const metadata = await getMetadata(_ref);
          const downloadURL = await getDownloadURL(_ref);
          this.uploaded.push({
            url: downloadURL,
            filename: name,
            size: metadata.size,
            email: auth.user.email,
            nick: emailNick(auth.user.email),
          });
          result++;
        }
      }
      if (result > 0) {
        notify({
          message: `${result} files uploaded to bucket, but doesn't have record in firestore.<br>
          Resolve mismathed files either by publish or delete.`,
          actions: [
            {
              label: "Resolve",
              color: "white",
              handler: () => {
                router.push({ path: "/add" });
              },
            },
          ],
          multiLine: true,
          html: true,
          type: "warning",
          timeout: 0,
          group: "mismatch",
        });
      } else {
        notify({ message: `All good. Nothing to reslove`, group: "mismatch" });
      }
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
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
        // if (querySnapshot.empty) {
        //   this.error = "empty";
        // }
        if (reset) this.objects.length = 0;
        querySnapshot.forEach((it) => {
          this.objects.push(it.data());
        });
        const next = querySnapshot.docs[querySnapshot.docs.length - 1];
        if (next && next.id) {
          next.id === this.next ? (this.next = null) : (this.next = next.id);
        } else {
          this.next = null;
          this.error = this.objects.length === 0 ? "empty" : null;
        }
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
        if (this.objects && this.objects.length) {
          const idx = this.objects.findIndex(
            (item) => item.filename === obj.filename
          );
          if (idx > -1) this.objects.splice(idx, 1, obj);
          notify({ message: `${obj.filename} updated` });
        }
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
        // TODO transaction, handle errors
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
    getRec(snapshot) {
      let rec;
      snapshot.forEach(async (it) => {
        rec = it.data();
      });
      return rec;
    },
    async getLast() {
      let snapshotYear, snapshotUser, rec;
      const auth = useUserStore();
      const constraints = [orderBy("date", "desc"), limit(1)];
      const qYear = query(photosCol, ...constraints);
      if (auth.user && auth.user.isAuthorized) {
        const qUser = query(
          photosCol,
          where("email", "==", auth.user.email),
          ...constraints
        );
        snapshotUser = await getDocs(qUser);
        if (snapshotUser.empty) {
          snapshotYear = await getDocs(qYear);
          rec = this.getRec(snapshotYear);
          rec.href = "/list?year=" + rec.year;
        } else {
          rec = this.getRec(snapshotUser);
          const diff = Date.parse(rec.date) - +new Date();
          if (diff > CONFIG.activeUser) {
            rec = this.getRec(snapshotYear);
            rec.href = "/list?year=" + rec.year;
          } else {
            rec.href = "/list?nick=" + emailNick(rec.email);
          }
        }
      } else {
        snapshotYear = await getDocs(qYear);
        rec = getRec(snapshotYear);
        rec.href = "/list?year=" + rec.year;
      }
      this.last = rec;
    },
    async getSince() {
      const q = query(photosCol, orderBy("date", "asc"), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      querySnapshot.forEach((it) => {
        const rec = it.data();
        this.since = rec.year;
      });
    },
    async fix() {
      const test = ["ш", "ђ", "љ", "џ", "ћ", "ч", "ж"];
      const q = query(photosCol, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      querySnapshot.forEach(async (it) => {
        const rec = it.data();

        const docRef = doc(db, "Photo", rec.filename);
        await updateDoc(docRef, { done: false });

        const headline = rec.headline.toLowerCase();
        for (const c of test) {
          if (headline.indexOf(c) !== -1) {
            const docRef = doc(db, "Photo", rec.filename);
            const slug = textSlug(rec.headline);
            rec.text = sliceSlug(slug);
            await setDoc(docRef, rec, { merge: true });
            // const data = {
            //   done: deleteField(),
            // };
            // await updateDoc(docRef, data);
            notify({ message: slug });
          }
        }
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
