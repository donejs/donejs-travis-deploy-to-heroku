var path = require('path');

module.exports = function getNameFromConfig(rootPath) {
  return new Promise(function(resolve) {
    var name;

    try {
      var config = require(path.join(rootPath, '.yo-rc.json'));
      name = config['donejs-heroku'] && config['donejs-heroku'].herokuAppName;
    } catch (e) {}

    resolve(name);
  });
};
