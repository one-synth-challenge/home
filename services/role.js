var permission = require('./permission');
module.exports = {
  SysAdmin: [],
  Owner: [ permission.Manage, permission.Submit, permission.Modify ],
  Manager: [ permission.Manage, permission.Submit ],
  User: [ permission.Submit ],

  roleKeys: () => {
    return Object.keys(module.exports).filter(k =>
      ['all', 'get', 'roleKeys', 'findById', 'forPermission'].indexOf(k) < 0);
  },

  all: () => {
    return module.exports.roleKeys().map(k =>
      module.exports[k]);
  },

  get: (permission) => {
    return module.exports.all()
      .filter( it =>
        it.permissions.indexOf(permission) >= 0);
  },

  forPermission: (permission) => {
    return Promise.resolve(module.exports.get(permission));
  },

  findById: (id) => {
    return Promise.resolve(module.exports.all().filter(r =>
      r.id === id));
  }
};
