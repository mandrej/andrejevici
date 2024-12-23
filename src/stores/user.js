import { defineStore, acceptHMRUpdate } from "pinia";
import { nextTick } from "vue";
import { CONFIG } from "../helpers";
import { auth, db } from "../boot/fire";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import router from "../router";

const provider = new GoogleAuthProvider();
// provider.addScope("https://www.googleapis.com/auth/userinfo.profile");
const deviceCol = collection(db, "Device");

// const timeStamp2Date = (ts) => {
//   const timeStamp = ts.seconds * 1000 + ts.nanoseconds / 1e6;
//   return new Date(timeStamp);
// };

const familyMember = (email) => {
  return CONFIG.family.find((el) => el === email);
};
const adminMember = (email) => {
  return CONFIG.admins.find((el) => el === email);
};

export const useUserStore = defineStore("auth", {
  state: () => ({
    user: null,
    token: null,
  }),
  getters: {
    showConsent: (state) => {
      return (
        "Notification" in window &&
        state.user &&
        state.user.allowPush &&
        state.user.askPush
      );
    },
  },
  actions: {
    async storeUser(user) {
      this.user = {
        name: user.displayName,
        email: user.email,
        uid: user.uid,
        isAuthorized: Boolean(familyMember(user.email)), // only family members
        isAdmin: Boolean(adminMember(user.email)),
        signedIn: new Date(1 * user.metadata.lastLoginAt), // millis
      };

      const docRef = doc(db, "User", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // 2024-05-22
        if (data.ask_push || data.allow_push) {
          await updateDoc(docRef, {
            allow_push: deleteField(),
            ask_push: deleteField(),
          });
        }

        if (!data.allowPush) {
          this.user.allowPush = true;
        } else {
          this.user.allowPush = data.allowPush; // preserve old
        }
      } else {
        this.user.allowPush = true;
      }

      this.user.askPush = this.token ? false : true;
      await setDoc(docRef, this.user, { merge: true });
    },
    signIn() {
      if (this.user && this.user.uid) {
        auth.signOut().then(() => {
          this.user = null;
          const routeName = router.currentRoute.value.name;
          if (routeName === "add" || routeName === "admin") {
            router.push({ name: "home" });
          }
        });
      } else {
        signInWithPopup(getAuth(), provider)
          .then((result) => {
            if (process.env.DEV)
              console.log(`Auth user: ${result.user.displayName}`);
          })
          .catch((err) => {
            console.error(err.message);
          });
      }
    },
    async updateUser() {
      const docRef = doc(db, "User", this.user.uid);
      await updateDoc(docRef, this.user);
    },
    async updateDevice() {
      const docRef = doc(db, "Device", this.token);
      const data = {
        email: this.user.email,
        stamp: new Date(),
      };
      await setDoc(docRef, data, { merge: true });
    },
    removeDevice() {
      const q = query(deviceCol, where("email", "==", this.user.email));
      return new Promise((resolve, reject) => {
        this.deleteQueryBatch(db, q, resolve).catch(reject);
      });
    },

    async deleteQueryBatch(db, query, resolve) {
      const querySnapshot = await getDocs(query);
      const batchSize = querySnapshot.size;
      if (batchSize === 0) {
        resolve();
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      nextTick(() => {
        this.deleteQueryBatch(db, query, resolve);
      });
    },
  },
  persist: {
    key: "b",
    paths: ["user", "token"],
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot));
}
