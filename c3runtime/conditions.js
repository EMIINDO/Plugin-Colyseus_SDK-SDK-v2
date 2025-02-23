"use strict";

{
  const ANY = ":any:";
  const typesByIndex = ["string", "number", "boolean", "undefined", "object"];

  function checkPath (lastPath, path) {
    if (lastPath === path) {
      return true;

    } else if (path.indexOf(ANY) >= 0) {
      const lastSegments = lastPath.split(".");
      const segments = path.split(".");

      if (lastSegments.length === segments.length) {
        for (let i = 0; i < segments.length; i++) {
          if (segments[i] !== ANY && segments[i] !== lastSegments[i]) {
            return false;
          }
        }
        return true;

      } else {
        return false;
      }

    } else {
      return false;
    }
  }
    const C3 = globalThis.C3;
  C3.Plugins.Colyseus_SDK.Cnds =
  {
    // Matchmaking
    OnGetAvailableRooms() { return true; },
    OnJoinRoom() { return true; },
    OnJoinError() { return true; },
    OnAnyError() { return true; },
    ForEachRoomAvailable() {
    const globalThis = this;

    if (globalThis.lastValue && globalThis.lastValue.length > 0) {
        const loopCtx = this.runtime.sdk.createLoopingConditionContext();
        const rooms = globalThis.lastValue;

        for (let key = 0; key < rooms.length; key++) {
            globalThis.lastKey = key;
            globalThis.lastValue = rooms[key];

            loopCtx.retrigger();

            if (loopCtx.isStopped)
                break;
        }

        loopCtx.release();
    }

    
    return false;
},

    // Room
    OnLeaveRoom() { return true; },
    OnRoomError() { return true; },
    OnStateChange() { return true; },
    OnMessage(type) {
      return (
        type === "*" ||
        this.lastType === type
      );
    },

    // Messages
    CompareMessageType(cmp, type) { return C3.compare(this.lastType, cmp, type); },
    CompareMessageValue(cmp, value) { return C3.compare(this.lastMessage, cmp, value); },
    CompareMessageValueAt(path, cmp, value) { return C3.compare(this.getDeepVariable(path, this.lastMessage), cmp, value);  },
    CompareMessageValueOfType(cmp, type) { return C3.compare(typeof (this.lastMessage), cmp, typesByIndex[type]); },
    CompareMessageValueAtOfType(path, cmp, type) { return C3.compare(typeof (this.getDeepVariable(path, this.lastMessage)), cmp, typesByIndex[type]); },

    // State/Schema
    OnChangeAtPath(path) { return checkPath(this.lastPath, path); },
    CompareStateValueAt(path, cmp, value) { return C3.compare(this.getDeepVariable(path, this.room && this.room.state), cmp, value); },

    // State/Schema/Collections
    OnCollectionItemAdd(path) { return this.lastCollectionPath === path; },
    OnCollectionItemRemove(path) { return this.lastCollectionPath === path; },
    OnCollectionItemChange(path) { return this.lastCollectionPath === path; },
    CompareItemsAtCount(path, cmp, count) {
      const collection = this.getDeepVariable(path, (this.room && this.room.state));
      const itemsCount = (typeof(collection.indexOf) === "function"
        ? (collection.length || 0)
        : (collection.size || 0));
      return C3.compare(itemsCount, cmp, count);
    },
    CompareCurrentItemsCount(cmp, count) {
      const collection = this.lastCollection || "";
      const itemsCount = (typeof(collection.indexOf) === "function"
        ? (collection.length || 0)
        : (collection.size || 0));
      return C3.compare(itemsCount, cmp, count);
    },
    ArrayHasValue(path, value) {
      const arr = this.getDeepVariable(path, this.room && this.room.state);
      return arr && typeof (arr.includes) === "function" && arr.includes(value)
    },
    MapHasKey(path, key) {
      const map = this.getDeepVariable(path, this.room && this.room.state);
      return map && typeof (map.has) === "function" && map.has(key);
    },

    // State
    CompareCurrentKey(cmp, key) { return C3.compare(this.lastKey, cmp, key); },
    CompareCurrentValue(cmp, value) { return C3.compare(this.lastValue, cmp, value); },
    CompareCurrentValueAt(path, cmp, value) { return C3.compare(this.getDeepVariable(path, this.lastValue), cmp, value); },
    ForEachItemAt(path) {
    const globalThis = this;
    const collection = this.getDeepVariable(path, this.room && this.room.state);
    const validCollection = (collection && typeof collection.forEach === "function");

    if (validCollection) {
        // Save the reference collection for future use (if needed)
        this.lastCollectionPath = path;
        this.lastCollection = collection;

        // Create a looping context to manage event iterations
        const loopCtx = this.runtime.sdk.createLoopingConditionContext();

        // Use a for loop to check for termination conditions (isStopped)
        for (let key = 0; key < collection.length; key++) {
            globalThis.lastKey = key;
            globalThis.lastPath = path + "." + key;
            globalThis.lastValue = collection[key];

            loopCtx.retrigger();
            if (loopCtx.isStopped)
                break;
        }

        loopCtx.release();
    }

 
    return false;

},

    // Error handling
    HasErrorCode(cmp, code) { return this.lastError && C3.compare(this.lastError.code, cmp, code); },
    HasErrorMessage(cmp, message) { return this.lastError && C3.compare(this.lastError.message, cmp, message); }

  };
}
