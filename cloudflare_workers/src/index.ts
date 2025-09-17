import { Router } from 'itty-router';
import { GoogleAuth } from 'google-auth-library';
import { generateAnalyticsReport } from './analytics';

// Create a new router
const router = Router();

// Placeholder for service account credentials
// You need to replace this with your actual service account key
const serviceAccount = {
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "your-private-key",
  "client_email": "your-client-email",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-client-email"
};

// Get an access token for the service account
async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: 'https://www.googleapis.com/auth/datastore',
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

// Helper function to make authenticated requests to the Firestore REST API
export async function firestoreRequest(url: string, method: string = 'GET', body: any = null) {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  return response.json();
}

// Placeholder for authentication
const isAuthenticated = (request: Request) => {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.split('Bearer ')[1];
  return 'test-uid';
};

const isAdmin = async (uid: string) => {
  const projectId = serviceAccount.project_id;
  const databaseId = '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
  const user = await firestoreRequest(url);
  return user.fields && user.fields.isAdmin && user.fields.isAdmin.booleanValue;
};

router.post('/analytics/report', async (request) => {
  const uid = isAuthenticated(request);
  if (!uid) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!(await isAdmin(uid))) {
    return new Response('Forbidden', { status: 403 });
  }

  const { startDate, endDate, reportType = 'comprehensive' } = await request.json();

  const report = await generateAnalyticsReport(new Date(startDate), new Date(endDate), reportType);

  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json' },
  });
});

router.get('/analytics/dashboard', async (request) => {
  const uid = isAuthenticated(request);
  if (!uid) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const projectId = serviceAccount.project_id;
    const databaseId = '(default)';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayOrdersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;
    const todayOrdersQuery = {
      structuredQuery: {
        from: [{ collectionId: 'orders' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: today.toISOString() } },
              { field: { fieldPath: 'paymentStatus' }, op: 'EQUAL', value: { stringValue: 'completed' } },
            ],
          },
        },
      },
    };
    const todayOrders = await firestoreRequest(todayOrdersUrl, 'POST', todayOrdersQuery);

    let todayRevenue = 0;
    if (todayOrders.documents) {
      for (const doc of todayOrders.documents) {
        todayRevenue += doc.fields.totalAmount.integerValue || 0;
      }
    }

    return new Response(JSON.stringify({ today: { orders: todayOrders.documents?.length || 0, revenue: todayRevenue } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Dashboard data fetch failed:', error);
    return new Response('Failed to fetch dashboard data', { status: 500 });
  }
});

// Catch-all for not-found routes
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  fetch: router.handle,
};
