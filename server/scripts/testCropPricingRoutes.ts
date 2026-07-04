import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { UserModel, type UserRole } from '../src/models/user.model.js';
import { seedCropCatalog } from '../src/modules/crop-pricing/crop-pricing.service.js';
import { getAuthCookieName, signAccessToken } from '../src/utils/auth-token.js';

type RouteTestResult = {
  route: string;
  status: number;
  ok: boolean;
  message: string;
};

const AUTH_COOKIE = getAuthCookieName();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function ensureUser(role: UserRole, suffix: string): Promise<{ id: string; cookie: string }> {
  const email = `crop-pricing-${role}-${suffix}@pasumai.test`;
  let user = await UserModel.findOne({ email });

  if (!user) {
    user = await UserModel.create({
      fullName: `Crop Pricing ${role.toUpperCase()}`,
      email,
      mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      dob: '1990-01-01',
      gender: 'other',
      passwordHash: 'test-password-hash',
      aadhaarFull: `${Math.floor(100000000000 + Math.random() * 899999999999)}`,
      aadhaarLast4: `${Math.floor(1000 + Math.random() * 8999)}`,
      role,
    });
  }

  const token = signAccessToken(String(user._id), role);
  return {
    id: String(user._id),
    cookie: `${AUTH_COOKIE}=${token}`,
  };
}

async function parseJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  await connectDB();
  await seedCropCatalog(false);

  const suffix = Date.now().toString(36);
  const admin = await ensureUser('admin', suffix);
  const farmer = await ensureUser('farmer', suffix);

  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
  });

  const address = server.address();
  assert(
    address && typeof address === 'object' && 'port' in address,
    'Unable to resolve test server port',
  );
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const results: RouteTestResult[] = [];

  try {
    // 1) GET /admin/crops
    const getAdminCropsRes = await fetch(`${base}/admin/crops`, {
      headers: { Cookie: admin.cookie },
    });
    const getAdminCropsBody = await parseJson(getAdminCropsRes);
    assert(getAdminCropsRes.status === 200, 'GET /admin/crops should return 200');
    assert(Array.isArray(getAdminCropsBody?.data), 'GET /admin/crops should return data array');
    assert(getAdminCropsBody.data.length >= 40, 'GET /admin/crops should return seeded crops');
    results.push({
      route: 'GET /admin/crops',
      status: getAdminCropsRes.status,
      ok: true,
      message: `returned ${getAdminCropsBody.data.length} crops`,
    });

    // 2) POST /admin/update-crop-price
    const updateRes = await fetch(`${base}/admin/update-crop-price`, {
      method: 'POST',
      headers: {
        Cookie: admin.cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        crop_name: 'Tomato',
        base_price: 27,
      }),
    });
    const updateBody = await parseJson(updateRes);
    assert(updateRes.status === 200, 'POST /admin/update-crop-price should return 200');
    assert(
      updateBody?.data?.crop === 'Tomato',
      'POST /admin/update-crop-price should update Tomato',
    );
    results.push({
      route: 'POST /admin/update-crop-price',
      status: updateRes.status,
      ok: true,
      message: `updated ${updateBody?.data?.crop} to base ${updateBody?.data?.base_price}`,
    });

    // 3) POST /admin/upload-crop-prices
    const csv = ['crop_name,base_price', 'tomato,25', 'onion,31', 'banana,46', 'mango,82'].join(
      '\n',
    );
    const formData = new FormData();
    formData.append('file', new Blob([csv], { type: 'text/csv' }), 'crop-prices.csv');

    const uploadRes = await fetch(`${base}/admin/upload-crop-prices`, {
      method: 'POST',
      headers: {
        Cookie: admin.cookie,
      },
      body: formData,
    });
    const uploadBody = await parseJson(uploadRes);
    assert(uploadRes.status === 200, 'POST /admin/upload-crop-prices should return 200');
    assert(typeof uploadBody?.data?.updated === 'number', 'CSV upload should return updated count');
    results.push({
      route: 'POST /admin/upload-crop-prices',
      status: uploadRes.status,
      ok: true,
      message: `updated ${uploadBody.data.updated} rows`,
    });

    // 4) POST /system/recalculate-crop-prices
    const recalcRes = await fetch(`${base}/system/recalculate-crop-prices`, {
      method: 'POST',
      headers: { Cookie: admin.cookie },
    });
    const recalcBody = await parseJson(recalcRes);
    assert(recalcRes.status === 200, 'POST /system/recalculate-crop-prices should return 200');
    assert(typeof recalcBody?.data?.recalculated === 'number', 'Recalculate should return count');
    results.push({
      route: 'POST /system/recalculate-crop-prices',
      status: recalcRes.status,
      ok: true,
      message: `recalculated ${recalcBody.data.recalculated} crops`,
    });

    // 5) GET /farmer/recommended-crop-prices
    const farmerRes = await fetch(`${base}/farmer/recommended-crop-prices`, {
      headers: { Cookie: farmer.cookie },
    });
    const farmerBody = await parseJson(farmerRes);
    assert(farmerRes.status === 200, 'GET /farmer/recommended-crop-prices should return 200');
    assert(Array.isArray(farmerBody?.data), 'Farmer recommended endpoint should return array');
    assert(farmerBody.data.length > 0, 'Farmer recommended endpoint should not be empty');
    results.push({
      route: 'GET /farmer/recommended-crop-prices',
      status: farmerRes.status,
      ok: true,
      message: `returned ${farmerBody.data.length} recommendations`,
    });

    // 6) Guard test: farmer cannot access admin route
    const unauthorizedAdminRes = await fetch(`${base}/admin/crops`, {
      headers: { Cookie: farmer.cookie },
    });
    assert(unauthorizedAdminRes.status === 403, 'Farmer access to /admin/crops should return 403');
    results.push({
      route: 'GET /admin/crops (farmer role)',
      status: unauthorizedAdminRes.status,
      ok: true,
      message: 'correctly blocked with 403',
    });

    // 7) Guard test: unauthenticated farmer route
    const unauthenticatedRes = await fetch(`${base}/farmer/recommended-crop-prices`);
    assert(unauthenticatedRes.status === 401, 'Unauthenticated access should return 401');
    results.push({
      route: 'GET /farmer/recommended-crop-prices (no auth)',
      status: unauthenticatedRes.status,
      ok: true,
      message: 'correctly blocked with 401',
    });

    console.log('Crop pricing route tests passed:\n');
    for (const entry of results) {
      console.log(`- [PASS] ${entry.route} -> ${entry.status} (${entry.message})`);
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await disconnectDB();
  }
}

run().catch((error: unknown) => {
  console.error('Crop pricing route tests failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
