(function (global) {
  global.chrome.app.runtime.onLaunched.addListener(function() {
    global.chrome.app.window.create("main.html", {
      "bounds": {
        "width": 640,
        "height": 480
      }
    });
  });

}(this));