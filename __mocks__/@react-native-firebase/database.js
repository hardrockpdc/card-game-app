// Manual Jest mock for @react-native-firebase/database.
//
// Models just enough of the modular RTDB API for transport-level tests: every
// listener registration returns an unsubscribe function and is recorded, so a
// test can assert how many listeners are live at any point. That's what the
// C3 leak is about — registrations that were never detached.
//
// Not a database: reads/writes are recorded, not stored. Tests that need
// values can push them through __emit().

const state = {
  // Every listener ever registered: { path, event, cb, active }
  listeners: [],
  writes: [],
  removes: [],
};

function register(refObj, event, cb) {
  const entry = { path: refObj.path, event, cb, active: true };
  state.listeners.push(entry);
  return () => {
    entry.active = false;
  };
}

export function getDatabase() {
  return { __db: true };
}

export function ref(_db, path) {
  return { path: String(path ?? "") };
}

export function onValue(refObj, cb) {
  return register(refObj, "value", cb);
}

export function onChildAdded(refObj, cb) {
  return register(refObj, "child_added", cb);
}

export function onChildChanged(refObj, cb) {
  return register(refObj, "child_changed", cb);
}

export function set(refObj, value) {
  state.writes.push({ path: refObj.path, value });
  return Promise.resolve();
}

export function push(refObj, value) {
  state.writes.push({ path: refObj.path, value, push: true });
  return Promise.resolve();
}

export function remove(refObj) {
  state.removes.push(refObj.path);
  return Promise.resolve();
}

export function get() {
  return Promise.resolve({ exists: () => false, val: () => null });
}

export function update(refObj, value) {
  state.writes.push({ path: refObj.path, value, update: true });
  return Promise.resolve();
}

export function onDisconnect() {
  return { update: () => Promise.resolve(), remove: () => Promise.resolve() };
}

export function serverTimestamp() {
  return 0;
}

// ─── Test helpers ────────────────────────────────────────────────────────────

export const __mock = {
  reset() {
    state.listeners = [];
    state.writes = [];
    state.removes = [];
  },
  // Listeners that are still attached (the leak metric).
  activeListeners(pathFilter) {
    return state.listeners.filter(
      (l) => l.active && (!pathFilter || l.path.includes(pathFilter)),
    );
  },
  allListeners(pathFilter) {
    return state.listeners.filter(
      (l) => !pathFilter || l.path.includes(pathFilter),
    );
  },
  // Fire every ACTIVE listener matching a path+event with a fake snapshot.
  emit(pathFilter, event, value) {
    const snap = {
      exists: () => value !== null && value !== undefined,
      val: () => value,
      ref: { path: pathFilter },
    };
    state.listeners
      .filter((l) => l.active && l.event === event && l.path.includes(pathFilter))
      .forEach((l) => l.cb(snap));
  },
  writes: () => state.writes,
  removes: () => state.removes,
};
