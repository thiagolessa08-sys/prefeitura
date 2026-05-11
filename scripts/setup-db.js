const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.DATABASE_PATH || './data/prefeitura.db'
const dbPath = path.resolve(process.cwd(), DB_PATH)
const dir = path.dirname(dbPath)

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

const count = db.prepare('SELECT COUNT(*) as n FROM usuarios').get().n
if (count === 0) {
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)').run(
    'Administrador', 'admin@prefeitura.com', hash
  )
  console.log('✅ Usuário admin criado: admin@prefeitura.com / admin123')
} else {
  console.log(`ℹ️  Banco já inicializado (${count} usuário(s))`)
}

db.close()
console.log('✅ Banco configurado em', dbPath)
