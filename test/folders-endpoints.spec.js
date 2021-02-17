const knex = require('knex')
const fixtures = require('./noteful.fixtures')
const app = require('../src/app')

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
        // const testFolders = fixtures.makeFoldersArray()
  
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
        // const testFolders = fixtures.makeFoldersArray()
  
        beforeEach('insert malicious note', () => {
          return db
            .into('folders')
            .insert([maliciousFolder])
        })
  
        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/folders/${maliciousFolder.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.name).to.eql(expectedFolder.name)
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