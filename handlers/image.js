var u = require('../util');

module.exports = u.resolve((db) => (router, app) => {
  router.get('/:id', (req, res) => {
    db.Image.findOne({where:{id:{$eq: req.params.id}}})
      .then(img => {
        //img = img.dataValues ? img.dataValues : img;
        res.setHeader('Content-Type', img.type);
        res.end(img.data, 'binary');
      })
      .catch(err => app.sendError(404, err));
  });
});
