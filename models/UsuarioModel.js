const mongoose = require('mongoose');

// Define a estrutura (Schema) para os usuários
const usuarioSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    cracha: { type: String, required: true },
    nome: { type: String, required: true }
});

// Exporta o modelo para que ele possa ser usado em outras partes da aplicação.
// O Mongoose criará uma coleção chamada 'usuarios' (plural e minúsculas) no banco.
module.exports = mongoose.model('Usuario', usuarioSchema);
