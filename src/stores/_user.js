import { defineStore } from "pinia";
import { auth } from "../boot/fire";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

export const useUserStore = defineStore("user", {
  state: () => ({
    user: {},
  }),
  actions: {
    signIn() {
      if (this.user && this.user.uid) {
        auth.signOut().then(() => {
          this.user = {};
          // const routeName = router.currentRoute.value.name;
          // if (routeName === "add" || routeName === "admin") {
          //   router.push({ name: "home" });
          // }
        });
      } else {
        signInWithPopup(auth, provider)
          .then((response) => {
            const payload = {
              name: response.user.displayName,
              email: response.user.email,
              uid: response.user.uid,
              photo: response.user.photoURL,
              isAuthorized: Boolean(familyMember(response.user.email)), // only family members
              isAdmin: Boolean(adminMember(response.user.email)),
              lastLogin: Date.now(), // millis
            };
            this.user = { ...payload };
            // this.updateUser(this.user);
            // this.getPermission();
          })
          .catch((err) => {
            console.error(err.message);
          });
      }
    },
  },
  persist: {
    key: "b",
    paths: ["user"],
  },
});
