# Quasar App (andrejevici)

A Quasar Project

## Install the dependencies

```bash
npm install -g firebase-tools
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
firebase emulators:start --import=data #--export-on-exit=data
quasar dev -m pwa
```

### Build and deploy app for production

```bash
quasar build -m pwa
firebase deploy --except functions,extensions
# or
./ands build
./ands deploy
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

```bash
inkscape --export-filename=AppIcon.png -w 2048 -h 2048 AppIcon.svg

yarn global add @quasar/icongenie
icongenie g -i AppIcon.png --skip-trim

quasar build -m pwa
firebase deploy
```

### using image-resize wxtension

storage-resize-images.env

```bash
CACHE_CONTROL_HEADER=Cache-Control: public, max-age=604800
CONTENT_FILTER_LEVEL=OFF
DELETE_ORIGINAL_FILE=false
firebaseextensions.v1beta.function/location=us-central1
FUNCTION_MEMORY=512
IMAGE_TYPE=jpeg
IMG_BUCKET=andrejevici.appspot.com
IMG_SIZES=400x400
IS_ANIMATED=false
MAKE_PUBLIC=true
REGENERATE_TOKEN=false
RESIZED_IMAGES_PATH=thumbnails
```

### Use docker for firebase-tools

https://github.com/AndreySenov/firebase-tools-docker/blob/main/doc/guide/running_firebase_emulators.md

```bash
docker pull andreysenov/firebase-tools:latest-node-22

docker run -dit --name firebase-login andreysenov/firebase-tools:latest-node-22 bash
# firebase login

docker run -dit \
  -p 9199:9199 -p 9099:9099 -p 9005:9005 -p 9000:9000 -p 8085:8085 -p 8080:8080 -p 5001:5001 -p 4000:4000 \
  -v /Users/milan/work/andrejevici:/project \
  -v /Users/milan/work/andrejevici/data:/data \
  -w /project \
  --name firebase-tools \
  andreysenov/firebase-tools:latest-node-22 \
  firebase emulators:start --import /data #--export-on-exit /data
  
quasar dev -m pwa
```
