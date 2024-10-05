const { Client, GatewayIntentBits } = require('discord.js');
const { registerPlayer } = require('../database'); // Ajuste o caminho conforme necessário

// Mock do módulo registerPlayer
jest.mock('../database', () => ({
    registerPlayer: jest.fn(),
}));

describe('Bot Test Suite', () => {
    let client;

    beforeEach(() => {
        client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    });

    test('should register a player', () => {
        console.log('Emitting messageCreate event...'); // Log para depuração

        // Emite o evento de mensagem
        client.emit('messageCreate', {
            content: '!register',
            author: { id: '12345', username: 'Player' },
            reply: jest.fn(),
        });

        // Verifica se a função registerPlayer foi chamada
        expect(registerPlayer).toHaveBeenCalledWith('12345', 'Player');
    });
});
