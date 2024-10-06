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

// Função para criar a tabela de jogadores se ela não existir, com os novos campos
function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT UNIQUE NOT NULL,
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        mvp INTEGER DEFAULT 0,
        partidas_jogadas INTEGER DEFAULT 0,
        vitorias INTEGER DEFAULT 0,
        derrotas INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela', err);
        } else {
            console.log('Tabela players criada ou já existe');
        }
    });
}

// Função para registrar um novo jogador
function registerPlayer(discordId) {
    db.run(`INSERT INTO players (discord_id)
            VALUES (?) ON CONFLICT(discord_id) DO NOTHING`, [discordId], (err) => {
        if (err) {
            console.error('Erro ao registrar jogador', err);
        } else {
            console.log('Jogador registrado com sucesso');
        }
    });
}

// Função para atualizar as estatísticas de um jogador
function updatePlayerStats(discordId, points, mvp, vitorias, derrotas) {
    db.run(`UPDATE players
            SET points = points + ?, 
                mvp = mvp + ?,
                partidas_jogadas = partidas_jogadas + 1,
                vitorias = vitorias + ?,
                derrotas = derrotas + ?
            WHERE discord_id = ?`, [points, mvp, vitorias, derrotas, discordId], (err) => {
        if (err) {
            console.error('Erro ao atualizar estatísticas do jogador', err);
        } else {
            console.log('Estatísticas do jogador atualizadas com sucesso');
        }
    });
}

// Função para obter informações do jogador
function getPlayerInfo(playerId, callback) {
    db.get('SELECT * FROM players WHERE discord_id = ?', [playerId], (err, row) => {
        if (err) {
            console.error(err.message);
            return callback(null); // Chama a callback com null em caso de erro
        }
        callback(row); // Chama a callback com a linha encontrada
    });
}

// Função para atualizar pontuação de um jogador
function updatePlayerPoints(discordId, points) {
    db.run(`UPDATE players
            SET points = points + ?
            WHERE discord_id = ?`, [points, discordId], (err) => {
        if (err) {
            console.error('Erro ao atualizar pontuação', err);
        } else {
            console.log('Pontuação atualizada com sucesso');
        }
    });
}

// Função para verificar se um jogador existe
const existingPlayer = (discordId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM players WHERE discord_id = ?`, [discordId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Função para atualizar o ranking automaticamente
const updatePlayerStatsMessage = async (client) => {
    console.log('Atualizando ranking dos jogadores...');
    const channelId = '1291592776768557056'; // ID do canal onde a mensagem será postada
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        console.error('Canal não encontrado!');
        return;
    }

    // Buscar informações de todos os jogadores
    db.all(`SELECT discord_id, points, level, mvp, partidas_jogadas, vitorias, derrotas FROM players`, async (err, rows) => {
        if (err) {
            console.error('Erro ao buscar jogadores:', err);
            return;
        }

        if (rows.length === 0) {
            console.log('Nenhum jogador registrado no sistema');
            return;
        }

        // Montar a mensagem com as informações dos jogadores
        let messageContent = '📊 **Ranking dos Jogadores**\n\n';

        for (const [index, row] of rows.entries()) {
            try {
                const user = await client.users.fetch(row.discord_id);
                messageContent += `${index + 1}. **${user.username}**\n`;
                messageContent += `- Pontos: ${row.points}\n`;
                messageContent += `- Nível: ${row.level}\n`;
                messageContent += `- MVPs: ${row.mvp}\n`;
                messageContent += `- Partidas Jogadas: ${row.partidas_jogadas}\n`;
                messageContent += `- Vitórias: ${row.vitorias}\n`;
                messageContent += `- Derrotas: ${row.derrotas}\n\n`;
            } catch (fetchError) {
                console.error(`Erro ao buscar o usuário com ID ${row.discord_id}:`, fetchError);
            }
        }

        // Verifica se já existe uma mensagem fixada no canal para atualizar
        const pinnedMessages = await channel.messages.fetchPinned();
        let statsMessage = pinnedMessages.find(msg => msg.author.id === client.user.id);

        if (statsMessage) {
            // Editar a mensagem existente
            await statsMessage.edit(messageContent);
        } else {
            // Enviar uma nova mensagem e fixá-la
            statsMessage = await channel.send(messageContent);
            await statsMessage.pin();
        }
    });
};

// Função para finalizar uma partida
const finalizeMatch = async (winningTeam, mvpId, losingTeam, client) => {
    // Atualiza pontos dos jogadores no banco de dados
    const winningPoints = 10;
    const losingPoints = -10;
    const mvpBonus = 15;

    for (const playerId of winningTeam) {
        updatePlayerStats(playerId, winningPoints, mvpId === playerId ? mvpBonus : 0, 1, 0);
    }

    for (const playerId of losingTeam) {
        updatePlayerStats(playerId, losingPoints, 0, 0, 1);
    }

    // Mencionar os jogadores do time vencedor
    const channelId = '1291592776768557056'; // ID do canal de ranking
    const channel = client.channels.cache.get(channelId);
    const winnerMention = winningTeam.map(id => `<@${id}>`).join(', ');

    await channel.send(`🏆 **Parabéns ao time vencedor: ${winnerMention}**! A pontuação será atualizada no ranking em breve.`);
    updatePlayerStatsMessage(client); // Atualiza o ranking após a finalização
};

// Exportar as funções para serem usadas no app.js
export {
    registerPlayer,
    updatePlayerPoints,
    getPlayerInfo,  // Exporte aqui
    existingPlayer,
    updatePlayerStatsMessage,
    finalizeMatch
};

// Exportar a conexão com o banco de dados
export { db };
