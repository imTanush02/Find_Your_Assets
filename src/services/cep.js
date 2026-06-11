// ══════════════════════════════════════════
//  CEP Environment Detection
// ══════════════════════════════════════════

let _env = null;

export function detectEnvironment() {
  if (_env) return _env;

  let isCEP = false;
  let cs = null;
  let nodeModules = {};

  // Try loading Node.js modules (available in CEP with --enable-nodejs)
  try {
    nodeModules = {
      fs: window.cep_node.require('fs'),
      path: window.cep_node.require('path'),
      https: window.cep_node.require('https'),
      http: window.cep_node.require('http'),
      os: window.cep_node.require('os'),
      Buffer: window.cep_node.Buffer,
    };
    isCEP = true;
  } catch (e1) {
    try {
      /* global require */
      nodeModules = {
        fs: require('fs'),
        path: require('path'),
        https: require('https'),
        http: require('http'),
        os: require('os'),
        Buffer: (typeof Buffer !== 'undefined') ? Buffer : null,
      };
      isCEP = true;
    } catch (e2) {
      isCEP = false;
    }
  }

  // Try creating CSInterface
  try {
    /* global CSInterface */
    cs = new CSInterface();
  } catch (e) {
    cs = null;
  }

  _env = { isCEP, cs, ...nodeModules };
  return _env;
}

/**
 * Promise wrapper for cs.evalScript
 */
export function evalScript(script) {
  const { cs } = detectEnvironment();
  return new Promise((resolve, reject) => {
    if (!cs) {
      reject(new Error('CSInterface not available'));
      return;
    }
    cs.evalScript(script, (result) => {
      if (result === 'EvalScript error.') {
        reject(new Error('ExtendScript error'));
      } else {
        resolve(result);
      }
    });
  });
}
