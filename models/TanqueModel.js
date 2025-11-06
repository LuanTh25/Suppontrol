const mongoose = require('mongoose');

// Define a estrutura (Schema) para os tanques
const tanqueSchema = new mongoose.Schema({
    nome: { type: String, required: true, unique: true },
    peso: { type: Number, default: 0 },
    quantidade: { type: Number, default: 0 },
    nivel: { type: Number, default: 0, min: 0, max: 100 }
});

// Exporta o modelo. O Mongoose criará uma coleção chamada 'tanques'.
module.exports = mongoose.model('Tanque', tanqueSchema);
