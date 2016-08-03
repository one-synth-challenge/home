var u = require('../util');

module.exports = u.resolve((db, session) => (router, app) => {
  router.all('/*', (req, res, next) =>
    app.authenticate()
      .then(() => next()));

  router.get('/', (req, res) => {
    res.json(Object.keys(db).filter(k => db[k].sync));
  });

  const excludeAttributes = {
    'database': true,
    'Model': true,
  };
  const normalizedTypes = {
  };
  normalizedTypes[db.normalizeDataType(db.DataTypes.UUID)] = 'uuid';
  normalizedTypes[db.normalizeDataType(db.DataTypes.DATE)] = 'date';
  normalizedTypes[db.normalizeDataType(db.DataTypes.TEXT)] = 'text';
  normalizedTypes[db.normalizeDataType(db.DataTypes.STRING)] = 'string';
  normalizedTypes[db.normalizeDataType(db.DataTypes.INTEGER)] = 'int';
  normalizedTypes[db.normalizeDataType(db.DataTypes.BIGINT)] = 'long';
  normalizedTypes[db.normalizeDataType(db.DataTypes.DOUBLE)] = 'double';
  const mapValues = (k, v) => {
    if (excludeAttributes[k]) return undefined;
    if (k === 'type') {
      var typ = normalizedTypes[v];
      if (typ) {
        return { type: typ, opts: v };
      }
    }
    return v;
  };

  const getIdEqClause = (table, id, obj) => {
    // {id:{$eq:req.params.id}}
    return {id:{$eq:id}};
  }

  Object.keys(db).map(k => {
    const table = db[k];
    if (!table.findAll) return;

    router.options((req, res) => res.send());

    router.get('/'+k+'/model', (req, res) => {
      res.send(JSON.stringify(table.attributes, mapValues));
    });

    router.get('/'+k, (req, res) =>
      table.findAll()
      .then(data =>
        res.json(data))
      .catch(err => app.sendError(500, err)));

    router.put('/'+k, (req, res) =>
      table.create(req.body)
      .then(data =>
        res.json(data))
      .catch(err => app.sendError(500, err)));

    router.post('/'+k+'/:id', (req, res) =>
      table.update(req.body,{where: getIdEqClause(table,req.params.id,req.body)})
      .then(data =>
        res.json(data))
      .catch(err => app.sendError(500, err)));

    router.delete('/'+k+'/:id', (req, res) => table.destroy({where:{id:{$eq:req.params.id}}})
      .then(data =>
        res.json(data))
      .catch(err => app.sendError(500, err)))
  });
});
