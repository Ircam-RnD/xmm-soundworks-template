import { Service, SegmentedView, serviceManager } from 'soundworks/client';

const SERVICE_ID = 'service:comonodelogin';

class ComoLoginView extends SegmentedView {
  onLogin(callback) {
    this.installEvents({
      'click #login': () => {
        const username = this.$el.querySelector('#username').value;
        const password = this.$el.querySelector('#password').value;
        // if (userName !== '' ) {
          callback({ username: username, password: password });
        // }
      }
    });
  }

  onConfirm(callback) {
    this.installEvents({
      'click #confirm': () => {
        callback();
      }
    });
  }

  onLogout(callback) {
    this.installEvents({
      'click #logout': () => {
        callback();
      }
    });
  }
}

const defaultViewTemplate = `
<% if (!logged) { %>
  <div class="section-top flex-middle">
    <!-- <p><%= instructions %></p> -->
  </div>
  <div class="section-center flex-center">
    <div>
      <label for="username"> username </label>
      <input type="text" id="username">
      <label for="password"> password </label>
      <input type="password" id="password">
      <button class="btn" id="login"><%= login %></button>
      <div id="errorMessage"> <%= errorMessage %> </div>
    </div>
  </div>
  <div class="section-bottom"></div>
<% } else { %>
  <div class="section-top flex-middle">
    <p><%= welcomeMessage %><%= username %></p>
  </div>
  <div class="section-center flex-center">
    <div>
      <button class="btn" id="confirm"><%= confirm %></button>
      <button class="btn" id="logout"><%= logout %></button>
    </div>
  </div>
  <div class="section-bottom"></div>
<% } %>`;

const defaultViewContent = {
  instructions: 'Enter your user name',
  login : 'Log in',
  welcomeMessage: 'Logged in as ',
  username: null,
  confirm: 'Confirm',
  logout: 'Log out',
  logged: false,
  errorMessage: null
};

/**
 * Interface for the client `login` service
 *
 * works in conjunction with the datastorage service
 * uses localStorage to check if the client is already logged in
 * if so, displays a welcome message
 * if not, provides a text input to specifiy a user name
 * if the user name doesn't already exist in the database, automatically creates a new entry
 * not secure : several users can be connected simultaneously using the same user name
 */

class ComoNodeLogin extends Service {
  constructor(options) {
    super(SERVICE_ID, true);

    const defaults = {
      viewPriority: 100,
      viewCtor: ComoLoginView
    };

    this.configure(defaults);

    this._defaultViewTemplate = defaultViewTemplate;
    this._defaultViewContent = defaultViewContent;

    this._onLoginResponse = this._onLoginResponse.bind(this);
    this._onLoginConfirmed = this._onLoginConfirmed.bind(this);
    this._onLogoutResponse = this._onLogoutResponse.bind(this);
    this._login = this._login.bind(this);
    this._confirm = this._confirm.bind(this);
    this._logout = this._logout.bind(this);

    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin');
  }

  //configure(options) 

  /** @private */
  init() {
    this._username = null;

    this.viewCtor = this.options.viewCtor;
    this.view = this.createView();
    this.view.onLogin(this._login);
    this.view.onConfirm(this._confirm);
    this.view.onLogout(this._logout);
  }

  /** @private */
  start() {
    super.start();

    if (!this.hasStarted)
      this.init();

    this.receive('login', this._onLoginResponse);
    this.receive('confirm', this._onLoginConfirmed);
    this.receive('logout', this._onLogoutResponse);

    const key = 'soundworks:service:comonodelogin:username';
    const storedUsername = localStorage.getItem(key);

    if (storedUsername !== null) {
      this.view.content.logged = true;
      this.view.content.username = storedUsername;
      this._username = storedUsername;
    } else {
      this.view.content.logged = false;
      this.view.content.username = null;  
    }

    this.show();
  }

  /** @private */
  stop() {
    super.stop();

    this.removeListener('login', this._onLoginResponse);
    this.removeListener('confirm', this._onLoginConfirmed);
    this.removeListener('logout', this._onLogoutResponse);

    this.hide();
  }

  getUserName() {
    return localStorage.getItem('soundworks:service:comonodelogin:username');
  }

  _login(credentials) {
    this.send('login', credentials);
  }

  _confirm() {
    this.send('confirm', this._username);
  }

  _logout() {
    this.send('logout', this._username);
  }

  _onLoginResponse(username) {
    this._username = username;
    console.log('login response : ' + this._username);
    localStorage.setItem('soundworks:service:comonodelogin:username', username);
    this._defaultViewContent.logged = true;
    this._defaultViewContent.username = username;
    this.view.render();
  }

  _onLoginConfirmed(username) {
    console.log('server confirmed that ' + username + ' is logged in');
    this.ready();
  }

  _onLogoutResponse(username) {
    this._username = null;
    localStorage.removeItem('soundworks:service:comonodelogin:username');
    this._defaultViewContent.logged = false;
    this._defaultViewContent.username = null;
    this.view.render();
  }
}

serviceManager.register(SERVICE_ID, ComoNodeLogin);

export default ComoNodeLogin;