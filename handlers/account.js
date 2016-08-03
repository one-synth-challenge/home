var u = require('../util');

module.exports = (router, app) => {
  u.resolve((db, session) => {

    router.get('/', (req, res) => {
      app.authenticate()
        .then(user => res.json(user))
        .catch(err => app.sendError(404, err));
    });

    function attachExternalAccounts(authInfo) {
      return db.ExternalAccount.findAll({ where:{ userId: {$eq: authInfo.userId }}})
        .then(externalAccounts => {
          authInfo.externalAccounts = externalAccounts.reduce((out, item) => (out[item.provider] = item) && out, {});
          return authInfo;
        });
    }

    /**
     * Connects the account to a currently logged in user or creates a new
     * account, then creates a session and returns the authentication info
     */
    router.put('/connect/:accountProvider', (req, res) => {
      console.log('connect hit');
      const acct = req.body || {};
      const acctId = '' + acct.id;
      const acctProvider = req.params.accountProvider;
      u.resolve((user) => {
        db.ExternalAccount.findOne({ where:{ provider: {$eq: acctProvider}, accountId: {$eq: acctId}}})
        .then(link => {
          var fetchUser;
          if (user) {
            fetchUser = Promise.resolve(user);
          } else {
            fetchUser = db.User.create({
              username: acct.name,
            });
          }
          if (!link) {
            return fetchUser.then(usr => db.ExternalAccount.create({
              userId: usr.id,
              provider: acctProvider,
              accountId: acctId,
              authToken: acct.authToken,
            }))
          }
          return fetchUser.then(() => link);
        })
        .then(acctLink => {
          return db.User.findOne({where:{id:{$eq:acctLink.userId}}})
            .then(user => session.begin(user))
            .then(authInfo => attachExternalAccounts(authInfo))
            .then(authInfo => res.json(authInfo));
        })
      });
    });

    router.post('/authenticate', (req, res) => {
      var username = req.body.username;
      var password = req.body.password;
      session.authenticate(username, password)
        .then(authInfo =>
          attachExternalAccounts(authInfo))
        .then(authInfo =>
          res.json(authInfo));
    });

    router.put('/create', (req, res) => {
    });
  });
};
