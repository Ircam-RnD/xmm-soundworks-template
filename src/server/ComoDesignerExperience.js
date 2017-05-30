import { Experience } from 'soundworks/server';
import { ComoNodeLogin } from './services/ComoNodeLogin';

export default class ComoDesignerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.login = this.require('comonodelogin');
    //this.osc = this.require('osc');
  }

  // if anything needs to append when the experience starts
  start() {}

  enter(client) {
    super.enter(client);

    // define your receives here
  }

  exit(client) {
    super.exit(client);
  }  
};