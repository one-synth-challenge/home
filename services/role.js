var permission = require('./permission');
module.exports = {
  SysAdmin: [],
  Admin: [ permission.Admin ],
  Owner: [ permission.Manage ],
  User: [ permission.Submit ],
};
