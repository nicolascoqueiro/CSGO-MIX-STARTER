import dotenv from 'dotenv'; // Importa a biblioteca dotenv
dotenv.config(); // Carrega as variáveis do arquivo .env

import { Client, GatewayIntentBits } from 'discord.js'; // Importa os módulos do discord.js
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Certifique-se de incluir este intent
    ]
});

import { registerPlayer, updatePlayerPoints, getPlayerInfo } from './database.js'; // Não esqueça de adicionar .js

// Exemplo de como usar as funções dentro de comandos do bot
client.on('messageCreate', (message) => {
    if (message.content === '!register') {
        registerPlayer(message.author.id);
        message.channel.send('Você foi registrado no sistema!');
    }

    if (message.content.startsWith('!addpoints')) {
        const points = parseInt(message.content.split(' ')[1]);
        if (!isNaN(points)) {
            updatePlayerPoints(message.author.id, points);
            message.channel.send(`Você recebeu ${points} pontos!`);
        } else {
            message.channel.send('Por favor, forneça um número válido de pontos.');
        }
    }

    if (message.content === '!profile') {
        getPlayerInfo(message.author.id, (player) => {
            if (player) {
                message.channel.send(`ID: ${player.discord_id}, Pontos: ${player.points}, Nível: ${player.level}`);
            } else {
                message.channel.send('Você ainda não está registrado.');
            }
        });
    }
});

// Função para obter todos os jogadores no canal de espera
const getPlayersInWaitingChannel = async (guild, waitingChannel) => {
    const channel = guild.channels.cache.get(waitingChannel);
    if (!channel) return [];

    const members = channel.members.map(member => {
        return {
            id: member.id,
            username: member.user.username,
            score: 0,
            level: 0
        };
    });

    // Obter a pontuação e nível dos jogadores
    for (const member of members) {
        const row = await new Promise((resolve, reject) => {
            db.get(`SELECT points, level FROM players WHERE discord_id = ?`, [member.id], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar jogador:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        if (row) {
            member.score = row.points; // Corrigido para usar 'points'
            member.level = row.level;
        }
    }

    return members;
};

// Função para balancear os times
const balanceTeams = (players) => {
    // Ordena jogadores pelo nível
    players.sort((a, b) => b.level - a.level);
    const teamTR = [];
    const teamCT = [];

    // Divide os jogadores em times alternadamente
    players.forEach((player, index) => {
        if (index % 2 === 0) {
            teamTR.push(player);
        } else {
            teamCT.push(player);
        }
    });

    return { teamTR, teamCT };
};

// Criação de canais e movimentação dos jogadores
const createTeamsChannels = async (guild, teamTR, teamCT) => {
    const trChannel = await guild.channels.create('Time TR', { type: 'GUILD_VOICE' });
    const ctChannel = await guild.channels.create('Time CT', { type: 'GUILD_VOICE' });

    // Mover jogadores para os canais correspondentes
    teamTR.forEach(player => {
        const member = guild.members.cache.get(player.id);
        if (member) {
            member.voice.setChannel(trChannel).catch(console.error);
        }
    });

    teamCT.forEach(player => {
        const member = guild.members.cache.get(player.id);
        if (member) {
            member.voice.setChannel(ctChannel).catch(console.error);
        }
    });
};

// Comando para iniciar mix e organizar os jogadores
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!startmix')) {
        const waitingChannel = '1291205321674588186';
        const players = await getPlayersInWaitingChannel(message.guild, waitingChannel);

        if (players.length >= 10) {
            const { teamTR, teamCT } = balanceTeams(players);
            await createTeamsChannels(message.guild, teamTR, teamCT);
            message.channel.send('Times criados com sucesso! Bons jogos!');
        } else {
            message.reply('Aguardando mais jogadores para iniciar a partida...');
        }
    }
});
//relacao cargo com nivel

/*import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();
import { registerPlayer, updatePlayerPoints, getPlayerInfo } from './database.js';

const client = new Client({ intents: [GatewayIntentBits.GUILDS, GatewayIntentBits.GUILD_MESSAGES, GatewayIntentBits.GUILD_MEMBERS] }); // Adicione GUILD_MEMBERS para obter informações de membros

// Função para atribuir cargo baseado em pontos
const assignRoleBasedOnPoints = async (member, points) => {
    const guild = member.guild;

    // Aqui você define suas regras de cargo
    let roleId; // Substitua com o ID do cargo correspondente

    if (points >= 1000) {
        roleId = 'ID_DO_CARGO_1000'; // Substitua com o ID do cargo para 1000 pontos
    } else if (points >= 500) {
        roleId = 'ID_DO_CARGO_500'; // Substitua com o ID do cargo para 500 pontos
    } else if (points >= 100) {
        roleId = 'ID_DO_CARGO_100'; // Substitua com o ID do cargo para 100 pontos
    }

    if (roleId) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
            await member.roles.add(role).catch(console.error);
            console.log(`Cargo ${role.name} atribuído a ${member.user.tag}`);
        }
    }
};

// Atualizar a função de atualização de pontos
async function updatePlayerPoints(discordId, points) {
    db.run(`
        UPDATE players
        SET points = points + ?
        WHERE discord_id = ?
    `, [points, discordId], async (err) => {
        if (err) {
            console.error('Erro ao atualizar pontuação', err);
        } else {
            console.log('Pontuação atualizada com sucesso');
            
            // Obter o membro do Discord
            const member = await client.guilds.cache.first().members.fetch(discordId).catch(console.error); // Altere para obter o membro correto

            if (member) {
                const newPoints = member.points + points; // Obtenha a nova pontuação após a atualização
                await assignRoleBasedOnPoints(member, newPoints); // Chama a função para atribuir cargo
            }
        }
    });
}

// Resto do código...

client.login(process.env.DISCORD_TOKEN);
 */


// Iniciar o bot
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
