---
# Sources: html/Work/aes.html:77-79, :86-98, :113; index.html:176-177, :528
title: AES-256 Encryptor
summary: A recursive AES-256 encryptor I wrote at 15. Its command-line arguments encrypt clipboard text, single files, or entire volumes with a password.
year: 2016
period: c. 2016
group: security
featured: true
order: 6
capabilities: [offensive-security]
stack: [C++, CLI, Testing, GitHub]
highlights:
  - Command-line arguments choose the target — clipboard text, a single file, or an entire volume — encrypted with the provided password.
  - Wrote the file reading and recursive directory traversal that let it encrypt whole directory trees.
  - Worked with foreign code as part of the cipher implementation.
  - Wrote tests, and used GitHub along the way.
cover: ./cover.webp
coverAlt: 'Demo run: File Explorer showing Encryption.exe, a directory tree of encrypted file names, and PowerShell reporting “Successfully Encrypted”.'
media:
  - kind: youtube
    id: 'DhG7bB0exLA'
    title: AES-256 Encryptor demo
    caption: Encrypting a nested test directory, file by file.
  - kind: image
    src: ./aes-source-code.webp
    alt: 'C++ source: the end of the AES S-box table, followed by the Aes256 constructor, destructor and encrypt function signature.'
legacyPaths: [html/Work/aes.html]
---

A recursive AES-256 encryptor for clipboard text, single files, or whole volumes — written at 15.

Designing user interfaces first piqued my interest in programming, and by 15 I was writing software of my own. This program is one of my first substantial independent projects.

## What I built

The program uses AES-256 as a recursive directory encryptor: its arguments let users encrypt clipboard text, single files, or entire volumes with the password they provide.

Building it meant learning to read files, recurse through directories and work with foreign code, writing tests, and using GitHub.
