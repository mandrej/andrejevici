const CONFIG = {
  limit: process.env.DEV ? 12 : 100,
  group: process.env.DEV ? 12 : 24,
  firebase: {
    apiKey: "AIzaSyBHV3J3GAEPiTU2MCrhuRI4F9mWzdjw6B0",
    authDomain: "andrejevici.firebaseapp.com",
    databaseURL: "https://andrejevici.firebaseio.com",
    projectId: "andrejevici",
    storageBucket: "andrejevici.appspot.com",
    messagingSenderId: "183441678976",
    appId: "1:183441678976:web:3f87f36ff673545d3fbc65",
    measurementId: "G-4HF1XHQ8Y6",
    vapidKey:
      "BJi0xbkOqVvlYglggQz_g2fWv_RToySqLr7__rX_aEX8b4uElfTzNNcBA9rHhaB8jJB7IGfhT5LDj_OocJ2e23g",
  },
  notifyUrl: process.env.DEV
    ? "http://localhost:5001/andrejevici/us-central1/notify"
    : "https://notify-hq2yjfmwca-uc.a.run.app",
  thumbnails: "thumbnails",
  photo_filter: ["year", "tags", "model", "lens", "email"],
  admins: ["milan.andrejevic@gmail.com", "mihailo.genije@gmail.com"],
  family: [
    "milan.andrejevic@gmail.com",
    "mihailo.genije@gmail.com",
    "ana.devic@gmail.com",
    "dannytaboo@gmail.com",
    "svetlana.andrejevic@gmail.com",
    "011.nina@gmail.com",
    "bogdan.andrejevic16@gmail.com",
    "zile.zikson@gmail.com",
  ],
  // activeUser: 30 * 24 * 60 * 60 * 1000, // submitting in last 30 days
  dateFormat: "YYYY-MM-DD HH:mm",
  cache_control: "public, max-age=604800",
  noTitle: "No name",
  fileBroken: "/broken_image.svg",
  fileMax: 10,
  fileType: "image/jpeg",
  fileSize: 4194304,
  title: "ANDрејевићи",
};

export default CONFIG;
