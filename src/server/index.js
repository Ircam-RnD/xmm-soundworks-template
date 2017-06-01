import 'source-map-support/register'; // enable sourcemaps in node
import * as soundworks from 'soundworks/server';
import DesignerExperience from './DesignerExperience';
<<<<<<< HEAD
=======
// import ComoDesignerExperience from './ComoDesignerExperience';
>>>>>>> 3bae12acfa77e69976b9899c93b2553242c1593b
import PlayerExperience from './PlayerExperience';
import defaultConfig from './config/default';

let config = null;

switch(process.env.ENV) {
  default:
    config = defaultConfig;
    break;
}

// configure express environment ('production' enables cache systems)
process.env.NODE_ENV = config.env;
// initialize application with configuration options
soundworks.server.init(config);

// define the configuration object to be passed to the `.ejs` template
soundworks.server.setClientConfigDefinition((clientType, config, httpRequest) => {
  return {
    clientType: clientType,
    env: config.env,
    appName: config.appName,
    socketIO: config.socketIO,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,
  };
});

// create the experience
// activities must be mapped to client types:
// - the `'player'` clients (who take part in the scenario by connecting to the
//   server through the root url) need to communicate with the `checkin` (see
// `src/server/playerExperience.js`) and the server side `playerExperience`.
// - we could also map activities to additional client types (thus defining a
//   route (url) of the following form: `/${clientType}`)

const designer = new DesignerExperience('designer');
<<<<<<< HEAD
=======
// const cdesigner = new ComoDesignerExperience('comodesigner');
>>>>>>> 3bae12acfa77e69976b9899c93b2553242c1593b
const player = new PlayerExperience('player');

// start application
soundworks.server.start();
