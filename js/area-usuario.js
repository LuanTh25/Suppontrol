// ============================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// ============================
const API_URL = 'http://localhost:3000/api';

let dadosTanques = {};
let solicitacoes = [];
let usuarioAtual = null;

// ============================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacao();
    inicializarPagina();
});

function verificarAutenticacao() {
    const estaLogado = localStorage.getItem('estaLogado');
    const tipoUsuario = localStorage.getItem('tipoUsuario');
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    
    console.log('🔍 Verificando autenticação usuário:', { estaLogado, tipoUsuario, usuarioLogado });
    
    if (estaLogado !== 'true' || tipoUsuario !== 'usuario') {
        alert('Acesso não autorizado! Redirecionando para login...');
        window.location.href = 'login.html';
        return;
    }
    
    usuarioAtual = usuarioLogado;
    
    // Carregar informações do usuário no header
    const userInfoElement = document.querySelector('.user-details h1');
    const userDetailsElement = document.querySelector('.user-details p');
    const userAvatar = document.querySelector('.user-avatar');
    
    if (userInfoElement && usuarioLogado.nome) {
        userInfoElement.textContent = usuarioLogado.nome;
    }
    
    if (userDetailsElement && usuarioLogado.cracha) {
        userDetailsElement.innerHTML = `Operador de Tanques • Crachá: ${usuarioLogado.cracha}`;
        if (usuarioLogado.cargo) {
            userDetailsElement.innerHTML = `${usuarioLogado.cargo} • Crachá: ${usuarioLogado.cracha}`;
        }
    }
    
    if (userAvatar && usuarioLogado.nome) {
        const iniciais = usuarioLogado.nome.split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        userAvatar.textContent = iniciais;
    }
    
    console.log('Acesso do usuário autorizado para:', usuarioLogado.nome);
}

// ============================
// INICIALIZAÇÃO DA PÁGINA
// ============================
function inicializarPagina() {
    console.log('Inicializando área do usuário...');
    
    // Carregar dados iniciais da API
    carregarTanques();
    carregarSolicitacoes();
    
    // Configurar formulário de solicitação
    configurarFormulario();
    
    // Configurar botão de logout
    configurarLogout();
    
    // Atualização automática a cada 10 segundos
    setInterval(() => {
        console.log('🔄 Atualização automática...');
        carregarTanques();
        carregarSolicitacoes();
    }, 10000);
    
    console.log('Área do usuário inicializada com sucesso!');
}

// ============================
// CARREGAR TANQUES DA API
// ============================
async function carregarTanques() {
    try {
        console.log('📊 Buscando dados dos tanques...');
        
        const response = await fetch(`${API_URL}/tanques`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar tanques');
        }
        
        dadosTanques = await response.json();
        
        console.log('Tanques carregados:', dadosTanques);
        
        renderizarTanques();
        atualizarAlertas();
        atualizarHorario();
        
    } catch (error) {
        console.error('Erro ao carregar tanques:', error);
        mostrarNotificacao('Erro ao carregar dados dos tanques', 'erro');
    }
}

// ============================
// RENDERIZAR TANQUES
// ============================
function renderizarTanques() {
    const container = document.getElementById('tanques-container');
    
    if (!container) {
        console.error('Container de tanques não encontrado');
        return;
    }
    
    container.innerHTML = '';

    const tipos = ['agua', 'banha', 'farinha'];
    const nomes = {
        agua: 'Água',
        banha: 'Banha',
        farinha: 'Farinha'
    };
    
    const icones = {
        agua: '💧',
        banha: '🥫',
        farinha: '🌾'
    };

    tipos.forEach(tipo => {
        const dados = dadosTanques[tipo] || { 
            peso: 0, 
            quantidade: 0, 
            nivel: 0, 
            capacidade: 1000,
            unidade: tipo === 'farinha' ? 'kg' : 'L'
        };
        
        const alertaClass = dados.nivel <= 50 ? 'alerta' : '';
        
        const card = document.createElement('div');
        card.className = `tanque-card ${alertaClass}`;
        card.setAttribute('data-tipo', tipo);
        
        card.innerHTML = `
            <h3>Tanque de ${nomes[tipo]}</h3>
            <div class="cilindro">
                <div class="fill" style="height: ${dados.nivel}%"></div>
            </div>
            <div class="tanque-info">
                <p><strong>Peso:</strong> ${dados.peso} kg</p>
                <p><strong>Quantidade:</strong> ${dados.quantidade} ${dados.unidade}</p>
                <p><strong>Nível:</strong> ${dados.nivel.toFixed(1)}%</p>
                <p><strong>Capacidade:</strong> ${dados.capacidade} ${dados.unidade}</p>
                <span class="nivel-badge ${dados.nivel <= 30 ? 'nivel-critico' : dados.nivel <= 50 ? 'nivel-baixo' : 'nivel-ok'}">
                    ${dados.nivel <= 30 ? '🔴 Nível Crítico' : dados.nivel <= 50 ? '⚠️ Nível Baixo' : '✅ Nível OK'}
                </span>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// ============================
// ATUALIZAR ALERTAS
// ============================
function atualizarAlertas() {
    const container = document.getElementById('alertas-container');
    const alertCount = document.querySelector('.alert-count');
    
    if (!container || !alertCount) return;
    
    const alertas = [];
    
    const nomes = {
        agua: 'Água',
        banha: 'Banha',
        farinha: 'Farinha'
    };
    
    Object.entries(dadosTanques).forEach(([tipo, dados]) => {
        if (dados.nivel <= 50) {
            alertas.push({
                tipo: nomes[tipo],
                nivel: dados.nivel,
                quantidade: dados.quantidade,
                unidade: dados.unidade,
                criticidade: dados.nivel <= 30 ? 'critico' : 'atencao'
            });
        }
    });

    alertCount.textContent = `${alertas.length} ${alertas.length === 1 ? 'ativo' : 'ativos'}`;
    
    if (alertas.length === 0) {
        container.innerHTML = '<p style="color: #10b981; text-align: center; padding: 20px;">✅ Nenhum alerta no momento</p>';
    } else {
        container.innerHTML = alertas.map(alerta => `
            <div class="alerta-item ${alerta.criticidade === 'critico' ? 'critico' : 'warning'}">
                <h4>
                    <i class="fas fa-exclamation-triangle"></i> 
                    Tanque de ${alerta.tipo}
                </h4>
                <p>Nível ${alerta.criticidade === 'critico' ? 'crítico' : 'baixo'}: ${alerta.nivel.toFixed(1)}%</p>
                <p>Quantidade atual: ${alerta.quantidade} ${alerta.unidade}</p>
            </div>
        `).join('');
    }
}

// ============================
// ATUALIZAR HORÁRIO
// ============================
function atualizarHorario() {
    const lastUpdate = document.querySelector('.last-update');
    if (lastUpdate) {
        const agora = new Date();
        lastUpdate.textContent = `Última atualização: ${agora.toLocaleTimeString('pt-BR')}`;
    }
}

// ============================
// CARREGAR SOLICITAÇÕES
// ============================
async function carregarSolicitacoes() {
    if (!usuarioAtual || !usuarioAtual.email) {
        console.error('Usuário não autenticado');
        return;
    }
    
    try {
        console.log('📋 Buscando solicitações do usuário:', usuarioAtual.email);
        
        const response = await fetch(`${API_URL}/solicitacoes/usuario/${usuarioAtual.email}`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar solicitações');
        }
        
        solicitacoes = await response.json();
        
        console.log('Solicitações carregadas:', solicitacoes.length);
        
        renderizarSolicitacoes();
        
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
    }
}

// ============================
// RENDERIZAR SOLICITAÇÕES
// ============================
function renderizarSolicitacoes() {
    const container = document.getElementById('solicitacoes-container');
    
    if (!container) return;
    
    if (solicitacoes.length === 0) {
        container.innerHTML = `
            <p style="color: #64748b; text-align: center; padding: 40px;">
                📋 Nenhuma solicitação realizada ainda
            </p>
        `;
        return;
    }

    const statusConfig = {
        pendente: { label: 'Pendente', icon: '⏳', class: 'pendente' },
        aceito: { label: 'Aceito', icon: '✅', class: 'aprovada' },
        recusado: { label: 'Recusado', icon: '❌', class: 'recusada' },
        em_espera: { label: 'Em Espera', icon: '⏸️', class: 'espera' },
        a_caminho: { label: 'A Caminho', icon: '🚚', class: 'a-caminho' },
        entregue: { label: 'Entregue', icon: '✔️', class: 'entregue' }
    };

    const produtosNomes = {
        agua: 'Água',
        farinha: 'Farinha',
        banha: 'Banha'
    };

    container.innerHTML = solicitacoes.map(sol => {
        const statusInfo = statusConfig[sol.status] || statusConfig.pendente;
        const produtoNome = produtosNomes[sol.tipoProduto] || sol.tipoProduto;
        
        return `
            <div class="solicitacao-card ${statusInfo.class}">
                <div class="solicitacao-header">
                    <h3>${statusInfo.icon} ${produtoNome}</h3>
                    <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
                </div>
                <div class="solicitacao-info">
                    <p><strong>ID:</strong> #${sol.solicitacaoNumero || sol._id.substring(0, 8)}</p>
                    <p><strong>Quantidade:</strong> ${sol.quantidade} ${sol.unidade}</p>
                    <p><strong>Data:</strong> ${formatarData(sol.dataSolicitacao)}</p>
                    ${sol.previsaoEntrega ? `<p><strong>Previsão:</strong> ${formatarData(sol.previsaoEntrega)}</p>` : ''}
                    ${sol.observacoes ? `<p><strong>Obs:</strong> ${sol.observacoes}</p>` : ''}
                </div>
                ${sol.status === 'pendente' ? `
                    <div class="solicitacao-acoes">
                        <button class="btn-editar" onclick="editarSolicitacao(${sol.solicitacaoNumero})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-cancelar" onclick="cancelarSolicitacao(${sol.solicitacaoNumero})">
                            <i class="fas fa-trash"></i> Cancelar
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ============================
// MODAL DE SOLICITAÇÃO
// ============================
function abrirModalSolicitacao() {
    document.getElementById('modalSolicitacao').style.display = 'block';
}

function fecharModal() {
    document.getElementById('modalSolicitacao').style.display = 'none';
    document.getElementById('form-solicitacao').reset();
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalSolicitacao');
    if (event.target === modal) {
        fecharModal();
    }
};

// ============================
// CONFIGURAR FORMULÁRIO
// ============================
function configurarFormulario() {
    const form = document.getElementById('form-solicitacao');
    
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const tipoProduto = document.getElementById('produto').value;
        const quantidade = parseInt(document.getElementById('quantidade').value);
        const unidade = document.getElementById('unidade').value;
        const observacoes = document.getElementById('observacoes').value;
        
        if (!tipoProduto || !quantidade || !unidade) {
            mostrarNotificacao('Preencha todos os campos obrigatórios!', 'erro');
            return;
        }
        
        await criarSolicitacao({
            usuarioEmail: usuarioAtual.email,
            usuarioCracha: usuarioAtual.cracha,
            usuarioCargo: usuarioAtual.cargo || 'Operador',
            tipoProduto,
            quantidade,
            unidade,
            observacoes
        });
    });
}

// ============================
// CRIAR SOLICITAÇÃO
// ============================
async function criarSolicitacao(dados) {
    try {
        console.log('📤 Criando solicitação:', dados);
        
        const response = await fetch(`${API_URL}/solicitacoes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        
        if (response.ok && result.sucesso) {
            mostrarNotificacao('Solicitação enviada com sucesso!', 'sucesso');
            fecharModal();
            carregarSolicitacoes();
        } else {
            throw new Error(result.mensagem || 'Erro ao criar solicitação');
        }
        
    } catch (error) {
        console.error('Erro ao criar solicitação:', error);
        mostrarNotificacao(error.message, 'erro');
    }
}

// ============================
// EDITAR SOLICITAÇÃO
// ============================
async function editarSolicitacao(numero) {
    const solicitacao = solicitacoes.find(s => s.solicitacaoNumero === numero);
    
    if (!solicitacao) {
        mostrarNotificacao('Solicitação não encontrada', 'erro');
        return;
    }
    
    const novaQuantidade = prompt(`Nova quantidade para ${solicitacao.tipoProduto}:`, solicitacao.quantidade);
    
    if (!novaQuantidade || isNaN(novaQuantidade)) return;
    
    try {
        const response = await fetch(`${API_URL}/solicitacoes/usuario/${numero}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quantidade: parseInt(novaQuantidade),
                usuarioEmail: usuarioAtual.email
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.sucesso) {
            mostrarNotificacao('Solicitação atualizada!', 'sucesso');
            carregarSolicitacoes();
        } else {
            throw new Error(result.mensagem);
        }
        
    } catch (error) {
        console.error('Erro ao editar:', error);
        mostrarNotificacao(error.message, 'erro');
    }
}

// ============================
// CANCELAR SOLICITAÇÃO
// ============================
async function cancelarSolicitacao(numero) {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/solicitacoes/usuario/${numero}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuarioEmail: usuarioAtual.email
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.sucesso) {
            mostrarNotificacao('Solicitação cancelada!', 'sucesso');
            carregarSolicitacoes();
        } else {
            throw new Error(result.mensagem);
        }
        
    } catch (error) {
        console.error('Erro ao cancelar:', error);
        mostrarNotificacao(error.message, 'erro');
    }
}

// ============================
// FUNÇÕES AUXILIARES
// ============================
function formatarData(dataString) {
    if (!dataString) return '-';
    
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Data inválida';
    }
}

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const notif = document.getElementById('notificacao');
    const texto = document.getElementById('notificacao-texto');
    
    if (!notif || !texto) return;
    
    // Remover classes anteriores
    notif.className = 'notificacao';
    
    // Adicionar nova classe
    if (tipo === 'erro') {
        notif.classList.add('erro');
    } else if (tipo === 'sucesso') {
        notif.classList.add('sucesso');
    }
    
    texto.textContent = mensagem;
    notif.classList.add('show');
    
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// ============================
// LOGOUT
// ============================
function configurarLogout() {
    const btnLogout = document.querySelector('.btn-logout');
    
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('tipoUsuario');
        localStorage.removeItem('estaLogado');
        window.location.href = 'login.html';
    }
}

console.log('Carregado e conectado à API!');