(function (global) {
  "use strict";

  var
    sphero = global.sphero,
    status = global.document.getElementById("status"),
    EXTENSION_ID = "{ID OF CONTENT SCRIPT EXTENSION}";

  if (!sphero) {
    status.textContent = "Something went terribly wrong, Sphero API not loaded...";
    return;
  }

  status.textContent = "Waiting for input from Hangout...";

  global.chrome.runtime.onMessageExternal.addListener(function (message, sender, sendResponse) {
    if (sender.id === EXTENSION_ID) {
      if (!sphero.isReady()) {
        sendResponse({"error": "Sphero API not ready"});
        return false;
      }
      if (message.command === "connect") {
        sphero.connect(0, function (error) {
          if (!!error) {
            sendResponse({"error": error});
          } else {
            sendResponse({"success": true});
          }
        });
        return true;
      }
      if (!!message.color) {
        sphero.changeColor(message.color[0], message.color[1], message.color[2]);
      }
      if (message.command === "move") {
        sphero.roll(100, message.direction, true);
        sendResponse({"success": true});
        return false;
      }
    }
  });
  
}(this));