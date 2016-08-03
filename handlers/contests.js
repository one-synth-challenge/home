var u = require('../util');

module.exports =  (router, app) => {
  u.resolve((db, session) => {

    router.get('/', (req, res) => {
      db.Contest.findAll()
        .then(contests => res.json(contests));
    });

    /**
     * Connects the account to a currently logged in user or creates a new
     * account, then creates a session and returns the authentication info
     */
    router.put('/', (req, res) => {
      app.authenticate()
        .then(user => res.json(user))
        .catch(err => app.sendError(404, err));
      console.log('connect hit');
      const contest = req.body || {};
    });

    router.delete('/', (req, res) => {
      var username = req.body.username;
      var password = req.body.password;
      session.authenticate(username, password)
        .then(authInfo => attachExternalAccounts(authInfo))
        .then(authInfo => res.json(authInfo));
    });
  });
};
