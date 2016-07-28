var SQ = require('sequelize');

module.exports = (connectString, onReady) => {
  const s = new SQ(connectString);

  const db = {
    query: s.query,
    normalizeDataType: s.normalizeDataType.bind(s),
    DataTypes: SQ,
  };

  const createOrder = [];

  db.User = createOrder[createOrder.length] = s.define('user', {
    id: {
      type: SQ.UUID,
      defaultValue: SQ.UUIDV1,
      primaryKey: true,
    },
    firstName: {
      type: SQ.STRING,
    },
    lastName: {
      type: SQ.STRING,
    },
    email: {
      type: SQ.STRING,
      allowNull: false,
    },
  });

  db.Group = createOrder[createOrder.length] = s.define('group', {
    id: {
      type: SQ.UUID,
      defaultValue: SQ.UUIDV1,
      primaryKey: true,
    },
    name: {
      type: SQ.STRING,
      allowNull: false,
    },
  });

  db.Contest = createOrder[createOrder.length] = s.define('contest', {
    id: {
      type: SQ.UUID,
      defaultValue: SQ.UUIDV1,
      primaryKey: true,
    },
    admin_group_id: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Group,
        key: 'id',
      }
    },
    name: {
      type: SQ.STRING,
      allowNull: false,
    },
  });

  db.ContestEntry = createOrder[createOrder.length] = s.define('contest_entry', {
    id: {
      type: SQ.UUID,
      defaultValue: SQ.UUIDV1,
      primaryKey: true,
    },
    contest_id: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Contest,
        key: 'id',
      }
    },
    owner_id: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.User,
        key: 'id',
      }
    },
    url: {
      type: SQ.STRING,
      allowNull: false,
    },
  });

  db.UserGroup = createOrder[createOrder.length] = s.define('user_group', {
    user_id: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.User,
        key: 'id',
      }
    },
    group_id: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Group,
        key: 'id',
        //deferrable: SQ.Deferrable.INITIALLY_IMMEDIATE,
      }
    },
  });

  const defaultData = [
    () => db.User.create({
      firstName: 'admin',
      email: 'admin@admin.com'
    }),
  ];

  // Initializes all the tables that need it
  let promise = Promise.resolve();
  createOrder.map(table => {
    promise = promise.then(() => table.sync({force: true}));
  });
  defaultData.map(dataInsert => {
    promise = promise.then(() => dataInsert());
  });
  promise.then(() => {
    console.log('then is done');
    onReady(db);
  });
};
