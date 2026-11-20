import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Geofence } from './models/Geofence.js';

async function seed() {
  await connectDb();

  let admin = await User.findOne({ email: env.seedAdminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Administrador',
      email: env.seedAdminEmail,
      password: env.seedAdminPassword,
      role: 'admin',
      accessCode: '9999'
    });
    console.log(`Admin creado: ${admin.email}`);
  } else {
    console.log(`Admin ya existe: ${admin.email}`);
  }

  const guardEmail = 'guardia@accesos.local';
  if (!(await User.findOne({ email: guardEmail }))) {
    await User.create({
      name: 'Operador Mapa',
      email: guardEmail,
      password: 'Guardia123!',
      role: 'guard',
      accessCode: '5555'
    });
    console.log(`Operador creado: ${guardEmail}`);
  }

  const devices = [
    {
      name: 'Dispositivo Demo 1',
      email: 'movil1@accesos.local',
      password: 'Movil123!',
      accessCode: '1001'
    },
    {
      name: 'Dispositivo Demo 2',
      email: 'movil2@accesos.local',
      password: 'Movil123!',
      accessCode: '1002'
    }
  ];

  for (const device of devices) {
    if (!(await User.findOne({ email: device.email }))) {
      await User.create({ ...device, role: 'resident' });
      console.log(`Dispositivo creado: ${device.email}`);
    }
  }

  // Geocerca demo alrededor del Zócalo CDMX
  const demoName = 'Zona Centro Demo';
  if (!(await Geofence.findOne({ name: demoName }))) {
    await Geofence.create({
      name: demoName,
      description: 'Geocerca de ejemplo para pruebas de enter/exit',
      color: '#3d9b84',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-99.1365, 19.4355],
            [-99.1305, 19.4355],
            [-99.1305, 19.4315],
            [-99.1365, 19.4315],
            [-99.1365, 19.4355]
          ]
        ]
      }
    });
    console.log(`Geocerca creada: ${demoName}`);
  }

  console.log('\nSeed completado.');
  console.log('Credenciales demo:');
  console.log(`  Admin:    ${env.seedAdminEmail} / ${env.seedAdminPassword}`);
  console.log('  Operador: guardia@accesos.local / Guardia123!');
  console.log('  Móvil 1:  movil1@accesos.local / Movil123!');
  console.log('  Móvil 2:  movil2@accesos.local / Movil123!');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
