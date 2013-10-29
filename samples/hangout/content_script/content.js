/*
 * Copyright (c) 2013 Gerwin Sturm, FoldedSoft e.U. / www.foldedsoft.at
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
  
  var APP_ID = "{ID OF PACKAGED APP}";
  
  if (global.location.href.indexOf("{URL WHERE HANGOUT EXTENSION IS HOSTED}") !== 0) {
    // Not in correct frame
    return;
  }

  function sendHangoutMessage(message) {
    message.type = "FROM_EXTENSION";
    global.postMessage(message, global.location.origin);
  }
  
  function sendAppMessage(message, callback) {
    global.chrome.runtime.sendMessage(APP_ID, message, undefined, function (response) {
      if (!!callback) {
        callback(response.success);
      }
    });
  }

  global.addEventListener("message", function (event) {
    // We only accept messages from ourselves
    if (event.source !== global) { return; }

    // We only accept messages coming from hangout including a command
    if (!event.data.type || event.data.type !== "FROM_HANGOUT" || !event.data.command) { return; }

    switch (event.data.command) {
      case "checkExtension":
        sendHangoutMessage({"extension": true});
        break;
      case "move":
        sendAppMessage(event.data);
        break;
      case "connect":
        sendAppMessage(event.data, function (success) {
          if (success) {
            sendHangoutMessage({"connected": true});
          } else {
            sendHangoutMessage({"status": "Connection failed"});
          }
        });
        break;
    }
  }, false);

}(this));