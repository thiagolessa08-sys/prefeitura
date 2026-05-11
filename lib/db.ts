import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || './data/prefeitura.db'

function getDbPath() {
  const dbPath = path.resolve(process.cwd(), DB_PATH)
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dbPath
}

let db: Database.Database | null = null

export function getDb() {
  if (!db) {
    db = new Database(getDbPath())
    db.pragma('journal_mode = WAL')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const count = (db.prepare('SELECT COUNT(*) as n FROM usuarios').get() as { n: number }).n
  if (count === 0) {
    const senhaHash = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)').run(
      'Administrador',
      'admin@prefeitura.com',
      senhaHash
    )
  }
}
