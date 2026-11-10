import { useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownAZ,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudUpload,
  Download,
  Grip,
  Layers3,
  Library,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

type ReadingStatus = "reading" | "want" | "finished";
type BookSize = "slim" | "regular" | "thick";
type BookHeight = "short" | "regular" | "tall";
type BookAge = "new" | "loved" | "vintage";
type BookFormat = "paperback" | "hardcover";
type SortMode = "manual" | "title" | "author" | "genre";

type Book = {
  id: string;
  title: string;
  authors: string[];
  genre: string;
  status: ReadingStatus;
  color: string;
  size: BookSize;
  height: BookHeight;
  age: BookAge;
  format: BookFormat;
  published?: string;
  description?: string;
  pageCount?: number;
  publisher?: string;
  thumbnail?: string;
};

const STORAGE_KEY = "digi-shelf-books-v1";
const palette = ["#6e8368", "#c37b55", "#667b99", "#b39b67", "#95777c", "#687b76", "#bc775e", "#8c855e"];

const initialBooks: Book[] = [
  { id: "piranesi", title: "Piranesi", authors: ["Susanna Clarke"], genre: "Fantasy", status: "finished", color: "#81917b", size: "slim", height: "tall", age: "new", format: "hardcover", published: "2020", pageCount: 272, publisher: "Bloomsbury Publishing" },
  { id: "educated", title: "Educated", authors: ["Tara Westover"], genre: "Memoir", status: "finished", color: "#c27e5c", size: "regular", height: "tall", age: "loved", format: "paperback", published: "2018", pageCount: 352 },
  { id: "secret-history", title: "The Secret History", authors: ["Donna Tartt"], genre: "Literary fiction", status: "want", color: "#77829b", size: "thick", height: "tall", age: "loved", format: "paperback", published: "1992", pageCount: 559 },
  { id: "circe", title: "Circe", authors: ["Madeline Miller"], genre: "Fantasy", status: "finished", color: "#9d805f", size: "regular", height: "regular", age: "new", format: "hardcover", published: "2018", pageCount: 393 },
  { id: "braiding", title: "Braiding Sweetgrass", authors: ["Robin Wall Kimmerer"], genre: "Nature", status: "reading", color: "#75876d", size: "thick", height: "tall", age: "loved", format: "paperback", published: "2013", pageCount: 408 },
  { id: "normal-people", title: "Normal People", authors: ["Sally Rooney"], genre: "Literary fiction", status: "finished", color: "#b28076", size: "slim", height: "regular", age: "new", format: "paperback", published: "2018", pageCount: 273 },
  { id: "night-circus", title: "The Night Circus", authors: ["Erin Morgenstern"], genre: "Fantasy", status: "want", color: "#535e69", size: "regular", height: "tall", age: "vintage", format: "hardcover", published: "2011", pageCount: 387 },
  { id: "little-life", title: "A Little Life", authors: ["Hanya Yanagihara"], genre: "Literary fiction", status: "finished", color: "#a57665", size: "thick", height: "tall", age: "loved", format: "paperback", published: "2015", pageCount: 720 },
  { id: "blue-sisters", title: "The Blue Sisters", authors: ["Coco Mellors"], genre: "Fiction", status: "reading", color: "#7c8797", size: "regular", height: "regular", age: "new", format: "hardcover", published: "2024", pageCount: 352 },
  { id: "kitchen", title: "The Nakano Thrift Shop", authors: ["Hiromi Kawakami"], genre: "Fiction", status: "want", color: "#b5a174", size: "slim", height: "short", age: "loved", format: "paperback", published: "2005", pageCount: 224 },
  { id: "wild", title: "Wild", authors: ["Cheryl Strayed"], genre: "Memoir", status: "finished", color: "#738d8b", size: "regular", height: "tall", age: "vintage", format: "paperback", published: "2012", pageCount: 315 },
  { id: "tomorrow", title: "Tomorrow, and Tomorrow, and Tomorrow", authors: ["Gabrielle Zevin"], genre: "Fiction", status: "want", color: "#9a8072", size: "thick", height: "tall", age: "new", format: "hardcover", published: "2022", pageCount: 416 },
];

const statuses: { id: ReadingStatus | "all"; label: string }[] = [
  { id: "all", label: "All books" },
  { id: "reading", label: "Reading" },
  { id: "want", label: "Want to read" },
  { id: "finished", label: "Finished" },
];

type GoogleBook = {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    categories?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    publisher?: string;
    imageLinks?: { thumbnail?: string };
  };
};

type BookSearchResult = {
  books: GoogleBook[];
  source: "Google Books" | "Open Library";
};

type OpenLibraryBook = {
  key?: string;
  title?: string;
  author_name?: string[];
  subject?: string[];
  first_publish_year?: number;
  publisher?: string[];
  number_of_pages_median?: number;
  cover_i?: number;
};

function readLibrary(): { books: Book[]; error: string | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { books: initialBooks, error: null };
    const parsed: unknown = JSON.parse(saved);
    if (!isBookList(parsed)) throw new Error("The saved library is not a valid book list.");
    return { books: parsed, error: null };
  } catch (error) {
    return {
      books: initialBooks,
      error: error instanceof Error ? `Your saved library could not be read: ${error.message}` : "Your saved library could not be read.",
    };
  }
}

function isBook(value: unknown): value is Book {
  if (typeof value !== "object" || value === null) return false;
  const book = value as Partial<Book>;
  return typeof book.id === "string"
    && book.id.length > 0
    && typeof book.title === "string"
    && Array.isArray(book.authors)
    && book.authors.every((author) => typeof author === "string")
    && typeof book.genre === "string"
    && ["reading", "want", "finished"].includes(book.status ?? "")
    && typeof book.color === "string"
    && ["slim", "regular", "thick"].includes(book.size ?? "")
    && ["short", "regular", "tall"].includes(book.height ?? "")
    && ["new", "loved", "vintage"].includes(book.age ?? "")
    && ["paperback", "hardcover"].includes(book.format ?? "");
}

function isBookList(value: unknown): value is Book[] {
  return Array.isArray(value) && value.every(isBook)
    && new Set(value.map((book) => book.id)).size === value.length;
}

function SortableBook({ book, index, onSelect, draggable }: { book: Book; index: number; onSelect: () => void; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: book.id, disabled: !draggable });
  const width = book.size === "slim" ? 37 : book.size === "thick" ? 59 : 47;
  const height = book.height === "short" ? 139 : book.height === "tall" ? 185 : 164;
  const style = {
    "--book-color": book.color,
    "--book-width": `${width}px`,
    "--book-height": `${height}px`,
    transform: CSS.Transform.toString(transform),
    transition: transition ? `${transition}, translate .16s ease` : "transform .2s ease, translate .16s ease",
  } as React.CSSProperties;

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      className={`book-spine ${book.age} ${book.format} ${isDragging ? "is-dragging" : ""}`}
      style={{ ...style, "--book-index": index } as React.CSSProperties}
      onClick={onSelect}
      title={`${book.title} — ${book.authors.join(", ")}`}
      aria-label={`Open ${book.title} by ${book.authors.join(", ")}`}
    >
      <span className="spine-rule" />
      <span className="spine-title">{book.title}</span>
      <span className="spine-author">{book.authors[0]}</span>
      <span className="spine-bottom-rule" />
    </button>
  );
}

async function fetchOpenLibraryBooks(query: string): Promise<BookSearchResult> {
  const fields = "key,title,author_name,subject,first_publish_year,publisher,number_of_pages_median,cover_i";
  const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=${fields}`);
  if (!response.ok) throw new Error(`Google Books is rate-limited and Open Library returned ${response.status}. Please try again.`);
  const data: { docs?: OpenLibraryBook[] } = await response.json();
  const books = (data.docs ?? []).map((item, index): GoogleBook => ({
    id: `openlibrary:${item.key ?? `${item.title ?? "book"}-${index}`}`,
    volumeInfo: {
      title: item.title,
      authors: item.author_name,
      categories: item.subject,
      publishedDate: item.first_publish_year ? String(item.first_publish_year) : undefined,
      publisher: item.publisher?.[0],
      pageCount: item.number_of_pages_median,
      imageLinks: item.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` } : undefined,
    },
  }));
  return { books, source: "Open Library" };
}

async function fetchBooks(query: string): Promise<BookSearchResult> {
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books`);
  if (response.status === 429) return fetchOpenLibraryBooks(query);
  if (!response.ok) throw new Error(`Google Books returned ${response.status}. Please try again.`);
  const data: { items?: GoogleBook[] } = await response.json();
  return { books: data.items ?? [], source: "Google Books" };
}

function App() {
  const loaded = useMemo(readLibrary, []);
  const [books, setBooks] = useState<Book[]>(loaded.books);
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [queryText, setQueryText] = useState("");
  const [notice, setNotice] = useState(loaded.error ?? "");
  const [showHelp, setShowHelp] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const search = useQuery({
    queryKey: ["google-books", queryText],
    queryFn: () => fetchBooks(queryText),
    enabled: queryText.length > 0,
    retry: false,
    staleTime: 60_000,
  });

  const visibleBooks = useMemo(() => {
    const filtered = books.filter((book) => selectedStatus === "all" || book.status === selectedStatus);
    if (sortMode === "manual") return filtered;
    return [...filtered].sort((a, b) => {
      const aValue = sortMode === "title" ? a.title : sortMode === "author" ? a.authors[0] ?? "" : a.genre;
      const bValue = sortMode === "title" ? b.title : sortMode === "author" ? b.authors[0] ?? "" : b.genre;
      return aValue.localeCompare(bValue);
    });
  }, [books, selectedStatus, sortMode]);

  const counts = useMemo(() => ({
    all: books.length,
    reading: books.filter((book) => book.status === "reading").length,
    want: books.filter((book) => book.status === "want").length,
    finished: books.filter((book) => book.status === "finished").length,
  }), [books]);

  const shelfGenres = useMemo(() => [...new Set(books.map((book) => book.genre).filter(Boolean))].slice(0, 4), [books]);

  function updateBooks(next: Book[]) {
    setBooks(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? `Could not save your library: ${error.message}` : "Could not save your library.");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || sortMode !== "manual") return;
    const oldIndex = visibleBooks.findIndex((book) => book.id === active.id);
    const newIndex = visibleBooks.findIndex((book) => book.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reorderedView = arrayMove(visibleBooks, oldIndex, newIndex);
    const reorderedIds = reorderedView.map((book) => book.id);
    const replacement = [...books];
    let viewIndex = 0;
    for (let index = 0; index < replacement.length; index += 1) {
      if (selectedStatus === "all" || replacement[index].status === selectedStatus) {
        const reorderedBook = reorderedView[viewIndex];
        if (reorderedBook) replacement[index] = reorderedBook;
        viewIndex += 1;
      }
    }
    if (reorderedIds.length) updateBooks(replacement);
  }

  function addGoogleBook(item: GoogleBook, status: ReadingStatus = "want") {
    const info = item.volumeInfo;
    const book: Book = {
      id: item.id,
      title: info.title ?? "Untitled",
      authors: info.authors?.length ? info.authors : ["Unknown author"],
      genre: info.categories?.[0]?.split("/").at(-1)?.trim() ?? "Uncategorized",
      status,
      color: palette[books.length % palette.length],
      size: "regular",
      height: "regular",
      age: "new",
      format: "paperback",
      published: info.publishedDate,
      description: info.description,
      pageCount: info.pageCount,
      publisher: info.publisher,
      thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://"),
    };
    updateBooks([book, ...books]);
    setSearchOpen(false);
    setSearchText("");
    setQueryText("");
    setSelectedStatus("all");
  }

  function updateBook(updated: Book) {
    updateBooks(books.map((book) => book.id === updated.id ? updated : book));
    setSelectedBook(updated);
  }

  function removeBook(id: string) {
    updateBooks(books.filter((book) => book.id !== id));
    setSelectedBook(null);
  }

  function exportLibrary() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), books }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "my-digi-shelf.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importLibrary(file?: File) {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const imported = Array.isArray(parsed) ? parsed : (parsed as { books?: unknown })?.books;
      if (!isBookList(imported)) {
        throw new Error("This file does not look like a Digi Shelf library.");
      }
      updateBooks(imported);
      setNotice(`Imported ${imported.length} ${imported.length === 1 ? "book" : "books"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? `Import failed: ${error.message}` : "Import failed.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function searchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const term = searchText.trim();
    if (term) setQueryText(term);
  }

  const currentLabel = statuses.find((status) => status.id === selectedStatus)?.label ?? "All books";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Digi Shelf home">
          <span className="brand-mark"><Library size={19} strokeWidth={1.8} /></span>
          <span>digi<span className="brand-light">shelf</span></span>
        </a>
        <div className="side-label">YOUR LIBRARY</div>
        <nav className="shelf-nav" aria-label="Filter library by reading status">
          {statuses.map((status) => (
            <button key={status.id} type="button" className={`nav-item ${selectedStatus === status.id ? "active" : ""}`} aria-label={`${status.label}, ${counts[status.id]} books`} onClick={() => setSelectedStatus(status.id)}>
              <span className="nav-item-left">
                {status.id === "all" ? <Layers3 size={17} /> : status.id === "reading" ? <BookOpen size={17} /> : status.id === "want" ? <Bookmark size={17} /> : <Check size={17} />}
                {status.label}
              </span>
              <span className="nav-count">{counts[status.id]}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="side-label genre-label">ON YOUR SHELF</div>
        <div className="genre-list">
          {shelfGenres.map((genre) => <span className="genre-pill" key={genre}><span className="genre-dot" />{genre}</span>)}
          {shelfGenres.length === 0 && <span className="empty-genre">Your genres will show up here.</span>}
        </div>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <div className="note-icon"><Sparkles size={16} /></div>
          <p>A little home for your reading life.</p>
          <span>Made for the love of books.</span>
        </div>
        <button className="help-button" type="button" onClick={() => setShowHelp(true)}><CircleHelp size={16} /> How it works</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>My library</span><ChevronRight size={14} /><strong>{currentLabel}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" onClick={() => fileInput.current?.click()} title="Import library" aria-label="Import library"><CloudUpload size={18} /></button>
            <button className="icon-button" type="button" onClick={exportLibrary} title="Export library" aria-label="Export library"><Download size={18} /></button>
            <span className="topbar-divider" />
            <div className="avatar">S</div>
          </div>
          <input ref={fileInput} className="visually-hidden" type="file" accept=".json,application/json" onChange={(event) => void importLibrary(event.target.files?.[0])} />
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL LIBRARY</div>
              <h1>A shelf of your own<span className="title-period">.</span></h1>
              <p className="welcome-copy">Every story you love, all in one place.</p>
            </div>
            <button className="add-button" type="button" onClick={() => setSearchOpen(true)}><Plus size={18} /> Add a book</button>
          </section>

          {notice && <div className="notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15} /></button></div>}

          <section className="stats-row" aria-label="Library statistics">
            <div className="stat-card">
              <span className="stat-icon olive"><Library size={17} /></span>
              <div><strong>{counts.all}</strong><span>books on your shelf</span></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon rust"><BookOpen size={17} /></span>
              <div><strong>{counts.reading}</strong><span>currently reading</span></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon gold"><Bookmark size={17} /></span>
              <div><strong>{counts.finished}</strong><span>stories finished</span></div>
            </div>
            <div className="stat-card genre-stat">
              <span className="stat-icon blue"><Sparkles size={17} /></span>
              <div><strong>{shelfGenres.length}</strong><span>genres explored</span></div>
            </div>
          </section>

          <section className="shelf-section">
            <div className="section-heading">
              <div>
                <h2>{selectedStatus === "all" ? "Your bookshelf" : currentLabel}</h2>
                <span className="book-total">{visibleBooks.length} {visibleBooks.length === 1 ? "book" : "books"} <span className="heading-dot">·</span> looking lovely</span>
              </div>
              <div className="shelf-controls">
                <label className="sort-control">
                  <ArrowDownAZ size={16} />
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sort books">
                    <option value="manual">My order</option>
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="genre">Genre</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
                {sortMode === "manual" && <span className="drag-hint"><Grip size={14} /> Drag to arrange</span>}
              </div>
            </div>

            {visibleBooks.length > 0 ? (
              <div className="shelf-viewport">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={visibleBooks.map((book) => book.id)} strategy={horizontalListSortingStrategy}>
                    <div className="books-row">
                      {visibleBooks.map((book, index) => <SortableBook key={book.id} book={book} index={index} draggable={sortMode === "manual"} onSelect={() => setSelectedBook(book)} />)}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="shelf-board">
                  <div className="shelf-front"><span /><span /><span /></div>
                  <div className="shelf-shadow" />
                </div>
                <div className="shelf-scroll-hint"><ChevronLeft size={14} /> scroll to explore <ChevronRight size={14} /></div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><BookOpen size={26} /></div>
                <h3>No books here just yet</h3>
                <p>Add a book to start arranging your shelf.</p>
                <button className="text-button" type="button" onClick={() => setSearchOpen(true)}>Find your first book <ChevronRight size={15} /></button>
              </div>
            )}
          </section>

          <section className="bottom-row">
            <div className="quote-card">
              <span className="quote-mark">“</span>
              <p>There is no friend as loyal as a book.</p>
              <span className="quote-credit">— Ernest Hemingway</span>
            </div>
            <button className="transfer-card" type="button" onClick={() => fileInput.current?.click()}>
              <span className="transfer-icon"><CloudUpload size={18} /></span>
              <span><strong>Your shelf, wherever you go</strong><small>Import or export your library as a simple JSON file.</small></span>
              <ChevronRight size={17} className="transfer-arrow" />
            </button>
          </section>
          <footer className="footer-note">Your library is saved on this device <span>·</span> Google Books + Open Library search</footer>
        </div>
      </main>

      <AnimatePresence>
        {searchOpen && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
            <motion.div className="search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}>
              <div className="modal-heading">
                <div><span className="modal-eyebrow">GROW YOUR COLLECTION</span><h2 id="search-title">Find your next book</h2></div>
                <button className="icon-button" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={18} /></button>
              </div>
              <form className="search-form" onSubmit={searchSubmit}>
                <Search size={18} />
                <input autoFocus value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by title, author, or ISBN..." aria-label="Search Google Books" />
                <button type="submit">Search</button>
              </form>
              <div className="search-results">
                {!queryText && <div className="search-prompt"><Sparkles size={18} /><span>Find a book and make it yours.</span></div>}
                {search.isFetching && <div className="search-prompt"><span className="spinner" /> Looking through the stacks...</div>}
                {search.isError && <div className="search-error" role="alert">{search.error instanceof Error ? search.error.message : "Something went wrong while searching."}<button type="button" onClick={() => void search.refetch()}>Try again</button></div>}
                {search.isSuccess && search.data.books.length === 0 && <div className="search-prompt">No books found. Try a different search.</div>}
                {search.isSuccess && search.data.source === "Open Library" && <div className="search-source-note" role="status">Google Books daily quota reached. Showing Open Library results instead.</div>}
                {search.data?.books.map((item) => {
                  const info = item.volumeInfo;
                  const alreadyAdded = books.some((book) => book.id === item.id);
                  return (
                    <div className="result-item" key={item.id}>
                      {info.imageLinks?.thumbnail ? <img className="result-cover" src={info.imageLinks.thumbnail.replace("http://", "https://")} alt="" /> : <div className="result-cover result-cover-fallback"><BookOpen size={20} /></div>}
                      <div className="result-copy"><strong>{info.title ?? "Untitled"}</strong><span>{info.authors?.join(", ") ?? "Unknown author"}</span><small>{[info.publishedDate?.slice(0, 4), info.publisher].filter(Boolean).join(" · ")}</small></div>
                      <button className={`result-add ${alreadyAdded ? "added" : ""}`} type="button" disabled={alreadyAdded} onClick={() => addGoogleBook(item)}>{alreadyAdded ? <><Check size={15} /> Added</> : <><Plus size={15} /> Add</>}</button>
                    </div>
                  );
                })}
              </div>
              <div className="modal-footnote">{search.data?.source === "Open Library" ? "Book details provided by Open Library" : "Book details provided by Google Books"}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBook && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null); }}>
            <motion.div className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}>
              <div className="detail-top">
                <div className={`detail-spine ${selectedBook.age}`} style={{ "--book-color": selectedBook.color } as React.CSSProperties}><span>{selectedBook.title}</span></div>
                <div className="detail-title-wrap"><span className="modal-eyebrow">A BOOK ON YOUR SHELF</span><h2 id="detail-title">{selectedBook.title}</h2><p>{selectedBook.authors.join(", ")}</p><span className="genre-tag">{selectedBook.genre}</span></div>
                <button className="icon-button detail-close" type="button" onClick={() => setSelectedBook(null)} aria-label="Close details"><X size={18} /></button>
              </div>
              {selectedBook.description && <p className="book-description">{selectedBook.description}</p>}
              <div className="metadata-row">
                {selectedBook.published && <div><span>Published</span><strong>{selectedBook.published}</strong></div>}
                {selectedBook.publisher && <div><span>Publisher</span><strong>{selectedBook.publisher}</strong></div>}
                {selectedBook.pageCount && <div><span>Pages</span><strong>{selectedBook.pageCount}</strong></div>}
              </div>
              <div className="detail-fields">
                <label>Status<select value={selectedBook.status} onChange={(event) => updateBook({ ...selectedBook, status: event.target.value as ReadingStatus })}><option value="reading">Currently reading</option><option value="want">Want to read</option><option value="finished">Finished</option></select></label>
                <label>Shelf width<select value={selectedBook.size} onChange={(event) => updateBook({ ...selectedBook, size: event.target.value as BookSize })}><option value="slim">Slim</option><option value="regular">Regular</option><option value="thick">Thick</option></select></label>
                <label>Book height<select value={selectedBook.height} onChange={(event) => updateBook({ ...selectedBook, height: event.target.value as BookHeight })}><option value="short">Short</option><option value="regular">Regular</option><option value="tall">Tall</option></select></label>
                <label>Condition<select value={selectedBook.age} onChange={(event) => updateBook({ ...selectedBook, age: event.target.value as BookAge })}><option value="new">Like new</option><option value="loved">Well loved</option><option value="vintage">Vintage</option></select></label>
                <label>Edition<select value={selectedBook.format} onChange={(event) => updateBook({ ...selectedBook, format: event.target.value as BookFormat })}><option value="paperback">Paperback</option><option value="hardcover">Hardcover</option></select></label>
                <label>Spine color<select value={selectedBook.color} onChange={(event) => updateBook({ ...selectedBook, color: event.target.value })}>{palette.map((color) => <option value={color} key={color}>Color {palette.indexOf(color) + 1}</option>)}</select></label>
              </div>
              <div className="detail-footer"><button className="remove-button" type="button" onClick={() => removeBook(selectedBook.id)}>Remove from shelf</button><button className="done-button" type="button" onClick={() => setSelectedBook(null)}>Done</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}>
          <motion.div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <button className="icon-button help-close" type="button" onClick={() => setShowHelp(false)} aria-label="Close help"><X size={18} /></button>
            <span className="modal-eyebrow">A FEW LITTLE THINGS</span><h2 id="help-title">Make yourself at home.</h2>
            <ul className="help-list"><li><Grip size={17} /><span><strong>Arrange your shelf</strong>Drag books to put them in your own order, or sort by title, author, or genre.</span></li><li><Settings2 size={17} /><span><strong>Make each book yours</strong>Select any spine to change its size, height, condition, edition, and color.</span></li><li><CloudUpload size={17} /><span><strong>Take your library with you</strong>Use the import and export buttons to move your shelf between browsers.</span></li></ul>
            <button className="done-button help-done" type="button" onClick={() => setShowHelp(false)}>Lovely, thanks</button>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

export default App;
