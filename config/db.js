// A única responsabilidade deste arquivo é conectar ao banco de dados.

const mongoose = require('mongoose');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

const connectDB = async () => {
  try {
    // A string de conexão vem do arquivo .env que vamos criar
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conexão com o MongoDB estabelecida com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar com o MongoDB:', error.message);
    // Encerra o processo com falha se não conseguir conectar
    process.exit(1);
  }
};

// Exportamos a função para que ela possa ser usada no app.js
module.exports = connectDB;
