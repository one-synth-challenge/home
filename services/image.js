var u = require('../util');
var fs = require('fs');

module.exports = u.resolve((db, auth, session) => new class ImageService {
  insert(file) {
    return auth.enticate()
    .then(u => {
      // TODO enforce limits
      var imageData = fs.readFileSync(file.path);
      return db.Image.create({
        name: file.name,
        type: file.type,
        data: imageData,
      });
    });
  }
});
