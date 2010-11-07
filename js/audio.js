/* global vis,SoundManager */
var SM2_DEFER = true;

vis.audio = (function() {

	var musicTracks = [],
		activeTrack,
		paused = false,
		SM,
		audioData,
		fps = 15,
		lastFpsTime,
		frameCount = 0;

	var pow = Math.pow,
		log = Math.log,
		max = Math.max;

	var dataErrorNotified = false;

	function setup() {
		// make sure SM2 is loaded
		if (typeof window.SoundManager === "undefined") {
			setTimeout(function() {
				vis.audio.setup();
			},20);
			return;
		}
		if (!window.soundManager) {
			SM = window.soundManager = new SoundManager();
			SM.useHighPerformance = true;
			SM.debugMode = false;
			SM.useMovieStar = false;
			SM.flashVersion = 9;
			SM.flash9Options.useEQData = true;
			//SM.flash9Options.useWaveformData = true;
			SM.allowPolling = true;
			//SM.waitForWindowLoad = true;

			SM._writeDebug = SM._wD = function(sText, sType, bTimestamp) {
				//vis.log(sText);
			};
			SM.onerror = function() {
				alert("Failed to load SM2. Try reloading the page.");
			};
			SM.beginDelayedInit();
			lastFpsTime = new Date().getTime();
			setInterval(updateProgress,1000);
		}
	}

	function initAudioData() {
		audioData = {
			waveData : [],
			waveDataL : [],
			waveDataR : [],
			eqData : [],
			eqDataL : [],
			eqDataR : [],

			bands : [],
			avgBands : [],
			avgLongBands : [],

			longAvgBands : [],
			relBands : [],
			avgRelBands : [],

			numSamples : 256,
			freqBandInterval : 256 / 3,

			beat : 0,
			isBeat : false,
			beatLevel : 0
		};
		var i;

		for (i = 0; i < 3; i++) {
			audioData.avgBands[i] = 0;
			audioData.avgLongBands[i] = 0;

			audioData.relBands[i] = 0;
			audioData.longAvgBands[i] = 0;
		}
		for (i = 0; i < 256; i++) {
			audioData.waveDataL[i] = audioData.waveDataR[i] = 0;
			audioData.eqDataL[i] = audioData.eqDataR[i] = 0;
		}

		return audioData;
	}

	function play(track, stream, onload) {
		paused = false;
		if (activeTrack)
			SM.stop(activeTrack);
		if (musicTracks[track]) {
			musicTracks[track].play();
		} else {
			musicTracks[track] = SM.createSound({
				id : track,
				url : track,
				volume: 50,
				autoPlay: true,
				whileplaying : analyzeAudio,
				onload : function() {
					if (typeof onload === "function")
						onload();
				},
				ondataerror : function() {
					if (!dataErrorNotified) {
						dataErrorNotified = true;
						alert("Unable to access audio data. Make sure there are no other tabs that use Flash audio (e.g. YouTube).");
					}
					stop();
				}
			});
			musicTracks[track].stream = stream;
		}
		frameCount = 0;
		activeTrack = track;
		vis.audio.data = initAudioData();
		updateProgress();
	}

	function pause() {
		if (activeTrack) {
			if (paused)
				SM.play(activeTrack);
			else
				SM.pause(activeTrack);
			paused = !paused;
		}
	}

	function stop() {
		SM.stopAll();
		paused = false;
		activeTrack = null;
		vis.audio.data = initAudioData();
		updateProgress();
	}

	function isPlaying() {
		if (activeTrack) {
			var track = musicTracks[activeTrack];
			if (track.playState === 1 && track.position > 0) {
				return true;
			}
		}
		return false;
	}

	function setPosition(v) {
		if (activeTrack) {
			var track = musicTracks[activeTrack];
			if (track.stream) return;
			if (track.playState === 1 && track.position > 0) {
				var duration = track.readyState === 3 ? track.duration : track.durationEstimate;
				track.setPosition(v * duration);
				updateProgress(v * 100);
			}
		}
	}

	function updateProgress(v) {
		if (activeTrack) {
			var track = musicTracks[activeTrack],
				s,
				duration = track.readyState === 3 ? track.duration : track.durationEstimate;
			if (track.stream) {
				s = 0;
			} else {
				s = v || track.position / duration * 100;
			}
			if (typeof vis.audio.onprogress === "function")
				vis.audio.onprogress(s);
		}
	}


	var minFreq = 200,
		maxFreq = 11025,
		netOctaves = (log(maxFreq/minFreq) / log(2)),
		octavesPerBand = netOctaves / 3,
		mult = pow(2, octavesPerBand);


	function analyzeAudio(event) {
		frameCount++;

		// calculate fps every second(ish)
		var now = new Date().getTime();
		if (now - lastFpsTime >= 1000) {
			var delta = (now - lastFpsTime) / 1000;
			fps = frameCount / delta;
			frameCount = 0;
			lastFpsTime = now;
		}

		var specData = this.eqData.left;

		var bands = [];

		for (var i = 0; i < 3; i++) {

			var start = (audioData.numSamples * minFreq * pow(mult, i  ) / 11025.0)>>0;
			var end   = (audioData.numSamples * minFreq * pow(mult, i + 1) / 11025.0)>>0;
			start = Math.round(start / 4);
			end = Math.round(end / 4);
			if (start < 0) start = 0;
			if (end > audioData.numSamples) end = audioData.numSamples;

			bands[i] = 0;
			for (var j=start; j<end; j++) {
				bands[i] += (specData[j])*1.0;
			}

			bands[i] /= end-start;
		}

		// scale the three bands individually to give more equal levels
		bands[0] *= 3;
		bands[1] *= 5;
		bands[2] *= 7;

		var avgBands = audioData.avgBands,
			longAvgBands = audioData.avgLongBands,
			avgRelBands = [],
			avgMix;

		// do temporal blending to create attenuated versions
		for (i=0;i<3;i++) {
			if (bands[i] > avgBands[i]) {
				avgMix = pow(0.2, 14 / fps);
			} else {
				avgMix = pow(0.5, 14 / fps);
			}

			avgBands[i] = avgBands[i] * avgMix + bands[i] * (1 - avgMix);

			var longMix = pow(0.96, 14/fps);
			longAvgBands[i] = longAvgBands[i] * longMix + bands[i] * (1 - longMix);

			if (Math.abs(longAvgBands[i]) < 0.001)
				avgRelBands[i]  = 1.0;
			else
				avgRelBands[i]  = avgBands[i] / longAvgBands[i];

		}

		audioData.bands = bands;
		audioData.avgBands = avgBands;
		audioData.avgLongBands = longAvgBands;

		var bass = avgBands[0];
		var mid = avgBands[1];
		var treb = avgBands[2];

		var decayRate = pow(0.893, fps);  // lower # = more hasty to declare a beat
		var minAtt = 1.6;               // lower # = quieter songs can declare beats
		var decayTo = 0.8;               // lower # = more hasty to declare a beat

		var beat = max(
			bass / max(minAtt,avgRelBands[0]),
			mid / max(minAtt,avgRelBands[1]),
			treb / max(minAtt,avgRelBands[2]),
			(audioData.beat - decayTo) * decayRate + decayTo
		);
		audioData.beatLevel = (beat - audioData.beat - 0.07)*24 - 0.5;
		audioData.beat = beat;
		audioData.isBeat = (audioData.beatLevel > 0);
	}

	return {
		setup : setup,
		play : play,
		pause : pause,
		stop : stop,
		setPosition : setPosition,
		isPlaying : isPlaying,
		data : initAudioData()
	};

})();