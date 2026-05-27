// routes/api/public/weave.ts
import { createAPIFileRoute } from '@tanstack/start';
import { executeCommand } from '../../../lib/ecosystem/contracts';

export const Route = createAPIFileRoute('/api/public/weave')({
  POST: async ({ request }) => {
    const data = await request.json();
    try {
      const result = await executeCommand({
        type: 'SYNC_ZENODO',
        payload: data,
        userId: 'system_node_01'
      });
      return new Response(JSON.stringify(result), { status: 200 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  },
});
