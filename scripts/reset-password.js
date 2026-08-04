/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Script de uso único para resetear la contraseña de un usuario.
 *
 * Uso:
 *   1) Editá USERNAME y NEW_PASSWORD abajo (en TARGET).
 *   2) Desde la carpeta backend/ corré:
 *      node scripts/reset-password.js
 *
 * Necesita la variable de entorno MONGODB_URI definida en backend/.env
 * (ya esta porque el backend la usa para conectar).
 *
 * Efecto:
 *  - Hashea la nueva contraseña con bcrypt (mismo cost factor que la app: 10).
 *  - Actualiza passwordHash del usuario.
 *  - Incrementa tokenVersion → invalida cualquier sesión vieja del usuario.
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

// === EDITAR ACA ===
const TARGET = {
  USERNAME: 'gonzalito',
  NEW_PASSWORD: 'Gonzalo',
};
// ==================

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Falta MONGODB_URI en backend/.env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    // Si el URI no especifica DB, MongoClient usa la default — la app
    // guarda los users en la DB del URI. Confirmamos buscando primero.
    const db = client.db();
    const users = db.collection('users');

    const lookup = TARGET.USERNAME.toLowerCase().trim();
    const before = await users.findOne(
      { username: lookup },
      { projection: { _id: 1, username: 1, name: 1, lastName: 1, role: 1 } },
    );
    if (!before) {
      console.error(`❌ No encontre usuario con username "${lookup}".`);
      console.error('  Tip: el username se guarda en minusculas.');
      process.exit(1);
    }
    console.log('👤 Usuario encontrado:');
    console.log(`   ${before.name}${before.lastName ? ' ' + before.lastName : ''} (@${before.username}, rol=${before.role})`);

    const passwordHash = await bcrypt.hash(TARGET.NEW_PASSWORD, 10);

    const result = await users.updateOne(
      { _id: before._id },
      {
        $set: { passwordHash },
        $inc: { tokenVersion: 1 },
      },
    );

    if (result.modifiedCount === 1) {
      console.log('✅ Contraseña actualizada.');
      console.log(`   Nueva contraseña: ${TARGET.NEW_PASSWORD}`);
      console.log('   Las sesiones viejas quedaron invalidadas.');
    } else {
      console.warn('⚠ No se modificó ningún documento. Resultado:', result);
    }
  } catch (err) {
    console.error('❌ Error:', err.message ?? err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
