# Digi Shelf

A local-first bookshelf for keeping track of books you have read, are reading, or want to read. Search Google Books, arrange and personalize your shelf, and move your library between browsers with a JSON file.

## Get started

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The first visit includes a small example library; books and shelf changes are saved in this browser.

## Features

- Search Google Books and add books with their available metadata.
- Filter by reading status, and sort by title, author, or genre. Drag books to arrange a custom order.
- Select a book to edit its status, spine color, width, height, condition, and edition.
- Import or export the library as a JSON file from the top-right buttons.

Book search uses Google Books, with Open Library as a fallback if Google Books is rate-limited. The library stays in browser storage and is not sent to a server. Export a JSON file before switching browsers or clearing browser data.

## Build

```sh
npm run build
```
