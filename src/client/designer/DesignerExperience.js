import * as soundworks from 'soundworks/client';
import * as lfo from 'waves-lfo';
import { PhraseRecorderLfo, HhmmDecoderLfo } from 'xmm-lfo';
import { Login } from '../services/Login';
import { classes } from  '../shared/config';
import FeaturizerLfo from '../shared/FeaturizerLfo';
import MotionRenderer from '../shared/MotionRenderer';
import AudioEngine from '../shared/AudioEngine';

const audioContext = soundworks.audioContext;

class DesignerView extends soundworks.CanvasView {
  constructor(template, content, events, options) {
    super(template, content, events, options);
  }

  onInputChange(callback) {
    this.installEvents({
      'change #inputSelect': () => {
        const inputs = this.$el.querySelector('#inputSelect');
        callback(inputs.options[inputs.selectedIndex].value);
      }
    });
  }

  onToggleSendOscSensors(callback) {
    this.installEvents({
      'click #sendOscSensors': () => {
        const btn = this.$el.querySelector('#sendOscSensors');
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

  onToggleSendOscLikelihoods(callback) {
    this.installEvents({
      'click #sendOscLikelihoods': () => {
        const btn = this.$el.querySelector('#sendOscLikelihoods');
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

  onRecord(callback) {
    this.installEvents({
      'click #recBtn': () => {
        const rec = this.$el.querySelector('#recBtn');
        if (!rec.classList.contains('active')) {
          //recording = true;
          rec.innerHTML = 'STOP';
          rec.classList.add('active');
          // rec.style.background = '#ff0000';
          // phraseMaker.reset();
          callback('record');
        } else {
          //recording = false;
          rec.innerHTML = 'REC';
          rec.classList.remove('active');
          // rec.style.background = recOffColor;
          callback('stop')
        }
      }
    });
  }

  onSendPhrase(callback) {
    this.installEvents({
      'click #sendBtn': () => {
        const labels = this.$el.querySelector('#labelSelect');
        callback(labels.options[labels.selectedIndex].text);
      }
    });
  }

  onClearLabel(callback) {
    this.installEvents({
      'click #clearLabelBtn': () => {
        const labels = this.$el.querySelector('#labelSelect');
        callback(labels.options[labels.selectedIndex].text);
      }
    });
  }

  onClearModel(callback) {
    this.installEvents({
      'click #clearModelBtn': () => {
        callback();
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
        <div class="selectDiv"> Label :
          <select id="labelSelect">
            <% for (var prop in classes) { %>
              <option value="<%= prop %>">
                <%= prop %>
              </option>
            <% } %>
          </select>
        </div>
        <button id="recBtn">REC</button>
        <button id="sendBtn">SEND</button>
        <div class="canvasDiv">
          <canvas class="multislider" id="likelihoods"></canvas>
        </div>
        <button id="clearLabelBtn">CLEAR LABEL</button>
        <button id="clearModelBtn">CLEAR MODEL</button>  
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
      </div>
    </div>
    <div class="section-center flex-center">
    	<!-- <canvas class="multislider" id="likelihoods"></canvas> -->
    </div>
    <div class="section-bottom flex-middle">
    	<!-- nothing here -->
    </div>
  </div>
`;

export default class DesignerExperience extends soundworks.Experience {
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
    this.login = this.require('login');
    this.motionInput = this.require('motion-input', {
      descriptors: ['devicemotion']
    });

    this.labels = Object.keys(classes);
    this.likeliest = undefined;
    // this._soundIndex = -1;
	}

  //=============================================//

  init() {
    console.log('start initialization');

    this.audioEngine = new AudioEngine(classes, this.loader);

    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = {
    	title: 'play !',
      classes: classes
    };
    this.viewCtor = DesignerView;
    this.viewOptions = { preservePixelRatio: true, className: 'designer' };
    this.view = this.createView();

    this._onRecord = this._onRecord.bind(this);
    this._onSendPhrase = this._onSendPhrase.bind(this);
    this._onClearLabel = this._onClearLabel.bind(this);
    this._onClearModel = this._onClearModel.bind(this);

    this._onReceiveModel = this._onReceiveModel.bind(this);
    this._onModelFilter = this._onModelFilter.bind(this);   
    this._motionCallback = this._motionCallback.bind(this);

    this._setGainFromIntensity = this._setGainFromIntensity.bind(this);
    this._enableSounds = this._enableSounds.bind(this);
    this._setMasterVolume = this._setMasterVolume.bind(this);

    this.view.onInputChange((val) => { this._input = val; });
    this.view.onToggleSendOscSensors((val) => {
      this._sendOscSensors = val;
    });
    this.view.onToggleSendOscLikelihoods((val) => {
      this._sendOscLikelihoods = val;
    });

    this.view.onRecord(this._onRecord);
    this.view.onSendPhrase(this._onSendPhrase);
    this.view.onClearLabel(this._onClearLabel);
    this.view.onClearModel(this._onClearModel);
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
      likelihoodWindow: 20,
      callback: this._onModelFilter
    });

    this._devicemotionIn.connect(this._featurizer);
    this._devicemotionIn.connect(this._phraseRecorder);
    this._devicemotionIn.connect(this._hhmmDecoder);
    this._devicemotionIn.start();

    //----------------- RECEIVE -----------------//
    this.receive('model', this._onReceiveModel);
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

  _onRecord(cmd) {
    switch (cmd) {
      case 'record':
        this._phraseRecorder.start();
        break;

      case 'stop':
        this._phraseRecorder.stop();
        break;
    }
  }

  _onSendPhrase(label) {
    this._phraseRecorder.label = label;
    let phrase = this._phraseRecorder.getRecordedPhrase();
    if (phrase.length > 0) {
      if (confirm('send phrase with label ' + label + ' ?')) {
        this.send('phrase', { cmd: 'add', data: phrase }); // will this still work ?
      }
    } else {
      alert('cannot send empty phrases');
      console.error('error : empty phrases are forbidden');
    }
  }

  _onClearLabel(label) {
    if (confirm('do you really want to remove the label ' + label + ' ?')) {
      this.send('clear', { cmd: 'label', data: label });
    }    
  }

  _onClearModel() {
    if (confirm('do you really want to remove the current model ?')) {
      this.send('clear', { cmd: 'model' });
    }
  }

  //================ callbacks : ================//

  _motionCallback(eventValues) {
    const values = eventValues.slice(0,3).concat(eventValues.slice(-3));
    this._devicemotionIn.process(audioContext.currentTime, values, {});
  }

  _onReceiveModel(model) {
  	console.log(model);
    this._hhmmDecoder.model = model;
    console.log('received model');
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
  }

  _setGainFromIntensity(value) {
    this.audioEngine.setGainFromIntensity(value);
  }

  _enableSounds(onOff) {
    this.audioEngine.enableSounds(onOff);
  }

  _setMasterVolume(volume) {
    this.audioEngine.setMasterVolume(volume);
  }
}