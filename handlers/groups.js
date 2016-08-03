var u = require('../util');

module.exports = u.resolve((db, session, app) => (router) => {
  router.get('/', (req, res) => {
    db.Group.findAll()
      .then(groups => res.json(groups));
  });
});
