var SQ = require('sequelize');
var u = require('./util');
var rebuild = true || process.env.REBUILD_DATABASE;

module.exports = (connectString, onReady) => {
  const s = new SQ(connectString, {
    //logging: (text) => null
  });

  const db = {
    query: s.query,
    normalizeDataType: s.normalizeDataType.bind(s),
    DataTypes: SQ,
    literal: s.literal.bind(s),
    assertFound: result => {
      if (!result) {
        throw new Error('Not Found');
      }
      return result;
    },
    select: (...args) => {
      var sql = args[0];
      var params = args.slice(1);
      return s.query(sql,
        { replacements: params, type: SQ.QueryTypes.SELECT }
      );
    },
  };

  const createOrder = [];

  db.Image = createOrder[createOrder.length] = s.define('image', {
    id: {
      type: SQ.UUID,
      defaultValue: SQ.UUIDV1,
      primaryKey: true,
    },
    url: {
      type: SQ.STRING,
    },
    type: {
      type: SQ.STRING,
    },
    data: {
      type: SQ.BLOB,
    },
  });

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
    isAdmin: {
      type: SQ.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    imageId: {
      type: SQ.UUID,
      allowNull: true,
      field: 'imageid',
      references: {
        model: db.Image,
        key: 'id',
      }
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
      field: 'accountid',
    },
  }, {
    indexes: [{
      unique: true,
      fields: ['provider', 'accountid']
    }],
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
    public: {
      type: SQ.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    imageId: {
      type: SQ.UUID,
      allowNull: true,
      field: 'imageid',
      references: {
        model: db.Image,
        key: 'id',
      }
    },
  }, {
    indexes: [{
      unique: true,
      fields: ['name']
    }],
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
      field: 'admingroupid',
      references: {
        model: db.Group,
        key: 'id',
      }
    },
    name: {
      type: SQ.STRING,
      allowNull: false,
    },
    active: {
      type: SQ.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    startDate: {
      type: SQ.DATE,
      allowNull: false,
      defaultValue: SQ.NOW,
    },
    endDate: {
      type: SQ.DATE,
      allowNull: false,
      defaultValue: SQ.NOW,
    },
    imageId: {
      type: SQ.UUID,
      allowNull: true,
      field: 'imageid',
      references: {
        model: db.Image,
        key: 'id',
      }
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

  db.Permission = createOrder[createOrder.length] = s.define('permission', {
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

  db.Role = createOrder[createOrder.length] = s.define('role', {
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

  db.UserGroup = createOrder[createOrder.length] = s.define('user_group', {
    userId: {
      type: SQ.UUID,
      allowNull: false,
      field: 'userid',
      references: {
        model: db.User,
        key: 'id',
      }
    },
    roleId: {
      type: SQ.UUID,
      allowNull: false,
      field: 'roleid',
      references: {
        model: db.Role,
        key: 'id',
      }
    },
    groupId: {
      type: SQ.UUID,
      allowNull: false,
      field: 'groupid',
      references: {
        model: db.Group,
        key: 'id',
        //deferrable: SQ.Deferrable.INITIALLY_IMMEDIATE,
      }
    },
  }, {
    indexes: [{
      unique: true,
      fields: ['userid', 'roleid', 'groupid']
    }],
  });

  var permissions = require('./services/permission');
  const syncPermissions = () => Promise.all(
    Object.keys(permissions).map((permissionName) =>
      db.Permission.findOne({where:{name:{$eq:permissionName}}})
      .then(permission => {
        if (permission) {
          permissions[permissionName] = permission;
        } else {
          return db.Permission.create({name:permissionName})
            .then(permission => permissions[permissionName] = permission);
        }
      })
    )
  );

  var syncRoles = () => {
    var roles = require('./services/role');
    return Promise.all(
      roles.roleKeys().map((roleName) =>
        db.Role.findOne({where:{name:{$eq:roleName}}})
        .then(role => {
          if (role) {
            role.permissions = roles[roleName];
             roles[roleName] = role
          } else {
            return db.Role.create({name:roleName})
              .then(role => {
                role.permissions = roles[roleName];
                roles[roleName] = role;
              })
          }
        })
    ));
  };

  const defaultData = [
    () => db.User.create({
      username: 'admin',
      isAdmin: true,
      passwordHash: u.sha256(process.env.INITIAL_ADMIN_PASSWORD || 'admin'),
    }).then(user => db.Group.create({
        name: 'admin'
      }).then(group => {
        var roles = require('./services/role');
        return db.UserGroup.create({
          userId: user.id,
          groupId: group.id,
          roleId: roles.SysAdmin.id,
        }).then(() => db.UserGroup.create({
          userId: user.id,
          groupId: group.id,
          roleId: roles.Owner.id,
        }))
      })),
  ];

  // Initializes all the tables that need it
  var promise = Promise.resolve();
  createOrder.map(table => {
    // TODO better way to quote table names?
    table.qname = s.dialect.QueryGenerator.quoteIdentifier(table.tableName);
    promise = promise.then(() => table.sync({
      force: rebuild
    }));
  });

  // Synchronize reference data
  promise = promise.then(syncPermissions);

  promise = promise.then(syncRoles);

  // Insert default data
  defaultData.map(dataInsert => {
    promise = promise.then(() => dataInsert());
  });
  promise.then(() => {
    onReady(db);
  })
  .catch(err => console.error("onReady err:", err));
};
