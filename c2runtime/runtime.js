// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Colyseus = function(runtime)
{
  this.runtime = runtime;
};

(function ()
 {
   var Colyseus = window['Colyseus'];

   var pluginProto = cr.plugins_.Colyseus_SDK.prototype;

   /////////////////////////////////////
   // Object type class
   pluginProto.Type = function(plugin)
   {
     this.plugin = plugin;
     this.runtime = plugin.runtime;
   };

   var typeProto = pluginProto.Type.prototype;

   typeProto.onCreate = function()
   {
   };

   /////////////////////////////////////
   // Instance class
   pluginProto.Instance = function(type)
   {
     this.type = type;
     this.runtime = type.runtime;

     // Initialise object properties
     this.endpoint = "";
   };

   var instanceProto = pluginProto.Instance.prototype;

   instanceProto.onCreate = function()
   {
     // Read properties set in C3
     this.endpoint = this.properties[0];
     this.client = new Colyseus.Client(this.endpoint);
   };

  //  instanceProto.onDestroy = function()
  //  {
  //    // leave the room
  //    if (this.room) { this.room.leave(); }

  //    // close the connection with server.
  //    if (client) { client.close(); }
  //  };

   instanceProto.saveToJSON = function ()
   {
     return {};
   };

   instanceProto.loadFromJSON = function (o)
   {
   };

   /**BEGIN-PREVIEWONLY**/
   instanceProto.getDebuggerValues = function (propsections)
   {
   };
   /**END-PREVIEWONLY**/

   //////////////////////////////////////
   // Conditions
   function Cnds() { };

   /**
    * Conditions for Client
    */
   Cnds.prototype.OnOpen = function () { return true; };
   Cnds.prototype.OnClose = function () { return true; };
   Cnds.prototype.OnClientError = function () { return true; };

   /**
    * Conditions for Room
    */
   Cnds.prototype.OnJoinRoom = function () { return true; };
   Cnds.prototype.OnLeaveRoom = function () { return true; };
   Cnds.prototype.OnJoinError = function () { return true; };
   Cnds.prototype.OnRoomError = function () { return true; };
   Cnds.prototype.OnStateChange = function () { return true; };
   Cnds.prototype.OnMessage = function (type) { return this.lastType === type; };


   /* Schema Serializer */
   Cnds.prototype.OnCollectionItemAdd = function (path) { return checkPath(this.lastPath, path); },
   Cnds.prototype.OnCollectionItemChange = function (path) {
     return checkPath(this.lastPath, path);
   },
   Cnds.prototype.OnChangeAtPath = function (path) { return checkPath(this.lastPath, path); },
   Cnds.prototype.OnCollectionItemRemove = function (path) { return checkPath(this.lastPath, path); },

   Cnds.prototype.CompareCurrentKey = function (index) { return this.lastIndex === index; },
   Cnds.prototype.IsField = function (field) { return this.lastField === field; }

  //  var operations = ['any', 'add', 'replace', 'remove'];
  //  Cnds.prototype.OnRoomListen = function (path, operationIndex) {
  //    var self = this;
  //    var change = this.lastChange;
  //    var operation = operations[operationIndex];

  //    // the operation doesn't match with the operation user is interested in.
  //    if (operation !== "any" && change.operation !== operation) {
  //      return false;
  //    }

  //    var rules = path.split("/");

  //    if (!this.listeners[path]) {
  //      rules = rules.map(function(segment) {
  //        // replace placeholder matchers
  //        return (segment.indexOf(":") === 0)
  //          ? self.room.matcherPlaceholders[segment] || self.room.matcherPlaceholders[":*"]
  //          : new RegExp("^" + segment + "$");
  //      });
  //      this.listeners[path] = rules;
  //    }

  //    if (change.path.length !== this.listeners[path].length) {
  //      return false;
  //    }

  //    for (var i = 0, len = this.listeners[path].length; i < len; i++) {
  //      let matches = change.path[i].match(this.listeners[path][i]);
  //      if (!matches || matches.length === 0 || matches.length > 2) {
  //        return false;
  //      }
  //    }

  //    // alright! let's execute the callback!
  //    return true;
  //  };

   pluginProto.cnds = new Cnds();

   //////////////////////////////////////
   // Actions
   function Acts() {};

   Acts.prototype.SetEndpoint = function (endpoint)
   {
     this.client = new Colyseus.Client(endpoint || this.endpoint);
   };

   Acts.prototype.JoinRoom = function (roomName, options)
   {
     this._MatchMake("join", roomName, options);
   };

   Acts.prototype.JoinOrCreateRoom = function (roomName, options)
   {
     this._MatchMake("joinOrCreate", roomName, options);
   };

   Acts.prototype.CreateRoom = function (roomName, options)
   {
     this._MatchMake("create", roomName, options);
   };

   Acts.prototype.JoinRoomById = function (roomId, options)
   {
     this._MatchMake("joinById", roomId, options);
   };

   Acts.prototype.ConsumeSeatReservation = function (reservation)
   {
     this._MatchMake("consumeSeatReservation", JSON.parse(reservation));
   };

   Acts.prototype.ReconnectRoom = function (roomId, sessionId)
   {
     this._MatchMake("reconnect", roomId, sessionid);
   };

   Acts.prototype._MatchMake = function (methodName, roomName, options) {
     var self = this;
     var options = JSON.parse(options || "{}");

     this.client[methodName](roomName, options).then(function(room) {
       self.room = room;

       self.sessionId = self.room.sessionId;
       self.runtime.trigger(pluginProto.cnds.OnJoinRoom, self);

       room.onError(function (code, message) {
         self.lastError = { code: code, message: message };
         self.runtime.trigger(pluginProto.cnds.OnRoomError, self);
       });

       room.onLeave(function (code) {
         self.lastError = code;
         self.runtime.trigger(pluginProto.cnds.OnLeaveRoom, self);
       });

       room.onStateChange.once(function() {
         function registerCallbacksOnStructure(instance, path) {
           instance.onChange(function(_) { onChange([...path], []) });

           var schema = instance['_definition'].schema;
           for (var field in schema) {
             var schemaType = typeof (schema[field]);
             if (schemaType === "object" || schemaType === "function") {
               instance[field].onAdd(function (instance, index) { onAdd([...path, field], instance, index); })
               instance[field].onChange(function (instance, index) { onItemChange([...path, field], instance, index); });
               instance[field].onRemove(function (instance, index) { onRemove([...path, field], instance, index); })
             }
           }
         }

         function onAdd(path, instance, index) {
           // only register callbacks on child Schema structures.
           if (instance['_definition']) {
             registerCallbacksOnStructure(instance, [...path, index]);
           }

           self.lastPath = path.join(".");
           self.lastIndex = index;
           self.lastValue = instance;
           self.runtime.trigger(pluginProto.cnds.OnCollectionItemAdd, self);
         }

         function onItemChange(path, instance, index) {
           self.lastPath = path.join(".");
           self.lastIndex = index;
           self.lastValue = instance;
           self.runtime.trigger(pluginProto.cnds.OnCollectionItemChange, self);
         }

         function onChange(path, changes) {
           self.lastIndex = undefined;
           self.lastPath = path.join(".");
           for (var i = 0, l = changes.length; i < l; i++) {
             self.lastField = changes[i].field;
             self.lastValue = changes[i].value;
             self.lastPreviousValue = changes[i].previousValue;
             self.runtime.trigger(pluginProto.cnds.OnChangeAtPath, self);
           }
         }

         function onRemove(path, instance, index) {
           self.lastPath = path.join(".");
           self.lastIndex = index;
           self.lastValue = instance;
           self.runtime.trigger(pluginProto.cnds.OnCollectionItemRemove, self);
         }

         registerCallbacksOnStructure(self.room.state, []);
       });

       room.onStateChange(function (state) {
         self.lastPath = ".";
         self.lastIndex = undefined;
         self.lastValue = state;
         self.runtime.trigger(pluginProto.cnds.OnStateChange, self);
       });

       room.onMessage("*", function (type, message) {
         if (self.debug) {
           console.info("Colyseus: onMessage", type, message);
         }
         self.lastType = type;
         self.lastValue = message;
         self.runtime.trigger(pluginProto.cnds.OnMessage, self);
       });

     }).catch(function(e) {
       self.lastError = e;
       self.runtime.trigger(pluginProto.cnds.OnRoomError, self);
     });
   }

   Acts.prototype.RoomSend = function (type, message)
   {
     if (this.room && this.room.connection) {
       this.room.send(type, message);

     } else {
       console.log("RoomSend: not connected.");
     }
   }

   Acts.prototype.RoomSendJSON = function (type, message)
   {
     this.RoomSend(type, JSON.parse(message));
   }

   Acts.prototype.RoomLeave = function ()
   {
     if (this.room) {
       this.room.leave()
     }
   }

   pluginProto.acts = new Acts();

   //////////////////////////////////////
   // Expressions
   function Exps() {};

   Exps.prototype.SessionId = function (ret)
   {
     ret.set_string((this.room && this.room.sessionId) || "");
   };

   Exps.prototype.State = function (ret, variablePath)
   {
     ret.set_any(getDeepVariable(variablePath, (this.room && this.room.state) || {}));
   };

   Exps.prototype.JSON = function (ret, data) {
     ret.set_string(JSON.stringify(eval(`(${data})`)));
   };

   Exps.prototype.CurrentKey = function (ret) {
     ret.set_string(this.lastField || "");
   }

   Exps.prototype.CurrentValue = function (ret) {
     ret.set_any(this.lastValue);
   }

   Exps.prototype.CurrentValueAt = function (ret, path) {
     ret.set_any(getDeepVariable(path, this.lastValue));
   }

   Exps.prototype.Value = function (ret) {
     ret.set_any(this.lastValue);
   };

   Exps.prototype.ValueAt = function (ret, path) {
     ret.set_any(getDeepVariable(path, this.lastValue));
   };

   Exps.prototype.ErrorMessage = function (ret) {
     ret.set_string(this.lastError && this.lastError.message);
   };

   Exps.prototype.ErrorCode = function (ret) {
     ret.set_number(this.lastError && this.lastError.code);
   };

   pluginProto.exps = new Exps();

   //////////////////////////////////////
   // Utilities
   function getDeepVariable (path, container) {
     var path = path.split(".");
     var value = container;

     // deeply get the requested variable from the room's state.
     try {
       do {
        value = (typeof(value.get)!=="function") // MapSchema's .get() method
          ? value[path.shift()]
          : value.get(path.shift());
       } while (path.length > 0);
     } catch (e) {
       console.warn(e);
       return null;
     }

     return value;
   }

   var ANY = ":any:";
   function checkPath (lastPath, path) {
     if (lastPath === path) {
       return true;

     } else if (path.indexOf(ANY) >= 0) {
       var lastSegments = lastPath.split(".");
       var segments = path.split(".");

       if (lastSegments.length === segments.length) {
         for (var i = 0; i < segments.length; i++) {
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

 }());
