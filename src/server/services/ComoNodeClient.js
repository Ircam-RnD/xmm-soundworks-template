// from http://stackoverflow.com/questions/17575790/environment-detection-node-js-or-browser
// var checkIfNode = new Function("try {return this===global;}catch(e){return false;}");
// const isNode = checkIfNode();
// console.log(isNode);

import { XMLHttpRequest as NodeXMLHttpRequest } from 'xmlhttprequest';
import btoa from 'btoa';
import { LocalStorage } from 'node-localstorage';

function searchOptionsToParams(options) {
  let res = '?';
  let i = 0;

  if (options['searchOptions']) {
    const opts = options['searchOptions'];

    for (let o in opts) {
      if (i !== 0) {
        res += '&';
      }

      i++;

      if (Array.isArray(opts[o])) {
        res += `${o}=${opts[o].join(',')}`;
      } else {
        res += `${o}=${opts[o]}`;
      }
    }
  }
  return encodeURI(res);
};

//============================= THE CLIENT API ===============================//

class ComoNodeClient {

  constructor(comoUrl = 'https://como.ircam.fr/api/v1', nodeHost = '*') {
    this.localStorage = new LocalStorage('./scratch');
    this.nodeHost = nodeHost;
    this.comoUrl = comoUrl;
    this.tokenKey = 'como:apiv1:token';
  }

  login(username, password, callback) {
    const xhr = new NodeXMLHttpRequest();
    xhr.open('get', `${this.comoUrl}/users/login`, true);
    xhr.setRequestHeader('Access-Control-Allow-Origin', this.nodeHost);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${username}:${password}`));
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = () => {
      if (xhr.readyState == 4) {

        const resp = JSON.parse(xhr.responseText);
        //const resp = xhr.responseText;
        console.log(resp);
        if (xhr.status == 200) {
          if (resp.status === 'success') {
            const token = resp.data.token;
            //console.log(token);
            this.localStorage.setItem(this.tokenKey, token);
            callback(200, token);
          } else {
            callback(500, resp.message);
          }
        } else {
          callback(xhr.status, resp.message);
        }
      }
    };
    //xhr.onreadystatechange = xhr.onreadystatechange.bind(this);
    xhr.send();
  }

  logout(callback) {
    const xhr = new NodeXMLHttpRequest();
    xhr.open('get', `${this.comoUrl}/users/logout`, true);
    xhr.setRequestHeader('Access-Control-Allow-Origin', this.nodeHost);
    const token = this.localStorage.getItem(this.tokenKey);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = () => {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          const resp = JSON.parse(xhr.responseText);
          if (resp.status === 'success') {
            this.localStorage.removeItem(this.tokenKey);
            callback(200, 'disconnection successful');
          } else {
            callback(500, 'an error occured during disconnection : ' + JSON.stringify(resp));
          }
        } else {
          callback(xhr.status, 'an error occured during disconnection : ' + xhr.responseText);
        }
      }
    };
    //xhr.onreadystatechange = xhr.onreadystatechange.bind(this);
    xhr.send();    
  }

  /**
   * @private
   * for GET requests
   */
  _buildXhr (method, url) {
    const xhr = new NodeXMLHttpRequest();
    xhr.open(method, `${this.comoUrl}${url}`, true);
    xhr.setRequestHeader('Access-Control-Allow-Origin', this.nodeHost);
    return xhr;
  }

  /**
   * @private
   * for POST, and PUT and DELETE if we end up using such requests.
   * to send PUT or DELETE via xhr, simply change the method argument to 'put' or 'delete'
   */
  _buildTokenXhr(method, url) {
    const xhr = this._buildXhr(method, url);
    const token = this.localStorage.getItem(this.tokenKey);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    return xhr;  
  }

  /**
   * @private
   * simple GET request
   */
  _getSomething(url, callback) {
    const xhr = this._buildXhr('get', url);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        callback(xhr.status, xhr.responseText);
      }
    }
    xhr.send(null);
  }

  /**
   * @private
   * generic getter of lists by options filter
   */
  _getSomethingsList(url, options, callback) {
    const xhr = this._buildXhr('get', `${url}${searchOptionsToParams(options)}`);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        callback(xhr.status, xhr.responseText);
      }
    };
    xhr.send(null);
  }

  /**
   * @private
   * generic upload of data or remote creation from options
   */
  _uploadOrCreateSomething(url, data, callback) {
    const xhr = this._buildTokenXhr('post', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        callback(xhr.status, xhr.responseText);
      }
    };
    xhr.send(JSON.stringify(data));  
  }

  /**
   * @private
   * generic update of instance from data
   * same parameters as in _uploadOrCreateSomething
   */
  /*
  _updateSomething(url, data, callback) {
    var xhr = this._buildTokenXhr('put', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        callback(xhr.status, xhr.responseText);
      }
    };
    xhr.send(JSON.stringify(data));  
  }
  //*/

  /**
   * @private
   * simple DELETE request
   */
  _deleteSomething(url, callback) {
    const xhr = this._buildTokenXhr('delete', url);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        callback(xhr.status, xhr.responseText);
      }
    };
    xhr.send(null);
  }

  _deleteSomethingsList(url, options, callback) {
    const xhr = this._buildTokenXhr('delete', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        callback(xhr.status, xhr.responseText);
      }
    };
    xhr.send(JSON.stringify(options));
  }

  //==========================================================================//

  /**
   * @method getUser
   */
  getUser(id, callback) {
    this._getSomething(`/users/${id}`, callback);
  }

  /**
   * @method getUsersList
   */
  getUsers(options, callback) {
    this._getSomethingsList('/users/list', options, callback);
  }

  //==========================================================================//

  /**
   * @method uploadPhrase
   *
   */
  uploadPhrase(data, callback) {
    this._uploadOrCreateSomething('/phrases/upload', data, callback)
  }

  /**
   * @method getPhrase
   */
  getPhrase(id, callback) {
    this._getSomething(`/phrases/${id}`, callback);
  }

  /**
   * @method getPhrasesList
   */
  getPhrases(options, callback) {
    this._getSomethingsList('/phrases/list', options, callback);
  }

  /**
   * @method updatePhrase
   */
  /*
  updatePhrase(id, data, callback) {
    this._updateSomething(`/phrases/${id}`, data, callback)
  }
  //*/

  /**
   * @method deletePhrase
   */
  deletePhrase(id, callback) {
    this._deleteSomething(`/phrases/${id}`, callback);
  }

  /**
   * @method deletePhrases
   */
  deletePhrases(options, calllback) {
    this._deleteSomethingsList('/phrases/list', options, callback);
  }

  //==========================================================================//

  /**
   * @method createDataset
   * 
   */
  createDataset(data, callback) {
    this._uploadOrCreateSomething('/datasets/create', data, callback);
  }

  /**
   * @method getDataset
   */
  getDataset(id, callback) {
    this._getSomething(`/datasets/${id}`, callback);
  }

  /**
   * @method getDatasetsList
   */
  getDatasets(options, callback) {
    this._getSomethingsList('/datasets/list', options, callback);
  }

  /**
   * @method updateDataset
   */
  /*
  updateDataset(id, data, callback) {
    this._updateSomething(`/datasets/${id}`, data, callback)
  }
  //*/

  /**
   * @method deleteDataset
   */
  deleteDataset(id, callback) {
    this._deleteSomething(`/datasets/${id}`, callback)  
  }

  /**
   * @method deleteDatasetsList
   */
  deleteDatasets(options, callback) {
    this._deleteSomethingsList(`/datasets/list`, options, callback)  
  }

  //==========================================================================//

  /**
   * @method uploadModelconfig
   * 
   */
  uploadModelconfig(data, callback) {
    this._uploadOrCreateSomething('/modelconfigs/upload', data, callback);
  }

  /**
   * @method getModelconfig
   */
  getModelconfig(id, callback) {
    this._getSomething(`/modelconfigs/${id}`, callback);
  }

  /**
   * @method getModelconfigsList
   */
  getModelconfigs(options, callback) {
    this._getSomethingsList('/modelconfigs/list', options, callback);
  }

  /**
   * @method updateModelconfig
   */
  /*
  updateModelconfig(id, data, callback) {
    this._updateSomething(`/modelconfigs/${id}`, data, callback)
  }
  //*/

  /**
   * @method deleteModelconfig
   */
  deleteModelconfig(id, callback) {
    this._deleteSomething(`/modelconfigs/${id}`, callback)
  }

  deleteModelconfigs(options, callback) {
    this._deleteSomethingsList('/modelconfigs/list', options, callback);
  }

  //==========================================================================//

  /**
   * @method createModel
   * 
   */
  createModel(data, callback) {
    this._uploadOrCreateSomething('/models/create', data, callback);
  }

  /**
   * @method getModel
   */
  getModel(id, callback) {
    this._getSomething(`/models/${id}`, callback);
  }

  /**
   * @method getModelsList
   */
  getModels(options, callback) {
    this._getSomethingsList('/models/list', options, callback);
  }

  /**
   * @method updateModelconfig
   */
  /*
  updateModel(id, data, callback) {
    this._updateSomething(`/models/${id}`, data, callback)
  }
  //*/

  /**
   * @method deleteModelconfig
   */
  deleteModel(id, callback) {
    this._deleteSomething(`/models/${id}`, callback);  
  }

  deleteModels(options, callback) {
    this._deleteSomethingsList('/models/list', options, callback);
  }

};

//const como = new Como();

export default ComoNodeClient;