// index.js
import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

import supabase from './supabaseClient.js';
import { nanoid } from 'nanoid';

// Rota para criar um link encurtado
fastify.post('/shorten', async (request, reply) => {
    const { originalUrl } = request.body;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${nanoid(7)}`; // Gera um ID curto

    const { data, error } = await supabase
        .from('links')
        .insert([{ original_url: originalUrl, short_url: shortUrl }]);

    if (error) {
        console.error('Erro ao inserir no Supabase:', error);
        return reply.status(500).send({ error: 'Erro ao salvar no banco de dados.' });
    }

    return { shortUrl };
});

// Rota para redirecionar usando um link encurtado
fastify.get('/:shortUrl', async (request, reply) => {
    const { shortUrl } = request.params;
    const { data, error } = await supabase
        .from('links')
        .select('original_url')
        .eq('short_url', `${baseUrl}/${shortUrl}`)
        .single();

    if (error || !data) return reply.status(404).send({ error: 'Link não encontrado.' });

    return reply.redirect(data.original_url);
});

const start = async () => {
    try {
        const port = process.env.PORT || 3000; // Usa a porta do Render ou 3000 localmente
        await fastify.listen(port, '0.0.0.0'); // Importante: ouça em '0.0.0.0' para aceitar conexões externas
        fastify.log.info(`server listening on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
