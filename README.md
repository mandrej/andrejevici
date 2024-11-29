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

### Use docker for firebase-tools

https://github.com/AndreySenov/firebase-tools-docker/blob/main/doc/guide/running_firebase_emulators.md

```bash
docker run -dit -p 9199:9199 -p 9099:9099 -p 9005:9005 -p 9000:9000 -p 8085:8085 -p 8080:8080 -p 5001:5001 -p 5000:5000 -p 4000:4000 -v /Users/milan/work/andrejevici:/home/node --name firebase-tools andreysenov/firebase-tools bash

docker attach id
firebase login
docker stop id
docker rm id

docker run -dit -p 9199:9199 -p 9099:9099 -p 9005:9005 -p 9000:9000 -p 8085:8085 -p 8080:8080 -p 5001:5001 -p 5000:5000 -p 4000:4000 -v /Users/milan/work/andrejevici:/home/node --name firebase-tools andreysenov/firebase-tools firebase emulators:start --import=data

docker start id
quasar dev -m pwa
```
