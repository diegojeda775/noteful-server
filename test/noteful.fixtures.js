function makeNotesArray() {
    return [
        {
            id: 1,
            name: 'Dogs',
            modified: new Date,
            folderid: 3,
            content: 'Content for Dogs',
        },
        {
            id: 2,
            name: 'Cats',
            modified: new Date,
            folderid: 2,
            content: 'Content for Cats',
        },
        {
            id: 3,
            name: 'Bunnies',
            modified: new Date,
            folderid: 1,
            content: 'Content for Bunnies',
        }
    ];
} 

function makeFoldersArray() {
    return [
        {
            id: 1,
            name: 'Folder 1'
        },
        {
            id: 2,
            name: 'Folder 2'
        },
        {
            id: 3,
            name: 'Folder 3'
        }
    ];
} 

function makeMaliciousNote() {
    const maliciousNote = {
      id: 17,
      name: 'Naughty naughty very naughty <script>alert(\"xss\");</script>',
      folderid: 1,
      content: `Bad image <img src=\"https://url.to.file.which/does-not.exist\" onerror=\"alert(document.cookie);\">. But not <strong>all</strong> bad.`,
    }
    const expectedNote = {
      ...maliciousNote,
      name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
    return {
      maliciousNote,
      expectedNote,
    }
  }

function makeMaliciousFolder() {
    const maliciousFolder = {
        id: 16,
        name: 'Naughty naughty very naughty <script>alert(\"xss\");</script>'
    }
    const expectedFolder = {
        name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;'
    }
    return {
        maliciousFolder,
        expectedFolder
    }
}

module.exports = {
    makeNotesArray,
    makeMaliciousNote,
    makeFoldersArray,
    makeMaliciousFolder
}