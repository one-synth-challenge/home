var u = require('../util');

module.exports = u.resolve((db) => new class Session {
  /**
   * Find the user for the given session
   */
  find(sessionId) {
    return db.Session.findOne({where:{sessionId:{$eq:sessionId}}})
      .then(db.assertFound)
      .then(rec =>
        db.User.findOne({where:{id:{$eq:rec.userId}}})
        .then(db.assertFound));
  }

  /**
   * Create a session with a userid and id
   */
  create(sessionId, userId) {
    return db.Session.create({
      sessionId: sessionId,
      userId: userId,
    });
  }

  begin(user) {
    // TODO validate there isn't an existing session
    return u.random().then(sessionId => this.create(sessionId, user.id)
      .then(() => ({
        sessionId: sessionId,
        userId: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      }))
    )
  }

  /**
   * Destroy the session
   */
  destroy(sessionId) {
    return db.Session.destroy({where:{sessionId:{$eq:sessionId}}});
  }

  /**
   * Authenticate and return the authenticated session id and user
   */
  authenticate(username, password) {
    return db.User.findOne({where:{username:{$eq:username},passwordHash:{$eq:password}}})
      .then(db.assertFound)
      .then(usr =>
        this.begin(usr));
  }
});
