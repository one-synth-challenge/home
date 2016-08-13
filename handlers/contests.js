var u = require('../util');

module.exports = u.resolve((db, user, contest, permission) =>  (router, app) => {
    router.get('/', (req, res) =>
      contest.findPublic()
      .then(res.json)
    );

    router.get('/my', (req, res) =>
      contest.findForCurrentUser(permission.Manage)
      .then(it => {
        res.json(it);
      })
    );

    router.get('/:id', (req, res) =>
      contest.findById(req.params.id)
      .then(res.json)
    );

    router.put('/', (req, res) =>
      contest.create(req.body)
      .then(res.json)
    );

    router.delete('/:id', (req, res) => {
      contest.delete(req.params.id)
      .then(() => res.end());
    });
  }
);
