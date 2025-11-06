// Seleciona o banco de dados
use("tanksdb");

// Remove dados antigos (se existirem)
db.tanks.deleteMany({});
db.entregador.deleteMany({});

// Insere tanques
db.tanks.insertMany([
  { nome: "água", nivel: 80, pesoKg: 120, quantidade: 80, unidadeQuantidade: "L", capacidadeMaxima: 100 },
  { nome: "banha", nivel: 55, pesoKg: 90, quantidade: 60, unidadeQuantidade: "L", capacidadeMaxima: 100 },
  { nome: "farinha", nivel: 25, pesoKg: 200, quantidade: 30, unidadeQuantidade: "kg", capacidadeMaxima: 120 }
]);

// Insere localização do entregador
db.entregador.insertOne({
  _id: "padrao",
  latitude: -23.55052,
  longitude: -46.633308,
  criadoEm: new Date(),
  atualizadoEm: new Date()
});

print("✅ Banco de dados populado com sucesso!");
