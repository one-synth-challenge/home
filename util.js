var path = require('path');
var fs = require('fs');
var domain = require('domain');
const isDebugging = process.env.IS_DEBUG || false;

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

var deferredContext = {};
var globalContext = {};


/**
 * Rather than providing an instance immediately, it makes sense to
 * provide a provider so resolutions can happen when the variable is
 * requiested.
 */
exports.putInContextDynamic = function putInContextDynamic(key, provider) {
  deferredContext[key] = provider;
};

/**
 * Providing a lazy context var, it will be instantiated when first requested
 */
exports.putInContextLazy = function putInContextLazy(key, provider) {
  deferredContext[key] = () => {
    var obj = provider();
    globalContext[key] = obj;
    return obj;
  };
};

exports.executeInLocalContext = function(next) {
  if (process && process.domain) {
    next();
  } else {
    var d = domain.create();
    try {
      d.run(next);
      d.on('error', (e) => {
        // The error won't crash the process, but what it does is worse!
        // Though we've prevented abrupt process restarting, we are leaking
        // resources like crazy if this ever happens.
        // This is no better than process.on('uncaughtException')!
        console.error('Domain execution error', e);
      });
    } catch(e) {
      console.error('Domain run error', e);
    }
  }
}

/**
 * Puts all key/value mappings into context, invokes the
 * callback to proceed with execution
 */
exports.putInContext = function putInContext(varMapping) {
  if (process && process.domain) {
    for (var name in varMapping) {
      var value = varMapping[name];
      process.domain.add(value);
      process.domain[name] = value;
    }
  } else {
    for (var name in varMapping) {
      globalContext[name] = varMapping[name];
    }
  }
}

exports.getFromContext = function getFromContext(name) {
  var value;
  if (process && process.domain) {
    value = process.domain[name];
  }
  if (!value) {
    value = globalContext[name];
  }
  if (!value) {
    value = deferredContext[name];
    if (value) {
      value = value();
    }
  }
  if (isDebugging && !value) {
    console.log('no context value for', name);
  }
  return value;
}

exports.requireDir = function requireDir(dir, cb) {
  exports.readDir(dir, (file, filePath) => {
    try {
      cb(file, require(filePath));
    } catch (e) {
      console.error("requireDir error", e);
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

/// TRY manual way, since domains are deprecated and don't work
try {
  var ctx = require('./context');
  var alt = Object.assign({}, module.exports, {
    putInContext: function(vars, cb) {
      try {

      } finally {

      }
    },
    getFromContext: function(v) {

    }
  });
} catch(e) {
  console.log(e);
}
