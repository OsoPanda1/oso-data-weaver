import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { getServerConfig } from '../config.server';

// Ejemplo de server function tipada y validada con Zod.
// Se puede invocar en el cliente con:
//   const fn = useServerFn(getGreeting);
//   const data = await fn({ data: { name: 'Ada' } });

const InputSchema = z.object({
  name: z.string().min(1, 'name is required'),
});

const OutputSchema = z.object({
  greeting: z.string(),
  mode: z.string(),
});

export type GetGreetingInput = z.infer<typeof InputSchema>;
export type GetGreetingOutput = z.infer<typeof OutputSchema>;

export const getGreeting = createServerFn({ method: 'POST' })
  .inputValidator(InputSchema)
  .handler(async ({ data }): Promise<GetGreetingOutput> => {
    const config = getServerConfig();

    const result = {
      greeting: `Hello, ${data.name}!`,
      mode: config.nodeEnv ?? 'unknown',
    };

    // Validar también la salida para asegurar contrato estable
    return OutputSchema.parse(result);
  });
