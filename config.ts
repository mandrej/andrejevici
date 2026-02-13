const CONFIG = {
  limit: process.env.DEV ? 12 : 100,
  loginDays: 60,
  firebase: {
    apiKey: 'AIzaSyBHV3J3GAEPiTU2MCrhuRI4F9mWzdjw6B0',
    authDomain: 'andrejevici.firebaseapp.com',
    databaseURL: 'https://andrejevici.firebaseio.com',
    projectId: 'andrejevici',
    storageBucket: 'andrejevici.appspot.com',
    messagingSenderId: '183441678976',
    appId: '1:183441678976:web:3f87f36ff673545d3fbc65',
    measurementId: 'G-4HF1XHQ8Y6',
    vapidKey:
      'BJi0xbkOqVvlYglggQz_g2fWv_RToySqLr7__rX_aEX8b4uElfTzNNcBA9rHhaB8jJB7IGfhT5LDj_OocJ2e23g',
  },
  notifyUrl: process.env.DEV
    ? 'http://localhost:5001/andrejevici/us-central1/notify'
    : 'https://notify-hq2yjfmwca-uc.a.run.app',
  thumbnails: 'thumbnails',
  thumbSuffix: '_400x400.jpeg',
  photo_filter: ['year', 'tags', 'model', 'lens', 'email', 'nick'],
  adminMap: new Map<string, string>()
    .set('milan.andrejevic@gmail.com', 'FvlXe9WUkgaaRQ2tn7nNDiKfjSu1')
    .set('mihailo.genije@gmail.com', 'HG9VdF9syLNxHYbdQcU7kspLZ9H2'),
  familyMap: new Map<string, string>()
    .set('milan.andrejevic@gmail.com', 'milan') // email.match(/[^.@]+/)
    .set('mihailo.genije@gmail.com', 'mihailo')
    .set('ana.devic@gmail.com', 'ana')
    .set('dannytaboo@gmail.com', 'dannytaboo')
    .set('svetlana.andrejevic@gmail.com', 'svetlana')
    .set('011.nina@gmail.com', '011')
    .set('djordjeandrejevic13@gmail.com', 'djordje')
    .set('bogdan.andrejevic16@gmail.com', 'bogdan')
    .set('zile.zikson@gmail.com', 'zile'),

  dateFormat: 'YYYY-MM-DD HH:mm',
  cache_control: 'public, max-age=604800',
  noTitle: 'No name',
  fileBroken: '/broken_image.svg',
  fileMax: 10,
  fileType: '.jpg, .jpeg, .png, .gif',
  fileSize: 4194304,
  title: 'ANDрејевићи',
}

export default CONFIG
