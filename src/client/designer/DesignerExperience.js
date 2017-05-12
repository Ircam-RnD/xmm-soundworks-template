import * as soundworks from 'soundworks/client';
import * as lfo from 'waves-lfo/client';
import { PhraseRecorderLfo, HhmmDecoderLfo, GmmDecoderLfo } from 'xmm-lfo';
// import PhraseRecorderLfo from '../shared/PhraseRecorderLfo';
// import HhmmDecoderLfo from '../shared/HhmmDecoderLfo';
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
        <div class="toggleDiv">
          <button id="playBtn" class="toggleBtn"></button>
          Enable sounds
        </div>
      </div>
    </div>
    <div class="section-center flex-center">
    </div>
    <div class="section-bottom flex-middle">
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
    this.login = this.require('login');
    this.loader = this.require('loader', {
      assetsDomain: assetsDomain,
      files: audioFiles
    });
    this.motionInput = this.require('motion-input', {
      descriptors: ['devicemotion']
    });

    this.labels = Object.keys(classes);
    this.likeliest = undefined;
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
    this._intensityCallback = this._intensityCallback.bind(this);
    this._enableSounds = this._enableSounds.bind(this);

    this.view.onRecord(this._onRecord);
    this.view.onSendPhrase(this._onSendPhrase);
    this.view.onClearLabel(this._onClearLabel);
    this.view.onClearModel(this._onClearModel);
    this.view.onEnableSounds(this._enableSounds);

    //--------------------------------- LFO's --------------------------------//
    this._devicemotionIn = new lfo.source.EventIn({
      frameType: 'vector',
      frameSize: 6,
      frameRate: 1,//this.motionInput.period doesn't seem available anymore
      description: ['accX', 'accY', 'accZ', 'gyrAlpha', 'gyrBeta', 'gyrGamma']
    });
    this._featurizer = new FeaturizerLfo({
    	descriptors: [ 'accIntensity' ],
      callback: this._intensityCallback
    });
    this._phraseRecorder = new PhraseRecorderLfo({
      columnNames: ['accelGravX', 'accelGravY', 'accelGravZ',
                     'rotAlpha', 'rotBeta', 'rotGamma']      
    });
    // this._hhmmDecoder = new HhmmDecoderLfo({
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
    if (this.motionInput.isAvailable('devicemotion')) {
      this.motionInput.addListener('devicemotion', this._motionCallback);
    }
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
    this._phraseRecorder.setPhraseLabel(label);
    let phrase = this._phraseRecorder.getRecordedPhrase();
    if (phrase.length > 0) {
      if (confirm('send phrase with label ' + label + ' ?')) {
        this.send('phrase', { cmd: 'add', data: phrase });
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
    // console.log(values);
    // const frame = {
    //   time: new Date().getTime(),
    //   data: values
    // };
    // this._devicemotionIn.processFrame(frame);
    this._devicemotionIn.process(audioContext.currentTime, values);
  }

  _onReceiveModel(model) {
    this._hhmmDecoder.params.set('model', model);
    console.log('received model');
  }

  _onModelFilter(res) {
    const likelihoods = res.likelihoods;
    //console.log(likelihoods);
    const likeliest = res.likeliestIndex;
    const label = res.likeliest;
    //const alphas = res.alphas[likeliest];
    const newRes = {
      label: label,
      likeliest: likeliest,
      //alphas: alphas,
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

  _intensityCallback(values) {
    this.audioEngine.setGainFromIntensity(values[0]);
  }

  _enableSounds(onOff) {
    this.audioEngine.enableSounds(onOff);
  }
}