const knex = require('knex')
const fixtures = require('./noteful.fixtures')
const app = require('../src/app')


describe.only('Notes Endpoints', () => {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () =>  db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))
  afterEach('cleanup', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))
//before('cleanup', () => db('folders').truncate())
//   before('cleanup', () => db('notes').truncate())
//   afterEach('cleanup', () => db('folders').truncate())
//   afterEach('cleanup', () => db('notes').truncate())

  describe('GET /api/notes', () => {
    context(`Given no notes`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, [])
      })
    })

    context('Given there are notes in the database', () => {
      const testNotes = fixtures.makeNotesArray()
      const testFolders = fixtures.makeFoldersArray()

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
            .into('notes')
            .insert(testNotes)
          })
      })

      it('gets the notes from the store', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes)
      })
    })

    context(`Given an XSS attack note`, () => {
      const { maliciousNote, expectedNote } = fixtures.makeMaliciousNote()
      const testFolders = fixtures.makeFoldersArray()

      beforeEach('insert malicious note', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
            .into('notes')
            .insert([maliciousNote])
          })
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].name).to.eql(expectedNote.name)
            expect(res.body[0].content).to.eql(expectedNote.content)
          })
      })
    })
  })

  describe('GET /api/notes/:id', () => {
    context(`Given no notes`, () => {
      it(`responds 404 the note doesn't exist`, () => {
        return supertest(app)
          .get(`/api/notes/123`)
          .expect(404, {
            error: { message: `Note Not Found` }
          })
      })
    })

    context('Given there are notes in the database', () => {
      const testNotes = fixtures.makeNotesArray()
      const testFolders = fixtures.makeFoldersArray()

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
            .into('notes')
            .insert(testNotes)
          })
      })

      it('responds with 200 and the specified note', () => {
        const noteId = 2
        const expectedNote = testNotes[noteId - 1]
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(200, expectedNote)
      })
    })

    context(`Given an XSS attack note`, () => {
      const { maliciousNote, expectedNote} = fixtures.makeMaliciousNote()
      const testFolders = fixtures.makeFoldersArray()

      beforeEach('insert malicious note', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
            .into('notes')
            .insert([maliciousNote])
          })
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes/${maliciousNote.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.name).to.eql(expectedNote.name)
            expect(res.body.content).to.eql(expectedNote.content)
          })
      })
    })
  })

  describe('DELETE /api/notes/:id', () => {
    context(`Given no notes`, () => {
      it(`responds 404 whe note doesn't exist`, () => {
        return supertest(app)
          .delete(`/api/notes/123`)
          .expect(404, {
            error: { message: `Note Not Found` }
          })
      })
    })

    context('Given there are note in the database', () => {
        const testNotes = fixtures.makeNotesArray()
        const testFolders = fixtures.makeFoldersArray()

      beforeEach('insert notes', () => {
        return db
        .into('folders')
        .insert(testFolders)
        .then(() => {
          return db
          .into('notes')
          .insert(testNotes)
        })
      })

      it('removes the note by ID from the store', () => {
        const idToRemove = 2
        const expectedNotes = testNotes.filter(nt => nt.id !== idToRemove)
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get(`/api/notes`)
              .expect(expectedNotes)
          )
      })
    })
  })

  describe('POST /api/notes', () => {
    ['name', 'content', 'folderid'].forEach(field => {
      const newNote = {
        name: 'test-name',
        content: 'test-content',
        folderid: 2,
      }

      it(`responds with 400 missing '${field}' if not supplied`, () => {
        delete newNote[field]

        return supertest(app)
          .post(`/api/notes`)
          .send(newNote)
          .expect(400, {
            error: { message: `'${field}' is required` }
          })
      })
    })

    it(`responds with 400 invalid 'folderid' if not a number`, () => {
      const newNoteInvalidRating = {
        name: 'test-name',
        content: 'test-content',
        folderid: 'invalid',
      }
      return supertest(app)
        .post(`/api/notes`)
        .send(newNoteInvalidRating)
        .expect(400, {
          error: { message: `'folderid' must be a number` }
        })
    })

    it('adds a new note to the store', () => {
        // this.retries(3);
      const newNote = {
            id: 1,
            name: 'Dogs',
            // modified: new Date(),
            folderid: 3,
            content: 'Content for Dogs'
      }
      return supertest(app)
        .post(`/api/notes`)
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newNote.name)
          expect(res.body.folderid).to.eql(newNote.folderid)
          expect(res.body.content).to.eql(newNote.content)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
          const expected = new Date().toLocaleString
          const actual = new Date(res.body.modified).toLocaleString
          expect(actual).to.eql(expected)
        })
        .then(res =>
          supertest(app)
            .get(`/api/notes/${res.body.id}`)
            .expect(res.body)
        )
    })

    it('removes XSS attack content from response', () => {
      const { maliciousNote, expectedNote } = fixtures.makeMaliciousNote()
      return supertest(app)
        .post(`/api/notes`)
        .send(maliciousNote)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(expectedNote.name)
          expect(res.body.content).to.eql(expectedNote.content)
        })
    })
  })

  describe(`PATCH /api/notes/:notes_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .patch(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note Not Found` } })
      })
    })

    context('Given there are notes in the database', () => {
        const testNotes = fixtures.makeNotesArray()
        const testFolders = fixtures.makeFoldersArray()

      beforeEach('insert notes', () => {
        return db
        .into('folders')
        .insert(testFolders)
        .then(() => {
          return db
          .into('notes')
          .insert(testNotes)
        })
      })

      it('responds with 204 and updates the note', () => {
        const idToUpdate = 2
        const updateNote = {
          name: 'updated note name',
          modified: new Date(),
          content: 'updated note content',
          folderid: 1,
        }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must content either 'name' or 'content'`
            }
          })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateNote = {
          name: 'updated note name 2',
        }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({
            ...updateNote,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          )
      })

    })
  })
})

//FOLDERS ENPOINTS
describe('Folders Endpoints', () => {
    let db
  
    before('make knex instance', () => {
      db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL,
      })
      app.set('db', db)
    })
  
    after('disconnect from db', () => db.destroy())
  
    before('cleanup', () =>  db.raw('TRUNCATE folders RESTART IDENTITY CASCADE'))
    afterEach('cleanup', () => db.raw('TRUNCATE folders RESTART IDENTITY CASCADE'))
//   before('cleanup', () => db('folders').truncate())
    // before('cleanup', () => db('notes').truncate())
    // afterEach('cleanup', () => db('folders').truncate())
    // afterEach('cleanup', () => db('notes').truncate())
  
    describe('GET /api/folders', () => {
      context(`Given no folders`, () => {
        it(`responds with 200 and an empty list`, () => {
          return supertest(app)
            .get('/api/folders')
            .expect(200, [])
        })
      })
  
      context('Given there are notes in the database', () => {
        const testFolders = fixtures.makeFoldersArray()
  
        beforeEach('insert notes', () => {
          return db
            .into('folders')
            .insert(testFolders)
        })
  
        it('gets the folders from the store', () => {
          return supertest(app)
            .get('/api/folders')
            .expect(200, testFolders)
        })
      })
  
      context(`Given an XSS attack folder`, () => {
        const { maliciousFolder, expectedFolder } = fixtures.makeMaliciousFolder()
        const testFolders = fixtures.makeFoldersArray()
  
        beforeEach('insert malicious folder', () => {
          return db
            .into('folders')
            .insert([maliciousFolder])
        })
  
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/folders`)
            .expect(200)
            .expect(res => {
              expect(res.body[0].name).to.eql(expectedFolder.name)
            })
        })
      })
    })
  
    describe('GET /api/folders/:id', () => {
      context(`Given no folders`, () => {
        it(`responds 404 the folder doesn't exist`, () => {
          return supertest(app)
            .get(`/api/folders/123`)
            .expect(404, {
              error: { message: `Folder Not Found` }
            })
        })
      })
  
      context('Given there are folders in the database', () => {
        const testFolders = fixtures.makeFoldersArray()
  
        beforeEach('insert notes', () => {
          return db
            .into('folders')
            .insert(testFolders)
        })
  
        it('responds with 200 and the specified folder', () => {
          const folderId = 2
          const expectedFolder = testFolders[folderId - 1]
          return supertest(app)
            .get(`/api/folders/${folderId}`)
            .expect(200, expectedFolder)
        })
      })
  
      context(`Given an XSS attack folder`, () => {
        const { maliciousFolder, expectedFolder} = fixtures.makeMaliciousFolder()
        const testFolders = fixtures.makeFoldersArray()
  
        beforeEach('insert malicious note', () => {
          return db
            .into('folders')
            .insert(testFolders)
        })
  
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/folders/${maliciousFolder.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.name).to.eql(expectedNote.name)
            })
        })
      })
    })
  
    describe('DELETE /api/folders/:id', () => {
      context(`Given no folders`, () => {
        it(`responds 404 the folder doesn't exist`, () => {
          return supertest(app)
            .delete(`/api/folders/123`)
            .expect(404, {
              error: { message: `Folder Not Found` }
            })
        })
      })
  
      context('Given there are folder in the database', () => {
          const testFolders = fixtures.makeFoldersArray()
  
        beforeEach('insert notes', () => {
          return db
          .into('folders')
          .insert(testFolders)
        })
  
        it('removes the folder by ID from the store', () => {
          const idToRemove = 2
          const expectedFolder = testFolders.filter(fd => fd.id !== idToRemove)
          return supertest(app)
            .delete(`/api/folders/${idToRemove}`)
            .expect(204)
            .then(() =>
              supertest(app)
                .get(`/api/folders`)
                .expect(expectedFolder)
            )
        })
      })
    })
  
    describe('POST /api/folders', () => {
        const newFolder = {
          
        }
  
        it(`responds with 400 missing 'name' if not supplied`, () => {
  
          return supertest(app)
            .post(`/api/folders`)
            .send(newFolder)
            .expect(400, {
              error: { message: `'Name' is required` }
            })
        })
      
  
      
      it('adds a new folders to the store', () => {
          // this.retries(3);
        const newFolder = {
            name: 'Folder test'
        }
        return supertest(app)
          .post(`/api/folders`)
          .send(newFolder)
          .expect(201)
          .expect(res => {
            expect(res.body.name).to.eql(newFolder.name)
            expect(res.body).to.have.property('id')
          })
          .then(res =>
            supertest(app)
              .get(`/api/folders/${res.body.id}`)
              .expect(res.body)
          )
      })
  
      it('removes XSS attack content from response', () => {
        const { maliciousFolder, expectedFolder } = fixtures.makeMaliciousFolder()
        return supertest(app)
          .post(`/api/folders`)
          .send(maliciousFolder)
          .expect(201)
          .expect(res => {
            expect(res.body.name).to.eql(expectedFolder.name)
          })
      })
    })
  
    describe(`PATCH /api/folders/:folders_id`, () => {
      context(`Given no folders`, () => {
        it(`responds with 404`, () => {
          const folderId = 123456
          return supertest(app)
            .patch(`/api/folders/${folderId}`)
            .expect(404, { error: { message: `Folder Not Found` } })
        })
      })
  
      context('Given there are folders in the database', () => {
          const testFolders = fixtures.makeFoldersArray()
  
        beforeEach('insert notes', () => {
          return db
          .into('folders')
          .insert(testFolders)
        })
  
        it('responds with 204 and updates the note', () => {
          const idToUpdate = 2
          const updateFolder = {
            name: 'updated folder name',
          }
          const expectedFolder = {
            ...testFolders[idToUpdate - 1],
            ...updateFolder
          }
          return supertest(app)
            .patch(`/api/folders/${idToUpdate}`)
            .send(updateFolder)
            .expect(204)
            .then(res =>
              supertest(app)
                .get(`/api/folders/${idToUpdate}`)
                .expect(expectedFolder)
            )
        })
  
        it(`responds with 400 when no required fields supplied`, () => {
          const idToUpdate = 2
          return supertest(app)
            .patch(`/api/folders/${idToUpdate}`)
            .send({ irrelevantField: 'foo' })
            .expect(400, {
              error: {
                message: `Request body must contain a 'name'`
              }
            })
        })
          
      })
    })
  })
