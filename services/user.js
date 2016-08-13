var u = require('../util');

module.exports = u.resolve((db, auth, session) => new class UserService {
	get current() {
    return u.getFromContext('currentUser');
  }

  authenticate() {
    return auth.enticate();
  }

  authorize(groupId, permission) {
    return auth.orize(groupId, permission);
  }

  attachExternalAccounts(authInfo) {
    return db.ExternalAccount.findAll({ where:{ userId: {$eq: authInfo.userId }}})
      .then(externalAccounts => {
        authInfo.externalAccounts = externalAccounts.reduce((out, item) => (out[item.provider] = item) && out, {});
        return authInfo;
      });
  }
});
