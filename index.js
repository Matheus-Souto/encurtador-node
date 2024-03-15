// index.js
import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

import supabase from './supabaseClient.js';
import { nanoid } from 'nanoid';

// Endpoint para registro de usuário
fastify.post('/signup', async (request, reply) => {
    const { email, password } = request.body;
    const { user, session, error } = await supabase.auth.signUp({
      email,
      password,
    });
  
    if (error) return reply.status(400).send(error);
    return { user, session };
  });
  
  // Endpoint para login de usuário
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    const { user, session, error } = await supabase.auth.signIn({
      email,
      password,
    });
  
    if (error) return reply.status(400).send(error);
    return { user, session };
  });

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.raw.url === '/login' || request.raw.url === '/signup') {
      return; // Não verifica autenticação para login e signup
    }
  
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Token não fornecido.' });
    }
  
    const { error } = await supabase.auth.api.getUser(token);
  
    if (error) {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
  });

// Rota para criar um link encurtado
fastify.post('/shorten', async (request, reply) => {
    const { originalUrl } = request.body;
    const shortUrl = `${process.env.BASE_URL}/${nanoid(7)}`; // Gera um ID curto

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
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'; // Fallback para localhost
    const fullShortUrl = `${baseUrl}/${shortUrl}`;

    // Recupera o link encurtado do banco de dados
    const { data: linkData, error: linkError } = await supabase
        .from('links')
        .select('original_url, clicks, id')
        .eq('short_url', fullShortUrl)
        .single();

    if (linkError || !linkData) {
        console.error('Erro ao buscar o link:', linkError);
        return reply.status(404).send({ error: 'Link não encontrado.' });
    }

    // Incrementa o contador de cliques de forma segura
    const { error: updateError } = await supabase
        .from('links')
        .update({ clicks: linkData.clicks + 1 })
        .match({ id: linkData.id });

    if (updateError) {
        console.error('Erro ao atualizar os cliques:', updateError);
        return reply.status(500).send({ error: 'Erro ao atualizar os cliques.' });
    }

    // Redireciona para a URL original
    return reply.redirect(linkData.original_url);
});


// Rota para obter a contagem de cliques de um link encurtado
fastify.get('/clicks/:shortUrl', async (request, reply) => {
    const { shortUrl } = request.params;
    const { data, error } = await supabase
        .from('links')
        .select('clicks')
        .eq('short_url', `${process.env.BASE_URL}/${shortUrl}`)
        .single();

    if (error || !data) return reply.status(404).send({ error: 'Link não encontrado.' });

    return reply.send({ clicks: data.clicks });
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
