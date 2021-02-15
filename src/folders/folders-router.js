const path = require('path')
const express = require('express')
const xss = require('xss')
const logger = require('../logger')
const FoldersService = require('./folders-service')

const foldersRouter = express.Router()
const bodyParser = express.json()

const sanitizedFolder = folder => ({
  id: folder.id,
  name: xss(folder.name),
})

foldersRouter
    .route('/')

    .get((req, res, next) => {
        FoldersService.getAllFolders(req.app.get('db'))
        .then(folders => {
            res.json(folders.map(sanitizedFolder))
        })
        .catch(next)
    })

    .post(bodyParser, (req, res, next) => {
        const { name } = req.body
        const newFolder = { name }

    
        if (!newFolder.name) {
            logger.error(`Name is required`)
            return res.status(400).send({
                error: { message: `'Name' is required` }
            })
        }
    

        FoldersService.insertFolder(
            req.app.get('db'),
            newFolder
        )
            .then(folder => {
                logger.info(`Folder with id ${folder.id} created.`)
                res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                .json(sanitizedFolder(folder))
            })
            .catch(next)
    })


foldersRouter
    .route('/:folder_id')

    .all((req, res, next) => {
        const { folder_id } = req.params
        FoldersService.getFolderById(req.app.get('db'), folder_id)
        .then(folder => {
            if (!folder) {
                logger.error(`Folder with id ${folder_id} not found.`)
                return res.status(404).json({
                    error: { message: `Folder Not Found` }
                })
            }

            res.folder = folder
            next()
        })
        .catch(next)

    })

    .get((req, res) => {
        res.json(sanitizedFolder(res.folder))
    })

    .delete((req, res, next) => {
        const { folder_id } = req.params
        FoldersService.deleteFolder(
            req.app.get('db'),
            folder_id
        )
        .then(numRowsAffected => {
            logger.info(`Folder with id ${folder_id} deleted.`)
            res.status(204).end()
        })
        .catch(next)
    })

    .patch(bodyParser, (req, res, next) => {
        const { name } = req.body
        const folderToUpdate = { name }

        const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
        if (numberOfValues === 0) {
            logger.error(`Invalid update without required fields`)
            return res.status(400).json({
                error: {
                    message: `Request body must contain a 'name'`
                }
            })
        }

            FoldersService.updateFolder(
                req.app.get('db'),
                req.params.folder_id,
                folderToUpdate
            )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = foldersRouter