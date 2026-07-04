/* eslint-disable no-console */
const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:5000/api/v1';
const seed = Date.now();
const password = 'Pass@1234';
const farmerEmail = `farmer.market.${seed}@example.com`;
const consumerEmail = `consumer.market.${seed}@example.com`;

type HttpMethod = 'GET' | 'POST';

async function apiRequest<T>(path: string, method: HttpMethod, body?: unknown, cookie?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json()) as T;
  const setCookie = response.headers.get('set-cookie') ?? '';
  return { ok: response.ok, status: response.status, payload, setCookie };
}

function readCookie(rawSetCookie: string): string {
  return rawSetCookie.split(';')[0] ?? '';
}

async function registerAndGetCookie(email: string, role: 'farmer' | 'consumer', fullName: string) {
  const result = await apiRequest<{ success: boolean }>('/auth/register', 'POST', {
    fullName,
    email,
    password,
    role,
  });
  if (!result.ok) {
    throw new Error(`Registration failed for ${email}. Status: ${result.status}`);
  }
  const cookie = readCookie(result.setCookie);
  if (!cookie) {
    throw new Error(`Missing auth cookie for ${email}`);
  }
  return cookie;
}

async function run() {
  const farmerCookie = await registerAndGetCookie(farmerEmail, 'farmer', 'Farmer Smoke');
  const consumerCookie = await registerAndGetCookie(consumerEmail, 'consumer', 'Consumer Smoke');

  const createdProduct = await apiRequest<{ data: { id: string } }>(
    '/marketplace/',
    'POST',
    {
      name: 'Tomato Premium',
      cropType: 'vegetable',
      pricePerKg: 42,
      quantityKg: 120,
      location: 'Madurai',
      description: 'Fresh tomatoes from farm with high quality and good shelf life.',
    },
    farmerCookie,
  );
  if (!createdProduct.ok) {
    throw new Error(`Product creation failed. Status: ${createdProduct.status}`);
  }

  const productId = createdProduct.payload.data.id;
  const productsResult = await apiRequest('/marketplace/products', 'GET', undefined, consumerCookie);
  const productDetail = await apiRequest<{ data: { farmer_id: string } }>(`/marketplace/product/${productId}`, 'GET', undefined, consumerCookie);
  const cartResult = await apiRequest('/cart', 'POST', { items: [{ product_id: productId, quantity: 2 }] }, consumerCookie);
  const meResult = await apiRequest<{ data: { id: string } }>('/auth/me', 'GET', undefined, consumerCookie);
  const orderResult = await apiRequest(
    '/orders',
    'POST',
    {
      consumer_id: meResult.payload.data.id,
      farmer_id: productDetail.payload.data.farmer_id,
      products: [{ product_id: productId, quantity: 2 }],
      total_price: 84,
      delivery_address: {
        name: 'Consumer Smoke',
        phone: '9876543210',
        location: 'Madurai Town',
        notes: 'Call before delivery',
      },
    },
    consumerCookie,
  );

  console.log(
    JSON.stringify(
      {
        credentials: {
          farmer: { email: farmerEmail, password },
          consumer: { email: consumerEmail, password },
        },
        checks: {
          products: productsResult.status,
          product_detail: productDetail.status,
          cart: cartResult.status,
          order: orderResult.status,
        },
        order_response: orderResult.payload,
      },
      null,
      2,
    ),
  );
}

void run();
