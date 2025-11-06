// =============================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// =============================================

const API_URL = 'http://localhost:3000/api';

let pedidoSelecionadoId = null;
let solicitacaoAtual = null;
let solicitacoesData = [];
let usuariosData = [];
let isLoadingSolicitacoes = false;
let isLoadingUsuarios = false;
let usuarioAtual = null;

// =============================================
// Variáveis para rastreamento
// =============================================
let mapaAtivo = null;
let marcadorEntregador = null;
let intervaloAtualizacao = null;
let pedidoRastreamentoAtual = null;

const entregadores = [
    { nome: "Tauste", telefone: "(11) 99215-1111" },
    { nome: "Distribuidora Falcão", telefone: "(11) 91234-2222" },
    { nome: "Fenix Produtos", telefone: "(11) 95631-3333" },
    { nome: "Yeshua Suprimentos", telefone: "(11) 90912-4444" }
];

// =============================================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacao();
    inicializarPagina();
});

function verificarAutenticacao() {
    const estaLogado = localStorage.getItem('estaLogado');
    const tipoUsuario = localStorage.getItem('tipoUsuario');
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    
    console.log('Verificando autenticação admin:', { estaLogado, tipoUsuario, usuarioLogado });
    
    if (estaLogado !== 'true' || tipoUsuario !== 'admin') {
        alert('Acesso não autorizado! Redirecionando para login...');
        window.location.href = 'login.html';
        return;
    }
    
    usuarioAtual = usuarioLogado;
    
    const adminNameElement = document.getElementById('admin-name');
    const adminEmailElement = document.getElementById('admin-email');
    
    if (adminNameElement && usuarioLogado.nome) {
        adminNameElement.textContent = usuarioLogado.nome;
    }
    
    if (adminEmailElement && usuarioLogado.email) {
        adminEmailElement.textContent = usuarioLogado.email;
    }
    
    console.log('Acesso admin autorizado para:', usuarioLogado.nome);
}

// =============================================
// INICIALIZAÇÃO DA PÁGINA
// =============================================
function inicializarPagina() {
    console.log('Inicializando conexão com MongoDB...');
    
    showPage();
    initNavigation();
    setupModal();
    preencherEntregadores();
    setupForms();
    
    carregarDashboard();
    carregarSolicitacoes();
    carregarUsuarios();
    
    setInterval(() => {
        const sectionAtiva = document.querySelector('.content-section.active');
        if (sectionAtiva) {
            if (sectionAtiva.id === 'monitoring') {
                console.log('🔄 Atualizando solicitações...');
                carregarSolicitacoes();
            } else if (sectionAtiva.id === 'users') {
                console.log('🔄 Atualizando usuários...');
                carregarUsuarios();
            } else if (sectionAtiva.id === 'orders') {
                console.log('🔄 Atualizando pedidos...');
                carregarPedidos();
            }
        }
    }, 10000);
    
    console.log('Sistema inicializado com sucesso!');
}

function showPage() {
    const loading = document.getElementById('loading');
    const header = document.querySelector('.header');
    const container = document.querySelector('.container');
    
    if (loading) loading.style.display = 'none';
    if (header) header.style.display = 'flex';
    if (container) container.style.display = 'block';
}

function setupForms() {
    const aceitarPedidoForm = document.getElementById('aceitarPedidoForm');
    if (aceitarPedidoForm) {
        aceitarPedidoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmarAceitacaoPedido();
        });
    }
    
    const rejeitarPedidoForm = document.getElementById('rejeitarPedidoForm');
    if (rejeitarPedidoForm) {
        rejeitarPedidoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmarRejeicaoPedido();
        });
    }
    
    const esperaPedidoForm = document.getElementById('esperaPedidoForm');
    if (esperaPedidoForm) {
        esperaPedidoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmarEsperaPedido();
        });
    }
}

// =============================================
// SISTEMA DE NAVEGAÇÃO
// =============================================
function initNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const contentSections = document.querySelectorAll('.content-section');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            navTabs.forEach(t => t.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            const targetElement = document.getElementById(targetSection);
            if (targetElement) {
                targetElement.classList.add('active');
            }
            
            if (targetSection === 'monitoring') {
                carregarSolicitacoes();
            } else if (targetSection === 'orders') {
                carregarPedidos();
            } else if (targetSection === 'users') {
                carregarUsuarios();
            } else if (targetSection === 'dashboard') {
                carregarDashboard();
            }
        });
    });
}

// =============================================
// SISTEMA DE MODAIS
// =============================================
function setupModal() {
    const modals = document.querySelectorAll('.modal');
    
    window.addEventListener('click', function(event) {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.style.display === 'block' || modal.style.display === 'flex') {
                    modal.style.display = 'none';
                }
            });
            fecharModalStatus();
        }
    });
}

function preencherEntregadores() {
    const selectEntregador = document.getElementById('entregador');
    if (!selectEntregador) return;
    
    selectEntregador.innerHTML = '<option value="">Selecione o entregador</option>';
    
    entregadores.forEach(entregador => {
        const option = document.createElement('option');
        option.value = entregador.nome;
        option.textContent = entregador.nome;
        option.setAttribute('data-telefone', entregador.telefone);
        selectEntregador.appendChild(option);
    });
    
    selectEntregador.addEventListener('change', function() {
        const telefoneInput = document.getElementById('telefone-entregador');
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            telefoneInput.value = selectedOption.getAttribute('data-telefone') || '';
        }
    });
}

// =============================================
// DASHBOARD
// =============================================
async function carregarDashboard() {
    try {
        console.log('Carregando dashboard...');
        
        const responseAtividades = await fetch(`${API_URL}/atividades`);
        
        if (responseAtividades.ok) {
            const atividades = await responseAtividades.json();
            
            const tbody = document.getElementById('recent-activity');
            if (tbody && atividades.length > 0) {
                tbody.innerHTML = atividades.map(atividade => `
                    <tr>
                        <td>${formatarHora(atividade.dataAtividade)}</td>
                        <td>${atividade.usuarioEmail}</td>
                        <td>${atividade.descricao}</td>
                        <td><span class="badge badge-success">Sucesso</span></td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">
                            Nenhuma atividade registrada ainda
                        </td>
                    </tr>
                `;
            }
        }
        
        await updateStats();
        
        console.log('✅ Dashboard carregado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
    }
}

async function updateStats() {
    try {
        const responseUsuarios = await fetch(`${API_URL}/usuarios`);
        if (responseUsuarios.ok) {
            const usuarios = await responseUsuarios.json();
            const totalUsersElement = document.getElementById('total-users');
            if (totalUsersElement) {
                totalUsersElement.textContent = usuarios.length;
            }
        }
        
        const alertsCount = document.getElementById('alerts-count');
        if (alertsCount) {
            const pendentes = solicitacoesData.filter(s => s.status === 'pendente').length;
            alertsCount.textContent = pendentes;
        }
        
        const totalOrders = document.getElementById('total-orders');
        if (totalOrders) {
            const aceitos = solicitacoesData.filter(s => s.status === 'aceito').length;
            totalOrders.textContent = aceitos;
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar estatísticas:', error);
    }
}

// =============================================
// SOLICITAÇÕES
// =============================================
async function carregarSolicitacoes() {
    if (isLoadingSolicitacoes) {
        console.log('⏳ Já existe uma requisição em andamento');
        return;
    }
    
    isLoadingSolicitacoes = true;
    
    try {
        console.log('📋 Carregando solicitações...');
        
        const response = await fetch(`${API_URL}/solicitacoes/admin`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Aviso: ${response.status} - Erro ao buscar solicitações`);
            solicitacoesData = [];
            renderizarSolicitacoes();
            atualizarBadgeNotificacoes();
            return;
        }
        
        const data = await response.json();
        solicitacoesData = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
        
        console.log('✅ Solicitações carregadas:', solicitacoesData.length);
        
        renderizarSolicitacoes();
        atualizarBadgeNotificacoes();
        updateStats();
        
    } catch (error) {
        console.error('❌ Erro ao carregar solicitações:', error);
        solicitacoesData = [];
        renderizarSolicitacoes();
    } finally {
        isLoadingSolicitacoes = false;
    }
}

function renderizarSolicitacoes() {
    const tbody = document.getElementById('solicitacoes-table-body');
    const semDados = document.getElementById('sem-solicitacoes');
    
    if (!tbody) {
        console.error('❌ Elemento solicitacoes-table-body não encontrado!');
        return;
    }
    
    if (solicitacoesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 48px; opacity: 0.3; margin-bottom: 10px;"></i><br>
                    <strong>Nenhuma solicitação encontrada no banco de dados</strong><br>
                    <small>As solicitações aparecerão aqui automaticamente</small>
                </td>
            </tr>
        `;
        if (semDados) semDados.style.display = 'none';
        return;
    }
    
    if (semDados) semDados.style.display = 'none';
    
    tbody.innerHTML = solicitacoesData.map(solicitacao => {
        const statusClass = getStatusClass(solicitacao.status);
        const statusText = getStatusText(solicitacao.status);
        const produtoNome = getProdutoNome(solicitacao.tipoProduto);
        
        return `
            <tr data-status="${solicitacao.status}" data-produto="${solicitacao.tipoProduto}">
                <td>${formatarData(solicitacao.dataSolicitacao)}</td>
                <td>
                    <div class="info-usuario">
                        <strong>${solicitacao.usuarioEmail || 'N/A'}</strong>
                        <small>${solicitacao.usuarioCargo || 'Usuário'}</small>
                    </div>
                </td>
                <td>${solicitacao.usuarioCracha || 'N/A'}</td>
                <td>
                    <span class="produto-info">
                        <i class="fas ${obterIconeProduto(solicitacao.tipoProduto)}"></i>
                        ${produtoNome}
                    </span>
                </td>
                <td>
                    <strong>${solicitacao.quantidade || 0}</strong>
                    <small>${solicitacao.unidade || 'un'}</small>
                </td>
                <td>
                    <span class="status-badge status-${solicitacao.status}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="acoes-solicitacao">
                        ${solicitacao.status === 'pendente' ? `
                            <button class="btn-acao btn-aceitar" onclick="abrirModalAceitarPedido('${solicitacao._id}')">
                                <i class="fas fa-check"></i> Aceitar
                            </button>
                            <button class="btn-acao btn-recusar" onclick="abrirModalRejeitarPedido('${solicitacao._id}')">
                                <i class="fas fa-times"></i> Rejeitar
                            </button>
                            <button class="btn-acao btn-espera" onclick="abrirModalEsperaPedido('${solicitacao._id}')">
                                <i class="fas fa-clock"></i> Espera
                            </button>
                        ` : `
                            <span style="color: #6c757d; font-size: 12px;">Ações concluídas</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function atualizarBadgeNotificacoes() {
    const badge = document.querySelector('.badge-notificacoes');
    if (badge) {
        const pendentes = solicitacoesData.filter(s => s.status === 'pendente').length;
        badge.textContent = pendentes;
        badge.style.display = pendentes > 0 ? 'flex' : 'none';
    }
}

function filtrarSolicitacoes() {
    const filtroStatus = document.getElementById('filtro-status').value;
    const filtroProduto = document.getElementById('filtro-produto').value;
    const linhas = document.querySelectorAll('#solicitacoes-table-body tr');
    
    let linhasVisiveis = 0;
    
    linhas.forEach(linha => {
        const status = linha.getAttribute('data-status');
        const produto = linha.getAttribute('data-produto');
        
        const mostraStatus = filtroStatus === 'todos' || status === filtroStatus;
        const mostraProduto = filtroProduto === 'todos' || produto === filtroProduto;
        
        if (mostraStatus && mostraProduto) {
            linha.style.display = '';
            linhasVisiveis++;
        } else {
            linha.style.display = 'none';
        }
    });
    
    const semSolicitacoes = document.getElementById('sem-solicitacoes');
    if (semSolicitacoes) {
        semSolicitacoes.style.display = linhasVisiveis === 0 ? 'block' : 'none';
    }
}

// =============================================
// MODAL - ACEITAR PEDIDO
// =============================================
function abrirModalAceitarPedido(solicitacaoId) {
    console.log('Abrindo modal para aceitar pedido:', solicitacaoId);
    
    const solicitacao = solicitacoesData.find(s => s._id === solicitacaoId);
    
    if (!solicitacao) {
        console.error('❌ Solicitação não encontrada:', solicitacaoId);
        mostrarNotificacao('Erro: Solicitação não encontrada', 'error');
        return;
    }
    
    pedidoSelecionadoId = solicitacaoId;
    document.getElementById('aceitarPedidoModal').style.display = 'flex';
    
    const dataInput = document.getElementById('data-entrega');
    const hoje = new Date().toISOString().split('T')[0];
    dataInput.min = hoje;
    
    const tresDias = new Date();
    tresDias.setDate(tresDias.getDate() + 3);
    dataInput.value = tresDias.toISOString().split('T')[0];
    
    document.getElementById('entregador').value = '';
    document.getElementById('telefone-entregador').value = '';
    document.getElementById('observacoes-pedido').value = '';
    
    const alertDiv = document.getElementById('aceitar-pedido-alert');
    if (alertDiv) alertDiv.style.display = 'none';
}

function closeAceitarPedidoModal() {
    document.getElementById('aceitarPedidoModal').style.display = 'none';
    document.getElementById('aceitarPedidoForm').reset();
    const alertDiv = document.getElementById('aceitar-pedido-alert');
    if (alertDiv) alertDiv.style.display = 'none';
    pedidoSelecionadoId = null;
}

async function confirmarAceitacaoPedido() {
    if (!pedidoSelecionadoId) {
        console.error('❌ Nenhum pedido selecionado');
        return;
    }
    
    const dataEntrega = document.getElementById('data-entrega').value;
    const entregador = document.getElementById('entregador').value;
    const telefoneEntregador = document.getElementById('telefone-entregador').value;
    const observacoes = document.getElementById('observacoes-pedido').value;
    const alertDiv = document.getElementById('aceitar-pedido-alert');
    
    if (!dataEntrega || !entregador || !telefoneEntregador) {
        if (alertDiv) {
            alertDiv.textContent = 'Por favor, preencha todos os campos obrigatórios.';
            alertDiv.className = 'alert alert-error';
            alertDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        console.log('✅ Aceitando pedido:', pedidoSelecionadoId);
        
        const response = await fetch(`${API_URL}/solicitacoes/${pedidoSelecionadoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'aceito',
                previsaoEntrega: dataEntrega,
                observacoes: `Entregador: ${entregador} | Tel: ${telefoneEntregador} | ${observacoes}`
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao aceitar solicitação');
        }
        
        mostrarNotificacao('✅ Pedido aceito com sucesso!', 'success');
        
        setTimeout(() => {
            closeAceitarPedidoModal();
            carregarSolicitacoes();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erro ao aceitar pedido:', error);
        if (alertDiv) {
            alertDiv.textContent = `Erro: ${error.message}`;
            alertDiv.className = 'alert alert-error';
            alertDiv.style.display = 'block';
        }
    }
}

// =============================================
// MODAL - REJEITAR PEDIDO
// =============================================
function abrirModalRejeitarPedido(solicitacaoId) {
    const solicitacao = solicitacoesData.find(s => s._id === solicitacaoId);
    
    if (!solicitacao) {
        mostrarNotificacao('Erro: Solicitação não encontrada', 'error');
        return;
    }
    
    pedidoSelecionadoId = solicitacaoId;
    document.getElementById('rejeitarPedidoModal').style.display = 'flex';
    
    document.getElementById('motivo-rejeicao').value = '';
    document.getElementById('observacoes-rejeicao').value = '';
    
    const alertDiv = document.getElementById('rejeitar-pedido-alert');
    if (alertDiv) alertDiv.style.display = 'none';
}

function closeRejeitarPedidoModal() {
    document.getElementById('rejeitarPedidoModal').style.display = 'none';
    document.getElementById('rejeitarPedidoForm').reset();
    const alertDiv = document.getElementById('rejeitar-pedido-alert');
    if (alertDiv) alertDiv.style.display = 'none';
    pedidoSelecionadoId = null;
}

async function confirmarRejeicaoPedido() {
    if (!pedidoSelecionadoId) return;
    
    const motivoRejeicao = document.getElementById('motivo-rejeicao').value;
    const observacoes = document.getElementById('observacoes-rejeicao').value;
    const alertDiv = document.getElementById('rejeitar-pedido-alert');
    
    if (!motivoRejeicao) {
        if (alertDiv) {
            alertDiv.textContent = 'Por favor, informe o motivo da rejeição.';
            alertDiv.className = 'alert alert-error';
            alertDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/solicitacoes/${pedidoSelecionadoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'recusado',
                observacoes: `${motivoRejeicao}. ${observacoes}`
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao rejeitar solicitação');
        }
        
        mostrarNotificacao('✅ Pedido rejeitado com sucesso!', 'success');
        
        setTimeout(() => {
            closeRejeitarPedidoModal();
            carregarSolicitacoes();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erro ao rejeitar pedido:', error);
        if (alertDiv) {
            alertDiv.textContent = `Erro: ${error.message}`;
            alertDiv.className = 'alert alert-error';
            alertDiv.style.display = 'block';
        }
    }
}

// =============================================
// MODAL - EM ESPERA
// =============================================
function abrirModalEsperaPedido(solicitacaoId) {
    const solicitacao = solicitacoesData.find(s => s._id === solicitacaoId);
    
    if (!solicitacao) {
        mostrarNotificacao('Erro: Solicitação não encontrada', 'error');
        return;
    }
    
    pedidoSelecionadoId = solicitacaoId;
    document.getElementById('esperaPedidoModal').style.display = 'flex';
    
    document.getElementById('motivo-espera').value = '';
    document.getElementById('previsao-retomada').value = '';
    document.getElementById('observacoes-espera').value = '';
    
    const previsaoInput = document.getElementById('previsao-retomada');
    const hoje = new Date().toISOString().split('T')[0];
    previsaoInput.min = hoje;
    
    const seteDias = new Date();
    seteDias.setDate(seteDias.getDate() + 7);
    previsaoInput.value = seteDias.toISOString().split('T')[0];
    
    const alertDiv = document.getElementById('espera-pedido-alert');
    if (alertDiv) alertDiv.style.display = 'none';
}

function closeEsperaPedidoModal() {
    document.getElementById('esperaPedidoModal').style.display = 'none';
    document.getElementById('esperaPedidoForm').reset();
    const alertDiv = document.getElementById('espera-pedido-alert');
    if (alertDiv) alertDiv.style.display = 'none';
    pedidoSelecionadoId = null;
}

async function confirmarEsperaPedido() {
    if (!pedidoSelecionadoId) return;
    
    const motivoEspera = document.getElementById('motivo-espera').value;
    const previsaoRetomada = document.getElementById('previsao-retomada').value;
    const observacoes = document.getElementById('observacoes-espera').value;
    const alertDiv = document.getElementById('espera-pedido-alert');
    
    if (!motivoEspera || !previsaoRetomada) {
        if (alertDiv) {
            alertDiv.textContent = 'Por favor, preencha o motivo e a previsão de retomada.';
            alertDiv.className = 'alert alert-error';
            alertDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/solicitacoes/${pedidoSelecionadoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'em_espera',
                previsaoEntrega: previsaoRetomada,
                observacoes: `${motivoEspera}. ${observacoes}`
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao colocar em espera');
        }
        
        mostrarNotificacao('Pedido colocado em espera!', 'success');
        
        setTimeout(() => {
            closeEsperaPedidoModal();
            carregarSolicitacoes();
        }, 1500);
        
    } catch (error) {
        console.error('Erro ao colocar pedido em espera:', error);
        if (alertDiv) {
            alertDiv.textContent = `Erro: ${error.message}`;
            alertDiv.className = 'alert alert-error';
            alertDiv.style.display = 'block';
        }
    }
}

// =============================================
// FUNÇÃO PEDIDOS
// =============================================
async function carregarPedidos() {
    try {
        console.log('Carregando pedidos com rastreamento...');
        
        const response = await fetch(`${API_URL}/solicitacoes/admin`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar pedidos');
        }
        
        const data = await response.json();
        const todasSolicitacoes = Array.isArray(data.solicitacoes) ? data.solicitacoes : [];
        const pedidosAceitos = todasSolicitacoes.filter(s => s.status === 'aceito');
        
        console.log('✅ Pedidos aceitos encontrados:', pedidosAceitos.length);
        
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
            const rastreamento = rastreamentos.find(r => r.solicitacaoId._id === pedido._id);
            const statusRastreamento = rastreamento ? rastreamento.statusAtual : 'preparacao';
            
            let nomeEntregador = 'Não atribuído';
            let telefoneEntregador = '-';
            let empresaEntrega = 'Sistema Suppontrol';
            
            if (pedido.observacoes) {
                const matchEntregador = pedido.observacoes.match(/Entregador:\s*([^|]+)/);
                const matchTelefone = pedido.observacoes.match(/Tel:\s*([^|]+)/);
                if (matchEntregador) nomeEntregador = matchEntregador[1].trim();
                if (matchTelefone) telefoneEntregador = matchTelefone[1].trim();
            }
            
            return `
                <div class="pedido-card-aprimorado">
                    <div class="pedido-card-header">
                        <div class="pedido-titulo">
                            <i class="fas ${obterIconeProduto(pedido.tipoProduto)}"></i>
                            <h4>${getProdutoNome(pedido.tipoProduto)}</h4>
                        </div>
                        <span class="badge badge-pedido badge-aceito">
                            <i class="fas fa-check-circle"></i> Aprovado
                        </span>
                    </div>
                    
                    <div class="pedido-card-body">
                        <!-- Informações do Solicitante -->
                        <div class="info-section">
                            <div class="info-section-titulo">
                                <i class="fas fa-user"></i>
                                <span>Solicitante</span>
                            </div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Nome:</span>
                                    <span class="info-value">${pedido.usuarioEmail.split('@')[0]}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Crachá:</span>
                                    <span class="info-value">${pedido.usuarioCracha}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">E-mail:</span>
                                    <span class="info-value">${pedido.usuarioEmail}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Informações da Entrega -->
                        <div class="info-section">
                            <div class="info-section-titulo">
                                <i class="fas fa-truck"></i>
                                <span>Empresa de Entrega</span>
                            </div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Empresa:</span>
                                    <span class="info-value">${empresaEntrega}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Entregador:</span>
                                    <span class="info-value">${nomeEntregador}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Telefone:</span>
                                    <span class="info-value">${telefoneEntregador}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Informações do Pedido -->
                        <div class="info-section">
                            <div class="info-section-titulo">
                                <i class="fas fa-box"></i>
                                <span>Detalhes do Pedido</span>
                            </div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">ID:</span>
                                    <span class="info-value">#${pedido.solicitacaoNumero || pedido._id.substring(0, 8)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Quantidade:</span>
                                    <span class="info-value">${pedido.quantidade} ${pedido.unidade}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Previsão:</span>
                                    <span class="info-value">${formatarData(pedido.previsaoEntrega)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    

                    <div class="pedido-card-footer">
                        <div class="pedido-acoes-footer">
                            <button class="btn btn-status-pedido" onclick="abrirModalStatus('${pedido._id}')">
                                <i class="fas fa-info-circle"></i>
                                Ver Status
                            </button>
                            <button class="btn btn-gerar-nf" onclick="gerarNotaFiscal('${pedido._id}')">
                                <i class="fas fa-file-invoice"></i>
                                Gerar NF
                            </button>
                        </div>
                    </div>
                </div> 
        `;
        
        }).join('');
        
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
// MODAL STATUS DO PEDIDO
// =============================================
async function abrirModalStatus(pedidoId) {
    try {
        console.log('Abrindo modal de status para pedido:', pedidoId);
        
        const responsePedido = await fetch(`${API_URL}/solicitacoes/${pedidoId}`);
        if (!responsePedido.ok) throw new Error('Pedido não encontrado');
        
        const dataPedido = await responsePedido.json();
        const pedido = dataPedido.solicitacao;
        
        const responseRastreamento = await fetch(`${API_URL}/rastreamento/${pedidoId}`);
        let rastreamento = null;
        
        if (responseRastreamento.ok) {
            const dataRastreamento = await responseRastreamento.json();
            rastreamento = dataRastreamento.rastreamento;
        }
        
        pedidoRastreamentoAtual = pedido;
        
        criarModalStatus(pedido, rastreamento);
        
    } catch (error) {
        console.error('❌ Erro ao abrir modal:', error);
        mostrarNotificacao('Erro ao carregar status do pedido', 'error');
    }
}

function criarModalStatus(pedido, rastreamento) {
    const modalAnterior = document.getElementById('modalStatusPedido');
    if (modalAnterior) modalAnterior.remove();
    
    const statusAtual = rastreamento ? rastreamento.statusAtual : 'preparacao';
    
    const modal = document.createElement('div');
    modal.id = 'modalStatusPedido';
    modal.className = 'modal-status';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-status-content">
            <div class="modal-status-header">
                <h2>
                    <i class="fas fa-chart-line"></i>
                    Status do Pedido #${pedido.solicitacaoNumero || pedido._id.substring(0, 8)}
                </h2>
                <button class="btn-fechar-modal" onclick="fecharModalStatus()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-status-body">
                <!-- Timeline de Status -->
                <div class="status-timeline">
                    <div class="status-step ${statusAtual === 'preparacao' || statusAtual === 'enviado' || statusAtual === 'a_caminho' || statusAtual === 'entregue' ? 'completed' : ''} ${statusAtual === 'preparacao' ? 'active' : ''}">
                        <div class="status-step-icon">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <div class="status-step-content">
                            <h4>Pedido Recebido</h4>
                            <p>${rastreamento && rastreamento.dataPreparacao ? formatarDataHora(rastreamento.dataPreparacao) : 'Aguardando'}</p>
                        </div>
                    </div>
                    
                    <div class="status-step ${statusAtual === 'enviado' || statusAtual === 'a_caminho' || statusAtual === 'entregue' ? 'completed' : ''} ${statusAtual === 'enviado' ? 'active' : ''}">
                        <div class="status-step-icon">
                            <i class="fas fa-box-open"></i>
                        </div>
                        <div class="status-step-content">
                            <h4>Em Preparação</h4>
                            <p>${rastreamento && rastreamento.dataEnviado ? formatarDataHora(rastreamento.dataEnviado) : 'Aguardando'}</p>
                        </div>
                    </div>
                    
                    <div class="status-step ${statusAtual === 'a_caminho' || statusAtual === 'entregue' ? 'completed' : ''} ${statusAtual === 'a_caminho' ? 'active' : ''}">
                        <div class="status-step-icon">
                            <i class="fas fa-shipping-fast"></i>
                        </div>
                        <div class="status-step-content">
                            <h4>A Caminho</h4>
                            <p>${rastreamento && rastreamento.dataACaminho ? formatarDataHora(rastreamento.dataACaminho) : 'Aguardando'}</p>
                        </div>
                    </div>
                    
                    <div class="status-step ${statusAtual === 'entregue' ? 'completed' : ''}">
                        <div class="status-step-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="status-step-content">
                            <h4>Produto Entregue</h4>
                            <p>${rastreamento && rastreamento.dataEntregue ? formatarDataHora(rastreamento.dataEntregue) : 'Aguardando'}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Mapa (aparece apenas quando status é "a_caminho") -->
                ${statusAtual === 'a_caminho' ? `
                    <div class="mapa-rastreamento-container">
                        <div class="mapa-rastreamento-header">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>Rastreamento em Tempo Real</span>
                        </div>
                        <div id="mapaRastreamento" class="mapa-rastreamento"></div>
                        <div class="mapa-info-bar">
                            <div class="mapa-info-item">
                                <i class="fas fa-tachometer-alt"></i>
                                <span id="velocidadeMapa">Calculando...</span>
                            </div>
                            <div class="mapa-info-item">
                                <i class="fas fa-clock"></i>
                                <span id="tempoEstimadoMapa">Calculando...</span>
                            </div>
                            <div class="mapa-info-item">
                                <i class="fas fa-route"></i>
                                <span id="distanciaMapa">Calculando...</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Botões de Ação -->
                <div class="status-acoes">
                    ${!rastreamento ? `
                        <button class="btn-acao-status btn-iniciar-rastreamento" onclick="iniciarRastreamentoPedido('${pedido._id}')">
                            <i class="fas fa-play"></i>
                            Iniciar Rastreamento
                        </button>
                    ` : statusAtual !== 'entregue' ? `
                        <button class="btn-acao-status btn-avancar-status" onclick="avancarStatusPedido('${pedido._id}', '${statusAtual}')">
                            <i class="fas fa-arrow-right"></i>
                            Avançar para Próxima Etapa
                        </button>
                        ${statusAtual === 'a_caminho' ? `
                            <button class="btn-acao-status btn-simular" onclick="simularMovimentoEntregador('${pedido._id}')">
                                <i class="fas fa-play-circle"></i>
                                Simular Movimento
                            </button>
                        ` : ''}
                    ` : `
                        <div class="status-finalizado-msg">
                            <i class="fas fa-check-circle"></i>
                            <span>Entrega Concluída com Sucesso!</span>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    if (statusAtual === 'a_caminho') {
        setTimeout(() => {
            inicializarMapaRastreamento(pedido._id, rastreamento);
        }, 300);
    }
}

function fecharModalStatus() {
    const modal = document.getElementById('modalStatusPedido');
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
    pedidoRastreamentoAtual = null;
}

// =============================================
// INICIALIZAR RASTREAMENTO
// =============================================
async function iniciarRastreamentoPedido(pedidoId) {
    try {
        const nomeEntregador = prompt('Nome do Entregador:', 'Carlos Silva');
        if (!nomeEntregador) return;
        
        const telefoneEntregador = prompt('Telefone do Entregador:', '(11) 99999-9999');
        if (!telefoneEntregador) return;
        
        const response = await fetch(`${API_URL}/rastreamento`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                solicitacaoId: pedidoId,
                entregador: {
                    nome: nomeEntregador,
                    telefone: telefoneEntregador,
                    veiculo: 'Caminhão'
                }
            })
        });
        
        const result = await response.json();
        
        if (result.sucesso) {
            mostrarNotificacao('✅ Rastreamento iniciado!', 'success');
            fecharModalStatus();
            setTimeout(() => abrirModalStatus(pedidoId), 500);
        } else {
            throw new Error(result.mensagem);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('❌ ' + error.message, 'error');
    }
}

// =============================================
// AVANÇAR STATUS DO PEDIDO
// =============================================
async function avancarStatusPedido(pedidoId, statusAtual) {
    const proximosStatus = {
        'preparacao': 'enviado',
        'enviado': 'a_caminho',
        'a_caminho': 'entregue'
    };
    
    const novoStatus = proximosStatus[statusAtual];
    
    if (!novoStatus) {
        mostrarNotificacao('Não é possível avançar o status!', 'error');
        return;
    }
    
    const nomesStatus = {
        'enviado': 'Em Preparação',
        'a_caminho': 'A Caminho',
        'entregue': 'Produto Entregue'
    };
    
    if (!confirm(`Deseja marcar como "${nomesStatus[novoStatus]}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/rastreamento/${pedidoId}/status`, {
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
            fecharModalStatus();
            setTimeout(() => abrirModalStatus(pedidoId), 500);
        } else {
            throw new Error(result.mensagem);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('❌ ' + error.message, 'error');
    }
}


// =============================================
// INICIALIZAR MAPA DE RASTREAMENTO (NA ETAPA "A CAMINHO")
// =============================================
async function inicializarMapaRastreamento(pedidoId, rastreamento) {
    try {
        if (!window.L) {
            await carregarLeaflet();
        }
        
        const posEntregador = rastreamento.localizacaoEntregador || {
            latitude: -23.5505,
            longitude: -46.6333
        };
        
        const posDestino = {
            latitude: -23.5629,
            longitude: -46.6544
        };
        
        mapaAtivo = L.map('mapaRastreamento').setView([posEntregador.latitude, posEntregador.longitude], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapaAtivo);
        
        const iconEntregador = L.divIcon({
            className: 'marcador-entregador',
            html: '<div style="background: #667eea; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: pulse-marker 2s infinite;"><i class="fas fa-truck"></i></div>',
            iconSize: [40, 40]
        });
        
        const iconDestino = L.divIcon({
            className: 'marcador-destino',
            html: '<div style="background: #28a745; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"><i class="fas fa-map-marker-alt"></i></div>',
            iconSize: [40, 40]
        });
        
        marcadorEntregador = L.marker([posEntregador.latitude, posEntregador.longitude], {
            icon: iconEntregador
        }).addTo(mapaAtivo)
          .bindPopup(`<b>Entregador</b><br>${rastreamento.entregador.nome}`);
        
        L.marker([posDestino.latitude, posDestino.longitude], {
            icon: iconDestino
        }).addTo(mapaAtivo)
          .bindPopup('<b>Destino</b><br>Empresa Suppontrol');
        
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
        
        const bounds = L.latLngBounds(latlngs);
        mapaAtivo.fitBounds(bounds, { padding: [50, 50] });
        
        const distancia = calcularDistancia(
            posEntregador.latitude,
            posEntregador.longitude,
            posDestino.latitude,
            posDestino.longitude
        );
        
        document.getElementById('distanciaMapa').textContent = `${distancia.toFixed(2)} km`;
        document.getElementById('velocidadeMapa').textContent = 'Velocidade: 60 km/h';
        document.getElementById('tempoEstimadoMapa').textContent = `Tempo estimado: ${Math.ceil(distancia / 60 * 60)} min`;
        
        iniciarAtualizacaoAutomaticaMapa(pedidoId);
        
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        mostrarNotificacao('Erro ao carregar mapa', 'error');
    }
}

async function carregarLeaflet() {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Erro ao carregar Leaflet'));
        document.head.appendChild(script);
    });
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function iniciarAtualizacaoAutomaticaMapa(pedidoId) {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
    }
    
    intervaloAtualizacao = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/rastreamento/${pedidoId}`);
            const data = await response.json();
            
            if (data.sucesso && data.rastreamento.localizacaoEntregador) {
                const loc = data.rastreamento.localizacaoEntregador;
                
                if (marcadorEntregador && mapaAtivo) {
                    marcadorEntregador.setLatLng([loc.latitude, loc.longitude]);
                }
            }
        } catch (error) {
            console.error('Erro na atualização automática:', error);
        }
    }, 5000);
}

// =============================================
// MOVIMENTO DO ENTREGADOR
// =============================================
async function simularMovimentoEntregador(pedidoId) {
    try {
        const response = await fetch(`${API_URL}/rastreamento/${pedidoId}/simular-movimento`, {
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
            mostrarNotificacao('Simulação iniciada!', 'success');
            
            let indice = 0;
            const intervalo = setInterval(async () => {
                if (indice >= result.pontos.length) {
                    clearInterval(intervalo);
                    mostrarNotificacao('Simulação concluída!', 'success');
                    return;
                }
                
                const ponto = result.pontos[indice];
                
                await fetch(`${API_URL}/rastreamento/${pedidoId}/localizacao`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        latitude: ponto.latitude,
                        longitude: ponto.longitude
                    })
                });
                
                if (marcadorEntregador && mapaAtivo) {
                    marcadorEntregador.setLatLng([ponto.latitude, ponto.longitude]);
                    mapaAtivo.panTo([ponto.latitude, ponto.longitude]);
                }
                
                indice++;
            }, 2000);
        }
        
    } catch (error) {
        console.error('Erro ao simular movimento:', error);
        mostrarNotificacao('Erro na simulação', 'error');
    }
}

// =============================================
// GERENCIAMENTO DE USUÁRIOS
// =============================================

async function carregarUsuarios() {
    if (isLoadingUsuarios) {
        console.log('⏳ Já existe uma requisição de usuários em andamento');
        return;
    }
    
    isLoadingUsuarios = true;
    
    try {
        console.log('Carregando usuários...');
        
        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn('⚠️ Erro ao buscar usuários');
            usuariosData = [];
            renderizarUsuarios();
            return;
        }
        
        const data = await response.json();
        usuariosData = Array.isArray(data) ? data : [];
        
        console.log('Usuários carregados do MongoDB:', usuariosData.length);
        
        renderizarUsuarios();
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        usuariosData = [];
        renderizarUsuarios();
    } finally {
        isLoadingUsuarios = false;
    }
}

function renderizarUsuarios() {
    const usersTable = document.getElementById('users-table');
    
    if (!usersTable) {
        console.error('Elemento não encontrado!');
        return;
    }
    
    usersTable.innerHTML = '';
    
    if (usuariosData.length === 0) {
        usersTable.innerHTML = `
            <tr>
                <td colspan="6" class="no-data" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 10px;"></i><br>
                    <strong>Nenhum usuário cadastrado no banco de dados</strong><br>
                    <small>Os usuários aparecerão aqui automaticamente</small>
                </td>
            </tr>
        `;
        return;
    }
    
    usuariosData.forEach((user, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.nome || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.cracha || 'N/A'}</td>
            <td>
                <span class="badge ${user.tipoUsuario === 'admin' ? 'badge-primary' : 'badge-secondary'}">
                    ${user.cargo || (user.tipoUsuario === 'admin' ? 'Administrador' : 'Operador')}
                </span>
            </td>
            <td>
                <button class="btn-acao btn-aceitar" onclick="editUser('${user._id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-acao btn-recusar" onclick="deleteUser('${user._id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </td>
        `;
        usersTable.appendChild(row);
    });
}

function showAddUserModal() {
    document.getElementById('userModal').style.display = 'block';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

async function addUser() {
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const cracha = document.getElementById('user-cracha').value.trim();
    
    if (!name || !email || !cracha) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: name,
                email: email,
                cracha: cracha,
                cargo: 'Usuário',
                tipoUsuario: 'usuario'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.mensagem || 'Erro ao cadastrar usuário');
        }
        
        mostrarNotificacao('Usuário adicionado com sucesso!', 'success');
        
        closeUserModal();
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao adicionar usuário:', error);
        alert('Erro ao adicionar usuário: ' + error.message);
    }
}

async function editUser(userId) {
    const user = usuariosData.find(u => u._id === userId);
    
    if (!user) {
        alert('Usuário não encontrado!');
        return;
    }
    
    const modal = document.getElementById('editUserModal');
    if (!modal) {
        alert('Modal de edição não encontrado!');
        return;
    }
    
    document.getElementById('edit-user-name').value = user.nome || '';
    document.getElementById('edit-user-email').value = user.email || '';
    document.getElementById('edit-user-cracha').value = user.cracha || '';
    
    modal.setAttribute('data-user-id', userId);
    modal.style.display = 'block';
}

async function saveUserEdit() {
    const modal = document.getElementById('editUserModal');
    const userId = modal.getAttribute('data-user-id');
    
    if (!userId) {
        alert('Erro: ID do usuário não encontrado!');
        return;
    }
    
    const name = document.getElementById('edit-user-name').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const cracha = document.getElementById('edit-user-cracha').value.trim();
    
    if (!name || !email || !cracha) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: name,
                email: email,
                cracha: cracha
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.mensagem || '❌ Erro ao atualizar usuário');
        }
        
        mostrarNotificacao('✅ Usuário atualizado com sucesso!', 'success');
        
        closeEditUserModal();
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        alert('Erro ao atualizar usuário: ' + error.message);
    }
}

function closeEditUserModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.style.display = 'none';
        modal.removeAttribute('data-user-id');
    }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('❌ Erro ao excluir usuário...');
        }
        
        mostrarNotificacao('✅ Usuário excluído com sucesso!', 'success');
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário: ' + error.message);
    }
}

// =============================================================
// FUNÇÕES AUXILIARES - FORMATAR: DATA E HORA, STATUS DO PEDIDO
// =============================================================
function formatarData(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return 'Data inválida';
    }
}

function formatarHora(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'Hora inválida';
    }
}

function formatarDataHora(dataString) {
    if (!dataString) return 'Aguardando';
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

function getStatusClass(status) {
    const classes = {
        'pendente': 'pendente',
        'aceito': 'aceito',
        'recusado': 'recusado',
        'em_espera': 'em_espera'
    };
    return classes[status] || 'pendente';
}

function getStatusText(status) {
    const textos = {
        'pendente': '⏳ Pendente',
        'aceito': '✅ Aceito',
        'recusado': '❌ Recusado',
        'em_espera': '⏸️ Em Espera'
    };
    return textos[status] || status;
}

function getProdutoNome(tipo) {
    const nomes = {
        'agua': 'Água',
        'farinha': 'Farinha',
        'banha': 'Banha'
    };
    return nomes[tipo] || tipo;
}

function obterIconeProduto(produto) {
    const iconeMap = {
        'agua': 'fa-tint',
        'farinha': 'fa-seedling',
        'banha': 'fa-bacon'
    };
    return iconeMap[produto] || 'fa-box';
}

// =============================================
// FUNÇÕES DE BOTÕES
// =============================================
function refreshSolicitacoes() {
    console.log('🔄 Atualizando solicitações...');
    carregarSolicitacoes();
    mostrarNotificacao('✅ Solicitações atualizadas...', 'success');
}

function refreshOrders() {
    console.log('Atualizando pedidos...');
    carregarPedidos();
    mostrarNotificacao('✅ Pedidos atualizados...', 'success');
}

function logout() {
    if (confirm('Tem certeza que deseja sair da área administrativa?')) {
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('tipoUsuario');
        localStorage.removeItem('estaLogado');
        window.location.href = 'login.html';
    }
}

// =============================================
// SISTEMA DE NOTIFICAÇÕES
// =============================================
function mostrarNotificacao(mensagem, tipo) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        ${tipo === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>${mensagem}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// =============================================
// ESTILOS DE ANIMAÇÃO
// =============================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes pulse-marker {
        0%, 100% {
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        50% {
            box-shadow: 0 4px 24px rgba(102, 126, 234, 0.6);
        }
    }
    
    .badge-primary {
        background: #667eea;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
    }
    
    .badge-secondary {
        background: #6c757d;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
    }
`;
document.head.appendChild(style);

// =============================================
// SISTEMA DE NOTA FISCAL - ADICIONAR NO FINAL DO area-admin.js
// =============================================

// Função para gerar Nota Fiscal em PDF
async function gerarNotaFiscal(pedidoId) {
    try {
        console.log('📄 Gerando Nota Fiscal para pedido:', pedidoId);
        
        // Buscar dados do pedido
        const responsePedido = await fetch(`${API_URL}/solicitacoes/${pedidoId}`);
        if (!responsePedido.ok) throw new Error('Pedido não encontrado');
        
        const dataPedido = await responsePedido.json();
        const pedido = dataPedido.solicitacao;
        
        // Extrair informações do entregador
        let nomeEntregador = 'Não atribuído';
        let telefoneEntregador = '-';
        
        if (pedido.observacoes) {
            const matchEntregador = pedido.observacoes.match(/Entregador:\s*([^|]+)/);
            const matchTelefone = pedido.observacoes.match(/Tel:\s*([^|]+)/);
            if (matchEntregador) nomeEntregador = matchEntregador[1].trim();
            if (matchTelefone) telefoneEntregador = matchTelefone[1].trim();
        }
        
        // Carregar biblioteca jsPDF dinamicamente
        if (!window.jspdf) {
            await carregarJsPDF();
        }
        
        // Criar PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações
        const margemEsquerda = 20;
        const margemDireita = 190;
        const larguraPagina = margemDireita - margemEsquerda;
        let posY = 20;
        
        // ===== CABEÇALHO =====
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTA FISCAL', margemEsquerda, posY);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema Suppontrol', margemEsquerda, posY + 10);
        doc.text(`NF Nº ${pedido.solicitacaoNumero || pedido._id.substring(0, 8)}`, margemEsquerda, posY + 17);
        
        // Data de emissão (direita)
        const dataEmissao = new Date().toLocaleDateString('pt-BR');
        doc.setFontSize(10);
        doc.text(`Emissão: ${dataEmissao}`, margemDireita - 40, posY + 10, { align: 'right' });
        
        posY = 50;
        doc.setTextColor(0, 0, 0);
        
        // ===== DADOS DO EMITENTE =====
        doc.setFillColor(248, 249, 250);
        doc.rect(margemEsquerda, posY, larguraPagina, 35, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EMITENTE', margemEsquerda + 5, posY + 7);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema Suppontrol Ltda', margemEsquerda + 5, posY + 14);
        doc.text('CNPJ: 12.345.678/0001-90', margemEsquerda + 5, posY + 20);
        doc.text('End: Av. Paulista, 1000 - São Paulo/SP', margemEsquerda + 5, posY + 26);
        doc.text('Tel: (11) 3000-0000', margemEsquerda + 5, posY + 32);
        
        posY += 42;
        
        // ===== DADOS DO DESTINATÁRIO =====
        doc.setFillColor(248, 249, 250);
        doc.rect(margemEsquerda, posY, larguraPagina, 35, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DESTINATÁRIO', margemEsquerda + 5, posY + 7);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nome: ${pedido.usuarioEmail.split('@')[0]}`, margemEsquerda + 5, posY + 14);
        doc.text(`Email: ${pedido.usuarioEmail}`, margemEsquerda + 5, posY + 20);
        doc.text(`Crachá: ${pedido.usuarioCracha}`, margemEsquerda + 5, posY + 26);
        doc.text(`Cargo: ${pedido.usuarioCargo || 'Operador'}`, margemEsquerda + 5, posY + 32);
        
        posY += 42;
        
        // ===== DADOS DO PRODUTO =====
        doc.setFillColor(248, 249, 250);
        doc.rect(margemEsquerda, posY, larguraPagina, 8, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIÇÃO', margemEsquerda + 5, posY + 6);
        doc.text('QTDE', margemDireita - 80, posY + 6);
        doc.text('UNID.', margemDireita - 55, posY + 6);
        doc.text('VLR UNIT.', margemDireita - 35, posY + 6);
        doc.text('VLR TOTAL', margemDireita - 5, posY + 6, { align: 'right' });
        
        posY += 10;
        
        // Calcular valores (exemplo)
        const valorUnitario = obterValorUnitario(pedido.tipoProduto);
        const valorTotal = valorUnitario * pedido.quantidade;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(getProdutoNome(pedido.tipoProduto), margemEsquerda + 5, posY);
        doc.text(pedido.quantidade.toString(), margemDireita - 80, posY);
        doc.text(pedido.unidade, margemDireita - 55, posY);
        doc.text(`R$ ${valorUnitario.toFixed(2)}`, margemDireita - 35, posY);
        doc.text(`R$ ${valorTotal.toFixed(2)}`, margemDireita - 5, posY, { align: 'right' });
        
        posY += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(margemEsquerda, posY, margemDireita, posY);
        
        posY += 10;
        
        // ===== TOTALIZADORES =====
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        
        doc.text('SUBTOTAL:', margemDireita - 60, posY);
        doc.text(`R$ ${valorTotal.toFixed(2)}`, margemDireita - 5, posY, { align: 'right' });
        
        posY += 7;
        doc.text('IMPOSTOS (0%):', margemDireita - 60, posY);
        doc.text('R$ 0,00', margemDireita - 5, posY, { align: 'right' });
        
        posY += 10;
        doc.setFontSize(13);
        doc.setFillColor(102, 126, 234);
        doc.setTextColor(255, 255, 255);
        doc.rect(margemDireita - 80, posY - 6, 80, 10, 'F');
        doc.text('VALOR TOTAL:', margemDireita - 75, posY);
        doc.text(`R$ ${valorTotal.toFixed(2)}`, margemDireita - 5, posY, { align: 'right' });
        
        posY += 15;
        doc.setTextColor(0, 0, 0);
        
        // ===== DADOS DA ENTREGA =====
        doc.setFillColor(248, 249, 250);
        doc.rect(margemEsquerda, posY, larguraPagina, 25, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES DE ENTREGA', margemEsquerda + 5, posY + 7);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Entregador: ${nomeEntregador}`, margemEsquerda + 5, posY + 14);
        doc.text(`Telefone: ${telefoneEntregador}`, margemEsquerda + 5, posY + 20);
        
        if (pedido.previsaoEntrega) {
            const dataEntrega = new Date(pedido.previsaoEntrega).toLocaleDateString('pt-BR');
            doc.text(`Previsão de Entrega: ${dataEntrega}`, margemDireita - 60, posY + 14);
        }
        
        posY += 32;
        
        // ===== OBSERVAÇÕES =====
        if (pedido.observacoes) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('OBSERVAÇÕES:', margemEsquerda, posY);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const obsTexto = pedido.observacoes.substring(0, 200);
            const linhasObs = doc.splitTextToSize(obsTexto, larguraPagina);
            doc.text(linhasObs, margemEsquerda, posY + 5);
            
            posY += 5 + (linhasObs.length * 4);
        }
        
        // ===== RODAPÉ =====
        posY = 270;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.setFont('helvetica', 'italic');
        doc.text('Este documento é uma representação simplificada de Nota Fiscal.', 105, posY, { align: 'center' });
        doc.text('Sistema Suppontrol - Gestão de Tanques', 105, posY + 4, { align: 'center' });
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, posY + 8, { align: 'center' });
        
        // Adicionar borda da página
        doc.setDrawColor(102, 126, 234);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 277);
        
        // Salvar PDF
        const nomeArquivo = `NF_${pedido.solicitacaoNumero || pedido._id.substring(0, 8)}_${dataEmissao.replace(/\//g, '-')}.pdf`;
        doc.save(nomeArquivo);
        
        mostrarNotificacao('✅ Nota Fiscal gerada com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao gerar Nota Fiscal:', error);
        mostrarNotificacao('❌ Erro ao gerar Nota Fiscal: ' + error.message, 'error');
    }
}

// Função auxiliar para obter valor unitário do produto
function obterValorUnitario(tipoProduto) {
    const valores = {
        'agua': 25.00,      // R$ 25,00 por galão
        'farinha': 45.00,   // R$ 45,00 por saco
        'banha': 35.00      // R$ 35,00 por balde
    };
    return valores[tipoProduto] || 0;
}

// Função para carregar biblioteca jsPDF dinamicamente
async function carregarJsPDF() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            console.log('✅ jsPDF carregado com sucesso');
            resolve();
        };
        script.onerror = () => reject(new Error('Erro ao carregar jsPDF'));
        document.head.appendChild(script);
    });
}

console.log('✅ Sistema de Nota Fiscal carregado!');

console.log('Área Administrativa inicializada!');