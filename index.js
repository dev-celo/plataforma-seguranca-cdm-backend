
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const XLSX = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "segredo_super";

const users = [
  { id: 1, username: "monica", password: bcrypt.hashSync("123456", 8) },
  { id: 2, username: "vannic", password: bcrypt.hashSync("123456", 8) }
];

let database = [];

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.sendStatus(403);
  }
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.sendStatus(401);

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.sendStatus(401);

  const token = jwt.sign({ id: user.id, username }, SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.post('/relatorio', auth, async (req, res) => {
  const data = { ...req.body, id: Date.now(), user: req.user.username };
  database.push(data);
  await fs.ensureDir('./data');
  await fs.writeJson(`./data/${data.id}.json`, data, { spaces: 2 });
  res.json(data);
});

app.get('/relatorios', auth, (req, res) => {
  res.json(database);
});

app.get('/export', auth, (req, res) => {
  const ws = XLSX.utils.json_to_sheet(database);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatorios");

  const file = "relatorios.xlsx";
  XLSX.writeFile(wb, file);
  res.download(file);
});

app.listen(3001, () => console.log("Backend rodando"));
