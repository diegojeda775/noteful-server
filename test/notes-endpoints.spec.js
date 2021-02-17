const knex = require('knex')
const fixtures = require('./noteful.fixtures')
const app = require('../src/app')


describe('Notes Endpoints', () => {
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
         const stringifyNotes = testNotes.map(nt => ({...nt, modified: nt.modified.toJSON()}))
        return supertest(app)
          .get('/api/notes')
          .expect(200, stringifyNotes)
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
        const stringifyNotes = {...expectedNote, modified: expectedNote.modified.toJSON()}
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(200, stringifyNotes)
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
        const stringifyNotes = testNotes.map(nt => ({...nt, modified: nt.modified.toJSON()}))
        const expectedNotes = stringifyNotes.filter(nt => nt.id !== idToRemove)
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
    context(`Given that we pass bad notes in the database`, () => {
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
    })
    

    context(`Given there are no notes in the database`, () => {
      const testNotes = fixtures.makeNotesArray()
      const testFolders = fixtures.makeFoldersArray()

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })

        it(`adds a new note to the store`, () => {
            // this.retries(3)
          const newNote = {
                name: 'Test Note',
                folderid: 1,
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
              const expected = new Date().toLocaleString()
              const actual = new Date(res.body.modified).toLocaleString()
              expect(actual).to.eql(expected)
            })
            .then(res =>
              supertest(app)
                .get(`/api/notes/${res.body.id}`)
                .expect(res.body)
            )
        })

        it(`removes XSS attack content from response`, () => {
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
          content: 'updated note content',
          }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }

        const stringifyNotes = {...expectedNote, modified: expectedNote.modified.toJSON()}
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(stringifyNotes)
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
        const stringifyNotes = {...expectedNote, modified: expectedNote.modified.toJSON()}
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
              .expect(stringifyNotes)
          )
      })

    })
  })
})
