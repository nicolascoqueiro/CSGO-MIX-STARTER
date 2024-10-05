import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { registerPlayer, updatePlayerPoints, getPlayerInfo, existingPlayer } from './database.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Necessário para manipular membros
    ]
});

// Função para registrar os comandos slash
const commands = [
    {
        name: 'register',
        description: 'Registra o jogador no sistema.'
    },
    {
        name: 'addpoints',
        description: 'Adiciona pontos ao jogador.',
        options: [
            {
                name: 'points',
                description: 'Número de pontos a adicionar',
                type: 4, // Integer
                required: true
            }
        ]
    },
    {
        name: 'profile',
        description: 'Exibe o perfil do jogador.'
    },
    {
        name: 'startmix',
        description: 'Inicia o mix e organiza os jogadores.'
    }
];

// Registrar os comandos no Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registrando comandos slash...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.APP_ID, process.env.SERVER_ID), // Usa as variáveis do .env
            { body: commands }
        );

        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }
})();

// Lidar com comandos slash
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'register') {
        const channelId = '1292267326678237276'; // ID do canal específico para registro
        if (interaction.channel.id !== channelId) {
            return interaction.reply('Você só pode se registrar nesse canal <#1292267326678237276>.');
        }

        // Verifica se o jogador já está registrado
        const playerExists = await existingPlayer(interaction.user.id);
        if (playerExists) {
            return interaction.reply('Você já está registrado no sistema!');
        }

        await registerPlayer(interaction.user.id);
        await interaction.reply('Você foi registrado no sistema!');
    }

    if (commandName === 'addpoints') {
        const points = interaction.options.getInteger('points');
        updatePlayerPoints(interaction.user.id, points);
        await interaction.reply(`Você recebeu ${points} pontos!`);
    }

    if (commandName === 'profile') {
        getPlayerInfo(interaction.user.id, (player) => {
            if (player) {
                interaction.reply(`ID: ${player.discord_id}, Pontos: ${player.points}, Nível: ${player.level}`);
            } else {
                interaction.reply('Você ainda não está registrado.');
            }
        });
    }

    if (commandName === 'startmix') {
        const waitingChannel = 'ID_DO_CANAL_DE_ESPERA'; // Substitua pelo ID do canal de espera
        const players = await getPlayersInWaitingChannel(interaction.guild, waitingChannel);

        if (players.length >= 10) {
            const { teamTR, teamCT } = balanceTeams(players);
            await createTeamsChannels(interaction.guild, teamTR, teamCT);
            interaction.reply('Times criados com sucesso! Bons jogos!');
        } else {
            interaction.reply('Aguardando mais jogadores para iniciar a partida...');
        }
    }
});

// Função para obter jogadores no canal de espera
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
            member.score = row.points;
            member.level = row.level;
        }
    }

    return members;
};

// Função para balancear os times
const balanceTeams = (players) => {
    players.sort((a, b) => b.level - a.level);
    const teamTR = [];
    const teamCT = [];

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

// Iniciar o bot
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
