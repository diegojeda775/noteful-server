const NotesService = {
    getAllNotes(db) {
      return db('notes')
        .select('*');
    },
  
    insertNote(db, data) {
      return db('notes')
        .insert(data)
        .returning('*')
        .then(rows => rows[0]);
    },
  
    getNoteById(db, id) {
      return db('notes')
        .select('*')
        .where({ id })
        .first();
    },
  
    deleteNote(db, id) {
      return db('notes')
        .where({ id })
        .delete();
    },
  
    updateNote(db, id, data) {
      return db('notes')
        .where({ id })
        .update(data);
    }
  };
  
  module.exports = NotesService;