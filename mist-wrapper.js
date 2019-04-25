var Mist = require("mist-api").Mist;

/**
 * MistWrapper is a wrapper for accessing both Wish and Mist APIs.
 * This source is released under Apache 2.0 license. For licensing of the underlying libraries, contact ControlThings Oy Ab. https://controlthings.fi
 */
class MistWrapper {
  /**
   * Create a new wrapper object with the specified parameters.
   * @constructor
   * @param {string} name - The name of the calling entity.
   * @param {string} coreIp - The IP address of the Wish core.
   * @param {string} corePort - The application port the Wish core is listening to.
   */
  constructor(name, coreIp, corePort) {
    this.state = {
      name,
      coreIp,
      corePort
    };
  }

  /**
   * Open a connection to the Wish core.
   * @return {Promise}
   */
  open() {
    return new Promise((resolve, reject) => {
      this.api = new Mist({
        name: this.state.name,
        coreIp: this.state.coreIp,
        corePort: this.state.corePort
      });

      if (!this.api) {
        reject(
          "Could not open a connection to the wish-core. Make sure it is running and listening on " +
            this.state.coreIp +
            ":" +
            this.state.corePort
        );
      } else {
        this.api.node.addEndpoint("mist", { type: "string" });
        this.api.node.addEndpoint("mist.name", {
          type: "string",
          read: (args, peer, cb) => {
            cb(null, this.state.name);
          }
        });
        resolve();
      }
    });
  }

  /**
   * onReady() returns a Promise that resolves whenever the APIs are ready to be used.
   * @return {Promise}
   */
  onReady() {
    return new Promise(
      (resolve, reject) => {
        this.api.on("ready", () => {
          resolve();
        });
      }
    );
  }

  /**
   * wishRequest sends a request to the Wish API and returns a Promise that resolves or rejects depending on the outcome of the request.
   * @param {string} cmd - The command to send to the Wish core.
   * @param {Array} args - An array of arguments to be sent along with the command. If no arguments are sent, args should be an empty array [].
   * @return {Promise<object>} If resolved, the data returned from the request. If rejected, an error object.
   */
  wishRequest(cmd, args) {
    return new Promise((resolve, reject) => {
      this.api.wish.request(cmd, args, (err, data) => {
        if (err) {
          reject(data);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * getIdentity returns the exported Contact information for a given uid, or "myself" is uid is not specified.
   * @param {Buffer} uid - Which identity to get, or if not specified, get my own identity.
   */
  getIdentity(uid) {
    return new Promise((resolve, reject) => {
      this.wishRequest("identity.list", [])
        .then(data => {
          var found = false;

          for (var x = 0; x < data.length; x++) {
            // TODO: Get identity when uid is specified.
            if (!uid && data[x].privkey) {
              found = true;

              var ret = {
                identity: Object.assign({}, data[x])
              };

              this.wishRequest("identity.export", [data[x].uid])
                .then(exp => {
                  ret.contact = exp;
                  resolve(ret);
                })
                .catch(err => {
                  reject(err);
                });
            }
          }

          setTimeout(() => {
            if (found == false) reject("Not found");
          }, 2000);
        })
        .catch(err => {
          console.log("ERROR", err);
        });
    });
  }

  /**
   * ensureIdentity creates a new identity for our entity or fails graciously if there already is one.
   * @param {string} name - The name of our entity.
   */
  ensureIdentity(name) {
    return new Promise((resolve, reject) => {
      this.wishRequest("identity.create", [name])
        .then(data => {
          resolve(data);
        })
        .catch(err => {
          if (err.code == 304) {
            resolve(err);
          } else {
            reject(err);
          }
        });
    });
  }

  /**
   * Wish local discovery to retrieve a list of entities present.
   * @return {Promise<Array>|Promise<object>} If successful, an array of the discovered entities, otherwise an error object.
   */
  localList() {
    return this.wishRequest("wld.list", []);
  }

  localFriendRequest(localUid, remoteUid, rhid) {
    return this.wishRequest("wld.friendRequest", [luid, ruid, rhid]);
  }

  listFriendRequests() {
    return this.wishRequest("identity.friendRequestList", []);
  }

  acceptFriend(luid, ruid) {
    return this.wishRequest("identity.friendRequestAccept", [luid, ruid]);
  }

  /**
   * mistRequest sends a request to the Mist API and returns a Promise that resolves or rejects depending on the outcome of the request.
   * @param {string} cmd - The command to send to Mist.
   * @param {Array} args - An array of arguments to be sent along with the command. If no arguments are sent, args should be an empty array [].
   * @return {Promise<object>} If resolved, the data returned from the request. If rejected, an error object.
   */
  mistRequest(cmd, args) {
    return new Promise((resolve, reject) => {
      this.api.request(cmd, args, (err, data) => {
        if (err) {
          reject(data);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * listFriends lists all known friends (or peers as they are also called).
   */
  listFriends() {
    return this.mistRequest("listPeers", []);
  }

  /**
   * invoke invokes a function in a peer.
   * @param {object} friend - The peer object of the friend where the action should be invoked.
   * @param {string} action - The action (endpoint name).
   */
  invoke(friend, action) {
    return this.mistRequest("mist.control.invoke", [friend, action]);
  }

  /**
   * onSignal waits for a signal and fires off a callback whenever a signal is received. You can access
   * the signals directly by using this function.
   * @param {function} cb - The callback function that will receive the parameters (signal, data)
   */
  onSignal(cb) {
    var requestId = this.api.request("signals", [], (err, data) => {
      if (!err) {
        if (Array.isArray(data)) {
          cb(...data);
        } else {
          cb(data);
        }
      }
    });
  }

  /**
   * onFriendRequest makes a callback whenever a friend request is received.
   * @param {function} cb - Callback function
   */
  onFriendRequest(cb) {
    this.onSignal((signal, data) => {
      if (!err && signal == "friendRequest") {
        cb();
      }
    });
  }

  /**
   * Add an endpoint to the entity.
   * @param {string} name - The name of the endpoint.
   * @param {object} data - The endpoint data object which looks like { type: "int"|"float"|"string", read: readfunc, write: writefunc, invoke: invokefunc }
   */
  addEndpoint(name, data) {
    this.api.node.addEndpoint(name, data);
  }

  /**
   * Tell everyone that an enpoint value has changed.
   * @param {string} name - The name of the endpoint.
   */
  changed(name) {
    this.api.node.changed(name);
  }
}

module.exports = MistWrapper;
