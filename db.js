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
    startDate: {
      type: SQ.DATE,
      allowNull: false,
    },
    endDate: {
      type: SQ.DATE,
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

  db.RolePermission = createOrder[createOrder.length] = s.define('role_permission', {
    roleId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Role,
        key: 'id',
      }
    },
    permissionId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Permission,
        key: 'id',
      }
    },
  });

  db.UserRole = createOrder[createOrder.length] = s.define('user_role', {
    userId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.User,
        key: 'id',
      }
    },
    roleId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Role,
        key: 'id',
      }
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
    roleId: {
      type: SQ.UUID,
      allowNull: false,
      references: {
        model: db.Role,
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

  var permissions = require('./services/permission');
  const syncPermissions = () => {
    Object.keys(permissions).forEach((permissionName) =>
      db.Permission.findOne({where:{name:{$eq:permissionName}}})
      .then(permission => permission ?
        permissions[permissionName] = permission
        : db.Permission.create({name:permissionName})
          .then(permission => permissions[permissionName] = permission))
    );
  };

  var syncRoles = () => {
    var roles = require('./services/role');
    Object.keys(roles).forEach((roleName) =>
      db.Role.findOne({where:{name:{$eq:roleName}}})
      .then(role => {
        if (role) {
          console.log('Found role: ', roleName);
          return roles[roleName] = role
        } else {
        	return db.Role.create({name:roleName})
            .then(role => {
              roles[roleName] = role;
            })
        }
      })
    );
  };

  const defaultData = [
    () => db.User.create({
      username: 'admin',
      passwordHash: u.sha256(process.env.INITIAL_ADMIN_PASSWORD || 'admin'),
    }).then(user => db.Group.create({
        name: 'admin'
      }).then(group => {
        var roles = require('./services/role');
        return db.UserGroup.create({
          userId: user.id,
          groupId: group.id,
          roleId: roles.SysAdmin.id,
        })
      })),
  ];

  // Initializes all the tables that need it
  var promise = Promise.resolve();
  createOrder.map(table => {
    promise = promise.then(() => table.sync({force: true}));
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
