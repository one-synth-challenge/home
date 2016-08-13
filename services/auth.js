var u = require('../util');

const authFailure = {authFailure: true};
module.exports = u.resolve((app, db, role, session) => new class AuthService {
  orize(groupId, permission) {
    return this.enticate()
      .then(currentUser =>
        role.forPermission(permission)
        .then(roles => db.UserGroup.findOne({where:{
          groupId: {$eq: groupId},
          userId: {$eq: currentUser.id},
          roleId: {$in: roles.map(r => r.id)},
        }}))
        .then(rec => {
          if (!rec) {
            throw new Error(`User ${currentUser.username} Not Authorized for ${permission.name}`)
          }
          return rec;
        })
        .catch(ex => {
          app.sendError(401, "Not Authorized");
          return Promise.reject(authFailure);
        })
      );
  }

  enticate() {
    var currentUser = u.getFromContext('currentUser');
    if (currentUser != null) {
        return Promise.resolve(currentUser);
    }
    return u.resolve((req, res) => {
      // support cookie-based auth with 'sessionId'
      const sessionId = req.query.sessionId || req.get('X-Session-Id') || req.cookies && req.cookies.sessionId;
      return session.find(sessionId)
          .then(user => {
            if (!process.domain) {
              console.log('Setting current user, but no process.domain!');
              throw new Error('No current process.domain.');
            }
            // this should be in a domain
            u.putInContext({ currentUser: user });
            return user;
          })
          .catch(ex => {
            app.sendError(401, "Not Authenticated");
            return Promise.reject(authFailure);
          })
    });
  }
});
