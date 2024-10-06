import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db, registerPlayer, updatePlayerPoints, getPlayerInfo, existingPlayer } from './database.js';

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
        description: 'Adiciona pontos a um jogador.',
        options: [
            {
                name: 'player',
                description: 'Mencione o jogador para quem você deseja adicionar pontos.',
                type: 6, // User
                required: true
            },
            {
                name: 'points',
                description: 'Número de pontos a adicionar.',
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
            Routes.applicationGuildCommands(process.env.APP_ID, process.env.SERVER_ID),
            { body: commands }
        );

        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }
})();

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const registerChannelId = '1292267326678237276'; // Canal específico para o comando /register
    const profileChannelId = '1292514948273930364'; // Canal específico para o comando /profile

    if (commandName === 'register') {
        // Verifica se o comando está sendo executado no canal correto para registro
        if (interaction.channel.id !== registerChannelId) {
            return interaction.reply(`Você só pode usar o comando /register nesse canal <#${registerChannelId}>.`);
        }

        // Verifica se o jogador já está registrado
        const playerExists = await existingPlayer(interaction.user.id);
        if (playerExists) {
            return interaction.reply('Você já está registrado no sistema!');
        }

        await registerPlayer(interaction.user.id);
        
        // Atribui cargo ao jogador
        const roleId = '1292615895616721049';
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(roleId);
        
        await interaction.reply('Você foi registrado no sistema e recebeu um cargo!');
    }

    if (commandName === 'profile') {
        const playerId = interaction.user.id; // Obtém o ID do jogador
        getPlayerInfo(playerId, (player) => { // Passa a função callback
            if (player) {
                showProfile(interaction, player); // Chama a função para mostrar o perfil
            } else {
                interaction.reply('Você ainda não está registrado.'); // Responde se o jogador não estiver registrado
            }
        });
    }

    if (commandName === 'addpoints') {
        const player = interaction.options.getUser('player'); // Obtém o usuário mencionado
        const pointsToAdd = interaction.options.getInteger('points');

        // Atualiza a pontuação do jogador no banco de dados
        if (player) {
            await updatePlayerPoints(player.id, pointsToAdd);
            await interaction.reply(`Adicionados ${pointsToAdd} pontos ao jogador <@${player.id}> com sucesso!`);
            await updatePlayerRoles(player.id); // Atualiza os cargos após adicionar pontos
        } else {
            await interaction.reply('Jogador não encontrado.');
        }
    }

    if (commandName === 'startmix') {
        // Lógica para iniciar o mix
        await interaction.reply('Mix iniciado!');

        // Criação da mensagem interativa com o botão "finalizar"
        const button = new ButtonBuilder()
            .setCustomId('finalizar')
            .setLabel('Finalizar')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.channel.send({ content: 'Clique no botão para finalizar a partida.', components: [row] });
    }
});

// Função para mostrar o perfil do jogador
async function showProfile(interaction, player) {
    if (!player) {
        return interaction.reply('Jogador não encontrado.');
    }

    // Tente buscar o membro pelo ID do jogador
    const member = await interaction.guild.members.fetch(player.discord_id).catch(() => null);
    const username = member ? member.user.username : 'Usuário não encontrado';

    const profileEmbed = {
        color: 0x0099ff,
        title: `Perfil de ${username}`,
        fields: [
            { name: 'Discord ID', value: player.discord_id || 'Desconhecido', inline: true },
            { name: 'Pontos', value: player.points !== undefined ? player.points.toString() : '0', inline: true },
            { name: 'Nível', value: player.level !== undefined ? player.level.toString() : '0', inline: true },
            { name: 'MVPs', value: player.mvp !== undefined ? player.mvp.toString() : '0', inline: true },
            { name: 'Partidas Jogadas', value: player.partidas_jogadas !== undefined ? player.partidas_jogadas.toString() : '0', inline: true },
            { name: 'Vitórias', value: player.vitorias !== undefined ? player.vitorias.toString() : '0', inline: true },
            { name: 'Derrotas', value: player.derrotas !== undefined ? player.derrotas.toString() : '0', inline: true },
        ],
    };

    interaction.reply({ embeds: [profileEmbed] });
}

// Função para atualizar os cargos de acordo com os pontos
async function updatePlayerRoles(playerId) {
    const playerInfo = await getPlayerInfo(playerId); // Obter informações do jogador

    const roles = [
        { points: 50, roleId: '1291206360200904705' },
        { points: 100, roleId: '1291206609158017165' },
        { points: 150, roleId: '1291206689625870407' },
        { points: 200, roleId: '1291206787936288858' },
        { points: 250, roleId: '1291206839668707389' },
        { points: 300, roleId: '1291206883126022144' },
        { points: 350, roleId: '1291206933130379284' },
        { points: 400, roleId: '1291207022879965387' },
        { points: 450, roleId: '1291207071911510067' },
        { points: 500, roleId: '1291207091129679882' }
    ];

    const member = await client.guilds.cache.get(process.env.SERVER_ID).members.fetch(playerId);

    // Remover cargos antigos
    const currentRoles = member.roles.cache.filter(role => role.id !== member.id); // Remove o cargo do bot
    await member.roles.remove(currentRoles);

    // Atribuir novos cargos com base nos pontos
    roles.forEach(async (role) => {
        if (playerInfo.points >= role.points) {
            await member.roles.add(role.roleId);
        }
    });
}

// Lidar com cliques nos botões
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId } = interaction;

    if (customId === 'finalizar') {
        // Verifica se o usuário tem um dos cargos específicos
        const rolesAllowed = ['1291208084491862016', '1292327353988550739', '1291206019665498122'];
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const hasRole = rolesAllowed.some(roleId => member.roles.cache.has(roleId));

        if (!hasRole) {
            return interaction.reply('Você não tem permissão para finalizar a partida.');
        }

        // Aqui você pode adicionar lógica para decidir o time vencedor e o MVP.
        // Este é um exemplo básico; ajuste conforme suas necessidades.
        const winningTeam = 'Time A'; // Substitua pela lógica de seleção de time vencedor
        const mvpUserId = 'ID_DO_MVP'; // Substitua pela lógica de seleção do MVP

        // Atualiza pontos para o time vencedor e perdedor
        const winningPoints = 10;
        const losingPoints = -10;

        await updatePlayerPoints(winningTeam, winningPoints); // Atualize a lógica conforme necessário
        await updatePlayerPoints(mvpUserId, 15); // Adiciona 15 pontos ao MVP

        // Resposta final
        await interaction.reply(`A partida foi finalizada! O ${winningTeam} venceu! MVP: <@${mvpUserId}>`);
    }
});

// Iniciar o bot
client.login(process.env.DISCORD_TOKEN);
