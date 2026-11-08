import { defineConfig } from 'vitest/config';
import { octane } from 'octane/compiler/vite';

export default defineConfig({
	plugins: [octane()],
	test: { environment: 'jsdom', include: ['*.test.ts'] },
});
