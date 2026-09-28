import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

console.log('Testing zod-to-json-schema...');
try {
  const result = zodToJsonSchema(SignupRequestSchema);
  console.log('Success:', JSON.stringify(result, null, 2));
} catch (e) {
  console.error('Error:', e.message);
}
