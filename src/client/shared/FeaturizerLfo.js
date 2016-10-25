import * as lfo from 'waves-lfo';
import { MotionFeatures } from 'motion-features';

export default class Featurizer extends lfo.core.BaseLfo {
	constructor(options = {}) {
		const defaults = {
			descriptors: [
				'accRaw',
				'gyrRaw',
				'accIntensity',
				'gyrIntensity',
				'freefall',
				'kick',
				'shake',
				'spin',
				'still'
			],
			// motion-input indices :
			// 0,1,2 -> accelerationIncludingGravity
			// 3,4,5 -> acceleration
			// 6,7,8 -> rotationRate
			accIndices: [0, 1, 2], // accelerationIncludingGravity
			// accIndices: [3, 4, 5], // acceleration
			gyrIndices: [6, 7, 8], // rotationRate
			callback: undefined
		};

		super(defaults, options);
		this._features = new MotionFeatures({
			descriptors: this.params.descriptors,
			spinThresh: 0.5, // original : 200
			stillThresh: 2 // original : 5000
		});
		this._callback = this.params.callback;

		this.descriptorsInfo = {
			accRaw: [ 'x', 'y', 'z' ],
			gyrRaw: [ 'x', 'y', 'z' ],
			accIntensity: [ 'norm', 'x', 'y', 'z'	],
			gyrIntensity: [ 'norm', 'x', 'y', 'z'	],
			freefall: [ 'accNorm', 'falling', 'duration' ],
			kick: [ 'intensity', 'kicking' ],
			shake: [ 'shaking' ],
			spin: [ 'spinning', 'duration', 'gyrNorm' ],
			still: [ 'still', 'slide' ]
		}
	}

	initialize(inStreamParams = {}, outStreamParams = {}) {
		let len = 0;
		for (let d of this.params.descriptors) {
			len += this.descriptorsInfo[d].length;
		}

		outStreamParams.frameSize = len;
		super.initialize(inStreamParams, outStreamParams);
	}

	process(time, frame, metaData) {
		if (frame.length < 6) {
			this.output();
			return;
		}
		//return;

		this.time = time;
		this.metaData = metaData;

		const accIndices = this.params.accIndices;
		const gyrIndices = this.params.gyrIndices;
		
		this._features.setAccelerometer(
			frame[accIndices[0]],
			frame[accIndices[1]],
			frame[accIndices[2]]
		);

		this._features.setGyroscope(
			frame[gyrIndices[0]],
			frame[gyrIndices[1]],
			frame[gyrIndices[2]]
		);

		this._features.update((err, values) => {
			if (err !== null) {
				console.log(err);
				this.output();
				return;
			}

			let i = 0;
			let prnt = '';
			for (let d of this.params.descriptors) {
				const subDesc = this.descriptorsInfo[d]; // the array of the current descriptor's dimensions names
				const subValues = values[d];
				for (let subd of subDesc) {
					if (subd === 'duration' || subd === 'slide') {
						subValues[subd] = 0;
					}
					this.outFrame[i] = subValues[subd];
					i++;
					prnt += subd + ':' + subValues[subd] + ', ';
				}
			}
			//console.log(prnt);
			if (this._callback) {
				const desc = new Array(this.streamParams.frameSize);
				for (let j = 0; j < desc.length; j++) {
					desc[j] = this.outFrame[j];
				}
				this._callback(desc);
			}
			this.output();
		});
	}
};