import { Experience } from 'soundworks/server';
import ModelsRetriever from './shared/ModelsRetriever';
// import fs from 'fs';

export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.osc = this.require('osc');
  }

  start() {}

  enter(client) {
    super.enter(client);

    ModelsRetriever.getModels((err, models) => {
      this.send(client, 'models', models);
    });

    this.receive(client, 'sendosc', this._sendOsc(client));
  }

  exit(client) {
    super.exit(client);
  }

  _sendOsc(client) {
    return (args) => {
      this.osc.send(args.url, args.values);
    }
  }
}
