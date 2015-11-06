/*
Helper class that will increase build version of the app on each build.
This way we will forse main plugin to install www folder from the assets.
Otherwise - it will use the cached version.
*/
(function () {

  var path = require('path'),
    plist = require('plist'),
    microtime = require('microtime'),
    fs = require('fs'),
    xmlHelper = require('./xmlHelper.js'),
    logger = require('./logger.js'),
    IOS_PLATFORM = 'ios',
    ANDROID_PLATFORM = 'android',
    _iosPlistFile;

  module.exports = {
    increaseBuildVersion : increaseBuildVersion
  };

  // region Public API

  /**
   * Increase build version of the app.
   *
   * @param {Object} cordovaContext - cordova's context
   */
  function increaseBuildVersion(cordovaContext) {
    var platforms = cordovaContext.opts.platforms;

    // increase only for the platforms we are building for right now
    platforms.forEach(function(platform) {
      switch (platform) {
        case IOS_PLATFORM: {
          increaseBuildVersionForIos(cordovaContext);
          break;
        }
        case ANDROID_PLATFORM: {
          increaseBuildVersionForAndroid(cordovaContext);
          break;
        }
        default: {
          break;
        }
      }
    });
  }

  // endregion

  // region Android update

  /**
   * Increase value of the android:versionCode of the app.
   *
   * @param {Object} cordovaContext - cordova's context
   */
  function increaseBuildVersionForAndroid(cordovaContext) {
    var androidManifestFilePath = path.join(cordovaContext.opts.projectRoot, 'platforms', ANDROID_PLATFORM, 'AndroidManifest.xml'),
      manifestFileContent = xmlHelper.readXmlAsJson(androidManifestFilePath);

    if (!manifestFileContent) {
      logger.error('AndroidManifest.xml file is not found! Can\'t increase build version for android.');
      return;
    }

    var currentVersion = parseInt(manifestFileContent['manifest']['$']['android:versionCode']),
      newVersion = generateNewBuildVersion(currentVersion);

    manifestFileContent['manifest']['$']['android:versionCode'] = newVersion.toString();

    var isUpdated = xmlHelper.writeJsonAsXml(manifestFileContent, androidManifestFilePath);
    if (isUpdated) {
      logger.info('Android version code is set to ' + newVersion);
    }
  }

  // endregion

  // region iOS update

  /**
   * Increase CFBundleVersion of the app.
   *
   * @param {Object} cordovaContext - cordova context
   */
  function increaseBuildVersionForIos(cordovaContext) {
    var plistContent = readIosPlist(cordovaContext);
    if (!plistContent) {
      logger.error('Failed to read iOS project\'s plist file. Can\'t increase build version for iOS.');
      return;
    }

    var currentVersion = parseInt(plistContent['CFBundleVersion']),
      newVersion = generateNewBuildVersion(currentVersion);

    plistContent['CFBundleVersion'] = newVersion.toString();
    plistContent['CFBundleShortVersionString'] = newVersion.toString();

    var isUpdated = updateIosPlist(cordovaContext, plistContent);
    if (isUpdated) {
      logger.info('iOS bundle version set to ' + newVersion);
    }
  }

  /**
   * Read iOS project's plist file.
   * We need it to set new bundle version of the app.
   *
   * @param {Object} cordovaContext - cordova context
   * @return {Object} plist file content as JSON object
   */
  function readIosPlist(cordovaContext) {
    var pathToIosConfigPlist = pathToIosPlistFile(cordovaContext),
      plistFileContent;

    try {
      plistFileContent = fs.readFileSync(pathToIosConfigPlist, 'utf8');
    } catch (err) {
      logger.error(err);
      return null;
    }

    return plist.parse(plistFileContent);
  }

  /**
   * Save new data to the plist file.
   *
   * @param {Object} cordovaContext - cordova context
   * @param {Object} plistContent - new plist data
   * @return {Boolean} true - if content is saved; otherwise - false
   */
  function updateIosPlist(cordovaContext, plistContent) {
    var newPlist = plist.build(plistContent),
      pathToPlistFile = pathToIosPlistFile(cordovaContext);

    try {
      fs.writeFileSync(pathToPlistFile, newPlist, 'utf8');
    } catch (err) {
      logger.error(err);
      return false;
    }

    return true;
  }

  /**
   * Get file path to iOS plist.
   *
   * @param {Object} cordovaContext - cordova context
   * @return {String} path to plist
   */
  function pathToIosPlistFile(cordovaContext) {
    if (_iosPlistFile) {
      return _iosPlistFile;
    }

    var projectName = getProjectName(cordovaContext);
    if (!projectName) {
      logger.error('Project\'s name is unknown. Can\'t increase build version for iOS.');
      return null;
    }

    _iosPlistFile = path.join(cordovaContext.opts.projectRoot, 'platforms', IOS_PLATFORM, projectName, projectName + '-Info.plist');

    return _iosPlistFile;
  }

  /**
   * Get name of the project from the config.xml.
   *
   * @param {Object} cordovaContext - cordova context
   * @return {String} name of the project
   */
  function getProjectName(cordovaContext) {
    var projectsConfigXmlFilePath = path.join(cordovaContext.opts.projectRoot, 'config.xml'),
      projectsConfigXml = xmlHelper.readXmlAsJson(projectsConfigXmlFilePath);

    if (!projectsConfigXml) {
      logger.error('Project\'s config.xml file is not found!');
      return null;
    }

    return projectsConfigXml['widget']['name'][0];
  }

  // endregion

  /**
   * Generate new build version number of the app.
   *
   * @param {Integer} currentVersion - current version of the app
   * @return {Integer} new build version number
   */
  function generateNewBuildVersion(currentVersion) {
    var newVersion = parseInt(microtime.nowDouble());
    if (currentVersion > newVersion) {
      return currentVersion+1;
    } else {
      return newVersion;
    }
  }

})();