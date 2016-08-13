var u = require('../util');

module.exports = u.resolve((db, auth, role, user, image) => new class GroupService {
  findById(id) {
    return db.Group.findById(id);
  }

  findPublic() {
    return db.Group.findAll({where:{
      public: {$eq: true},
    }});
  }

  _groupIdSubqueryUserRole(user, role) {
    return db.literal(`
       (select groupId from ${db.UserGroup.qname}
        where userId = '${user.id}' and roleId = '${role.id}')
    `);
  }

  _groupIdSubqueryUserRoles(user, roles) {
    return db.literal(`
       (select groupId from ${db.UserGroup.qname}
        where userId = '${user.id}' and roleId in ('${roles.reduce((sql,r)=>sql+'\',\''+r.id,'')}'))
    `);
  }

  findManaged(user) {
    return db.Group.findAll({ where: {
      id: {$in: this._groupIdSubqueryUserRole(user, role.Owner)}
    }})
//    return db.select(
//      `select * from ${db.Group.qname} where id in \
//        (select groupId from ${db.UserGroup.qname} \
//          where userId = ? and roleId = ?)`, user.id, role.Owner.id);
  }

  findMember(user) {
    return db.Group.findAll({ where: {
      id: {$in: this._groupIdSubqueryUserRole(user, role.Member)}
    }})
//    return db.select(
//      `select * from ${db.Group.qname} where id in
//        (select groupid from ${db.UserGroup.qname}
//          where userid = ?)`, user.id);
  }

  groupIdsForCurrentUser(permission) {
    if (!permission) {
      throw new Error("Must specify a permission.");
    }
    return auth.enticate()
      .then(u => role.forPermission(permission)
        .then(roles => db.UserGroup.findAll({
          attributes: ['groupId'],
          where:{
          userId: u.id,
          roleId: {$in: roles.map(r => r.id)}
        }}))
        .then(groupIds => {
          groupIds = groupIds.map(g => g.groupId);
          return groupIds;
        }))
  }

  create(group) {
    return user.authenticate() // TODO enforce group creation limits
      .then(u => group.image ? image.insert(group.image)
        .then(img => {
          if(img) {
            group.imageId = img.id;
          }
          return u;
      }) : u)
      .then(u => db.Group.create(group)
        .then(group =>
          db.UserGroup.create({
            userId: u.id,
            groupId: group.id,
            roleId: role.Owner.id,
          })
          .then(ug => group))
      )
      .catch(err => console.error(err));
  }

});
