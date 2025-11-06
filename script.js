// Variáveis globais (aprendi que é melhor evitar, mas ainda estou aprendendo)
let formulario;
let campoEmail;
let campoCracha;
let botaoLogin;

// Função que executa quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página carregada!'); // Debug que o professor ensinou
    
    // Pegar os elementos do HTML
    formulario = document.getElementById('form-login');
    campoEmail = document.getElementById('email');
    campoCracha = document.getElementById('cracha');
    botaoLogin = document.querySelector('.botao-login');
    
    // Adicionar eventos (event listeners)
    formulario.addEventListener('submit', processarLogin);
    
    // Validar campos enquanto o usuário digita
    campoEmail.addEventListener('input', validarEmail);
    campoCracha.addEventListener('input', validarCracha);
});

// Função principal para processar o login
function processarLogin(evento) {
    // Impedir que o formulário seja enviado normalmente
    evento.preventDefault();
    
    console.log('Tentativa de login iniciada'); // Debug
    
    // Pegar os valores dos campos
    let email = campoEmail.value.trim();
    let cracha = campoCracha.value.trim();
    
    // Validar os campos
    let emailValido = validarEmail();
    let crachaValido = validarCracha();
    
    // Se tudo estiver válido, fazer o login
    if (emailValido && crachaValido) {
        fazerLogin(email, cracha);
    } else {
        console.log('Formulário inválido'); // Debug
        mostrarErro('Por favor, corrija os erros antes de continuar.');
    }
}

// Função para validar o email
function validarEmail() {
    let email = campoEmail.value.trim();
    let erroEmail = document.getElementById('erro-email');
    
    // Verificar se o campo está vazio
    if (email === '') {
        erroEmail.textContent = 'Email é obrigatório';
        campoEmail.classList.add('invalido');
        return false;
    }
    
    // Verificar se o email tem formato válido (regex básico que aprendi)
    let regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        erroEmail.textContent = 'Digite um email válido';
        campoEmail.classList.add('invalido');
        return false;
    }
    
    // Se chegou até aqui, o email é válido
    erroEmail.textContent = '';
    campoEmail.classList.remove('invalido');
    return true;
}

// Função para validar o crachá
function validarCracha() {
    let cracha = campoCracha.value.trim();
    let erroCracha = document.getElementById('erro-cracha');
    
    // Verificar se o campo está vazio
    if (cracha === '') {
        erroCracha.textContent = 'Crachá é obrigatório';
        campoCracha.classList.add('invalido');
        return false;
    }
    
    // Verificar se tem pelo menos 3 caracteres
    if (cracha.length < 3) {
        erroCracha.textContent = 'Crachá deve ter pelo menos 3 caracteres';
        campoCracha.classList.add('invalido');
        return false;
    }
    
    // Verificar se tem apenas números e letras
    let regexCracha = /^[0-9]+$/;
    if (!regexCracha.test(cracha)) {
        erroCracha.textContent = 'Crachá deve conter apenas letras e números';
        campoCracha.classList.add('invalido');
        return false;
    }
    
    // Se chegou até aqui, o crachá é válido
    erroCracha.textContent = '';
    campoCracha.classList.remove('invalido');
    return true;
}

// Função para fazer o login (AGORA CONECTADA À API)
async function fazerLogin(email, cracha) {
    console.log('Enviando dados para a API:', email, cracha);

    botaoLogin.disabled = true;
    botaoLogin.textContent = 'Entrando...';

    try {
        const resposta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                cracha: cracha
            })
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            // Login bem-sucedido
            alert('✅ Login realizado com sucesso! Bem-vindo, ' + dados.usuario.nome);
            
            // Redireciona para a página de tanques após 1 segundo
            setTimeout(function() {
                window.location.href = 'tanques.html'; // Redirecionamento real
            }, 1000);

        } else {
            // Login falhou
            alert('❌ Erro: ' + dados.mensagem);
            botaoLogin.disabled = false;
            botaoLogin.textContent = 'Entrar';
        }

    } catch (erro) {
        console.error('Falha ao conectar com o servidor:', erro);
        alert('❌ Erro: Não foi possível conectar ao servidor. Verifique se a API está rodando.');
        botaoLogin.disabled = false;
        botaoLogin.textContent = 'Entrar';
    }
}

// Função para simular resposta do servidor
function simularLoginServidor(email, cracha) {
    // Para fins de demonstração, aceitar alguns logins específicos
    let loginsValidos = [
        { email: 'admin@empresa.com', cracha: '123' },
        { email: 'usuario@empresa.com', cracha: '456' },
        { email: 'teste@empresa.com', cracha: 'abc123' }
    ];
    
    // Verificar se o login está na lista
    for (let i = 0; i < loginsValidos.length; i++) {
        if (loginsValidos[i].email === email && loginsValidos[i].cracha === cracha) {
            return true;
        }
    }
    
    // Se não encontrou, retornar false
    return false;
}

// Função para mostrar mensagem de erro
function mostrarErro(mensagem) {
    alert('❌ Erro: ' + mensagem); // Usando alert simples por enquanto
    console.log('Erro:', mensagem); // Debug
}

// Função para mostrar mensagem de sucesso
function mostrarSucesso(mensagem) {
    alert('✅ ' + mensagem); // Usando alert simples por enquanto
    console.log('Sucesso:', mensagem); // Debug
}

// Função extra: limpar formulário (não está sendo usada, mas aprendi a fazer)
function limparFormulario() {
    campoEmail.value = '';
    campoCracha.value = '';
    
    // Limpar classes de erro
    campoEmail.classList.remove('invalido');
    campoCracha.classList.remove('invalido');
    
    // Limpar mensagens de erro
    document.getElementById('erro-email').textContent = '';
    document.getElementById('erro-cracha').textContent = '';
}

async function atualizarTanques() {
  try {
    // Exemplo de chamada para sua API REST
    const response = await fetch("http://localhost:3000/api/tanques");
    const data = await response.json();

    document.getElementById("agua").textContent = data.agua + " L";
    document.getElementById("farinha").textContent = data.farinha + " g";
    document.getElementById("banha").textContent = data.banha + " mL";

  } catch (error) {
    console.error("Erro ao buscar dados:", error);
  }
}

// Atualiza a cada 5 segundos
setInterval(atualizarTanques, 5000);

// Atualiza assim que a página abrir
atualizarTanques();

// Sistema de Galões de Água - JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema de Galões de Água carregado!');
    
    // Inicializar funcionalidades
    initNavigation();
    initGaloes();
    updateWelcomeMessage();
});

// Funcionalidades de navegação
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover classe ativa de todos os links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Adicionar classe ativa ao link clicado
            this.classList.add('active');
            
            // Simular navegação
            const section = this.textContent.toLowerCase();
            console.log(`Navegando para: ${section}`);
            
            // Aqui você pode adicionar lógica específica para cada seção
            switch(section) {
                case 'pedido':
                    showMessage('Seção de Pedidos');
                    break;
                case 'localização':
                    showMessage('Seção de Localização');
                    break;
                case 'perfil':
                    showMessage('Seção de Perfil');
                    break;
            }
        });
    });
}

// Funcionalidades dos galões
function initGaloes() {
    const galoes = document.querySelectorAll('.galao');
    
    galoes.forEach(galao => {
        galao.addEventListener('click', function() {
            const container = this.closest('.galao-container');
            const label = container.querySelector('.galao-label').textContent;
            const volume = container.querySelector('.galao-volume').textContent;
            
            showGalaoInfo(label, volume);
        });
        
        // Adicionar efeito hover
        galao.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        galao.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// Atualizar mensagem de boas-vindas
function updateWelcomeMessage() {
    const welcomeTitle = document.querySelector('.welcome-title');
    const currentHour = new Date().getHours();
    let greeting;
    
    if (currentHour < 12) {
        greeting = 'Bom dia';
    } else if (currentHour < 18) {
        greeting = 'Boa tarde';
    } else {
        greeting = 'Boa noite';
    }
    
    // Você pode personalizar o nome aqui
    const userName = 'Usuário'; // Pode ser obtido de uma API ou localStorage
    welcomeTitle.textContent = `${greeting}, ${userName}!`;
}
