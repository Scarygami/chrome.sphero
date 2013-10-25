(function (global) {
  "use strict";

  var
    sphero = global.sphero,
    con = global.console,
    doc = global.document,
    status = doc.getElementById("status"),
    main = doc.getElementById("main"),
    controls = doc.getElementById("controls"),
    connect = doc.getElementById("connect"),
    dropzone = doc.getElementById("drop"),
    start = doc.getElementById("start"),
    stop = doc.getElementById("stop"),
    music;

  function Music() {
    var
      AUDIO_SUPPORT = false,
      audio_context,
      audio_source,
      audio_gain_node,
      audio_analyser,
      audio_processor,
      audio_timer = 0,
      audio_bd = new BeatDetektor(),
      audio_vu = new BeatDetektor.modules.vis.VU(),
      current_buffer,
      beat = 0,
      intensity = [100, 100, 100],
      playing = false;

    AUDIO_SUPPORT = true;
    if (global.AudioContext) {
      audio_context = new global.AudioContext();
    } else {
      if (global.webkitAudioContext) {
        audio_context = new global.webkitAudioContext();
      } else {
        AUDIO_SUPPORT = false;
      }
    }

    function change_volume(v) {
      if (audio_gain_node) {
        audio_gain_node.gain.value = v * v;
      }
    }

    function start_music() {
      try {
        audio_source.noteOff(0);
        audio_source.disconnect(0);
      } catch (e) { console.log(e); }
      audio_source = audio_context.createBufferSource();
      if (!audio_gain_node) { audio_gain_node = audio_context.createGainNode(); }
      if (!audio_analyser) { audio_analyser = audio_context.createAnalyser(); }
      if (!audio_processor) {
        audio_processor = audio_context.createJavaScriptNode(2048, 1, 1);
        audio_processor.onaudioprocess = function (e) {
          var input_array, freq_data, i, j, z, sum, bin_size;

          input_array = e.inputBuffer.getChannelData(0);
          freq_data = new Uint8Array(audio_analyser.frequencyBinCount);
          audio_analyser.getByteFrequencyData(freq_data);
          audio_bd.process(audio_context.currentTime, input_array);
          audio_timer += audio_bd.last_update;
          if (audio_timer > 1.0 / 24.0) {
            audio_vu.process(audio_bd, audio_timer);
            audio_timer = 0;
          }
          if (audio_vu.vu_levels.length) {
            z = audio_vu.vu_levels[0];
            beat = z * 50;
          }
          bin_size = Math.floor(freq_data.length / 4);
          for (i = 0; i < 3; i++) {
            sum = 0;
            for (j = 0; j < bin_size; j++) {
              sum += freq_data[i * bin_size + j];
            }
            sum /= bin_size;
            intensity[i] = Math.min(Math.floor(sum) * 2, 255);
          }
        };
      }
      audio_source.buffer = current_buffer;
      audio_source.loop = true;

      audio_source.connect(audio_gain_node);
      audio_gain_node.connect(audio_context.destination);

      audio_source.connect(audio_analyser);
      audio_analyser.connect(audio_processor);
      audio_processor.connect(audio_context.destination);

      audio_source.noteOn(0);
      
      playing = true;
    }

    function stop_music() {
      try {
        audio_source.noteOff(0);
        audio_source.disconnect(0);
      } catch (e) {console.log(e);}
      beat = 0.5;
      intensity = [100, 100, 100];
      playing = false;
    }

    function load_song(file, callback) {
      var reader = new FileReader();
      reader.onload = function () {
        audio_context.decodeAudioData(reader.result, function (buffer) {
          current_buffer = buffer;
          callback();
        }, function (e) {
          con.log("Error decoding file", file, e);
        });
      };
      reader.readAsArrayBuffer(file);
    }

    return {
      AUDIO_SUPPORT: AUDIO_SUPPORT,
      change_volume: change_volume,
      start_music: start_music,
      stop_music: stop_music,
      load_song: load_song,
      isPlaying: function () { return playing; },
      get_beat: function () { return beat; },
      get_intensity: function () {
        if (playing) {
          return intensity;
        }
        return [100, 100, 100];
      }
    };
  }

  music = new Music();

  /*
  main.style.display = "block";
  controls.style.display = "block";
  initialize();
  // */

  if (!sphero) {
    status.textContent = "Something went terribly wrong, Sphero API not loaded...";
    return;
  }
  
  var heading = 0;
  var last_move = 0;
  var speeds = [];
  
  function move() {
    var speed, intensity, now = (new Date()).getTime(), elapsed = Math.min(now - last_move, 1000), i;
    
    last_move = now;

    speed = Math.max(0, Math.min(Math.floor(music.get_beat()) * 15, 150));
    /*speeds.push(speed);
    if (speeds.length > 5) {
      speeds.shift();
    }
    speed = 0;
    for (i = 0; i < speeds.length; i++) {
       speed += speeds[i];
    }
    speed /= speeds.length;*/
    
    heading += elapsed / 1000 * 45;
    //if (speed > 100) { heading += elapsed / 1000 * 45; }
    if (heading >= 360) {
      heading -= 360;
    }
    
    intensity = music.get_intensity();
    
    sphero.roll(speed, Math.floor(heading), true, function () {
      sphero.changeColor(intensity[0], intensity[1], intensity[2], function () {
        if (music.isPlaying()) {
          global.setTimeout(move, 100);
        } else {
          sphero.roll(speed, heading, false);
        }
      });
    });
  }
  
  function handleFile(file) {
    music.load_song(file, function () {
      start.disabled = false;
      stop.disabled = false;
      music.start_music();
      global.setTimeout(move, 1);
    });
  }
  
  start.onclick = music.start_music;
  stop.onclick = music.stop_music;

  function handleFileSelect(eventObj) {
    var i, l, files;
    eventObj.stopPropagation();
    eventObj.preventDefault();

    files = eventObj.dataTransfer.files;
    l = files.length;
    for (i = 0; i < l; i++) {
      if (files[i].type.indexOf("audio") === 0) {
        handleFile(files[i])
        break;
      }
    }

    dropzone.classList.remove("dragging");
  }

  function handleDragOver(eventObj) {
    eventObj.stopPropagation();
    eventObj.preventDefault();
    eventObj.dataTransfer.dropEffect = "copy";
  }
  
  function initialize() {
    dropzone.addEventListener("dragover", handleDragOver, false);
    dropzone.addEventListener("drop", handleFileSelect, false);
    dropzone.addEventListener("dragenter", function () {
      dropzone.classList.add("dragging");
    }, false);
    dropzone.addEventListener("dragleave", function () {
      dropzone.classList.remove("dragging");
    }, false);
  }
  
  status.textContent = "Waiting for Sphero API to become ready...";
  sphero.onReady.add(function () {
    var devices;
    status.textContent ="Sphero API ready, searching for devices...!";
    
    devices = sphero.getDevices();
    if (devices.length > 0) {
      status.textContent = "Sphero found! Controls enabled!";
      main.style.display = "block";
      connect.onclick = function () {
        connect.disabled = true;
        sphero.connect(0, function (error) {
          if (!!error) {
            status.textContent = error;
            connect.disabled = false;
          } else {
            initialize();
            status.textContent = "Sphero connected, waiting for input...";
            controls.style.display = "block";
          }
        });
      };
    } else {
      status.textContent = "No devices found, make sure to pair with your Sphero first, then restart this app.";
    }
  });

  
}(this));