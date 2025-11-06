const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Conectar ao banco de dados
connectDB();

const app = express();
const porta = 3000;

// ============================
// MIDDLEWARES
// ============================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ============================
// SCHEMAS E MODELS
// ============================

// Schema de Usuário
const usuarioSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    cracha: { type: String, required: true },
    nome: { type: String, required: true },
    cargo: { type: String, default: 'Operador' },
    tipoUsuario: { type: String, enum: ['admin', 'usuario'], default: 'usuario' }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

// Schema de Tanque
const tanqueSchema = new mongoose.Schema({
    nome: { type: String, required: true, unique: true },
    peso: { type: Number, default: 0 },
    quantidade: { type: Number, default: 0 },
    capacidade: { type: Number, default: 1000 },
    nivel: { type: Number, default: 0, min: 0, max: 100 },
    unidade: { type: String, default: 'L' }
});

const Tanque = mongoose.model('Tanque', tanqueSchema);

// Schema de Solicitação
const solicitacaoSchema = new mongoose.Schema({
    solicitacaoNumero: {
        type: Number,
        unique: true,
        index: true
    },
    usuarioEmail: { type: String, required: true },
    usuarioCracha: { type: String, required: true },
    usuarioCargo: { type: String, default: 'Operador' },
    tipoProduto: { type: String, required: true },
    quantidade: { type: Number, required: true },
    unidade: { type: String, required: true },
    status: {
        type: String,
        enum: ['pendente', 'aceito', 'recusado', 'em_espera', 'preparacao', 'a_caminho', 'entregue'],
        default: 'pendente'
    },
    previsaoEntrega: { type: Date },
    dataSolicitacao: {
        type: Date,
        default: Date.now
    },
    observacoes: { type: String },
    folhaPagamento: {
        valorTotal: Number,
        dataPagamento: Date,
        statusPagamento: String
    }
});

const Solicitacao = mongoose.model('Solicitacao', solicitacaoSchema);

// Schema de Notificação
const notificacaoSchema = new mongoose.Schema({
    usuarioEmail: { type: String, required: true },
    tipo: { type: String, required: true },
    mensagem: { type: String, required: true },
    solicitacaoId: { type: mongoose.Schema.Types.ObjectId },
    lida: {
        type: Boolean,
        default: false
    },
    dataNotificacao: {
        type: Date,
        default: Date.now
    }
});

const Notificacao = mongoose.model('Notificacao', notificacaoSchema);

// Schema de Atividade
const atividadeSchema = new mongoose.Schema({
    usuarioEmail: { type: String, required: true },
    tipo: { type: String, required: true },
    descricao: { type: String, required: true },
    dataAtividade: {
        type: Date,
        default: Date.now
    }
});

const Atividade = mongoose.model('Atividade', atividadeSchema);

// Schema do Contador
const contadorSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sequence_value: { type: Number, default: 0 }
});

const Contador = mongoose.model('Contador', contadorSchema);

// ============================
// FUNÇÃO AUXILIAR - CONTADOR
// ============================
async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Contador.findByIdAndUpdate(
        sequenceName,
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.sequence_value;
}

// ============================
// ROTAS DE AUTENTICAÇÃO
// ============================

// Login
app.post('/api/login', async function(req, res) {
    try {
        const { email, cracha } = req.body;

        console.log('Tentativa de login:', { email, cracha });

        if (!email || !cracha) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Email e crachá são obrigatórios' 
            });
        }

        const usuarioEncontrado = await Usuario.findOne({
            email: email.trim().toLowerCase(),
            cracha: cracha.toString().trim()
        });

        console.log('Usuário encontrado:', usuarioEncontrado);

        if (usuarioEncontrado) {
            await Atividade.create({
                usuarioEmail: usuarioEncontrado.email,
                tipo: 'login',
                descricao: `Login realizado por ${usuarioEncontrado.nome}`
            });

            res.json({
                sucesso: true,
                mensagem: 'Login realizado com sucesso!',
                usuario: {
                    id: usuarioEncontrado._id,
                    nome: usuarioEncontrado.nome,
                    email: usuarioEncontrado.email,
                    cracha: usuarioEncontrado.cracha,
                    cargo: usuarioEncontrado.cargo || 'Operador',
                    tipoUsuario: usuarioEncontrado.tipoUsuario || 'usuario'
                }
            });
        } else {
            res.status(401).json({
                sucesso: false,
                mensagem: 'Email ou crachá incorreto'
            });
        }
    } catch (error) {
        console.error("❌ Erro na rota /api/login:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor: ' + error.message 
        });
    }
});

// Debug - Listar todos os usuários
app.get('/api/debug/usuarios', async function(req, res) {
    try {
        const usuarios = await Usuario.find({});
        console.log('👥 Todos os usuários no banco:', usuarios);
        res.json({ 
            total: usuarios.length,
            usuarios: usuarios.map(u => ({
                id: u._id,
                nome: u.nome,
                email: u.email,
                cracha: u.cracha,
                tipoUsuario: u.tipoUsuario
            }))
        });
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }
});

// ============================
// ROTAS DE USUÁRIOS (CRUD)
// ============================

// Criar usuário
app.post('/api/usuarios', async function(req, res) {
    try {
        const { nome, email, cracha, cargo, tipoUsuario } = req.body;

        const usuarioExistente = await Usuario.findOne({ email: email });
        if (usuarioExistente) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Este email já está cadastrado.' 
            });
        }

        const novoUsuario = await Usuario.create({
            nome,
            email,
            cracha,
            cargo: cargo || 'Operador',
            tipoUsuario: tipoUsuario || 'usuario'
        });

        await Atividade.create({
            usuarioEmail: email,
            tipo: 'cadastro',
            descricao: `Novo usuário cadastrado: ${nome}`
        });

        res.status(201).json({ 
            sucesso: true, 
            mensagem: 'Usuário cadastrado com sucesso!', 
            usuario: novoUsuario 
        });

    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor ao cadastrar usuário' 
        });
    }
});

// Listar todos os usuários
app.get('/api/usuarios', async function(req, res) {
    try {
        const usuarios = await Usuario.find({});
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro ao buscar usuários' 
        });
    }
});

// Buscar usuário por ID
app.get('/api/usuarios/:id', async function(req, res) {
    try {
        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Usuário não encontrado' 
            });
        }
        res.json({ sucesso: true, usuario: usuario });
    } catch (error) {
        console.error("Erro ao buscar usuário por ID:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor ao buscar usuário' 
        });
    }
});

// Atualizar usuário
app.put('/api/usuarios/:id', async function(req, res) {
    try {
        const { nome, email, cracha } = req.body;

        if (!nome || !email || !cracha) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Nome, email e crachá são obrigatórios' 
            });
        }

        const usuarioExistente = await Usuario.findOne({ 
            email: email, 
            _id: { $ne: req.params.id } 
        });
        
        if (usuarioExistente) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Este email já está em uso por outro usuário.' 
            });
        }

        const usuarioAtualizado = await Usuario.findByIdAndUpdate(
            req.params.id,
            { nome, email, cracha },
            { new: true, runValidators: true }
        );

        if (!usuarioAtualizado) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Usuário não encontrado para atualizar' 
            });
        }

        res.json({ 
            sucesso: true, 
            mensagem: 'Usuário atualizado com sucesso!', 
            usuario: usuarioAtualizado 
        });

    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        if (error.code === 11000) {
            res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Erro de duplicidade (email ou crachá já existe).' 
            });
        } else {
            res.status(500).json({ 
                sucesso: false, 
                mensagem: 'Erro no servidor ao atualizar usuário' 
            });
        }
    }
});

// Excluir usuário
app.delete('/api/usuarios/:id', async function(req, res) {
    try {
        const usuarioExcluido = await Usuario.findByIdAndDelete(req.params.id);

        if (!usuarioExcluido) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Usuário não encontrado para excluir' 
            });
        }

        res.json({ 
            sucesso: true, 
            mensagem: 'Usuário excluído com sucesso!' 
        });

    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor ao excluir usuário' 
        });
    }
});

// ============================
// ROTAS DE TANQUES
// ============================

// Buscar estado dos tanques
app.get('/api/tanques', async function(req, res) {
    try {
        const tanquesDoBanco = await Tanque.find({});
        
        console.log('Tanques no banco:', tanquesDoBanco);

        const tanquesFormatado = {};
        
        tanquesDoBanco.forEach(item => {
            tanquesFormatado[item.nome] = {
                peso: item.peso,
                quantidade: item.quantidade,
                nivel: item.nivel,
                capacidade: item.capacidade || 1000,
                unidade: item.nome === 'farinha' ? 'kg' : 'L'
            };
        });

        // Garantir que todos os tanques existam
        const tanquesEsperados = ['agua', 'farinha', 'banha'];
        tanquesEsperados.forEach(nome => {
            if (!tanquesFormatado[nome]) {
                tanquesFormatado[nome] = {
                    peso: 0,
                    quantidade: 0,
                    nivel: 0,
                    capacidade: 1000,
                    unidade: nome === 'farinha' ? 'kg' : 'L'
                };
            }
        });

        res.json(tanquesFormatado);
    } catch (error) {
        console.error("❌ Erro ao buscar dados dos tanques:", error);
        res.status(500).json({ erro: 'Erro ao buscar dados dos tanques' });
    }
});

// Atualizar tanques via Postman
app.post('/api/monitoramento/tanques', async (req, res) => {
    try {
        const { tanques } = req.body;

        console.log('Postman enviando dados:', tanques);

        if (!Array.isArray(tanques)) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'O corpo deve conter um array "tanques"' 
            });
        }

        const resultados = [];

        for (const tanqueData of tanques) {
            const { nome, peso, quantidade } = tanqueData;

            if (!nome || peso === undefined || quantidade === undefined) {
                resultados.push({ 
                    nome, 
                    status: 'erro', 
                    mensagem: 'Dados incompletos' 
                });
                continue;
            }

            try {
                let tanque = await Tanque.findOne({ nome });
                
                if (!tanque) {
                    tanque = new Tanque({ 
                        nome,
                        capacidade: 1000
                    });
                }

                tanque.peso = peso;
                tanque.quantidade = quantidade;
                
                const capacidade = tanque.capacidade || 1000;
                tanque.nivel = Math.min(100, Math.max(0, (quantidade / capacidade) * 100));

                await tanque.save();
                
                resultados.push({ 
                    nome, 
                    status: 'sucesso', 
                    nivel: tanque.nivel,
                    quantidade: tanque.quantidade,
                    mensagem: `Tanque ${nome} atualizado: ${tanque.quantidade}${nome === 'farinha' ? 'kg' : 'L'} (${tanque.nivel.toFixed(1)}%)` 
                });

            } catch (error) {
                resultados.push({ 
                    nome, 
                    status: 'erro', 
                    mensagem: error.message 
                });
            }
        }

        res.json({
            sucesso: true,
            mensagem: 'Tanques controlados via Postman!',
            resultados
        });

    } catch (error) {
        console.error("Erro na rota /api/monitoramento/tanques:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor: ' + error.message 
        });
    }
});


// ============================
// ROTAS DE SOLICITAÇÕES
// ============================

// Criar solicitação
app.post('/api/solicitacoes', async (req, res) => {
    try {
        const { usuarioEmail, usuarioCracha, usuarioCargo, tipoProduto, quantidade } = req.body;

        // Verificar estoque
        const tanque = await Tanque.findOne({ nome: tipoProduto });
        if (!tanque) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Tanque não encontrado' 
            });
        }

        // Converter quantidade
        let quantidadeNecessaria;
        if (tipoProduto === 'agua') quantidadeNecessaria = quantidade * 20;
        else if (tipoProduto === 'farinha') quantidadeNecessaria = quantidade * 50;
        else if (tipoProduto === 'banha') quantidadeNecessaria = quantidade * 15;
       
        if (tanque.quantidade < quantidadeNecessaria) {
            return res.status(400).json({
                sucesso: false,
                mensagem: `Estoque insuficiente. Disponível: ${Math.floor(tanque.quantidade / (tipoProduto === 'agua' ? 20 : tipoProduto === 'farinha' ? 50 : 15))} ${tipoProduto === 'agua' ? 'galões' : tipoProduto === 'farinha' ? 'sacos' : 'baldes'}`
            });
        }

        const novoNumero = await getNextSequenceValue('solicitacao_id_contador');

        const novaSolicitacao = await Solicitacao.create({
            solicitacaoNumero: novoNumero,
            usuarioEmail,
            usuarioCracha,
            usuarioCargo,
            tipoProduto,
            quantidade,
            unidade: tipoProduto === 'agua' ? 'galões' : tipoProduto === 'farinha' ? 'sacos' : 'baldes',
            status: 'pendente'
        });

        res.json({ 
            sucesso: true, 
            mensagem: 'Solicitação criada com sucesso!',
            solicitacao: novaSolicitacao 
        });
    } catch (error) {
        console.error("Erro ao criar solicitação:", error);
        res.status(500).json({ erro: 'Erro ao criar solicitação' });
    }
});

// Buscar solicitações do usuário
app.get('/api/solicitacoes/usuario/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const solicitacoes = await Solicitacao.find({ usuarioEmail: email })
            .sort({ dataSolicitacao: -1 });
        
        res.json(solicitacoes);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar solicitações' });
    }
});

// Listar todas as solicitações (admin)
app.get('/api/solicitacoes/admin', async function(req, res) {
    try {
        const solicitacoes = await Solicitacao.find({})
            .sort({ dataSolicitacao: -1 });
            
        res.json({ sucesso: true, solicitacoes: solicitacoes });

    } catch (error) {
        console.error("Erro ao buscar solicitações para admin:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor' 
        });
    }
});

// Buscar uma solicitação por ID
app.get('/api/solicitacoes/:id', async function(req, res) {
    try {
        const solicitacao = await Solicitacao.findById(req.params.id);
        if (!solicitacao) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Solicitação não encontrada' 
            });
        }
        res.json({ sucesso: true, solicitacao: solicitacao });
    } catch (error) {
        console.error("Erro ao buscar solicitação por ID:", error);
        if (error.kind === 'ObjectId') {
            res.status(400).json({ 
                sucesso: false, 
                mensagem: 'ID da solicitação inválido' 
            });
        } else {
            res.status(500).json({ 
                sucesso: false, 
                mensagem: 'Erro no servidor ao buscar solicitação' 
            });
        }
    }
});

// Atualizar status de solicitação (admin)
app.put('/api/solicitacoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, previsaoEntrega, observacoes } = req.body;

        const solicitacao = await Solicitacao.findByIdAndUpdate(
            id,
            { status, previsaoEntrega, observacoes },
            { new: true }
        );

        if (!solicitacao) {
            return res.status(404).json({ erro: 'Solicitação não encontrada' });
        }

        // Criar notificação
        let mensagem;
        let tipoNotificacao;

        if (status === 'aceito') {
            tipoNotificacao = 'solicitacao_aceita';
            mensagem = `Sua solicitação #${solicitacao.solicitacaoNumero} (${solicitacao.quantidade} ${solicitacao.unidade} de ${solicitacao.tipoProduto}) foi aceita! Previsão de entrega: ${new Date(previsaoEntrega).toLocaleDateString('pt-BR')}`;
        } else if (status === 'recusado') {
            tipoNotificacao = 'solicitacao_recusada';
            mensagem = `Sua solicitação #${solicitacao.solicitacaoNumero} (${solicitacao.quantidade} ${solicitacao.unidade} de ${solicitacao.tipoProduto}) foi recusada.`;
        } else if (status === 'em_espera') {
            tipoNotificacao = 'em_espera';
            mensagem = `Sua solicitação #${solicitacao.solicitacaoNumero} (${solicitacao.quantidade} ${solicitacao.unidade} de ${solicitacao.tipoProduto}) está em espera.`;
        }

        if (tipoNotificacao) {
            await Notificacao.create({
                usuarioEmail: solicitacao.usuarioEmail,
                tipo: tipoNotificacao,
                mensagem,
                solicitacaoId: id
            });
        }

        res.json({ 
            sucesso: true, 
            mensagem: 'Solicitação atualizada com sucesso!',
            solicitacao 
        });
    } catch (error) {
        console.error("Erro ao atualizar solicitação:", error);
        res.status(500).json({ erro: 'Erro ao atualizar solicitação' });
    }
});

// Editar solicitação (usuário)
app.put('/api/solicitacoes/usuario/:numero', async (req, res) => {
    try {
        const { numero } = req.params;
        const { quantidade, observacoes, usuarioEmail } = req.body;

        if (!usuarioEmail) {
            return res.status(401).json({ 
                sucesso: false, 
                mensagem: 'Autorização falhou. Email do usuário é obrigatório.' 
            });
        }

        const solicitacao = await Solicitacao.findOne({ solicitacaoNumero: numero });

        if (!solicitacao) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Solicitação não encontrada' 
            });
        }

        if (solicitacao.usuarioEmail !== usuarioEmail) {
            return res.status(403).json({ 
                sucesso: false, 
                mensagem: 'Acesso negado. Você não pode editar esta solicitação.' 
            });
        }

        if (solicitacao.status !== 'pendente') {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Não é possível editar uma solicitação que já foi processada.' 
            });
        }

        if (quantidade) solicitacao.quantidade = quantidade;
        if (observacoes !== undefined) solicitacao.observacoes = observacoes;
        
        await solicitacao.save();

        res.json({ 
            sucesso: true, 
            mensagem: 'Solicitação editada com sucesso!',
            solicitacao 
        });

    } catch (error) {
        console.error("Erro ao editar solicitação:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor' 
        });
    }
});

// Excluir solicitação (usuário)
app.delete('/api/solicitacoes/usuario/:numero', async (req, res) => {
    try {
        const { numero } = req.params;
        const { usuarioEmail } = req.body;

        if (!usuarioEmail) {
            return res.status(401).json({ 
                sucesso: false, 
                mensagem: 'Autorização falhou. Email do usuário é obrigatório.' 
            });
        }

        const solicitacao = await Solicitacao.findOne({ solicitacaoNumero: numero });

        if (!solicitacao) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Solicitação não encontrada' 
            });
        }

        if (solicitacao.usuarioEmail !== usuarioEmail) {
            return res.status(403).json({ 
                sucesso: false, 
                mensagem: 'Acesso negado. Você não pode excluir esta solicitação.' 
            });
        }

        if (solicitacao.status !== 'pendente') {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Não é possível excluir uma solicitação que já foi processada.' 
            });
        }

        await Solicitacao.findByIdAndDelete(solicitacao._id);

        res.json({ 
            sucesso: true, 
            mensagem: 'Solicitação excluída com sucesso!'
        });

    } catch (error) {
        console.error("Erro ao excluir solicitação:", error);
        res.status(500).json({ 
            sucesso: false, 
            mensagem: 'Erro no servidor' 
        });
    }
});

// Adicionar folha de pagamento
app.put('/api/solicitacoes/:id/pagamento', async (req, res) => {
    try {
        const { id } = req.params;
        const { valorTotal, dataPagamento, statusPagamento } = req.body;

        const solicitacao = await Solicitacao.findByIdAndUpdate(
            id,
            { 
                folhaPagamento: {
                    valorTotal,
                    dataPagamento,
                    statusPagamento
                }
            },
            { new: true }
        );

        res.json({ sucesso: true, solicitacao });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao adicionar folha de pagamento' });
    }
});

// ============================
// ROTAS DE NOTIFICAÇÕES
// ============================

// Buscar notificações do usuário
app.get('/api/notificacoes/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const notificacoes = await Notificacao.find({ usuarioEmail: email })
            .sort({ dataNotificacao: -1 });
        res.json(notificacoes);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar notificações' });
    }
});

// Marcar notificação como lida
app.put('/api/notificacoes/:id/lida', async (req, res) => {
    try {
        const { id } = req.params;
        await Notificacao.findByIdAndUpdate(id, { lida: true });
        res.json({ sucesso: true });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao marcar notificação como lida' });
    }
});

// ============================
// ROTAS DE ATIVIDADES
// ============================

// Buscar atividades recentes
app.get('/api/atividades', async (req, res) => {
    try {
        const atividades = await Atividade.find({})
            .sort({ dataAtividade: -1 })
            .limit(10);
        res.json(atividades);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar atividades' });
    }
});

// Schema de Rastreamento
const rastreamentoSchema = new mongoose.Schema({
    solicitacaoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Solicitacao',
        required: true 
    },
    statusAtual: {
        type: String,
        enum: ['preparacao', 'enviado', 'a_caminho', 'entregue'],
        default: 'preparacao'
    },
    localizacaoEntregador: {
        latitude: Number,
        longitude: Number,
        timestamp: Date
    },
    historicoLocalizacoes: [{
        latitude: Number,
        longitude: Number,
        timestamp: { type: Date, default: Date.now }
    }],
    entregador: {
        nome: String,
        telefone: String,
        veiculo: String
    },
    dataPreparacao: Date,
    dataEnviado: Date,
    dataACaminho: Date,
    dataEntregue: Date,
    observacoes: String
});

const Rastreamento = mongoose.model('Rastreamento', rastreamentoSchema);

// =============================================
// ROTA: Criar rastreamento ao aceitar pedido
// =============================================
app.post('/api/rastreamento', async (req, res) => {
    try {
        const { solicitacaoId, entregador } = req.body;

        // Verificar se já existe rastreamento
        let rastreamento = await Rastreamento.findOne({ solicitacaoId });

        if (rastreamento) {
            return res.json({ 
                sucesso: true, 
                mensagem: 'Rastreamento já existe',
                rastreamento 
            });
        }

        // Criar novo rastreamento
        rastreamento = await Rastreamento.create({
            solicitacaoId,
            statusAtual: 'preparacao',
            dataPreparacao: new Date(),
            entregador: {
                nome: entregador.nome,
                telefone: entregador.telefone,
                veiculo: entregador.veiculo || 'Veículo padrão'
            }
        });

        res.json({ 
            sucesso: true, 
            mensagem: 'Rastreamento criado!',
            rastreamento 
        });

    } catch (error) {
        console.error('Erro ao criar rastreamento:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTA: Atualizar status do rastreamento
// =============================================
app.put('/api/rastreamento/:solicitacaoId/status', async (req, res) => {
    try {
        const { solicitacaoId } = req.params;
        const { novoStatus, observacoes } = req.body;

        const rastreamento = await Rastreamento.findOne({ solicitacaoId });

        if (!rastreamento) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Rastreamento não encontrado' 
            });
        }

        // Atualizar status e data correspondente
        rastreamento.statusAtual = novoStatus;
        
        if (novoStatus === 'enviado') {
            rastreamento.dataEnviado = new Date();
        } else if (novoStatus === 'a_caminho') {
            rastreamento.dataACaminho = new Date();
        } else if (novoStatus === 'entregue') {
            rastreamento.dataEntregue = new Date();
        }

        if (observacoes) {
            rastreamento.observacoes = observacoes;
        }

        await rastreamento.save();

        // Criar notificação para o usuário
        const solicitacao = await Solicitacao.findById(solicitacaoId);
        if (solicitacao) {
            let mensagemNotif = '';
            if (novoStatus === 'preparacao') {
                mensagemNotif = `Seu pedido #${solicitacao.solicitacaoNumero} está em preparação! 📦`;
            } else if (novoStatus === 'enviado') {
                mensagemNotif = `Seu pedido #${solicitacao.solicitacaoNumero} foi enviado! 🚀`;
            } else if (novoStatus === 'a_caminho') {
                mensagemNotif = `Seu pedido #${solicitacao.solicitacaoNumero} está a caminho! 🚚`;
            } else if (novoStatus === 'entregue') {
                mensagemNotif = `Seu pedido #${solicitacao.solicitacaoNumero} foi entregue! ✅`;
            }

            await Notificacao.create({
                usuarioEmail: solicitacao.usuarioEmail,
                tipo: 'rastreamento_atualizado',
                mensagem: mensagemNotif,
                solicitacaoId: solicitacaoId
            });
        }

        res.json({ 
            sucesso: true, 
            mensagem: 'Status atualizado!',
            rastreamento 
        });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTA: Atualizar localização do entregador
// =============================================
app.put('/api/rastreamento/:solicitacaoId/localizacao', async (req, res) => {
    try {
        const { solicitacaoId } = req.params;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ 
                sucesso: false, 
                mensagem: 'Latitude e longitude são obrigatórios' 
            });
        }

        const rastreamento = await Rastreamento.findOne({ solicitacaoId });

        if (!rastreamento) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Rastreamento não encontrado' 
            });
        }

        // Atualizar localização atual
        rastreamento.localizacaoEntregador = {
            latitude,
            longitude,
            timestamp: new Date()
        };

        // Adicionar ao histórico
        rastreamento.historicoLocalizacoes.push({
            latitude,
            longitude,
            timestamp: new Date()
        });

        // Manter apenas as últimas 50 localizações
        if (rastreamento.historicoLocalizacoes.length > 50) {
            rastreamento.historicoLocalizacoes = rastreamento.historicoLocalizacoes.slice(-50);
        }

        await rastreamento.save();

        res.json({ 
            sucesso: true, 
            mensagem: 'Localização atualizada!',
            localizacao: rastreamento.localizacaoEntregador
        });

    } catch (error) {
        console.error('Erro ao atualizar localização:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTA: Buscar rastreamento de uma solicitação
// =============================================
app.get('/api/rastreamento/:solicitacaoId', async (req, res) => {
    try {
        const { solicitacaoId } = req.params;

        const rastreamento = await Rastreamento.findOne({ solicitacaoId })
            .populate('solicitacaoId');

        if (!rastreamento) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Rastreamento não encontrado' 
            });
        }

        res.json({ 
            sucesso: true, 
            rastreamento 
        });

    } catch (error) {
        console.error('Erro ao buscar rastreamento:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTA: Listar todos os rastreamentos (admin)
// =============================================
app.get('/api/rastreamento', async (req, res) => {
    try {
        const rastreamentos = await Rastreamento.find()
            .populate('solicitacaoId')
            .sort({ dataPreparacao: -1 });

        res.json({ 
            sucesso: true, 
            rastreamentos 
        });

    } catch (error) {
        console.error('Erro ao listar rastreamentos:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTA: Simular movimento do entregador
// =============================================
app.post('/api/rastreamento/:solicitacaoId/simular-movimento', async (req, res) => {
    try {
        const { solicitacaoId } = req.params;
        const { destino } = req.body;

        const rastreamento = await Rastreamento.findOne({ solicitacaoId });

        if (!rastreamento) {
            return res.status(404).json({ 
                sucesso: false, 
                mensagem: 'Rastreamento não encontrado' 
            });
        }

        // Localização inicial 
        const origem = rastreamento.localizacaoEntregador || {
            latitude: -23.5505,
            longitude: -46.6333
        };

        // Criar pontos intermediários
        const passos = 10;
        const pontos = [];

        for (let i = 0; i <= passos; i++) {
            const percentual = i / passos;
            const lat = origem.latitude + (destino.latitude - origem.latitude) * percentual;
            const lng = origem.longitude + (destino.longitude - origem.longitude) * percentual;
            
            pontos.push({ latitude: lat, longitude: lng });
        }

        res.json({ 
            sucesso: true, 
            mensagem: 'Rota simulada gerada!',
            pontos 
        });

    } catch (error) {
        console.error('Erro ao simular movimento:', error);
        res.status(500).json({ erro: error.message });
    }
});

console.log('✅ Rotas de rastreamento adicionadas!');

// =============================================
// ATUALIZAR carregarPedidos()
// =============================================

async function carregarPedidos() {
    try {
        console.log('📦 Carregando pedidos com rastreamento do MongoDB...');
        
        const response = await fetch(`${API_URL}/solicitacoes/admin`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar pedidos');
        }
        
        const data = await response.json();
        const todasSolicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
        const pedidosAceitos = todasSolicitacoes.filter(s => s.status === 'aceito');
        
        console.log('✅ Pedidos aceitos encontrados:', pedidosAceitos.length);
        
        // Buscar rastreamentos
        const responseRastreamento = await fetch(`${API_URL}/rastreamento`);
        let rastreamentos = [];
        
        if (responseRastreamento.ok) {
            const dataRastreamento = await responseRastreamento.json();
            rastreamentos = dataRastreamento.rastreamentos || [];
        }
        
        const container = document.getElementById('pedidos-container');
        if (!container) return;
        
        if (pedidosAceitos.length === 0) {
            container.innerHTML = `
                <div class="sem-dados" style="width: 100%; text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; opacity: 0.3; margin-bottom: 10px;"></i>
                    <p><strong>Nenhum pedido aprovado no banco de dados</strong></p>
                    <small>Aprove solicitações na aba "Solicitações" para vê-las aqui</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pedidosAceitos.map(pedido => {
            // Buscar rastreamento deste pedido
            const rastreamento = rastreamentos.find(r => r.solicitacaoId._id === pedido._id);
            const statusRastreamento = rastreamento ? rastreamento.statusAtual : 'preparacao';
            
            return `
                <div class="pedido-card-tracking">
                    <div class="pedido-header">
                        <h4>📦 ${getProdutoNome(pedido.tipoProduto)}</h4>
                        <span class="badge badge-success">✅ Aprovado</span>
                    </div>
                    
                    <div class="pedido-info">
                        <p><strong>ID:</strong> #${pedido.solicitacaoNumero || pedido._id.substring(0, 8)}</p>
                        <p><strong>Usuário:</strong> ${pedido.usuarioEmail}</p>
                        <p><strong>Quantidade:</strong> ${pedido.quantidade} ${pedido.unidade}</p>
                        <p><strong>Previsão:</strong> ${formatarData(pedido.previsaoEntrega)}</p>
                    </div>
                    
                    <!-- Timeline de Rastreamento -->
                    <div class="tracking-timeline">
                        <div class="timeline-item ${statusRastreamento === 'preparacao' || statusRastreamento === 'enviado' || statusRastreamento === 'a_caminho' || statusRastreamento === 'entregue' ? 'completed' : ''} ${statusRastreamento === 'preparacao' ? 'active' : ''}">
                            <div class="timeline-icon">
                                <i class="fas fa-box-open"></i>
                            </div>
                            <div class="timeline-content">
                                <h5>Preparação</h5>
                                <small>${rastreamento && rastreamento.dataPreparacao ? formatarDataHora(rastreamento.dataPreparacao) : '-'}</small>
                            </div>
                        </div>
                        
                        <div class="timeline-item ${statusRastreamento === 'enviado' || statusRastreamento === 'a_caminho' || statusRastreamento === 'entregue' ? 'completed' : ''} ${statusRastreamento === 'enviado' ? 'active' : ''}">
                            <div class="timeline-icon">
                                <i class="fas fa-shipping-fast"></i>
                            </div>
                            <div class="timeline-content">
                                <h5>Enviado</h5>
                                <small>${rastreamento && rastreamento.dataEnviado ? formatarDataHora(rastreamento.dataEnviado) : '-'}</small>
                            </div>
                        </div>
                        
                        <div class="timeline-item ${statusRastreamento === 'a_caminho' || statusRastreamento === 'entregue' ? 'completed' : ''} ${statusRastreamento === 'a_caminho' ? 'active' : ''}">
                            <div class="timeline-icon">
                                <i class="fas fa-truck"></i>
                            </div>
                            <div class="timeline-content">
                                <h5>A Caminho</h5>
                                <small>${rastreamento && rastreamento.dataACaminho ? formatarDataHora(rastreamento.dataACaminho) : '-'}</small>
                            </div>
                        </div>
                        
                        <div class="timeline-item ${statusRastreamento === 'entregue' ? 'completed' : ''}">
                            <div class="timeline-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="timeline-content">
                                <h5>Entregue</h5>
                                <small>${rastreamento && rastreamento.dataEntregue ? formatarDataHora(rastreamento.dataEntregue) : '-'}</small>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Informações do Entregador -->
                    ${rastreamento && rastreamento.entregador ? `
                        <div class="entregador-info">
                            <div class="entregador-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="entregador-detalhes">
                                <strong>${rastreamento.entregador.nome}</strong>
                                <small>${rastreamento.entregador.telefone}</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Botões de Ação -->
                    <div class="pedido-acoes">
                        ${!rastreamento ? `
                            <button class="btn-tracking btn-iniciar" onclick="iniciarRastreamento('${pedido._id}')">
                                <i class="fas fa-play"></i> Iniciar Rastreamento
                            </button>
                        ` : statusRastreamento !== 'entregue' ? `
                            <button class="btn-tracking btn-avancar" onclick="avancarStatus('${pedido._id}', '${statusRastreamento}')">
                                <i class="fas fa-forward"></i> Avançar Status
                            </button>
                            ${statusRastreamento === 'a_caminho' ? `
                                <button class="btn-tracking btn-mapa" onclick="abrirMapa('${pedido._id}')">
                                    <i class="fas fa-map-marked-alt"></i> Ver Mapa
                                </button>
                            ` : ''}
                        ` : `
                            <div class="status-finalizado">
                                <i class="fas fa-check-circle"></i>
                                Pedido Finalizado
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
        
        // Atualizar contador de pedidos
        const totalOrders = document.getElementById('total-orders');
        if (totalOrders) {
            totalOrders.textContent = pedidosAceitos.length;
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar pedidos:', error);
        const container = document.getElementById('pedidos-container');
        if (container) {
            container.innerHTML = `
                <div class="sem-dados" style="width: 100%; text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p><strong>Erro ao carregar pedidos</strong></p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }
}

// =============================================
// FUNÇÃO: Iniciar Rastreamento
// =============================================

async function iniciarRastreamento(solicitacaoId) {
    try {
        const entregadorNome = prompt('Nome do Entregador:');
        if (!entregadorNome) return;
        
        const entregadorTelefone = prompt('Telefone do Entregador:');
        if (!entregadorTelefone) return;
        
        const response = await fetch(`${API_URL}/rastreamento`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                solicitacaoId: solicitacaoId,
                entregador: {
                    nome: entregadorNome,
                    telefone: entregadorTelefone,
                    veiculo: 'Caminhão'
                }
            })
        });
        
        const result = await response.json();
        
        if (result.sucesso) {
            mostrarNotificacao('✅ Rastreamento iniciado!', 'success');
            carregarPedidos();
        } else {
            throw new Error(result.mensagem);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('❌ ' + error.message, 'error');
    }
}

// =============================================
// FUNÇÃO: Avançar Status
// =============================================

async function avancarStatus(solicitacaoId, statusAtual) {
    const proximosStatus = {
        'preparacao': 'enviado',
        'enviado': 'a_caminho',
        'a_caminho': 'entregue'
    };
    
    const novoStatus = proximosStatus[statusAtual];
    
    if (!novoStatus) {
        alert('Não é possível avançar o status!');
        return;
    }
    
    const nomesStatus = {
        'enviado': 'Enviado',
        'a_caminho': 'A Caminho',
        'entregue': 'Entregue'
    };
    
    if (!confirm(`Deseja marcar como "${nomesStatus[novoStatus]}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/rastreamento/${solicitacaoId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                novoStatus: novoStatus
            })
        });
        
        const result = await response.json();
        
        if (result.sucesso) {
            mostrarNotificacao(`✅ Status atualizado para "${nomesStatus[novoStatus]}"!`, 'success');
            carregarPedidos();
        } else {
            throw new Error(result.mensagem);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('❌ ' + error.message, 'error');
    }
}

// =============================================
// FUNÇÃO: Abrir Mapa
// =============================================

function abrirMapa(solicitacaoId) {
    // Criar modal do mapa
    const modal = document.createElement('div');
    modal.id = 'mapaModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content modal-mapa">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fas fa-map-marked-alt"></i> 
                    Rastreamento em Tempo Real
                </h3>
                <button class="close-btn" onclick="fecharMapa()">&times;</button>
            </div>
            
            <div class="mapa-container" id="mapa" style="height: 500px; width: 100%;"></div>
            
            <div class="mapa-info">
                <div class="info-item">
                    <i class="fas fa-truck"></i>
                    <span id="velocidade">Carregando...</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span id="tempo-estimado">Calculando...</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span id="distancia">Calculando...</span>
                </div>
            </div>
            
            <div class="form-actions">
                <button class="btn btn-primary" onclick="simularMovimento('${solicitacaoId}')">
                    <i class="fas fa-play"></i> Simular Movimento
                </button>
                <button class="btn btn-secondary" onclick="fecharMapa()">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Inicializar mapa com Leaflet
    setTimeout(() => {
        inicializarMapa(solicitacaoId);
    }, 100);
}

// =============================================
// FUNÇÃO: Inicializar Mapa (Leaflet)
// =============================================

async function inicializarMapa(solicitacaoId) {
    try {
        // Carregar Leaflet dinamicamente
        if (!window.L) {
            // Adicionar CSS do Leaflet
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
            
            // Adicionar JS do Leaflet
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => inicializarMapaComLeaflet(solicitacaoId);
            document.head.appendChild(script);
        } else {
            inicializarMapaComLeaflet(solicitacaoId);
        }
    } catch (error) {
        console.error('Erro ao carregar mapa:', error);
    }
}

async function inicializarMapaComLeaflet(solicitacaoId) {
    // Buscar rastreamento
    const response = await fetch(`${API_URL}/rastreamento/${solicitacaoId}`);
    const data = await response.json();
    
    if (!data.sucesso) {
        alert('Erro ao buscar dados de rastreamento');
        return;
    }
    
    const rastreamento = data.rastreamento;
    
    // Posição do entregador (ou posição inicial padrão)
    const posEntregador = rastreamento.localizacaoEntregador || {
        latitude: -23.5505,
        longitude: -46.6333
    };
    
    // Posição de destino (exemplo: empresa)
    const posDestino = {
        latitude: -23.5629,
        longitude: -46.6544
    };
    
    // Criar mapa
    mapaAtivo = L.map('mapa').setView([posEntregador.latitude, posEntregador.longitude], 13);
    
    // Adicionar camada de tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapaAtivo);
    
    // Ícone personalizado do entregador
    const iconEntregador = L.divIcon({
        className: 'marcador-entregador',
        html: '<div style="background: #667eea; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"><i class="fas fa-truck"></i></div>',
        iconSize: [40, 40]
    });
    
    // Ícone do destino
    const iconDestino = L.divIcon({
        className: 'marcador-destino',
        html: '<div style="background: #28a745; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"><i class="fas fa-map-marker-alt"></i></div>',
        iconSize: [40, 40]
    });
    
    // Adicionar marcadores
    marcadorEntregador = L.marker([posEntregador.latitude, posEntregador.longitude], {
        icon: iconEntregador
    }).addTo(mapaAtivo)
      .bindPopup(`<b>Entregador</b><br>${rastreamento.entregador.nome}`);
    
    L.marker([posDestino.latitude, posDestino.longitude], {
        icon: iconDestino
    }).addTo(mapaAtivo)
      .bindPopup('<b>Destino</b><br>Empresa');
    
    // Desenhar rota
    const latlngs = [
        [posEntregador.latitude, posEntregador.longitude],
        [posDestino.latitude, posDestino.longitude]
    ];
    
    L.polyline(latlngs, {
        color: '#667eea',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(mapaAtivo);
    
    // Ajustar zoom para mostrar ambos os pontos
    const bounds = L.latLngBounds(latlngs);
    mapaAtivo.fitBounds(bounds, { padding: [50, 50] });
    
    // Calcular distância
    const distancia = calcularDistancia(
        posEntregador.latitude,
        posEntregador.longitude,
        posDestino.latitude,
        posDestino.longitude
    );
    
    document.getElementById('distancia').textContent = `${distancia.toFixed(2)} km até o destino`;
    document.getElementById('velocidade').textContent = 'Velocidade: 60 km/h';
    document.getElementById('tempo-estimado').textContent = `Tempo estimado: ${Math.ceil(distancia / 60 * 60)} minutos`;
    
    // Iniciar atualização automática
    iniciarAtualizacaoAutomatica(solicitacaoId);
}

// =============================================
// FUNÇÃO: Calcular Distância (Haversine)
// =============================================

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// =============================================
// FUNÇÃO: Simular Movimento
// =============================================

async function simularMovimento(solicitacaoId) {
    try {
        const response = await fetch(`${API_URL}/rastreamento/${solicitacaoId}/simular-movimento`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                destino: {
                    latitude: -23.5629,
                    longitude: -46.6544
                }
            })
        });
        
        const result = await response.json();
        
        if (result.sucesso && result.pontos) {
            let indice = 0;
            const intervalo = setInterval(async () => {
                if (indice >= result.pontos.length) {
                    clearInterval(intervalo);
                    mostrarNotificacao('✅ Simulação concluída!', 'success');
                    return;
                }
                
                const ponto = result.pontos[indice];
                
                // Atualizar localização no backend
                await fetch(`${API_URL}/rastreamento/${solicitacaoId}/localizacao`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        latitude: ponto.latitude,
                        longitude: ponto.longitude
                    })
                });
                
                // Atualizar marcador no mapa
                if (marcadorEntregador && mapaAtivo) {
                    marcadorEntregador.setLatLng([ponto.latitude, ponto.longitude]);
                    mapaAtivo.panTo([ponto.latitude, ponto.longitude]);
                }
                
                indice++;
            }, 2000); // Atualiza a cada 2 segundos
        }
        
    } catch (error) {
        console.error('Erro ao simular movimento:', error);
        mostrarNotificacao('❌ Erro na simulação', 'error');
    }
}

// =============================================
// FUNÇÃO: Atualização Automática
// =============================================

function iniciarAtualizacaoAutomatica(solicitacaoId) {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
    }
    
    intervaloAtualizacao = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/rastreamento/${solicitacaoId}`);
            const data = await response.json();
            
            if (data.sucesso && data.rastreamento.localizacaoEntregador) {
                const loc = data.rastreamento.localizacaoEntregador;
                
                if (marcadorEntregador) {
                    marcadorEntregador.setLatLng([loc.latitude, loc.longitude]);
                }
            }
        } catch (error) {
            console.error('Erro na atualização automática:', error);
        }
    }, 5000); // Atualiza a cada 5 segundos
}

// =============================================
// FUNÇÃO: Fechar Mapa
// =============================================

function fecharMapa() {
    const modal = document.getElementById('mapaModal');
    if (modal) {
        modal.remove();
    }
    
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
        intervaloAtualizacao = null;
    }
    
    if (mapaAtivo) {
        mapaAtivo.remove();
        mapaAtivo = null;
    }
    
    marcadorEntregador = null;
}

// =============================================
// FUNÇÃO AUXILIAR: Formatar Data e Hora
// =============================================

function formatarDataHora(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Data inválida';
    }
}

console.log('Sistema de rastreamento carregado!');

// ============================
// INICIAR SERVIDOR
// ============================
app.listen(porta, function() {
    console.log('=================================');
    console.log(`Servidor rodando na porta ${porta}`);
    console.log(`Acesse em: http://localhost:${porta}`);
    console.log('MongoDB conectado com sucesso!');
    console.log('=================================');
});