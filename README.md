# Suppontrol - Projeto de Monitoramento e Gestão de Tanques (PI)

**Controle de Nível de Tanques e Automação de Pedidos.** Este sistema Full-Stack (Node.js/MongoDB) monitora insumos (água, farinha, banha) em tempo real e automatiza o ciclo de solicitação de pedidos, do funcionário à entrega. Garante acesso ponta a ponta, praticidade e controle eficiente de estoque e tanques.

## 🚀 Tecnologias Utilizadas

O projeto é construído com uma arquitetura Full-Stack, utilizando as seguintes tecnologias:

| Categoria | Tecnologia | Descrição |
| --- | --- | --- |
| **Backend** | Node.js, Express | Ambiente de execução e framework para o servidor API. |
| **Banco de Dados** | MongoDB, Mongoose | Banco de dados NoSQL para persistência de dados e ODM (Object Data Modeling). |
| **Frontend** | HTML5, CSS3, JavaScript | Estrutura da interface, estilização e lógica de interação do lado do cliente. |
| **Estilização** | CSS Puro | Estilos customizados para as áreas de usuário, admin e monitoramento. |
| **Outros** | CORS, dotenv | Middleware para lidar com requisições de diferentes origens e gerenciamento de variáveis de ambiente. |

## ✨ Funcionalidades Principais

O sistema oferece diferentes níveis de acesso e funcionalidades:

1. **Autenticação**: Login seguro baseado em e-mail e crachá.

1. **Monitoramento de Tanques**:
  - Visualização em tempo real do nível, peso e quantidade de insumos (água, farinha, banha).
  - Atualização de dados via API (`/api/monitoramento/tanques`).

1. **Área do Usuário (Operador)**:
  - Visualização do perfil.
  - Criação de novas solicitações de insumos.
  - Acompanhamento do status das solicitações (pendente, aceito, em preparação, a caminho, entregue).
  - Visualização de notificações.

1. **Área do Administrador**:
  - Gestão completa de usuários (CRUD: Criar, Listar, Atualizar, Excluir).
  - Gestão de solicitações (Visualizar, Aceitar, Recusar, Atualizar Status).
  - Visualização do histórico de atividades (logins, cadastros).

## ⚙️ Instalação e Configuração

Siga os passos abaixo para configurar e rodar o projeto em sua máquina local.

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 14 ou superior)

- [MongoDB](https://www.mongodb.com/try/download/community) (local ou acesso a um cluster Atlas)

### 1. Clonar o Repositório

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd pi
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo chamado `.env` na raiz do projeto e adicione a string de conexão do seu MongoDB.

```
# Exemplo de arquivo .env
MONGO_URI=mongodb+srv://<usuario>:<senha>@<cluster>/Suppontrol
```

> **Nota**: A porta padrão do servidor é `3000`.

### 4. Popular o Banco de Dados (Opcional)

O projeto inclui um script de *seed* para popular o banco de dados com dados iniciais de tanques e usuários.

Para popular o banco, você pode usar um cliente MongoDB (como o MongoDB Shell ou Compass) e executar o conteúdo do arquivo `seed.js`.

### 5. Iniciar o Servidor

```bash
node app.js
```

O servidor estará rodando em `http://localhost:3000`.

## 📂 Estrutura de Arquivos

| Arquivo/Diretório | Descrição |
| --- | --- |
| `app.js` | Arquivo principal do servidor Express, contém a lógica de rotas e definição dos Schemas Mongoose. |
| `db.js` | Módulo de conexão com o MongoDB. |
| `package.json` | Metadados do projeto e lista de dependências. |
| `.env` | Variáveis de ambiente (como a `MONGO_URI`). |
| `seed.js` | Script para popular o banco de dados com dados iniciais. |
| `login.html` | Página de login da aplicação. |
| `area-usuario.html` | Dashboard e funcionalidades para usuários (Operadores). |
| `area-admin.html` | Dashboard e funcionalidades para administradores. |
| `perfil.html` | Página de visualização e edição do perfil do usuário. |
| `style.css` | Estilos globais da aplicação. |
| `area-usuario.css` | Estilos específicos para a área do usuário. |
| `area-admin.css` | Estilos específicos para a área do administrador. |
| `monitoramento.css` | Estilos para a seção de monitoramento de tanques. |
| `script.js` | Lógica JavaScript geral para o frontend. |
| `login.js` | Lógica de autenticação do lado do cliente. |
| `area-usuario.js` | Lógica de interação para a área do usuário (solicitações, notificações). |
| `area-admin.js` | Lógica de interação para a área do administrador (gestão de usuários e solicitações). |
| `monitoramento.js` | Lógica de atualização e exibição dos dados dos tanques. |

## 🤝 Autores

- **Luan Thomazini Marques de Oliveira**

- **Jéssica Cristina Gabriel de Oliveira**


