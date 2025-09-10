"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = void 0;
/* eslint-disable comma-dangle */
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var messaging_1 = require("firebase-admin/messaging");
var https_1 = require("firebase-functions/v2/https");
var logger = require("firebase-functions/logger");
var TOPIC = 'newimages';
(0, app_1.initializeApp)();
exports.notify = (0, https_1.onRequest)({
    timeoutSeconds: 120,
    region: ['us-central1'],
    cors: ['https://andrejevici.web.app', 'http://localhost:9200'],
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var registrationTokens, text, msg, query, querySnapshot, tokens;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                registrationTokens = [];
                text = req.body.text;
                if (!text || text.length === 0) {
                    res.send('No message error');
                    return [2 /*return*/];
                }
                msg = {
                    topic: TOPIC,
                    data: {
                        title: 'Andrejevici',
                        body: text,
                        link: 'https://andrejevici.web.app/',
                    },
                };
                query = (0, firestore_1.getFirestore)().collection('Device');
                return [4 /*yield*/, query.get()];
            case 1:
                querySnapshot = _a.sent();
                if (querySnapshot.size === 0) {
                    res.status(200).send('No subscribers error');
                    return [2 /*return*/];
                }
                querySnapshot.forEach(function (docSnap) {
                    registrationTokens.push(docSnap.id);
                });
                if (!(registrationTokens.length > 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, unsubscribe(registrationTokens)];
            case 2:
                tokens = _a.sent();
                if (tokens.length > 0) {
                    (0, messaging_1.getMessaging)()
                        .send(msg)
                        .then(function (response) {
                        logger.info('send response:', response);
                        res.write(response);
                    })
                        .catch(function (error) {
                        logger.error(error);
                        res.write(error);
                    })
                        .finally(function () {
                        res.end();
                    });
                }
                else {
                    res.status(200).send('All tokens expired');
                }
                return [3 /*break*/, 4];
            case 3:
                res.status(200).send('No subscribers');
                _a.label = 4;
            case 4: return [2 /*return*/];
        }
    });
}); });
var unsubscribe = function (tokens) { return __awaiter(void 0, void 0, void 0, function () {
    var resp;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, messaging_1.getMessaging)().unsubscribeFromTopic(tokens, TOPIC)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ];
            case 1:
                resp = _a.sent();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resp.errors.forEach(function (it) {
                    var token = tokens[it.index];
                    if (token !== undefined &&
                        (it.error.code === 'messaging/invalid-registration-token' ||
                            it.error.code === 'messaging/registration-token-not-registered')) {
                        removeToken(token);
                        tokens.splice(it.index, 1);
                    }
                });
                if (!(tokens.length > 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, messaging_1.getMessaging)().subscribeToTopic(tokens, TOPIC)];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3: return [2 /*return*/, tokens];
        }
    });
}); };
var removeToken = function (token) { return __awaiter(void 0, void 0, void 0, function () {
    var docRef, doc;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (token === undefined)
                    return [2 /*return*/];
                docRef = (0, firestore_1.getFirestore)().collection('Device').doc(token);
                return [4 /*yield*/, docRef.get()];
            case 1:
                doc = _b.sent();
                logger.info("Remove token for ".concat((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.email));
                return [4 /*yield*/, docRef.delete()];
            case 2:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); };
