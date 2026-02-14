const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const sqlite3 = require("sqlite3").verbose();
const cron = require("node-cron");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ADMIN_PASSWORD = "ClipadasL7";
const PORT = process.env.PORT || 3000;

// Banco de dados
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

// Função para pegar visualizações do perfil
async function pegarVisualizacoes(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const texto = $("strong[data-e2e='followers-count']").first().text();
    const numero = parseInt(texto.replace(/\D/g, "")) || 0;

    return numero;
  } catch (err) {
    return 0;
  }
}

// Atualização automática a cada 1 hora
cron.schedule("0 * * * *", async () => {
  db.all("SELECT * FROM participantes WHERE aprovado = 1", async (err, rows) => {
    if (rows) {
      for (let p of rows) {
        const views = await pegarVisualizacoes(p.link);
        db.run("UPDATE participantes SET visualizacoes = ? WHERE id = ?", [
          views,
          p.id,
        ]);
      }
      console.log("Atualização automática feita.");
    }
  });
});

// Página principal
app.get("/", (req, res) => {
  db.all(
    "SELECT * FROM participantes WHERE aprovado = 1 ORDER BY visualizacoes DESC",
    (err, rows) => {
      let html = `
      <h1>🏆 CLIPADAS L7</h1>
      <h2>Campeonato de 30 dias</h2>
      <p>1º - 1500 Robux<br>
      2º - 1000 Robux<br>
      3º - 750 Robux<br>
      4º ao 6º - 250 Robux</p>
      <hr>
      <h2>Ranking</h2>
      `;

      rows.forEach((p, index) => {
        html += `<p>${index + 1}º - ${p.canal} - ${p.visualizacoes} visualizações</p>`;
      });

      html += `
      <hr>
      <h2>Enviar canal</h2>
      <form method="POST" action="/enviar">
      Nome do canal: <input name="canal" required><br>
      Link do perfil: <input name="link" required><br>
      <button type="submit">Enviar</button>
      </form>
      `;

      res.send(html);
    }
  );
});

// Envio do participante
app.post("/enviar", (req, res) => {
  const { canal, link } = req.body;

  db.run(
    "INSERT INTO participantes (canal, link) VALUES (?, ?)",
    [canal, link],
    () => {
      res.send("Canal enviado para aprovação!");
    }
  );
});

// Painel admin
app.get("/admin", (req, res) => {
  db.all("SELECT * FROM participantes WHERE aprovado = 0", (err, rows) => {
    let html = `<h1>Painel Admin</h1>
    <form method="POST" action="/aprovar">
    Senha: <input name="senha" type="password">
    <button type="submit">Entrar</button>
    </form>`;

    rows.forEach((p) => {
      html += `<p>${p.canal} - ${p.link}</p>`;
    });

    res.send(html);
  });
});

app.post("/aprovar", (req, res) => {
  if (req.body
