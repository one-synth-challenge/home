var path = require('path');
var fs = require('fs');
var domain = require('domain');

exports.sha256 = function sha256(password) {
  var crypto = require('crypto');
  var sha256 = crypto.createHash('sha256').update(password).digest("hex");
  return sha256;
};

exports.random = function random(bits) {
  return new Promise((resolve, reject) => {
    require('crypto').randomBytes(bits || 48, function(err, buffer) {
      if (err) {
        reject(err);
      } else {
        resolve(buffer.toString('hex'));
      }
    });
  });
};

exports.putInContext = function putInContext(varMapping, next) {
  var wrap = false;
  var current = process.domain;
  if (!current) {
    wrap = true;
    current = domain.create();
    current.on('error', (err) => {
      console.error('Caught error!', err);
    });
  }
  for (var name in varMapping) {
    var value = varMapping[name];
    current.add(value);
    current[name] = value;
  }
  if(wrap) {
    current.run(next);
  } else {
    next();
  }
}

exports.getFromContext = function getFromContext(name) {
  var value = process.domain[name];
  if (!value) {
    console.log('no context value for', name);
    var deferred = name+'$deferred';
    value = process.domain[deferred];
    if (value) {
      console.log('no context value for', name, 'found deferred');
      value = value(); // TODO this still may end up circular
      process.domain.add(value);
      process.domain[name] = value;
      //process.domain.remove(deferred);
    } else {
      console.log('no context value for', name, ', no deferred found');
    }
  }
  return value;
}

exports.requireDir = function requireDir(dir, cb) {
  exports.readDir(dir, (file, filePath) => {
    try {
      cb(file, require(filePath));
    } catch (e) {
      console.error(e);
      throw e;
    }
  });
}

/**
 * Returns each file in a dir with a relative require path
 */
exports.readDir = function readDir(dir, cb) {
  const normalizedPath = path.join(__dirname, dir);
  fs.readdirSync(normalizedPath).forEach(function(file) {
      cb(file, "./" + dir + "/" + file);
  });
}

/**
 * Injects into the 'this' object
 */
exports.inject = function inject(dependencies, obj) {
  for (var key in dependencies) {
    var dep = getFromContext(key);
    obj.key = dep;
  }
  return obj;
}

/**
 * Calls fn as a function with the dependencies.
 * NOTE: use shorthand syntax, don't use default values... e.g. this works with
 * functions defined like: (db, user) => { ... }
 */
exports.resolve = function resolve(fn) {
  var dependencies = exports.getFunctionArgumentNames(fn);
  var resolved = [];
  for (var i = 0; i < dependencies.length; i++) {
    var key = dependencies[i];
    var dep = exports.getFromContext(key);
    resolved.push(dep);
  }
  return fn.apply(fn, resolved);
}

const STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
exports.getFunctionArgumentNames = function getFunctionArgumentNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null)
     result = [];
  return result;
}

