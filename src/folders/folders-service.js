const FoldersService = {
    getAllFolders(db) {
      return db('folders')
        .select('*');
    },
  
    insertFolder(db, data) {
      return db('folders')
        .insert(data)
        .returning('*')
        .then(rows => rows[0]);
    },
  
    getFolderById(db, id) {
      return db('folders')
        .select('*')
        .where({ id })
        .first();
    },
  
    deleteFolder(db, id) {
      return db('folders')
        .where({ id })
        .delete();
    },
  
    updateFolder(db, id, data) {
      return db('folders')
        .where({ id })
        .update(data);
    }
  };
  
  module.exports = FoldersService;