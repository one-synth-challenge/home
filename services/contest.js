var u = require('../util');

module.exports = u.resolve((db, image, user, group, role, permission) => new class ContestService {
  findPublic() {
    return db.Contest.findAll({where:{
      active: {$eq: true}
    }});
  }

  findPublicForGroup(groupId) {
    return db.Contest.findAll({where:{
      active: {$eq: true},
      adminGroupId: {$eq: groupId},
    }});
  }

  findForUser(user, permission) {
    return db.select(
      `select * from ${db.Contest.qname} where adminGroupId in
        (select groupId from ${db.UserGroup.qname}
          where userId = ? and roleId in ?)`,
            user.id,
            role.get(permission).map(r => r.id));
  }

  findForCurrentUser(permission) {
    return group.groupIdsForCurrentUser(permission)
    .then(groupIds => {
      return db.Contest.findAll({where:{
        adminGroupId: {$in: groupIds}
      }})
    })
    .then(c => {
      return c;
    });
  }

  findById(id) {
    return db.Contest.findById(id);
  }

  create(contest) {
    return user.authorize(contest.adminGroupId, permission.Manage)
      .then(u => contest.image && image.insert(contest.image))
      .then(img => {
        if(img) {
          contest.imageId = img.id;
        }
        return contest;
      })
      .then(contest => db.Contest.create(contest));
  }

  delete(id) {
    return findById(id)
      .then(it => user.authorize(it.adminGroupId, permission.Manage))
      .then(it => db.Contest.remove(it));
  }
});
