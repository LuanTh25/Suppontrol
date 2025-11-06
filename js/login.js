// ============================
// CONFIGURAÇÕES E CONSTANTES
// ============================
const API_URL = 'http://localhost:3000/api';

// ============================
// INICIALIZAÇÃO DA PÁGINA
// ============================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Página de login carregada');
    
    // Verificar se já está logado
    verificarSessaoExistente();
    
    // Configurar evento do formulário
    configurarFormulario();
    
    // Validação em tempo real
    configurarValidacaoTempoReal();
});

// ============================
// VERIFICAR SESSÃO EXISTENTE
// ============================
function verificarSessaoExistente() {
    const estaLogado = localStorage.getItem('estaLogado');
    const tipoUsuario = localStorage.getItem('tipoUsuario');
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    
    console.log('Verificando sessão:', { estaLogado, tipoUsuario, usuarioLogado });
    
    if (estaLogado === 'true' && tipoUsuario && usuarioLogado) {
        console.log('Sessão ativa encontrada, redirecionando...');
        redirecionarPorTipo(tipoUsuario);
    } else {
        console.log('Nenhuma sessão ativa');
    }
}

// ============================
// CONFIGURAR FORMULÁRIO
// ============================
function configurarFormulario() {
    const formLogin = document.getElementById('form-login');
    
    if (!formLogin) {
        console.error('Formulário de login não encontrado!');
        return;
    }
    
    formLogin.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Formulário submetido');
        
        // Limpar mensagens de erro anteriores
        limparErros();
        
        // Validar formulário
        if (!validarFormulario()) {
            console.log('Validação do formulário falhou');
            return;
        }
        
        // Coletar dados do formulário
        const formData = {
            email: document.getElementById('email').value.trim().toLowerCase(),
            cracha: document.getElementById('cracha').value.trim(),
            tipo: document.getElementById('tipo-usuario').value
        };
        
        console.log('Dados coletados:', formData);
        
        await handleLogin(formData);
    });
}

// ============================
// VALIDAÇÃO EM TEMPO REAL
// ============================
function configurarValidacaoTempoReal() {
    const emailInput = document.getElementById('email');
    const crachaInput = document.getElementById('cracha');
    const tipoInput = document.getElementById('tipo-usuario');
    
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validarCampoEmail(this.value);
        });
    }
    
    if (crachaInput) {
        crachaInput.addEventListener('blur', function() {
            validarCampoCracha(this.value);
        });
    }
    
    if (tipoInput) {
        tipoInput.addEventListener('change', function() {
            validarCampoTipo(this.value);
        });
    }
}

// ============================
// HANDLE LOGIN
// ============================
async function handleLogin(formData) {
    const btnLogin = document.querySelector('.botao-login');
    const btnTextoOriginal = btnLogin ? btnLogin.textContent : '';
    
    try {
        console.log('Iniciando processo de login...');
        
        // Mostrar loading no botão
        if (btnLogin) {
            btnLogin.disabled = true;
            btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            btnLogin.style.opacity = '0.7';
        }
        
        console.log('Enviando requisição para:', `${API_URL}/login`);
        console.log('Payload:', { email: formData.email, cracha: formData.cracha });
        
        // Fazer requisição de login
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.email,
                cracha: formData.cracha
            })
        });
        
        console.log('Status da resposta:', response.status);
        
        const result = await response.json();
        console.log('Resposta completa:', result);
        
        if (response.ok && result.sucesso) {
            console.log('Login bem-sucedido!');
            console.log('Dados do usuário:', result.usuario);
            
            // Verificar se o tipo de usuário corresponde
            if (result.usuario.tipoUsuario !== formData.tipo) {
                throw new Error(`Tipo de usuário incorreto. Você selecionou "${formData.tipo}" mas o cadastro indica "${result.usuario.tipoUsuario}"`);
            }
            
            // Salvar dados no localStorage
            localStorage.setItem('estaLogado', 'true');
            localStorage.setItem('tipoUsuario', result.usuario.tipoUsuario);
            localStorage.setItem('usuarioLogado', JSON.stringify(result.usuario));
            
            console.log('Dados salvos no localStorage');
            
            // Mostrar mensagem de sucesso
            mostrarNotificacao('Login realizado com sucesso!', 'success');
            
            // Atualizar botão
            if (btnLogin) {
                btnLogin.innerHTML = '<i class="fas fa-check"></i> Sucesso! Redirecionando...';
                btnLogin.style.background = '#28a745';
            }
            
            // Redirecionar após breve delay
            setTimeout(() => {
                console.log('Redirecionando para:', result.usuario.tipoUsuario);
                redirecionarPorTipo(result.usuario.tipoUsuario);
            }, 1500);
            
        } else {
            throw new Error(result.mensagem || 'Erro ao fazer login');
        }
        
    } catch (error) {
        console.error('Erro no login:', error);
        mostrarErroGeral(error.message);
        
        // Restaurar botão em caso de erro
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = btnTextoOriginal;
            btnLogin.style.opacity = '1';
            btnLogin.style.background = '';
        }
    }
}

// ============================
// FUNÇÕES DE VALIDAÇÃO
// ============================
function validarFormulario() {
    const email = document.getElementById('email').value.trim();
    const cracha = document.getElementById('cracha').value.trim();
    const tipo = document.getElementById('tipo-usuario').value;
    
    const isEmailValid = validarCampoEmail(email);
    const isCrachaValid = validarCampoCracha(cracha);
    const isTipoValid = validarCampoTipo(tipo);
    
    return isEmailValid && isCrachaValid && isTipoValid;
}

function validarCampoEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = email && emailRegex.test(email);
    
    mostrarErroCampo('email', isValid ? '' : 'Email inválido');
    return isValid;
}

function validarCampoCracha(cracha) {
    // Aceita múltiplos formatos:
    // AA-1234 (2 letras, hífen, 4 números)
    // FUNC001 (letras seguidas de números)
    // ABC123 (qualquer combinação de letras e números)
    const crachaRegex1 = /^[A-Za-z]{2}-\d{4}$/;  // AA-1234
    const crachaRegex2 = /^[A-Za-z]{4}\d{3}$/;    // FUNC001
    const crachaRegex3 = /^[A-Za-z0-9]{4,10}$/;   // Genérico (4-10 caracteres alfanuméricos)
    
    const isValid = cracha && (crachaRegex1.test(cracha) || crachaRegex2.test(cracha) || crachaRegex3.test(cracha));
    
    mostrarErroCampo('cracha', isValid ? '' : 'Formato inválido. Ex: AA-1234 ou FUNC001');
    return isValid;
}

function validarCampoTipo(tipo) {
    const isValid = ['admin', 'usuario'].includes(tipo);
    
    mostrarErroCampo('tipo-usuario', isValid ? '' : 'Selecione um tipo de acesso');
    return isValid;
}

// ============================
// FUNÇÕES DE EXIBIÇÃO DE ERROS
// ============================
function mostrarErroCampo(fieldName, message) {
    const errorElement = document.getElementById(`erro-${fieldName}`);
    const inputElement = document.getElementById(fieldName);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = message ? 'block' : 'none';
        errorElement.style.color = '#dc3545';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '5px';
    }
    
    if (inputElement && message) {
        inputElement.style.borderColor = '#dc3545';
        inputElement.style.backgroundColor = '#fff5f5';
    } else if (inputElement) {
        inputElement.style.borderColor = '';
        inputElement.style.backgroundColor = '';
    }
}

function mostrarErroGeral(message) {
    // Criar notificação de erro se não existir elemento de erro geral
    mostrarNotificacao('❌ ' + message, 'error');
}

function limparErros() {
    // Limpar erros de campos
    const camposErro = ['email', 'cracha', 'tipo-usuario'];
    camposErro.forEach(campo => {
        mostrarErroCampo(campo, '');
    });
}

// ============================
// FUNÇÕES DE NOTIFICAÇÃO
// ============================
function mostrarNotificacao(mensagem, tipo) {
    // Remover notificação anterior se existir
    const notifAnterior = document.querySelector('.notificacao-login');
    if (notifAnterior) {
        notifAnterior.remove();
    }
    
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'notificacao-login';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        ${tipo === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: 'Roboto', sans-serif;
        font-size: 14px;
        max-width: 350px;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            ${tipo === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'}
            <span>${mensagem}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// ============================
// REDIRECIONAMENTO
// ============================
function redirecionarPorTipo(tipo) {
    if (tipo === 'admin') {
        console.log('🔀 Redirecionando para área administrativa...');
        window.location.href = 'area-admin.html';
    } else if (tipo === 'usuario') {
        console.log('🔀 Redirecionando para área do usuário...');
        window.location.href = 'area-usuario.html';
    } else {
        console.error('Tipo de usuário desconhecido:', tipo);
        mostrarNotificacao('Erro: Tipo de usuário desconhecido', 'error');
    }
}

// ============================
// ESTILOS DE ANIMAÇÃO
// ============================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .erro {
        display: none;
        color: #dc3545;
        font-size: 12px;
        margin-top: 5px;
    }
    
    .fa-spinner {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log('Sistema de login inicializado!');