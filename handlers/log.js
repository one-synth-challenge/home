var u = require('../util');

module.exports = u.resolve((user, session) => (router, app) => {
  router.get('/in', (req, res) => {
    user.authenticate()
      .then(u => res.json(u))
      .catch(err => app.sendError(404, err));
  });

  router.post('/in', (req, res) => {
      var username = req.body.username;
      var password = req.body.password;
      session.authenticate(username, password)
        .then(authInfo =>
          user.attachExternalAccounts(authInfo))
        .then(res.json);
  });

  router.post('/out/:sessionId', (req, res) => {
    var sessionId = req.params.sessionId;
      session.destroy(sessionId)
        .then(() => res.end());
  });
});
