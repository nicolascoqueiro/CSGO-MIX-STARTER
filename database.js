import sqlite3 from 'sqlite3';

// Conectar ao banco de dados SQLite (ou criar um se não existir)
const db = new sqlite3.Database('./player_data.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados', err);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        initializeDatabase();
    }
});

// Função para criar a tabela de jogadores se ela não existir
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT UNIQUE NOT NULL,
            points INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1
        )
    `, (err) => {
        if (err) {
            console.error('Erro ao criar tabela', err);
        } else {
            console.log('Tabela players criada ou já existe');
        }
    });
}

// Função para registrar um novo jogador
function registerPlayer(discordId) {
    db.run(`
        INSERT INTO players (discord_id)
        VALUES (?)
        ON CONFLICT(discord_id) DO NOTHING
    `, [discordId], (err) => {
        if (err) {
            console.error('Erro ao registrar jogador', err);
        } else {
            console.log('Jogador registrado com sucesso');
        }
    });
}

// Função para atualizar pontuação de um jogador
function updatePlayerPoints(discordId, points) {
    db.run(`
        UPDATE players
        SET points = points + ?
        WHERE discord_id = ?
    `, [points, discordId], (err) => {
        if (err) {
            console.error('Erro ao atualizar pontuação', err);
        } else {
            console.log('Pontuação atualizada com sucesso');
        }
    });
}

// Função para pegar informações de um jogador
function getPlayerInfo(discordId, callback) {
    db.get(`
        SELECT * FROM players
        WHERE discord_id = ?
    `, [discordId], (err, row) => {
        if (err) {
            console.error('Erro ao buscar jogador', err);
        } else {
            callback(row);
        }
    });
}

// Exportar as funções para serem usadas no app.js
export {
    registerPlayer,
    updatePlayerPoints,
    getPlayerInfo
};
