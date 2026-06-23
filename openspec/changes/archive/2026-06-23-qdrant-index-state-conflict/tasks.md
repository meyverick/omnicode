## 1. Implement Collection ID Migration

- [x] 1.1 In `src/installer/lib.js`, update `resolveCollectionName()`. Check if `.qdrant` exists using `existsSync`.
- [x] 1.2 If `.qdrant` exists, use `fs.statSync` to determine if it is a file or a directory.
- [x] 1.3 If it is a file (legacy), read its content, delete the file (`unlinkSync`), create the `.qdrant` directory (`mkdirSync`), and write the content to `.qdrant/id`.
- [x] 1.4 If `.qdrant` does not exist, create the directory and write a new generated UUID to `.qdrant/id`.
- [x] 1.5 Ensure the function always reads from `.qdrant/id` when the directory already exists.

## 2. Update Status Checks and Rename Lock File

- [x] 2.1 Verify that `getProcessStatus()` in `src/bin/omnicode.js` correctly looks for `.qdrant/.indexing` instead of `.qdrant/indexing.lock`. Update it to use `.indexing`.
- [x] 2.2 Verify that `indexReferences()` in `src/installer/lib.js` correctly looks for `.qdrant/index.json`. Update the lock file name from `indexing.lock` to `.indexing`.
- [x] 2.3 Update cleanup handlers in `src/bin/omnicode-runtime.js` to look for `.indexing` instead of `indexing.lock`.
