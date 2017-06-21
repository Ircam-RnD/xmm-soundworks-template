import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

export default class SimpleAudioEngine {
  constructor(sounds) {
    this.buffers = sounds;
    this.audioContext = audioContext;
  }

  play(label, callback) {
    const src = audioContext.createBufferSource();
    src.buffer = this.buffers[label];
    src.connect(audioContext.destination);
    src.start(audioContext.currentTime);

    setTimeout(() => {
      callback();
    }, src.buffer.duration * 1000);
  }
}