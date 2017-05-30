import Como from './ComoNodeClient';
import { Service, serviceManager } from 'soundworks/server';

const SERVICE_ID = 'service:comonodelogin';

class ComoNodeLogin extends Service {
  constructor() {
    super(SERVICE_ID);

    const defaults = {};
    this.configure(defaults);

    this.checkin = this.require('checkin');

    this.comos = new Map();
  }

  /** @private */
  configure(options) {
    super.configure(options);
  }

  /** @private */
  start() {
    super.start();
  }

  /** @private */
  connect(client) {
    super.connect(client);
    // client.activities.login = { userName: null };
    client.activities['service:login'] = { username: null };
    this.receive(client, 'login', this._onLogin(client));
    this.receive(client, 'confirm', this._onConfirm(client));
    this.receive(client, 'logout', this._onLogout(client));
  }

  /** @private */
  /** @todo check for eventual db errors with more callbacks in Mongo.js */
  _onLogin(client) {
    return (credentials) => {
      this.comos[client] = new Como();//'http://127.0.0.1:8001');
      this.comos[client].login(credentials['username'], credentials['password'], (code, message) => {
        switch (code) {
          case 200:
            console.log(message);
            this.send(client, 'login', credentials['username']);
            break;

          default:
            console.log(message);
            break;
        }
      });
    };
  }

  /** @private */
  _onConfirm(client) {
    return (username) => {
      // client.activities.login.userName = userName;
      // console.log(client.activities);
      client.activities['service:login'].username = username;
      this.send(client, 'confirm', username);
    }
  }

  /** @private */
  _onLogout(client) {
    return (username) => {
      // client.activities.login.userName = null;
      client.activities['service:login'].username = null;
      this.comos[client].logout((code, message) => {
        console.log(message);
        this.send(client, 'logout', username);
      });
    };
  }
}

serviceManager.register(SERVICE_ID, ComoNodeLogin);

export default ComoNodeLogin;