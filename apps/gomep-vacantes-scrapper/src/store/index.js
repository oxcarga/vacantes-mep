import { createStore, usesFirestore } from "./store.js";
import { createJsonStore } from "./json.js";
import { createFirestoreStore } from "./firestore.js";

export {
  createJsonStore,
  createFirestoreStore,
  createStore,
  usesFirestore,
};
