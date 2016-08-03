const hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result
}

const randomString = function randomString(length = 8, chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

const hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

const globalContext = {};
const makeContextFunction = (name) => {
  var rand;
  do {
    rand = randomString();
  } while(rand in globalContext);
  // see: http://marcosc.com/2012/03/dynamic-function-names-in-javascript/
  var fn = new Function("return function context_"+name+"_"+rand+"(contextVars, value, args, next){try{contextVars['"+rand+"']=value;return next.apply(next, args)}finally{contextVars['"+rand+"']=null}}")();
  fn.varName = name;
  fn.lookup = rand;
  return (value, args, next) => {
    return fn(globalContext, value, args, next);
  };
}

const findContextVarsFromCaller = function findContextVarsFromCaller() {
  var contextVars = {};
  var top = findContextVarsFromCaller.caller;
  var max = 100;
  var now = 0;
  while (top) {
    if (top.lookup) {
      // First found is more local
      if (!(top.varName in contextVars)) {
        contextVars[top.varName] = globalContext[top.lookup];
      }
    }
    now++;
    if (now > max) break;
    top = top.caller;
  }
  return contextVars;
}

const findContextFromCallStack = () => {
  var contextVars = {};
  var stack = '' + new Error().stack;
  /context_(\w+)_(\w+)/g.exec(stack).forEach((match, idx, groups) => {
    // First found is more local
    if (!(top.varName in contextVars)) {
      contextVars[groups[1]] = globalContext[groups[2]];
    }
  });
  return contextVars;
}


// for fun
//var fn = makeContextFunction('currentUser');
//fn("george", ['some', 'args'], (...args) => {
//  console.log(findContextVarsFromCaller());
//  console.log(findContextFromCallStack());
//})
