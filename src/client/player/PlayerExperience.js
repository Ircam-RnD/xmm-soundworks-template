import * as soundworks from 'soundworks/client';
import * as lfo from 'waves-lfo/client';
import { XmmDecoderLfo } from 'xmm-lfo';
import { classes } from  '../shared/config';
import FeaturizerLfo from '../shared/FeaturizerLfo';
import LikelihoodsRenderer from '../shared/LikelihoodsRenderer';
import AudioEngine from '../shared/AudioEngine';

const audioContext = soundworks.audioContext;

const viewModel = { models: null };

const viewTemplate = `
  <div class="foreground">
    <div class="section-top flex-middle">
      <div>
        <div class="selectDiv" id="modelsDiv"> Model :
          <select id="modelSelect">
            <% for (var prop in models) { %>
              <option value="<%= prop %>">
                <%= prop %>
              </option>
            <% } %>
          </select>
        </div>
        <div class="canvasDiv" id="likelihoodsDiv">
          <canvas class="multislider" id="likelihoods"></canvas>
        </div>
        <!--
        Sound control :
        <div class="audioDiv">
          <button id="playBtn" class="toggleBtn"></button>
          <div id="audioSliderDiv">
            <input type="range" id="volumeSlider"></input>
          </div>
        </div>
        -->
        <div class="toggleDiv">
          <button id="playBtn" class="toggleBtn"></button>
          Enable sounds
        </div>
        <div class="toggleDiv">
          <button id="sendOsc" class="toggleBtn"></button>
          Send OSC
        </div>
      </div>
    </div>
    <div class="section-center flex-center">
    </div>
    <div class="section-bottom flex-middle">
    </div>
  </div>
`;

class PlayerView extends soundworks.CanvasView {
  constructor(template, content, events, options) {
    super(template, content, events, options);
  }

  onModelChange(callback) {
    this.installEvents({
      'change #modelSelect': () => {
        const inputs = this.$el.querySelector('#modelSelect');
        callback(inputs.options[inputs.selectedIndex].value);
      }
    });
  }

  setModelItem(item) {
    const el = this.$el.querySelector('#modelSelect');
    el.value = item;
  }

  onToggleSendOsc(callback) {
    this.installEvents({
      'click #sendOsc': () => {
        const btn = this.$el.querySelector('#sendOsc');
        const active = btn.classList.contains('active');
        if (!active) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
        callback(!active);
      }
    });
  }

  onEnableSounds(callback) {
    this.installEvents({
      'click #playBtn': () => {
        const btn = this.$el.querySelector('#playBtn');
        const active = btn.classList.contains('active');
        if (!active) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
        callback(!active);        
      }
    });
  }

  onSetMasterVolume(callback) {
    this.installEvents({
      'change #volumeSlider': () => {
        const slider = this.$el.querySelector('#volumeSlider');
        callback(slider.value);
      }
    });
  }
}

// this experience plays a sound when it starts, and plays another sound when
// other clients join the experience
class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin', { showDialog: false });
    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: classes,
    });
    this.motionInput = this.require('motion-input', {
      descriptors: ['devicemotion']
    });

    this.labels = Object.keys(classes);
    this.likeliest = undefined;
    this._models = null;
    this._sendOscFlag = false;
  }

  start() {
    super.start(); // don't forget this

    this.view = new PlayerView(viewTemplate, viewModel, {}, {
      preservePixelRatio: true,
      className: 'player'
    });

    // as show can be async, we make sure that the view is actually rendered
    this.show().then(() => {
      this._onReceiveModels = this._onReceiveModels.bind(this);
      this._onModelChange = this._onModelChange.bind(this);
      this._onModelFilter = this._onModelFilter.bind(this);   
      this._motionCallback = this._motionCallback.bind(this);

      this._setGainFromIntensity = this._setGainFromIntensity.bind(this);
      this._enableSounds = this._enableSounds.bind(this);
      this._setMasterVolume = this._setMasterVolume.bind(this);

      this.view.onModelChange(this._onModelChange);
      this.view.onEnableSounds(this._enableSounds);
      this.view.onToggleSendOsc((val) => {
        this._sendOscFlag = val;
      });

      //------------------------------- RENDERER -----------------------------//
      this.renderer = new LikelihoodsRenderer(100);
      this.view.addRenderer(this.renderer);

      //--------------------------------- LFO's ------------------------------//
      this._devicemotionIn = new lfo.source.EventIn({
        frameType: 'vector',
        frameSize: 6,
        frameRate: 1, // this.motionInput.period doesn't seem available anymore
        description: ['accX', 'accY', 'accZ', 'gyrAlpha', 'gyrBeta', 'gyrGamma']
      });
      this._featurizer = new FeaturizerLfo({
        descriptors: [ 'accIntensity' ],
        callback: this._setGainFromIntensity
      });
      this._xmmDecoder = new XmmDecoderLfo({
        likelihoodWindow: 20,
        callback: this._onModelFilter
      });

      this._devicemotionIn.connect(this._featurizer);
      this._devicemotionIn.connect(this._xmmDecoder);
      this._devicemotionIn.start();

      //------------------ AUDIO -----------------//
      this.audioEngine = new AudioEngine(this.audioBufferManager.data);
      this.audioEngine.start();

      //--------------- MOTION INPUT -------------//
      if (this.motionInput.isAvailable('devicemotion')) {
        this.motionInput.addListener('devicemotion', this._motionCallback);
      }

      //----------------- RECEIVE -----------------//
      this.receive('models', this._onReceiveModels);
    });
  }

  //--------------------------------- CALLBACKS ------------------------------//

  _motionCallback(eventValues) {
    const values = eventValues.slice(0,3).concat(eventValues.slice(-3));
    this._devicemotionIn.process(audioContext.currentTime, values);

    if (this._sendOscFlag) {
      this._sendOsc('sensors', values);
    }
  }

  _onReceiveModel(model) {
    this._xmmDecoder.params.set('model', model);
    console.log('received model');
  }

  _onReceiveModels(models) {
    this._models = models;

    this.view.model.models = this._models;
    this.view.render('#modelsDiv');

    const prevModels = Object.keys(models);
    const prevModelIndex = prevModels.indexOf(this._currentModel);

    if (this._currentModel &&  prevModelIndex > -1) {
      this._currentModel = prevModels[prevModelIndex];
      this.view.setModelItem(this._currentModel);
    } else {
      this._currentModel = prevModels[0];
    }

    this._xmmDecoder.params.set('model', this._models[this._currentModel]);
  }

  _onModelChange(value) {
    this._currentModel = value;
    this._xmmDecoder.params.set('model', this._models[this._currentModel]);
  }

  _onModelFilter(res) {
    const likelihoods = res.likelihoods;
    const likeliest = res.likeliestIndex;
    const label = res.likeliest;
    const alphas = res.alphas;// res.alphas[likeliest];

    const newRes = {
      label: label,
      likeliest: likeliest,
      alphas: alphas,
      likelihoods: likelihoods
    }

    this.renderer.setModelResults(newRes);

    if (this.likeliest !== label) {
      this.likeliest = label;
      console.log('changed gesture to : ' + label);
      const i = this.labels.indexOf(label);
      this.audioEngine.fadeToNewSound(i);
    }

    if (this._sendOscFlag) {
      this._sendOsc('likelihoods', likelihoods);
      this._sendOsc('likeliest', likeliest);
    }
  }

  _setGainFromIntensity(values) {
    if (this._sendOscFlag) {
      this._sendOsc('intensity', [values[0]]);
    }
    this.audioEngine.setGainFromIntensity(values[0]);
  }

  _enableSounds(onOff) {
    this.audioEngine.enableSounds(onOff);
  }

  _setMasterVolume(volume) {
    this.audioEngine.setMasterVolume(volume);
  }

  _sendOsc(suffix, values) {
    this.send('sendosc', {
      url: `/${this._currentModel}/${suffix}`,
      values: values
    });
  }
}

export default PlayerExperience;
