import BaseLfo from 'waves-lfo/common/core/BaseLfo';
// import * as lfo from 'waves-lfo/client';
import { PhraseMaker } from 'xmm-client';

const definitions = {
  bimodal: {
    type: 'boolean',
    default: false,
    constant: true
  },
  dimensionInput: {
    type: 'integer',
    default: 0,
    constant: true
  },
  columnNames: {
    type: 'any',
    default: [''],
    constant: true
  },
};

// uncomment this and add to other xmm-lfo's when lfo is exposed in /common as well
// or use client ? (it's very likely that we won't run these lfo's server-side)
// if (lfo.version < '1.0.0')
//  throw new Error('')

/**
 * Lfo class using PhraseMaker class from xmm-client
 * to record input data and format it for xmm-node.
 */
export default class PhraseRecorderLfo extends BaseLfo {
  constructor(options = {}) {
    super(definitions, options);

    this._phraseMaker = new PhraseMaker({
      bimodal: this.params.get('bimodal'),
      dimensionInput: this.params.get('dimensionInput'),
      columnNames: this.params.get('columnNames'),
    });

    this._isStarted = false;
  }

  /**
   * Get the current label of the last / currently being recorded phrase.
   * @returns {String}.
   */
  getPhraseLabel() {
    return this._phraseMaker.getConfig()['label'];
  }

  /**
   * Set the current label of the last / currently being recorded phrase.
   * @param {String} label - The label.
   */
  setPhraseLabel(label) {
    this._phraseMaker.setConfig({ label: label });
  }

  /**
   * Return the latest recorded phrase.
   * @returns {XmmPhrase}
   */
  getRecordedPhrase() {
    // this.stop();
    console.log(this._phraseMaker.phrase);
    return this._phraseMaker.phrase;
  }

  /**
   * Start recording a phrase from the input stream.
   */
  start() {
    this._phraseMaker.reset();
    this._isStarted = true;
  }

  /**
   * Stop the current recording.
   * (makes the phrase available via <code>getRecordedPhrase()</code>).
   */
  stop() {
    this._isStarted = false;
  }

  /** @private */
  onParamUpdate(name, value, metas) {
    super.onParamUpdate(name, value, metas);

    const config = {};
    config[name] = value;
    this._phraseMaker.setConfig(config);
  }

  /** @private */
  processStreamParams(prevStreamParams = {}) {
    this.prepareStreamParams(prevStreamParams);

    this._phraseMaker.setConfig({ dimension: this.streamParams.frameSize });
    this._phraseMaker.reset();

    this.propagateStreamParams();
  }

  /** @private */
  processVector(frame) {
    if (!this._isStarted) {
      return;
    }

    // const { data } = frame;
    const frameSize = this.streamParams.frameSize;
    const inData = frame.data;
    const outData = this.frame.data;

    for (let i = 0; i < frameSize; i++) {
      outData[i] = inData[i];
    }
    //console.log(outData);

    const inArray = new Array(this.streamParams.frameSize);
    for (let i = 0; i < inArray.length; i++) {
      inArray[i] = inData[i];
    }

    this._phraseMaker.addObservation(inArray);
  }
}

// export default PhraseRecorderLfo;