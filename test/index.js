var fs = require('fs');
var path = require('path');
var helpers = require('yeoman-test');
var assert = require('yeoman-assert');

describe('donejs-travis-to-heroku', function() {
  describe('without .travis.yml', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir()
        .on('end', done);
    });

    it('does not write travis.yml', function() {
      assert.noFile('.travis.yml');
    });
  });

  describe('with .travis.yml but no Procfile', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
        })
        .on('end', done);
    });

    it('does not write travis.yml', function() {
      assert.noFileContent('.travis.yml', /deploy:/);
    });
  });

  describe('with Procfile but travis.yml has deploy settings', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_deploy_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
          fs.copyFileSync(
            path.join(__dirname, 'procfile_fixture'),
            path.join(dir, 'Procfile')
          );
        })
        .on('end', done);
    });

    it('does not override travis.yml deploy settings', function() {
      assert.fileContent('.travis.yml', /app: my-awesome-app/);
    });
  });

  describe('with Procfile but travis.yml has before_deploy steps', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_before_deploy_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
          fs.copyFileSync(
            path.join(__dirname, 'procfile_fixture'),
            path.join(dir, 'Procfile')
          );
        })
        .on('end', done);
    });

    it('does not override travis.yml before_deploy steps', function() {
      assert.fileContent('.travis.yml', /echo 'ready\?'/);
    });
  });

  describe('with Procfile and travis.yml without deployment stuff', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .withPrompts({
          githubUsername: 'foo',
          githubAppName: 'my-app',
          herokuAppName: 'place-my-order-1234',
          herokuAuthToken: '**************'
        })
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_fixture.yml'),
            path.join(dir, '.travis.yml')
          );

          fs.copyFileSync(
            path.join(__dirname, 'procfile_fixture'),
            path.join(dir, 'Procfile')
          );
        })
        .on('ready', function(generator) {
          // stub helper that reads the most recently created heroku app name
          generator._getMostRecentHerokuAppName = function() {
            return Promise.resolve('');
          };
          generator._getPromptDefaults = function() {
            return Promise.resolve({ parsedRepo: {} });
          };
          generator._encryptHerokuToken = function() {
            return Promise.resolve('ENCRYPTED_TOKEN');
          };
        })
        .on('end', done);
    });

    it('writes encryped heroku token', function() {
      assert.fileContent('.travis.yml', /api_key: ENCRYPTED_TOKEN/);
    });

    it('writes deploy settings with app name from prompt', function() {
      assert.fileContent('.travis.yml', /deploy:/);
      assert.fileContent('.travis.yml', /app: place-my-order-1234/);
    });

    it('writes before_deploy steps', function() {
      assert.fileContent('.travis.yml', /before_deploy:/);
      assert.fileContent('.travis.yml', /node build/);
      assert.fileContent('.travis.yml', /git add dist\/ --force/);
    });
  });
});
