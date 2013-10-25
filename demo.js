(function (global) {
  "use strict";

  var
    sphero = global.sphero,
    con = global.console,
    doc = global.document,
    status = doc.getElementById("status"),
    controls = doc.getElementById("controls"),
    connect = doc.getElementById("connect");
  
  if (!sphero) {
    status.textContent = "Something went terribly wrong, Sphero API not loaded...";
    return;
  }
  
  status.textContent = "Waiting for Sphero API to become ready...";
  sphero.onReady.add(function () {
    var devices;
    status.textContent ="Sphero API ready, searching for devices...!";
    
    devices = sphero.getDevices();
    if (devices.length > 0) {
      status.textContent = "Sphero found! Controls enabled!";
      controls.style.display = "block";
      connect.onclick = function () {
        connect.disabled = true;
        sphero.connect(0, function (error) {
          if (!!error) {
            status.textContent = error;
            connect.disabled = false;
          } else {
            status.textContent = "Sphero connected, waiting for input...";
          }
        });
      };
    } else {
      status.textContent = "No devices found, make sure to pair with your Sphero first, then restart this app.";
    }
  });

  
}(this));