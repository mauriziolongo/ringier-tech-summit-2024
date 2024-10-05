/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Playback configuration
// Replace this with your own Amazon IVS Playback URL
const playbackUrl = ''
const myTextarea = document.getElementById("myTextarea");
const productEl = document.getElementById("product");
const productTitleEl = document.getElementById("product__title");
const productObjectsEl = document.getElementById("product__objects");
const productDescriptionEl = document.getElementById("product__description");
// Initialize player
(function () {

  // Set up IVS playback tech and quality plugin
  registerIVSTech(videojs);
  registerIVSQualityPlugin(videojs);

  // Initialize video.js player
  const videoJSPlayer = videojs("amazon-ivs-videojs", {
      techOrder: ["AmazonIVS"],
      controlBar: {
          playToggle: {
              replay: false
          }, // Hides the replay button for VOD
          pictureInPictureToggle: false // Hides the PiP button
      }
  });

  // Use the player API once the player instance's ready callback is fired
  const readyCallback = function () {
      // This executes after video.js is initialized and ready
      window.videoJSPlayer = videoJSPlayer;

      // Get reference to Amazon IVS player
      const ivsPlayer = videoJSPlayer.getIVSPlayer();

      // Show the "big play" button when the stream is paused
      const videoContainerEl = document.querySelector("#amazon-ivs-videojs");
      videoContainerEl.addEventListener("click", () => {
          if (videoJSPlayer.paused()) {
              videoContainerEl.classList.remove("vjs-has-started");
          } else {
              videoContainerEl.classList.add("vjs-has-started");
          }
      });

      // Logs low latency setting and latency value 5s after playback starts
      const PlayerState = videoJSPlayer.getIVSEvents().PlayerState;
      ivsPlayer.addEventListener(PlayerState.PLAYING, () => {
          console.log("Player State - PLAYING");
          setTimeout(() => {
              console.log(
                  `This stream is ${
                      ivsPlayer.isLiveLowLatency() ? "" : "not "
                  }playing in ultra low latency mode`
              );
              console.log(`Stream Latency: ${ivsPlayer.getLiveLatency()}s`);
          }, 5000);
      });

      // Log errors
      const PlayerEventType = videoJSPlayer.getIVSEvents().PlayerEventType;
      ivsPlayer.addEventListener(PlayerEventType.ERROR, (type, source) => {
          console.warn("Player Event - ERROR: ", type, source);
      });

      // Log and display timed metadata
      ivsPlayer.addEventListener(PlayerEventType.TEXT_METADATA_CUE, (cue) => {
          const metadataText = cue.text;
          const position = ivsPlayer.getPosition().toFixed(2);
          console.log(
              `Player Event - TEXT_METADATA_CUE: "${metadataText}". Observed ${position}s after playback started.`
          );
          triggerOverlay(metadataText);
      });

      // Enables manual quality selection plugin
      videoJSPlayer.enableIVSQualityPlugin();

      // Set volume and play default stream
      videoJSPlayer.volume(0.5);
      fetch('./config.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.playbackUrl) {
          throw new Error('Playback URL is missing in the config file');
        }
        videoJSPlayer.src(data.playbackUrl);
      })
      .catch(error => {
        console.error('Error loading or processing config:', error.message);
        videoJSPlayer.src(playbackUrl);
      });
  };

  let showRekognition = (metadata) => {
    var textedJson = JSON.stringify(metadata, undefined, 2);
    document.getElementById("myTextarea").value = textedJson;    
    document.getElementById("myImage").src = metadata.image;    
  };

  let showProduct = (metadata) => {
    productEl.classList.remove("hidden");
    productEl.classList.add("opacity__in");
    productObjectsEl.textContent = metadata.objects;
    productTitleEl.textContent = metadata.title;
    productDescriptionEl.textContent = metadata.description;
  };

  let clearRekognition = (metadata) => {
    document.getElementById("myTextarea").value = "";
    document.getElementById("myImage").src = "";    
  };

  let clearProduct = (metadata) => {
    productEl.classList.remove("opacity__in");
    productEl.classList.add("hidden");
    productObjectsEl.textContent = "";  
    productTitleEl.textContent = "";
    productDescriptionEl.textContent = "";
  };

  
  // -----------------

  let showDefault = (metadata) => {
    return false;
  };

  let clearDefault = (metadata) => {
    // TBA
  };

  // -----------------

  let clearAll = () => {

    clearRekognition();
   
  };

  let triggerOverlay = (metadata) => {
    clearAll();

    if (metadata) {
      try {
        let obj = JSON.parse(metadata);
        switch (obj.type) {
          case "rekognition":
            showRekognition(obj);
            break;
          default:
            showDefault(obj);
        }
      } catch (e) {
        console.log(e);
      }
    }
  };

  // Register ready callback
  videoJSPlayer.ready(readyCallback);
})();
