var yaml = require('js-yaml');
var last = require('lodash/last');
var trim = require('lodash/trim');
var sortBy = require('lodash/sortBy');
var encrypt = require('travis-encrypt');
var isObject = require('lodash/isObject');
var Generator = require('yeoman-generator');
var parseGithubUrl = require('parse-github-url');
var getNameFromConfig = require('./get-name-from-config');

module.exports = Generator.extend({
  constructor: function constructor(args, opts) {
    Generator.call(this, args, opts);
    this.timeoutDelay = 2000;
    this.travisConfigPath = this.destinationPath('.travis.yml');
    this.herokuConfigPath = this.destinationPath('Procfile');
    this.pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
    this.deploySettings = {
      skip_cleanup: true, // jshint ignore:line
      provider: 'heroku'
    };
    this.beforeDeploySteps = [
      'git config --global user.email "me@example.com"',
      'git config --global user.name "deploy bot"',
      'node build',
      'git add dist/ --force',
      'git commit -m "Updating build."'
    ];
  },

  initializing: function initializing() {
    var travisConfigExists = this.fs.exists(this.travisConfigPath);
    var herokuConfigExists = this.fs.exists(this.herokuConfigPath);

    if (!travisConfigExists) {
      this.abort = true;
      this.log.error(
        'Travis config file not found!. Please run "donejs add travis" first.'
      );
      return;
    }

    this.travisYml = yaml.safeLoad(this.fs.read(this.travisConfigPath));
    if (this.travisYml.deploy) {
      this.abort = true;
      this.log.error(
        'There are deploy settings in your .travis.yml already. ' +
          'Please delete the "deploy" section before running this command.'
      );
      return;
    }
    if (this.travisYml.before_deploy) { //jshint ignore:line
      this.abort = true;
      this.log.error(
        'There are before_deploy steps in your .travis.yml already. ' +
          'Please delete the "before_deploy" section before running this command.'
      );
      return;
    }

    if (!herokuConfigExists) {
      this.abort = true;
      this.log.error(
        'Heroku Procfile not found!. Please run "donejs add heroku" first.'
      );
      return;
    }
  },

  prompting: function prompting() {
    if (!this.abort) {
      var self = this;
      var done = self.async();

      return self
        ._getPromptDefaults()
        .then(function(defaults) {
          var repo = defaults.parsedRepo;
          return self.prompt([
            {
              type: 'input',
              name: 'githubUsername',
              message: "What's your GitHub username?",
              default: repo.owner ? repo.owner : null
            },
            {
              type: 'input',
              name: 'githubAppName',
              message: "What's your GitHub application name?",
              default: repo.name ? repo.name : null
            },
            {
              type: 'input',
              name: 'herokuAppName',
              message: "What's your Heroku application name?",
              default: defaults.appName ? defaults.appName : null
            },
            {
              type: 'input',
              name: 'herokuAuthToken',
              message: "What's your Heroku Auth Token?",
              default: defaults.herokuToken ? defaults.herokuToken : null
            }
          ]);
        })
        .then(function(answers) {
          self.props = answers;
          done();
        })
        .catch(done);
    }
  },

  writing: function writing() {
    if (!this.abort) {
      var done = this.async();
      var props = this.props;

      this._encryptHerokuToken()
        .then(function(encrypted) {
          /* jshint camelcase: false */
          this.log('Adding deploy settings to ' + this.travisConfigPath);

          this.travisYml.deploy = this.deploySettings;
          this.travisYml.deploy.app = props.herokuAppName;
          this.travisYml.deploy.api_key = encrypted;
          this.travisYml.before_deploy = this.beforeDeploySteps;

          this.fs.write(this.travisConfigPath, yaml.safeDump(this.travisYml));
          done();
        }.bind(this), done);
    }
  },

  // private helpers
  _encryptHerokuToken: function encryptHerokuToken() {
    var props = this.props;

    this.log('Encrypting Heroku Auth Token...');
    return new Promise(function(resolve, reject) {
      encrypt({
        repo: `${props.githubUsername}/${props.githubAppName}`,
        data: props.herokuAuthToken
      }, function(err, blob) {
        if (err) {
          reject(err);
        } else {
          resolve(blob);
        }
      });
    });
  },

  _getPromptDefaults: function getPromptDefaults() {
    var self = this;

    var appNamePromise = getNameFromConfig(this.destinationPath()).then(
      function(name) {
        return name ? name : self._getMostRecentHerokuAppName();
      }
    );

    return Promise.all([
      appNamePromise,
      self._getParsedGitHubRepo(),
      self._getHerokuAuthToken()
    ]).then(function(defaults) {
      return {
        appName: defaults[0],
        parsedRepo: defaults[1],
        herokuToken: defaults[2]
      };
    });
  },

  // https://docs.npmjs.com/files/package.json#repository
  _getParsedGitHubRepo: function getParsedGitHubRepo() {
    var repo = this.pkg.repository;
    return parseGithubUrl(isObject(repo) ? repo.url : repo);
  },

  _getHerokuAuthToken: function getHerokuAuthToken() {
    var self = this;

    return new Promise(function(resolve) {
      var timeout;
      var token = '';

      var resolveWithToken = function resolveEmpty() {
        clearTimeout(timeout);
        resolve(trim(token));
      };

      // reject the promise if the process is taking too long,
      // the user might be logged out
      timeout = setTimeout(resolveWithToken, self.timeoutDelay);

      var child = self.spawnCommand('heroku', ['auth:token'], {
        stdio: 'pipe'
      });

      child.stdout.on('data', function(data) {
        token += data;
      });

      child.on('exit', resolveWithToken);
      child.on('error', resolveWithToken);
    });
  },

  _getMostRecentHerokuAppName: function getMostRecentHerokuAppName() {
    return this._getHerokuApps()
      .then(function(apps) {
        return sortBy(apps, function(app) {
          return new Date(app.created_at); // jshint ignore:line
        });
      })
      .then(function(sorted) {
        return sorted.length ? last(sorted).name : '';
      });
  },

  _getHerokuApps: function getHerokuApps() {
    var self = this;

    return new Promise(function(resolve) {
      var timeout;
      var apps = '';

      var child = self.spawnCommand('heroku', ['apps', '--json'], {
        stdio: 'pipe'
      });

      var resolveWithApps = function resolveEmpty() {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(apps));
        } catch (e) {
          resolve([]);
        }
      };

      // resolve the promise if the process is taking too long,
      // the user might be logged out
      timeout = setTimeout(resolveWithApps, self.timeoutDelay);

      child.stdout.on('data', function(data) {
        apps += data;
      });

      child.on('exit', resolveWithApps);
      child.on('error', resolveWithApps);
    });
  }
});
