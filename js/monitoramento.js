let solicitacoes = [];
        let solicitacaoAtual = null;
        let filtroAtual = 'todos';
        let termoBusca = '';

        // Carregar solicitações ao abrir a página
        document.addEventListener('DOMContentLoaded', function() {
            carregarSolicitacoes();
            configurarBusca();
        });

        function configurarBusca() {
            const campoBusca = document.getElementById('campo-busca');
            campoBusca.addEventListener('input', function() {
                termoBusca = this.value.toLowerCase();
                renderizarSolicitacoes();
            });
        }

        async function carregarSolicitacoes() {
            try {
                // Simulação de carregamento de dados
                // Em um cenário real, isso viria de uma API
                const resposta = await fetch('http://localhost:3000/api/solicitacoes');
                solicitacoes = await resposta.json();
                
                // Atualizar dashboard
                atualizarDashboard();
                
                // Renderizar solicitações
                renderizarSolicitacoes();
                
                // Mostrar notificação de atualização
                mostrarNotificacao('Dados atualizados com sucesso!', 'sucesso');
            } catch (erro) {
                console.error('Erro ao carregar solicitações:', erro);
                mostrarNotificacao('Erro ao carregar solicitações', 'erro');
            }
        }

        function atualizarDashboard() {
            const contadores = {
                pendentes: 0,
                aceitas: 0,
                recusadas: 0,
                espera: 0
            };
            
            solicitacoes.forEach(sol => {
                if (contadores.hasOwnProperty(sol.status)) {
                    contadores[sol.status]++;
                }
            });
            
            document.getElementById('contador-pendentes').textContent = contadores.pendentes;
            document.getElementById('contador-aceitas').textContent = contadores.aceitas;
            document.getElementById('contador-recusadas').textContent = contadores.recusadas;
            document.getElementById('contador-espera').textContent = contadores.espera;
        }

        function renderizarSolicitacoes() {
            const container = document.getElementById('solicitacoes-container');
            
            // Aplicar filtros
            let solicitacoesFiltradas = solicitacoes;
            
            if (filtroAtual !== 'todos') {
                if (filtroAtual === 'urgente') {
                    solicitacoesFiltradas = solicitacoes.filter(s => s.urgente);
                } else {
                    solicitacoesFiltradas = solicitacoes.filter(s => s.status === filtroAtual);
                }
            }
            
            // Aplicar busca
            if (termoBusca) {
                solicitacoesFiltradas = solicitacoesFiltradas.filter(sol => 
                    sol.usuarioEmail.toLowerCase().includes(termoBusca) ||
                    sol.usuarioCracha.toLowerCase().includes(termoBusca) ||
                    sol.tipoProduto.toLowerCase().includes(termoBusca) ||
                    obterNomeProduto(sol.tipoProduto).toLowerCase().includes(termoBusca)
                );
            }
            
            // Ordenar por data (mais recentes primeiro) e por urgência
            solicitacoesFiltradas.sort((a, b) => {
                if (a.urgente && !b.urgente) return -1;
                if (!a.urgente && b.urgente) return 1;
                return new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao);
            });

            if (solicitacoesFiltradas.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>Nenhuma solicitação encontrada</h3>
                        <p>Não há solicitações ${filtroAtual === 'todos' ? '' : filtroAtual} no momento.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = solicitacoesFiltradas.map(sol => `
                <div class="card-solicitacao ${sol.status} ${sol.urgente ? 'urgente' : ''}">
                    <div class="card-header">
                        <div class="produto-icon">
                            ${obterIconeProduto(sol.tipoProduto)}
                        </div>
                        <span class="status-badge ${sol.status}">
                            ${obterTextoStatus(sol.status)}
                        </span>
                    </div>
                    
                    <div class="card-body">
                        <div class="info-linha">
                            <i class="fas fa-user"></i>
                            <span><span class="info-destaque">Email:</span> ${sol.usuarioEmail}</span>
                        </div>
                        <div class="info-linha">
                            <i class="fas fa-id-badge"></i>
                            <span><span class="info-destaque">Crachá:</span> ${sol.usuarioCracha}</span>
                        </div>
                        <div class="info-linha">
                            <i class="fas fa-briefcase"></i>
                            <span><span class="info-destaque">Cargo:</span> ${sol.usuarioCargo}</span>
                        </div>
                        <div class="info-linha">
                            <i class="fas fa-box"></i>
                            <span><span class="info-destaque">Produto:</span> ${obterNomeProduto(sol.tipoProduto)}</span>
                        </div>
                        <div class="info-linha">
                            <i class="fas fa-hashtag"></i>
                            <span><span class="info-destaque">Quantidade:</span> ${sol.quantidade} ${sol.unidade}</span>
                        </div>
                        <div class="info-linha">
                            <i class="fas fa-calendar"></i>
                            <span><span class="info-destaque">Data:</span> ${formatarData(sol.dataSolicitacao)}</span>
                        </div>
                        ${sol.previsaoEntrega ? `
                        <div class="info-linha">
                            <i class="fas fa-truck"></i>
                            <span><span class="info-destaque">Previsão:</span> ${formatarData(sol.previsaoEntrega)}</span>
                        </div>
                        ` : ''}
                        ${sol.observacoes ? `
                        <div class="info-linha">
                            <i class="fas fa-sticky-note"></i>
                            <span><span class="info-destaque">Observações:</span> ${sol.observacoes}</span>
                        </div>
                        ` : ''}
                    </div>

                    ${sol.status === 'pendente' ? `
                    <div class="card-acoes">
                        <button class="btn-acao btn-aceitar" onclick="abrirModalAceitar('${sol._id}')">
                            <i class="fas fa-check"></i> Aceitar
                        </button>
                        <button class="btn-acao btn-recusar" onclick="abrirModalRecusar('${sol._id}')">
                            <i class="fas fa-times"></i> Recusar
                        </button>
                        <button class="btn-acao btn-espera" onclick="atualizarStatus('${sol._id}', 'em_espera')">
                            <i class="fas fa-pause"></i> Em Espera
                        </button>
                    </div>
                    ` : ''}
                </div>
            `).join('');
        }

        function filtrarPor(status) {
            filtroAtual = status;
            
            // Atualizar botões ativos
            document.querySelectorAll('.filtro-btn').forEach(btn => {
                btn.classList.remove('ativo');
            });
            event.target.closest('.filtro-btn').classList.add('ativo');
            
            renderizarSolicitacoes();
        }

        function abrirModalAceitar(id) {
            solicitacaoAtual = id;
            document.getElementById('modalAceitar').style.display = 'flex';
            
            // Definir data mínima como hoje
            const hoje = new Date().toISOString().split('T')[0];
            document.getElementById('previsaoEntrega').min = hoje;
            
            // Limpar campos
            document.getElementById('observacoes').value = '';
        }

        function abrirModalRecusar(id) {
            solicitacaoAtual = id;
            document.getElementById('modalRecusar').style.display = 'flex';
            
            // Limpar campos
            document.getElementById('motivoRecusa').value = '';
            document.getElementById('observacoesRecusa').value = '';
        }

        function fecharModal() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
            solicitacaoAtual = null;
        }

        async function confirmarAceitacao() {
            const previsaoEntrega = document.getElementById('previsaoEntrega').value;
            const observacoes = document.getElementById('observacoes').value;

            if (!previsaoEntrega) {
                mostrarNotificacao('Por favor, informe a previsão de entrega!', 'aviso');
                return;
            }

            // Mostrar loading
            document.getElementById('texto-confirmar').style.display = 'none';
            document.getElementById('loading-confirmar').style.display = 'inline-block';

            await atualizarStatus(solicitacaoAtual, 'aceito', previsaoEntrega, observacoes);
            
            // Restaurar botão
            document.getElementById('texto-confirmar').style.display = 'inline';
            document.getElementById('loading-confirmar').style.display = 'none';
            
            fecharModal();
        }

        async function confirmarRecusa() {
            const motivoRecusa = document.getElementById('motivoRecusa').value;
            const observacoes = document.getElementById('observacoesRecusa').value;

            if (!motivoRecusa) {
                mostrarNotificacao('Por favor, selecione um motivo para a recusa!', 'aviso');
                return;
            }

            // Mostrar loading
            document.getElementById('texto-recusar').style.display = 'none';
            document.getElementById('loading-recusar').style.display = 'inline-block';

            await atualizarStatus(solicitacaoAtual, 'recusado', null, `${motivoRecusa}: ${observacoes}`);
            
            // Restaurar botão
            document.getElementById('texto-recusar').style.display = 'inline';
            document.getElementById('loading-recusar').style.display = 'none';
            
            fecharModal();
        }

        async function atualizarStatus(id, status, previsaoEntrega = null, observacoes = '') {
            try {
                const dados = { status };
                if (previsaoEntrega) dados.previsaoEntrega = previsaoEntrega;
                if (observacoes) dados.observacoes = observacoes;

                const resposta = await fetch(`http://localhost:3000/api/solicitacoes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resultado = await resposta.json();

                if (resultado.sucesso) {
                    mostrarNotificacao('Solicitação atualizada com sucesso! O usuário foi notificado.', 'sucesso');
                    await carregarSolicitacoes();
                } else {
                    mostrarNotificacao('Erro ao atualizar solicitação.', 'erro');
                }
            } catch (erro) {
                console.error('Erro:', erro);
                mostrarNotificacao('Erro ao atualizar solicitação.', 'erro');
            }
        }

        function mostrarNotificacao(mensagem, tipo) {
            const notificacao = document.getElementById('notificacao');
            const texto = document.getElementById('notificacao-texto');
            
            // Definir ícone e cor baseado no tipo
            let icone = 'fas fa-info-circle';
            if (tipo === 'sucesso') icone = 'fas fa-check-circle';
            if (tipo === 'erro') icone = 'fas fa-exclamation-circle';
            if (tipo === 'aviso') icone = 'fas fa-exclamation-triangle';
            
            notificacao.className = `notificacao ${tipo}`;
            notificacao.innerHTML = `<i class="${icone}"></i><span id="notificacao-texto">${mensagem}</span>`;
            
            // Mostrar notificação
            notificacao.classList.add('mostrar');
            
            // Ocultar após 5 segundos
            setTimeout(() => {
                notificacao.classList.remove('mostrar');
            }, 5000);
        }

        function obterIconeProduto(tipo) {
            const icones = {
                'agua': '💧',
                'farinha': '🌾',
                'banha': '🥫'
            };
            return icones[tipo] || '📦';
        }

        function obterNomeProduto(tipo) {
            const nomes = {
                'agua': 'Água',
                'farinha': 'Farinha',
                'banha': 'Banha'
            };
            return nomes[tipo] || tipo;
        }

        function obterTextoStatus(status) {
            const textos = {
                'pendente': 'Pendente',
                'aceito': 'Aceito',
                'recusado': 'Recusado',
                'em_espera': 'Em Espera'
            };
            return textos[status] || status;
        }

        function formatarData(data) {
            return new Date(data).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Atualizar automaticamente a cada 30 segundos
        setInterval(carregarSolicitacoes, 30000);