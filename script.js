/*
  The code for finding out the BPM / tempo is taken from this post:
  http://tech.beatport.com/2014/web-audio/beat-detection-using-web-audio/
 */

var result = document.querySelector('#result'),
    text = document.querySelector('#text'),
    audioTag = document.querySelector('#audio'),
    playButton = document.querySelector('#play');

var context;
var myAudioBuffer = null;

window.onload=function(){
      // file open button
      var control = document.getElementById("fileChooseInput");
      control.addEventListener("change", fileChanged, false);
      
      // create audio context
      context = new AudioContext();
      
   }

// Function to identify peaks
function getPeaksAtThreshold(data, threshold) {
  var peaksArray = [];
  var length = data.length;
  for(var i = 0; i < length;) {
    if (data[i] > threshold) {
      peaksArray.push(i);
      // Skip forward ~ 1/4s to get past this peak.
      i += 10000;
    }
    i++;
  }
  return peaksArray;
}

// Function used to return a histogram of peak intervals
function countIntervalsBetweenNearbyPeaks(peaks) {
  var intervalCounts = [];
  peaks.forEach(function(peak, index) {
    for(var i = 0; i < 10; i++) {
      var interval = peaks[index + i] - peak;
      var foundInterval = intervalCounts.some(function(intervalCount) {
        if (intervalCount.interval === interval)
          return intervalCount.count++;
      });
      if (!foundInterval) {
        intervalCounts.push({
          interval: interval,
          count: 1
        });
      }
    }
  });
  return intervalCounts;
}

// Function used to return a histogram of tempo candidates.
function groupNeighborsByTempo(intervalCounts, sampleRate) {
  var tempoCounts = [];
  intervalCounts.forEach(function(intervalCount, i) {
    if (intervalCount.interval !== 0) {
      // Convert an interval to tempo
      var theoreticalTempo = 60 / (intervalCount.interval / sampleRate );

      // Adjust the tempo to fit within the 90-180 BPM range
      while (theoreticalTempo < 90) theoreticalTempo *= 2;
      while (theoreticalTempo > 180) theoreticalTempo /= 2;

      theoreticalTempo = Math.round(theoreticalTempo);
      var foundTempo = tempoCounts.some(function(tempoCount) {
        if (tempoCount.tempo === theoreticalTempo)
          return tempoCount.count += intervalCount.count;
      });
      if (!foundTempo) {
        tempoCounts.push({
          tempo: theoreticalTempo,
          count: intervalCount.count
        });
      }
    }
  });
  return tempoCounts;
}

function fileChanged(e){
      var file = e.target.files[0];
      var fileReader = new FileReader();
      fileReader.onload = fileLoaded;
      fileReader.readAsArrayBuffer(file);
   }

function fileLoaded(e){
      context.decodeAudioData(e.target.result, function(buffer) {
          myAudioBuffer = buffer;
      });
}

function playSound(buffer) {
      ssource = context.createBufferSource();
      ssource.buffer = buffer;
      ssource.connect(context.destination);
      ssource.start();

      var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        var offlineContext = new OfflineContext(1, 2, 44100);

          // Create buffer source
          source = offlineContext.createBufferSource();
          source.buffer = buffer;

          // Create filter
          var filter = offlineContext.createBiquadFilter();
          filter.type = "lowpass";

          // Pipe the song into the filter, and the filter into the offline context
          source.connect(filter);
          filter.connect(offlineContext.destination);

          // Schedule the song to start playing at time:0
          source.start(0);

          var peaks,
              initialThresold = 0.9,
              thresold = initialThresold,
              minThresold = 0.3,
              minPeaks = 30;

          do {
            peaks = getPeaksAtThreshold(buffer.getChannelData(0), thresold);
            thresold -= 0.05;
          } while (peaks.length < minPeaks && thresold >= minThresold);

          

          var intervals = countIntervalsBetweenNearbyPeaks(peaks);

          var groups = groupNeighborsByTempo(intervals, buffer.sampleRate);

          var top = groups.sort(function(intA, intB) {
            return intB.count - intA.count;
          }).splice(0,5);

          text.innerHTML = 'BPM is <strong>' + Math.round(top[0].tempo);

          

          result.style.display = 'block';
}

function stopSound() {
      if (ssource) {
          ssource.stop();
      }
}

/*
audioTag.addEventListener('timeupdate', function() {
  var progressIndicator = document.querySelector('#progress');
  if (progressIndicator && audioTag.duration) {
    progressIndicator.setAttribute('x', (audioTag.currentTime * 100 / audioTag.duration) + '%');
  }
});

playButton.addEventListener('click', function() {
  audioTag.play();
});

result.style.display = 'none';

document.querySelector('form').addEventListener('submit', function(e) {
  e.preventDefault();
  result.style.display = 'none';
  playSound(buffer).then(function(results) {
      var track = results.tracks.items[0];

      var previewUrl = track.preview_url;
      audioTag.src = track.preview_url;

      var context = new (window.AudioContext || window.webkitAudioContext) ();
      var request = new XMLHttpRequest();
      request.open('GET', previewUrl, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {

        // Create offline context
        var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        var offlineContext = new OfflineContext(1, 2, 44100);

        offlineContext.decodeAudioData(request.response, function(buffer) {

          // Create buffer source
          var source = offlineContext.createBufferSource();
          source.buffer = buffer;

          // Create filter
          var filter = offlineContext.createBiquadFilter();
          filter.type = "lowpass";

          // Pipe the song into the filter, and the filter into the offline context
          source.connect(filter);
          filter.connect(offlineContext.destination);

          // Schedule the song to start playing at time:0
          source.start(0);

          var peaks,
              initialThresold = 0.9,
              thresold = initialThresold,
              minThresold = 0.3,
              minPeaks = 30;

          do {
            peaks = getPeaksAtThreshold(buffer.getChannelData(0), thresold);
            thresold -= 0.05;
          } while (peaks.length < minPeaks && thresold >= minThresold);

          

          var intervals = countIntervalsBetweenNearbyPeaks(peaks);

          var groups = groupNeighborsByTempo(intervals, buffer.sampleRate);

          var top = groups.sort(function(intA, intB) {
            return intB.count - intA.count;
          }).splice(0,5);

          text.innerHTML = 'BPM is <strong>' + Math.round(top[0].tempo);

          

          result.style.display = 'block';
        });
      };
      request.send();
    });
});
*/

