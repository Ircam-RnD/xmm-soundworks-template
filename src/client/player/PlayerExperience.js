import * as soundworks from 'soundworks/client';
import * as lfo from 'waves-lfo';
import { PhraseRecorderLfo, HhmmDecoderLfo } from 'xmm-lfo';
import { classes } from  '../shared/config';
import FeaturizerLfo from '../shared/FeaturizerLfo';
import MotionRenderer from '../shared/MotionRenderer';
import AudioEngine from '../shared/AudioEngine';

const audioContext = soundworks.audioContext;

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

const viewTemplate = `
  <div class="foreground">
    <div class="section-top flex-middle">
    	<div>
      	<!-- <p class="big"><%= title %></p> -->
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

export default class PlayerExperience extends soundworks.Experience {
	constructor(assetsDomain) {
    super();

    const audioFiles = [];
    for (let label in classes) {
      audioFiles.push(classes[label]);
    }
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin', { showDialog: false });
    this.loader = this.require('loader', {
      assetsDomain: assetsDomain,
      files: audioFiles
    });
    this.motionInput = this.require('motion-input', {
      descriptors: ['devicemotion']
    });

    this.labels = Object.keys(classes);
    this.likeliest = undefined;
    this._models = null;
    this._sendOscFlag = false;
	}

  //=============================================//

  init() {
    console.log('start initialization');

    this.audioEngine = new AudioEngine(classes, this.loader);

    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = {
    	title: 'play !',
      models: null
    };
    this.viewCtor = PlayerView;
    this.viewOptions = { preservePixelRatio: true, className: 'player' };
    this.view = this.createView();

    this._onReceiveModel = this._onReceiveModel.bind(this);
    this._onReceiveModels = this._onReceiveModels.bind(this);
    this._onModelChange = this._onModelChange.bind(this);
    this._onModelFilter = this._onModelFilter.bind(this);   
    this._motionCallback = this._motionCallback.bind(this);

    this._setGainFromIntensity = this._setGainFromIntensity.bind(this);
    this._enableSounds = this._enableSounds.bind(this);
    this._setMasterVolume = this._setMasterVolume.bind(this);

    this.view.onModelChange(this._onModelChange);
    this.view.onToggleSendOsc((val) => {
      this._sendOscFlag = val;
    });

    this.view.onEnableSounds(this._enableSounds);
    this.view.onSetMasterVolume(this._setMasterVolume);

    this.motionInput.addListener('devicemotion', this._motionCallback);

    //--------------------------------- LFO's --------------------------------//
    this._devicemotionIn = new lfo.sources.EventIn({
      frameSize: 6,
      ctx: audioContext
    });
    this._featurizer = new FeaturizerLfo({
    	descriptors: [ 'accIntensity' ],
      callback: this._setGainFromIntensity
    });
    this._phraseRecorder = new PhraseRecorderLfo({
      column_names: ['accelGravX', 'accelGravY', 'accelGravZ',
                     'rotAlpha', 'rotBeta', 'rotGamma']      
    });
    this._hhmmDecoder = new HhmmDecoderLfo({
      likelihoodWindow: 5,
      callback: this._onModelFilter
    });

    this._devicemotionIn.connect(this._featurizer);
    this._devicemotionIn.connect(this._phraseRecorder);
    this._devicemotionIn.connect(this._hhmmDecoder);
    this._devicemotionIn.start();

    //----------------- RECEIVE -----------------//
    this.receive('model', this._onReceiveModel);
    this.receive('models', this._onReceiveModels);
  }

  //=============================================//

  start() {
    super.start(); // don't forget this

    // console.log('starting');
    if (!this.hasStarted)
      this.init();

    //window.location = window.location.origin + '/conductor';
    this.show();

    // initialize rendering
    this.renderer = new MotionRenderer(100);
    this.view.addRenderer(this.renderer);
    // this function is called before each update (`Renderer.render`) of the canvas
    this.view.setPreRender((ctx, dt) => {});

    this.audioEngine.start();
  }

  //================ callbacks : ================//

  _motionCallback(eventValues) {
    const values = eventValues.slice(0,3).concat(eventValues.slice(-3));
    this._devicemotionIn.process(audioContext.currentTime, values, {});
    if (this._sendOscFlag) {
    	this._sendOsc('sensors', values);
    }
  }

  _onReceiveModel(model) {
  	console.log(model);
    this._hhmmDecoder.model = model;
    console.log('received model');
  }

  _onReceiveModels(models) {
  	this._models = models;
  	this.view.content = {
    	title: 'play !',
      models: this._models  		
  	};
		this.view.render('#modelsDiv');
		this._currentModel = Object.keys(models)[0];
  	this._hhmmDecoder.model = models[this._currentModel];
  }

  _onModelChange(value) {
  	this._currentModel = value;
  	this._hhmmDecoder.model = this._models[this._currentModel];
  }

  _onModelFilter(res) {
    const likelihoods = res.likelihoods;
    const likeliest = res.likeliestIndex;
    const label = res.likeliest;
    const alphas = res.alphas[likeliest];
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