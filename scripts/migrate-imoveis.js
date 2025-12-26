// scripts/migrate-imoveis.js
const mongoose = require('mongoose');

async function migrateImoveis() {
  try {
    await mongoose.connect(
      '',
    );

    const result = await mongoose.connection.collection('imovels').updateMany(
      {}, // Todos os documentos
      [
        {
          $set: {
            // Migra valor antigo para valor_venda se existir
            valor_venda: { $ifNull: ['$valor', null] },
            // Migra aluguel antigo para valor_aluguel se existir
            valor_aluguel: { $ifNull: ['$aluguel', null] },
            // Define os campos booleanos baseado nos valores existentes
            para_venda: { $cond: [{ $gt: ['$valor', 0] }, true, false] },
            para_aluguel: { $cond: [{ $gt: ['$aluguel', 0] }, true, false] },
            // Remove os campos antigos
            valor: '$$REMOVE',
            aluguel: '$$REMOVE',
          },
        },
      ],
    );

    console.log(
      `Migração concluída. ${result.modifiedCount} documentos atualizados.`,
    );
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrateImoveis();
