const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "ClipadasL7";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Banco SQLite
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS participantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canal TEXT,
      link TEXT,
      visualizacoes INTEGER DEFAULT 0,
      aprovado INTEGER DEFAULT 0
    )
  `);
});

// Simulação de atualização automática a cada 1 hora
cron.schedule("0 * * * *", () => {
  db.all("SELECT * FROM participantes WHERE aprovado = 1", (err, rows) => {
    if (rows) {
      rows.forEach((p) => {
        const novasViews = p.visualizacoes + Math.floor(Math.random() * 100);
        db.run(
          "UPDATE participantes SET visualizacoes = ? WHERE id = ?",
          [novasViews, p.id]
        );
      });
      console.log("Visualizações atualizadas.");
    }
  });
});

// Página principal
app.get("/", (req, res) => {
  db.all(
    "SELECT * FROM participantes WHERE aprovado = 1 ORDER BY visualizacoes DESC LIMIT 50",
    (err, rows) => {
      let html = `
      <h1>🏆 CLIPADAS L7</h1>
      <h3>Campeonato de 30 dias</h3>
      <p>
      1º - 1500 Robux<br>
      2º - 1000 Robux<br>
      3º - 750 Robux<br>
      4º ao 6º - 250 Robux
      </p>
      <hr>
      <h2>Ranking</h2>
      `;

      rows.forEach((p, index) => {
        html += `<p>${index + 1}º - ${p.canal} - ${p.visualizacoes} visualizações</p>`;
      });

      html += `
      <hr>
      <h2>Enviar Perfil</h2>
      <form method="POST" action="/enviar">
      Nome do Canal:<br>
      <input name="canal" required><br><br>
      Link do Perfil TikTok:<br>
      <input name="link" required><br><br>
      <button type="submit">Enviar</button>
      </form>
      `;

      res.send(html);
    }
  );
});

// Envio
app.post("/enviar", (req, res) => {
  const { canal, link } = req.body;

  db.run(
    "INSERT INTO participantes (canal, link) VALUES (?, ?)",
    [canal, link],
    () => {
      res.send("Perfil enviado para aprovação!");
    }
  );
});

// Aprovação automática com senha
app.post("/aprovar", (req, res) => {
  const { senha } = req.body;

  if (senha === ADMIN_PASSWORD) {
    db.run("UPDATE participantes SET aprovado = 1 WHERE aprovado = 0");
    res.send("Participantes aprovados!");
  } else {
    res.send("Senha incorreta!");
  }
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
