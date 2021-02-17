const path = require('path')
const express = require('express')
const xss = require('xss')
const logger = require('../logger')
const NotesService = require('./notes-service')

const NotesRouter = express.Router()
const bodyParser = express.json()

const sanitizedNote = note => ({
  id: note.id,
  name: xss(note.name),
  modified: note.modified,
  folderid: note.folderid,
  content: xss(note.content),
})

NotesRouter
  .route('/')

  .get((req, res, next) => {
    NotesService.getAllNotes(req.app.get('db'))
      .then(notes => {
        res.json(notes.map(sanitizedNote))
      })
      .catch(next)
  })

  .post(bodyParser, (req, res, next) => {
    const { name, folderid, content } = req.body
    const newNote = { name, folderid, content }

    for (const field of ['name', 'folderid', 'content']) {
      if (!newNote[field]) {
        logger.error(`${field} is required`)
        return res.status(400).send({
          error: { message: `'${field}' is required` }
        })
      }
    }

    const numFolderID = Number(folderid)

    if(!Number.isInteger(numFolderID)) {
        logger.error(`Invalid folder id '${folderid}' supplied`);
        return res.status(400).send({
            error: { message: `'folderid' must be a number`}
        })
    }

    newNote.modified = new Date

    NotesService.insertNote(
      req.app.get('db'),
      newNote
    )
      .then(note => {
        logger.info(`Note with id ${note.id} created.`)
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(sanitizedNote(note))
      })
      .catch(next)
  })


NotesRouter
  .route('/:note_id')

  .all((req, res, next) => {
    const { note_id } = req.params
    NotesService.getNoteById(req.app.get('db'), note_id)
      .then(note => {
        if (!note) {
          logger.error(`Note with id ${note_id} not found.`)
          return res.status(404).json({
            error: { message: `Note Not Found` }
          })
        }

        res.note = note
        next()
      })
      .catch(next)

  })

  .get((req, res) => {
    res.json(sanitizedNote(res.note))
  })

  .delete((req, res, next) => {
    const { note_id } = req.params
    NotesService.deleteNote(
      req.app.get('db'),
      note_id
    )
      .then(numRowsAffected => {
        logger.info(`Note with id ${note_id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })

  .patch(bodyParser, (req, res, next) => {
    const { name, content } = req.body
    const noteToUpdate = { name, content }
    const { note_id } = req.params

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      logger.error(`Invalid update without required fields`)
      return res.status(400).json({
        error: {
          message: `Request body must content either 'name' or 'content'`
        }
      })
    }
    NotesService.updateNote(
      req.app.get('db'),
      note_id,
      noteToUpdate
    )
      .then(numRowsAffected => {
        logger.info(`Note with id ${note_id} edited.`)
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = NotesRouter