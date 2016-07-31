var SQ = require('sequelize');
var u = require('./util');

module.exports = (connectString, onReady) => {
  const s = new SQ(connectString);

  const db = {
    query: s.query,
    normalizeDataType: s.normalizeDataType.bind(s),
    DataTypes: SQ,
    assertFound: result => {
      if (!result) {
        throw new Error('Not Found');
      }
      return result;
    },
  };

  const createOrder = [];

  db.User = createOrder[createOrder.length] = s.define('user', {
    id: {
      type: SQ.UUID,
      defaultValue: SQ.UUIDV1,
      primaryKey: true,
    },
    username: {
      type: SQ.STRING,
      allowNull: false,
    },
    passwordHash: {
      type: SQ.STRING,
    },
    firstName: {
      type: SQ.STRING,
    },
    lastName: {
      type: SQ.STRING,
    },
    email: {
      type: SQ.STRING,
    },
  });

  db.Session = createOrder[createOrder.length] = s.define('session', {
    userId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.User,
        key: 'id',
      }
    },
    sessionId: {
      type: SQ.STRING,
      allowNull: false,
    },
  })

  db.ExternalAccount = createOrder[createOrder.length] = s.define('external_account', {
    userId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.User,
        key: 'id',
      }
    },
    provider: {
      type: SQ.STRING,
      allowNull: false,
    },
    accountId: {
      type: SQ.STRING,
      allowNull: false,
    },
  })

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
    adminGroupId: {
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
    contestId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Contest,
        key: 'id',
      }
    },
    ownerId: {
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
    userId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.User,
        key: 'id',
      }
    },
    groupId: {
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
      username: 'admin',
      passwordHash: u.sha256('wtf'),
    }).then(user => db.Group.create({
        name: 'admin'
      }).then(group => db.UserGroup.create({
        userId: user.id,
        groupId: group.id,
      }))),
  ];

  // Initializes all the tables that need it
  var promise = Promise.resolve();
  createOrder.map(table => {
    promise = promise.then(() => table.sync({force: true}));
  });
  defaultData.map(dataInsert => {
    promise = promise.then(() => dataInsert());
  });
  promise.then(() => {
    try {
      onReady(db);
    } catch(e) {
      console.error(e);
    }
  });
};
