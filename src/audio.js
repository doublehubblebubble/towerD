// ============================================================
//  audio.js  —  Procedural background music via Web Audio API
//  D-minor medieval battle theme, 8-bar looping phrase
// ============================================================

var AudioManager = (function () {
  'use strict';

  var ctx        = null;
  var masterGain = null;
  var playing    = false;
  var nextPhrase = 0;
  var timer      = null;

  var BPM         = 108;
  var SPB         = 60 / BPM;  // seconds per beat ≈ 0.556 s
  var TOTAL_BEATS = 32;         // 8 bars × 4 beats

  // ---- Frequency table (Hz) ----
  var F = {};
  F.D2  = 73.42;  F.E2  = 82.41;  F.F2  = 87.31;  F.G2  = 98.00;
  F.A2  = 110.00; F.Bb2 = 116.54; F.C3  = 130.81;
  F.D3  = 146.83; F.E3  = 164.81; F.F3  = 174.61; F.G3  = 196.00;
  F.A3  = 220.00; F.Bb3 = 233.08; F.C4  = 261.63;
  F.D4  = 293.66; F.E4  = 329.63; F.F4  = 349.23; F.G4  = 392.00;
  F.A4  = 440.00; F.Bb4 = 466.16; F.C5  = 523.25;
  F.D5  = 587.33; F.E5  = 659.25; F.F5  = 698.46; F.G5  = 783.99;

  // ---- ADSR helper ----
  function env(gn, t, atk, hold, rel, vol) {
    gn.gain.cancelScheduledValues(t);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(vol, t + atk);
    gn.gain.setValueAtTime(vol, t + atk + hold);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + atk + hold + rel);
  }

  // ---- Instruments ----

  function playBass(freq, t, beats) {
    var dur = beats * SPB;
    var osc = ctx.createOscillator();
    var flt = ctx.createBiquadFilter();
    var gn  = ctx.createGain();
    osc.type            = 'sawtooth';
    osc.frequency.value = freq;
    flt.type            = 'lowpass';
    flt.frequency.value = 320;
    flt.Q.value         = 4;
    env(gn, t, 0.01, dur * 0.75, dur * 0.2, 0.42);
    osc.connect(flt); flt.connect(gn); gn.connect(masterGain);
    osc.start(t); osc.stop(t + dur + 0.12);
  }

  function playLead(freq, t, beats) {
    var dur = beats * SPB;
    // Dual-oscillator unison (slight detune) for richness
    [-3, 4].forEach(function (detune) {
      var osc = ctx.createOscillator();
      var gn  = ctx.createGain();
      osc.type        = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value    = detune;
      env(gn, t, 0.02, dur * 0.68, dur * 0.28, 0.28);
      osc.connect(gn); gn.connect(masterGain);
      osc.start(t); osc.stop(t + dur + 0.12);
    });
  }

  function playPad(freq, t, beats) {
    // Three-oscillator detuned pad for harmonic warmth
    var dur = beats * SPB;
    [-6, 0, 8].forEach(function (detune) {
      var osc = ctx.createOscillator();
      var flt = ctx.createBiquadFilter();
      var gn  = ctx.createGain();
      osc.type            = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value    = detune;
      flt.type            = 'lowpass';
      flt.frequency.value = 850;
      flt.Q.value         = 1.2;
      env(gn, t, 0.18, dur * 0.55, dur * 0.4, 0.065);
      osc.connect(flt); flt.connect(gn); gn.connect(masterGain);
      osc.start(t); osc.stop(t + dur + 0.25);
    });
  }

  function playKick(t) {
    var osc = ctx.createOscillator();
    var gn  = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.22);
    gn.gain.setValueAtTime(0.95, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(gn); gn.connect(masterGain);
    osc.start(t); osc.stop(t + 0.42);
  }

  function playSnare(t) {
    var rate = ctx.sampleRate;
    var len  = Math.ceil(rate * 0.16);
    var buf  = ctx.createBuffer(1, len, rate);
    var d    = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 1800; flt.Q.value = 0.7;
    var gn  = ctx.createGain();
    gn.gain.setValueAtTime(0.42, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    src.connect(flt); flt.connect(gn); gn.connect(masterGain);
    src.start(t); src.stop(t + 0.22);
  }

  function playHat(t, vol) {
    var rate = ctx.sampleRate;
    var len  = Math.ceil(rate * 0.05);
    var buf  = ctx.createBuffer(1, len, rate);
    var d    = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var flt = ctx.createBiquadFilter();
    flt.type = 'highpass'; flt.frequency.value = 9000;
    var gn  = ctx.createGain();
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(flt); flt.connect(gn); gn.connect(masterGain);
    src.start(t); src.stop(t + 0.07);
  }

  // ---- Musical phrase data ----
  // Format: [beat_offset, frequency, duration_in_beats]

  // Bass line — root notes with passing tones (8 bars)
  var BASS = [
    // Bar 1-2: Dm
    [0,   F.D2, 1  ], [1,   F.D2, 0.5], [1.5, F.F2, 0.5],
    [2,   F.A2, 1.5], [3.5, F.C3, 0.5],
    [4,   F.D2, 1  ], [5,   F.F2, 0.5], [5.5, F.A2, 0.5],
    [6,   F.C3, 1  ], [7,   F.A2, 1  ],
    // Bar 3-4: Bb
    [8,   F.Bb2,1  ], [9,   F.Bb2,0.5], [9.5, F.D3, 0.5],
    [10,  F.F3, 1.5], [11.5,F.D3, 0.5],
    [12,  F.Bb2,1  ], [13,  F.C3, 0.5], [13.5,F.D3, 0.5],
    [14,  F.F3, 1  ], [15,  F.D3, 1  ],
    // Bar 5-6: F
    [16,  F.F2, 1  ], [17,  F.F2, 0.5], [17.5,F.A2, 0.5],
    [18,  F.C3, 1.5], [19.5,F.A2, 0.5],
    [20,  F.F2, 1  ], [21,  F.G2, 0.5], [21.5,F.A2, 0.5],
    [22,  F.C3, 1  ], [23,  F.A2, 1  ],
    // Bar 7-8: Am → Dm
    [24,  F.A2, 1  ], [25,  F.A2, 0.5], [25.5,F.C3, 0.5],
    [26,  F.E3, 1.5], [27.5,F.C3, 0.5],
    [28,  F.G2, 0.5], [28.5,F.A2, 0.5], [29, F.C3, 0.5], [29.5,F.E3, 0.5],
    [30,  F.D2, 2  ],
  ];

  // Lead melody — dramatic arc: rise on Bb, peak on F, resolve on Dm
  var MELODY = [
    // Bar 1: D minor opening
    [0,   F.D4,  0.5], [0.5, F.F4,  0.5],
    [1,   F.A4,  1  ], [2,   F.C5,  0.5], [2.5, F.Bb4, 0.5],
    [3,   F.A4,  0.75],[3.75,F.G4,  0.25],
    // Bar 2
    [4,   F.F4,  0.5], [4.5, F.E4,  0.5],
    [5,   F.D4,  1.5], [6.5, F.E4,  0.25],[6.75,F.F4,  0.25],
    [7,   F.G4,  0.5], [7.5, F.A4,  0.5],
    // Bar 3: Bb — climb higher
    [8,   F.Bb4, 0.5], [8.5, F.C5,  0.5],
    [9,   F.D5,  1  ], [10,  F.C5,  0.5], [10.5,F.Bb4, 0.5],
    [11,  F.A4,  0.75],[11.75,F.G4, 0.25],
    // Bar 4
    [12,  F.F4,  0.5], [12.5,F.G4,  0.5],
    [13,  F.A4,  1.5], [14.5,F.Bb4, 0.5],
    [15,  F.C5,  0.5], [15.5,F.Bb4, 0.5],
    // Bar 5: F — triumphant peak
    [16,  F.A4,  0.5], [16.5,F.C5,  0.5],
    [17,  F.E5,  1  ], [18,  F.D5,  0.5], [18.5,F.C5,  0.5],
    [19,  F.Bb4, 0.75],[19.75,F.A4, 0.25],
    // Bar 6
    [20,  F.G4,  0.5], [20.5,F.A4,  0.5],
    [21,  F.Bb4, 1  ], [22,  F.C5,  0.5], [22.5,F.Bb4, 0.5],
    [23,  F.A4,  0.5], [23.5,F.G4,  0.5],
    // Bar 7: Am — tension builds
    [24,  F.E5,  0.5], [24.5,F.D5,  0.5],
    [25,  F.C5,  0.5], [25.5,F.Bb4, 0.5],
    [26,  F.A4,  2  ],
    // Bar 8: Dm resolution + pickup to loop
    [28,  F.F4,  0.5], [28.5,F.G4,  0.5],
    [29,  F.A4,  0.5], [29.5,F.C5,  0.5],
    [30,  F.D5,  1.5], [31.5,F.C5,  0.5],
  ];

  // Chord pads — one per 2-bar section (slow attack for ambience)
  var PADS = [
    [0,  F.D3,  8], [0,  F.F3,  8], [0,  F.A3,  8],  // Dm
    [8,  F.Bb2, 8], [8,  F.D3,  8], [8,  F.F3,  8],  // Bb
    [16, F.F2,  8], [16, F.A3,  8], [16, F.C4,  8],  // F
    [24, F.A2,  8], [24, F.C3,  8], [24, F.E3,  8],  // Am
  ];

  // ---- Phrase scheduler ----
  function schedulePhrase(startTime) {
    var t0 = startTime;

    // Drums
    for (var bar = 0; bar < 8; bar++) {
      var b = t0 + bar * 4 * SPB;
      playKick(b);
      playKick(b + 2 * SPB);
      playSnare(b + 1 * SPB);
      playSnare(b + 3 * SPB);
      // Eighth-note hi-hats; on-beats slightly louder
      for (var h = 0; h < 8; h++) {
        playHat(b + h * 0.5 * SPB, h % 2 === 0 ? 0.15 : 0.08);
      }
    }

    // Pads (first)
    PADS.forEach(function (p) {
      playPad(p[1], t0 + p[0] * SPB, p[2]);
    });

    // Bass
    BASS.forEach(function (n) {
      playBass(n[1], t0 + n[0] * SPB, n[2]);
    });

    // Lead melody (on top)
    MELODY.forEach(function (n) {
      playLead(n[1], t0 + n[0] * SPB, n[2]);
    });
  }

  function scheduleLoop() {
    if (!playing) return;
    var now = ctx.currentTime;
    if (nextPhrase < now + 1.5) {
      schedulePhrase(nextPhrase);
      nextPhrase += TOTAL_BEATS * SPB;
    }
    timer = setTimeout(scheduleLoop, 600);
  }

  // ---- Public API ----

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(ctx.destination);
  }

  function start() {
    if (playing) return;
    init();
    if (ctx.state === 'suspended') ctx.resume();
    playing    = true;
    nextPhrase = ctx.currentTime + 0.15;
    scheduleLoop();
  }

  function stop() {
    playing = false;
    clearTimeout(timer);
    if (ctx) ctx.suspend();
  }

  /** Toggle music on/off. Returns true if now playing. */
  function toggle() {
    if (playing) { stop(); return false; }
    start(); return true;
  }

  function setVolume(v) {
    if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  return { start: start, stop: stop, toggle: toggle, setVolume: setVolume };
})();
