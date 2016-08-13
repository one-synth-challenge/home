var u = require('../util');

module.exports = u.resolve((db, session, user, app) => (router) => {
  /**
   * Connects the account to a currently logged in user or creates a new
   * account, then creates a session and returns the authentication info
   */
  router.put('/login/:accountProvider', (req, res) => {
    const acct = req.body || {};
    const acctId = '' + acct.id;
    const acctProvider = req.params.accountProvider;
    db.ExternalAccount.findOne({ where:{ provider: {$eq: acctProvider}, accountId: {$eq: acctId}}})
    .then(link => {
      if (!link) {
        var fetchUser;
        if (user.current) {
          fetchUser = Promise.resolve(user.current);
        } else {
          fetchUser = db.User.create({
            username: acct.name,
          });
        }
        return fetchUser.then(usr => db.ExternalAccount.create({
          userId: usr.id,
          provider: acctProvider,
          accountId: acctId,
          authToken: acct.authToken,
        }))
      }
      return Promise.resolve(link);
    })
    .then(acctLink => {
      return db.User.findOne({where:{id:{$eq:acctLink.userId}}})
        .then(user => session.begin(user))
        .then(authInfo => user.attachExternalAccounts(authInfo))
        .then(authInfo => res.json(authInfo));
    });
  });

  /**
   * Explicitly connects an account
   */
  router.put('/connect/:accountProvider', (req, res) => {
    const acct = req.body || {};
    const acctId = '' + acct.id;
    const acctProvider = req.params.accountProvider;
    var createAccountOrLink;
    if (user.current) {
      createAccountOrLink = db.ExternalAccount.findOne({ where:{
        provider: {$eq: acctProvider},
        accountId: {$eq: acctId},
        userId: {$eq: user.current.id}
      }})
      .then(link => {
        if (!link) {
          return fetchUser.then(usr => db.ExternalAccount.create({
            userId: usr.id,
            provider: acctProvider,
            accountId: acctId,
            authToken: acct.authToken,
          }))
        }
        return link;
      });
    } else {
      createAccountOrLink = db.ExternalAccount
      .findOne({ where:{
        provider: {$eq: acctProvider},
        accountId: {$eq: acctId},
      }})
      .then(link => {
        if (link) {
          throw new Error(`The ${acctProvider} account is already associated with a user.`);
        }
        return db.User.create({
            username: acct.name,
          })
          .then(usr => db.ExternalAccount.create({
            userId: usr.id,
            provider: acctProvider,
            accountId: acctId,
            authToken: acct.authToken,
          }));
      });
    }
    createAccountOrLink.then(acctLink => {
      return db.User.findOne({where:{id:{$eq:acctLink.userId}}})
        .then(usr => session.begin(usr))
        .then(authInfo => {
          return user.attachExternalAccounts(authInfo);
        })
        .then(authInfo => res.json(authInfo));
    });
  });

  router.put('/create', (req, res) => {
  });
});
