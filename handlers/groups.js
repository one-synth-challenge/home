var u = require('../util');

module.exports = u.resolve((db, user, session, group) => (router) => {
  router.get('/', (req, res) => {
    group.findPublic()
      .then(res.json);
  });

  router.get('/my', (req, res) => {
    user.authenticate()
      .then(u => group.findManaged(u))
      .then(res.json);
  });

  router.get('/:id', (req, res) => {
    group.findById(req.params.id)
      .then(res.json);
  });

  router.put('/', (req, res) => {
    group.create(req.body)
      .then(res.json);
  });

  router.post('/:groupid', (req, res) => {
    group.create(req.body)
      .then(res.json);
  });
});
