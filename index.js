const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const yaml = require('js-yaml');

class Autoconf {

  constructor(name) {
    if (!name) throw Error("Service name is required");
    this.serviceName = name;
    /*
    final project ===> actual addon/service ===> autoconf module

    EX:
    __dirname:            autoconf module
    process.env.INIT_CWD: final project
    process.cwd():        backkit-koa (actual addon/service module we are installing)
    */

    // skip vars
    this.skipPrompt = process.env.NO_INTERACTIVE || process.env.NO_PROMPT || !process.env.npm_config_foreground_scripts || process.env.npm_config_foreground_scripts === 'false' ? true : false;
    this.skipAutoconf = process.env.NO_AUTOCONF || (process.cwd() === process.env.INIT_CWD) ? true : false;

    // identification
    this.packageJson = require(`${process.cwd()}${path.sep}package.json`);
    this.npmModuleName = this.packageJson.name;

    // root dirs
    this.rootServiceDir = `${process.env.INIT_CWD}${path.sep}services`;
    this.rootConfigDir = `${process.env.INIT_CWD}${path.sep}config`;
    this.rootResourceDir = `${process.env.INIT_CWD}${path.sep}res`;

    // service code paths
    this.serviceCodeDir = this.serviceBaseDir; // service dir is flat
    this.serviceCodeMainJS = `${process.env.INIT_CWD}${path.sep}services${path.sep}${this.serviceName}.js`;
    
    // serfice config paths
    this.serviceConfigDir = `${process.env.INIT_CWD}${path.sep}config${path.sep}${this.serviceName}`; // OPTIONAL
    this.serviceConfigMainYML = `${process.env.INIT_CWD}${path.sep}config${path.sep}${this.serviceName}.yml`; // TODO: what if many configs
    
    // resources
    this.serviceResourceDir = `${process.env.INIT_CWD}${path.sep}res${path.sep}${this.serviceName}`;

    // dynamic stuff
    this.promptQuestions = {};
    this.answers = {};
    this.config = {};
    this.defaultConfig = {};
    this.generatorRules = [];
    this.generatorFunction = () => ([])
    this.configTransformer = (self, answers) => {
      return Object.assign({}, self.defaultConfig, answers); 
    };
  }

  answersToConfig(fn) {
    this.configTransformer = fn.bind(this);
    return this;
  }

  generator(fn) {
    this.generatorFunction = fn.bind(this);
    return this;
  }
  
  default(fn) {
    this.defaultConfig = fn.bind(this)(this);
    return this;
  }

  prompt(fn) {
    this.promptQuestions = fn.bind(this)(this);
    return this;
  }

  log(...args) {
    console.log.apply(this, args);
  }

  logerr(arg) {
    console.error(arg);
  }

  _runRules() {
    for (const rule of this.generatorRules) {
      // create dir recursive if not exist
      if (rule.mkdirp)
      {
        if (!fs.existsSync(rule.mkdirp))
        {
          fs.mkdirSync(rule.mkdirp, {recursive: true});
        }
      }
      // create file if not exist
      else if (rule.putFileOnce)
      {
        // todo: create dir
        if (!fs.existsSync(rule.putFileOnce)) {
          const pardir = path.dirname(rule.putFileOnce);
          if (rule.contentYml) {
            this.log("");
            this.log(`create dir ${pardir}`);
            fs.mkdirSync(pardir, {recursive: true});
            this.log(`create file ${rule.putFileOnce}`);
            this.log()
            this.log("```");
            this.log(yaml.safeDump(rule.contentYml, {skipInvalid: true}));
            this.log("```");
            fs.writeFileSync(rule.putFileOnce, yaml.safeDump(rule.contentYml, {skipInvalid: true}));
          } else if (rule.contentJson) {
            this.log("");
            this.log(`create dir ${pardir}`);
            fs.mkdirSync(pardir, {recursive: true});
            this.log(`create file ${rule.putFileOnce}`);
            this.log("```");
            this.log(JSON.stringify(rule.contentJson, null, ' '));
            this.log("```");
            fs.writeFileSync(rule.putFileOnce, JSON.stringify(rule.contentJson));
          } else if (rule.content) {
            this.log("");
            this.log(`create dir ${pardir}`);
            fs.mkdirSync(pardir, {recursive: true});
            this.log(`create file ${rule.putFileOnce}`);
            this.log("```");
            this.log(rule.content);
            this.log("```");
            fs.writeFileSync(rule.putFileOnce, rule.content);
          } else {
            this.log("");
            this.log(`create dir ${pardir}`);
            fs.mkdirSync(pardir, {recursive: true});
            this.log(`create file ${rule.putFileOnce}`);
            this.log('');
            fs.writeFileSync(rule.putFileOnce, '');
          }
        }
      }
    }
  }

  _cleanPromptQuestions() {
    this.promptQuestions = this.promptQuestions.filter(q => {
      if (q.if) {
        if (q.if.fileNotFound) {
          const fileNotFound = !fs.existsSync(q.if.fileNotFound);
          if (!fileNotFound) {
            this.log(`skipping prompt "${q.message}" because "${q.if.fileNotFound}" already exist`)
          }
          return fileNotFound;
        }
      }
      return true;
    });
  }

  async promise() {
    if (!this.skipAutoconf) {
      if (!this.skipPrompt) {
        this.log("autoconf with prompt");

        // exclude questions if files already exist
        this._cleanPromptQuestions();

        // run prompt
        return inquirer.prompt(this.promptQuestions).then(answers => {
          this.answers = answers;
          this.config = this.configTransformer(this, answers);
          this.generatorRules = this.generatorFunction(this);
          return Promise.resolve(this._runRules());
        });
      } else {
        this.log("autoconf without prompt");
        this.config = this.defaultConfig;
        this.generatorRules = this.generatorFunction(this);
        return Promise.resolve(this._runRules());
      }
    } else {
      this.log("skip autoconf");
    }
  }

  run() {
    if (!this.skipAutoconf) {
      this
      .promise()
      .then(() => {
        this.log(`success configuring ${this.serviceName} service (${this.npmModuleName})`);
      })
      .catch((err) => {
        this.log(`error configuring ${this.serviceName} service (${this.npmModuleName})`);
        this.logerr(err);
      }); 
    } else {
      this.log("skip autoconf");
    }
  }


}

module.exports = (name) => new Autoconf(name);