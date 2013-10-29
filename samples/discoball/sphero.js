/*
 * Copyright (c) 2012-2013 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


(function (global) {
  "use strict";

  var
    bt = global.chrome.bluetooth,
    con = global.console,
    UUID = "00001101-0000-1000-8000-00805f9b34fb";

  function Sphero() {
    var
      that = this,
      profile = {"uuid": UUID},
      current_device,
      devices = [],
      bt_available = false,
      api_ready = false,
      current_socket,
      readyCallbacks = [];

    function onDeviceDiscovered(device) {
      if (device.paired && device.name.indexOf("Sphero") === 0) {
        con.log("Sphero found", device);
        devices.push(device);
      }
    }

    function updateDevices(callback) {
      devices = [];
      if (!bt_available) {
        con.log("Bluetooth not available");
        try { callback(null, "Bluetooth not available"); } catch (e) {
          con.log("Error calling updateDevices callback", e);
        }
      }
      bt.getDevices({
        "deviceCallback": onDeviceDiscovered
      }, function () {
        var error = global.chrome.runtime.lastError;
        if (!!error) {
          con.log("Error updating devices", error);
          if (!!callback) {
            try { callback(null, error.message); } catch (e) {
              con.log("Error calling updateDevices callback", e);
            }
          }
        } else {
          con.log("Devices retrieved");
          if (!!callback) {
            try { callback(devices); } catch (e) {
              con.log("Error calling updateDevices callback", e);
            }
          }
        }
      });
    }

    function onAdapterStateChanged(state) {
      con.log("onAdapterStateChanged", state);
      if (!state || !state.available || !state.powered) {
        bt_available = false;
        api_ready = false;
        devices = [];
        current_device = false;
        current_socket = false;
      } else {
        bt_available = true;
        bt.addProfile(profile, function () {
          updateDevices(function () {
            var callback;
            api_ready = true;
            while(readyCallbacks.length > 0) {
              callback = readyCallbacks.pop();
              try { callback(); } catch (e) {
                con.log("Error calling onReady callback", e);
              }
            }
          });
        });
      }
    }

    function write (did, cid, seq, data, callback) {
      var buffer, view, check, i;
      if (!current_device || !current_socket) { return; }
      buffer = new ArrayBuffer(7 + data.length);
      view = new Uint8Array(buffer);
      view[0] = 0xFF;
      view[1] = 0xFE;
      view[2] = did & 0xFF;
      view[3] = cid & 0xFF;
      view[4] = seq & 0xFF;
      view[5] = data.length + 1;
      for (i = 0; i < data.length; i++) {
        view[6 + i] = data[i] & 0xFF;
      }

      check = 0;
      for (i = 2; i <= 5 + data.length; i++) {
        check += view[i];
      }
      view[6 + data.length] = check & 0xFF ^ 0xFF;

      bt.write({"socket": current_socket, "data": buffer}, function (r) {
        if (!!callback) {
          try { callback(); } catch (e) {
            con.log("Error calling connect callback", e);
          }
        }
      });
    }

    function onConnection(socket) {
      con.log("onConnection", socket);
      current_socket = socket;
    }

    function connect(device_id, callback) {
      var device;
      if (!api_ready) {
        con.log("API not ready");
        if (!!callback) {
          try { callback("API not ready"); } catch (e) {
            con.log("Error calling connect callback", e);
          }
        }
        return;
      }
      if (devices.length === 0) {
        con.log("No devices available");
        if (!!callback) {
          try { callback("No devices available"); } catch (e) {
            con.log("Error calling connect callback", e);
          }
        }
        return;
      }
      device = devices[device_id];
      if (!device) {
        con.log("Device not found");
        if (!!callback) {
          try { callback("Device not found"); } catch (e) {
            con.log("Error calling connect callback", e);
          }
        }
        return;
      }
      bt.connect({
        "device": device,
        "profile": profile
      }, function () {
        var error = global.chrome.runtime.lastError;
        if (!!error) {
          con.log("Connection failed", error);
          if (!!callback) {
            try { callback(error.message); } catch (e) {
              con.log("Error calling connect callback", e);
            }
          }
        } else {
          con.log("Sphero connected");
          current_device = device;
          if (!!callback) {
            try { callback(); } catch (e) {
              con.log("Error calling connect callback", e);
            }
          }
        }
      });
    }
    
    function disconnect(callback) {
      if (!current_device || !current_socket) {
        con.log("No device connected");
        if (!!callback) {
          try { callback("No device connected"); } catch (e) {
            con.log("Error calling disconnect callback", e);
          }
        }
        return;
      }
      bt.disconnect({
        "socket": current_socket
      }, function () {
        var error = global.chrome.runtime.lastError;
        current_device = undefined;
        current_socket = undefined;
        if (!!error) {
          con.log("Disconnection failed", error);
          if (!!callback) {
            try { callback(error.message); } catch (e) {
              con.log("Error calling disconnect callback", e);
            }
          }
        } else {
          con.log("Sphero disconnected");
          if (!!callback) {
            try { callback(); } catch (e) {
              con.log("Error calling disconnect callback", e);
            }
          }
        }
      });
    }

    // Initialize listeners for Bluetooth state
    bt.onAdapterStateChanged.addListener(onAdapterStateChanged);
    bt.getAdapterState(onAdapterStateChanged);
    bt.onConnection.addListener(onConnection);

    // Functions for discovering and connecting to devices
    this.isReady = function () { return api_ready; };
    this.onReady = {
      "add": function (callback) {
        if (!!callback) {
          if (api_ready) {
            try { callback(); } catch (e) {
              con.log("Error calling onReady callback", e);
            }
            return;
          }
          readyCallbacks.push(callback);
        }
      }
    };
    this.getDevices = function () { return devices; };
    this.updateDevices = function (callback) { updateDevices(callback); };
    this.connect = function (device_id, callback) { connect(device_id, callback); };
    this.disconnect = function (callback) { disconnect(callback); };
    
    // Functions to actually controll the sphero
    this.changeColor = function (r, g, b, callback) {
      write(0x02, 0x20, 0x00, [r, g, b, 0], callback);
    };

    this.setTailLight = function (bright, callback) {
      write(0x02, 0x21, 0x00, [bright], callback);
    };

    this.setHeading = function (heading, callback) {
      write(0x02, 0x01, 0x00, [(heading >> 8), heading], callback);
    };

    this.roll = function (speed, heading, go, callback) {
      write(0x02, 0x30, 0x00, [speed, (heading >> 8), heading, (go ? 1 : 0)], callback);
    };
    
    // Functions mainly meant for debugging
    this.write = function (did, cid, seq, data) { write(did, cid, seq, data); };
    this.getSocket = function () { return current_socket; };
    this.getDevice = function () { return current_device; };
    this.getProfile = function () { return profile; };
  }

  global.sphero = new Sphero();

}(this));