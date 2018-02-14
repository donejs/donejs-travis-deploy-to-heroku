var yaml = require('js-yaml');
var last = require('lodash/last');
var sortBy = require('lodash/sortBy');
var Generator = require('yeoman-generator');
var getNameFromConfig = require('./get-name-from-config');

module.exports = Generator.extend({
  constructor: function constructor(args, opts) {
    Generator.call(this, args, opts);
    this.travisConfigPath = this.destinationPath('.travis.yml');
    this.herokuConfigPath = this.destinationPath('Procfile');
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

      getNameFromConfig(this.destinationPath())
        .then(function(name) {
          return name ? name : self._getMostRecentHerokuAppName();
        })
        .then(function(name) {
          return self.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'What is the name of the Heroku application?',
              default: name ? name : null
            }
          ]);
        })
        .then(function(answers) {
          self.props = answers;
          done();
        });
    }
  },

  writing: function writing() {
    if (!this.abort) {
      this.log('Adding deploy settings to ' + this.travisConfigPath);
      this.travisYml.deploy = this.deploySettings;
      this.travisYml.deploy.app = this.props.name;
      this.travisYml.before_deploy = this.beforeDeploySteps; //jshint ignore:line

      this.fs.write(this.travisConfigPath, yaml.safeDump(this.travisYml));
    }
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
    var apps = '';

    return new Promise(function(resolve) {
      var timeout;

      var child = self.spawnCommand('heroku', ['apps', '--json'], {
        stdio: 'pipe'
      });

      var resolveEmpty = function resolveEmpty() {
        clearTimeout(timeout);
        resolve([]);
      };

      // resolve the promise if the process is taking too long,
      // the user might be logged out
      timeout = setTimeout(resolveEmpty, 2000);

      child.stdout.on('data', function(data) {
        apps += data;
      });

      child.on('exit', function(code) {
        if (code === 0) {
          try {
            resolve(JSON.parse(apps));
          } catch (e) {
            resolveEmpty();
          }
        } else {
          resolveEmpty();
        }
      });

      child.on('error', resolveEmpty);
    });
  }
});
